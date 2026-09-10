use crate::domain::weight::{
    summarize_by_tag, CreateWeightRecord, UpdateWeightRecord, WeightGroupBy, WeightRecord,
    WeightRecordFilters, WeightStats,
};
use crate::error::{AppError, AppResult};
use crate::repo::{pets, weight_records};
use chrono_tz::Tz;
use sqlx::SqlitePool;
use uuid::Uuid;

#[tracing::instrument(skip(pool))]
pub async fn list(pool: &SqlitePool, filters: WeightRecordFilters) -> AppResult<Vec<WeightRecord>> {
    weight_records::list(pool, &filters).await
}

#[tracing::instrument(skip(pool))]
pub async fn create(
    pool: &SqlitePool,
    req: CreateWeightRecord,
    timezone: Tz,
) -> AppResult<WeightRecord> {
    // Validate pet exists
    let pet_id = Uuid::parse_str(&req.pet_id)
        .map_err(|_| AppError::BadRequest(format!("invalid pet_id: {}", req.pet_id)))?;
    pets::get_pet(pool, pet_id)
        .await
        .map_err(|_| AppError::BadRequest(format!("Pet {} not found", req.pet_id)))?;

    let weight_kg = req.weight_kg;
    let pet_id_str = req.pet_id.clone();
    let record = weight_records::create(pool, req, timezone).await?;

    // Update the pet's current weight
    pets::update_weight(pool, &pet_id_str, weight_kg).await?;

    Ok(record)
}

#[tracing::instrument(skip(pool))]
pub async fn stats(
    pool: &SqlitePool,
    pet_id: &str,
    date_from: &str,
    date_to: &str,
) -> AppResult<WeightStats> {
    weight_records::stats(pool, pet_id, date_from, date_to).await
}

#[tracing::instrument(skip(pool))]
pub async fn update(
    pool: &SqlitePool,
    id: &str,
    req: UpdateWeightRecord,
) -> AppResult<WeightRecord> {
    weight_records::update(pool, id, req).await
}

#[tracing::instrument(skip(pool))]
pub async fn delete(pool: &SqlitePool, id: &str) -> AppResult<()> {
    weight_records::delete(pool, id).await
}

#[tracing::instrument(skip(pool))]
pub async fn summary(
    pool: &SqlitePool,
    pet_id: &str,
    date_from: Option<&str>,
    date_to: &str,
    granularity: &crate::domain::weight::WeightGranularity,
    group_by: &WeightGroupBy,
) -> AppResult<Vec<crate::domain::weight::WeightSummaryBucket>> {
    match group_by {
        WeightGroupBy::None => {
            weight_records::summary(pool, pet_id, date_from, date_to, granularity).await
        }
        WeightGroupBy::Tag => {
            let records = weight_records::list(
                pool,
                &WeightRecordFilters {
                    pet_id: Some(pet_id.to_string()),
                    date_from: date_from.map(str::to_string),
                    date_to: Some(date_to.to_string()),
                    limit: None,
                    offset: None,
                },
            )
            .await?;
            Ok(summarize_by_tag(&records, granularity))
        }
    }
}
