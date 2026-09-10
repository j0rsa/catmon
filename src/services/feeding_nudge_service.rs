use chrono::{DateTime, Timelike, Utc};
use chrono_tz::Tz;
use sqlx::SqlitePool;

use crate::domain::nutrition_record::NutritionRecordFilters;
use crate::domain::nutrition_status::{
    parse_hhmm, parse_schedule_kind, parse_schedule_windows, reached_feeding_windows,
    schedule_projection_at, FEEDING_TIME_STEP_MINUTES,
};
use crate::error::AppResult;
use crate::repo::{nutrition_records, nutrition_schedules, pets};
use crate::services::{notification_service, nutrition_status_service};

const SLOT_SECS: u64 = (FEEDING_TIME_STEP_MINUTES as u64) * 60;

/// Spawn the feeding-reminder worker. It runs immediately (catch-up after
/// restart), then wakes every 10 minutes and notifies when today's intake is
/// still below the cumulative schedule projection (same curve as the fluid
/// chart) for at most one newly-behind window per check.
pub fn spawn(pool: SqlitePool, timezone: Tz) {
    tokio::spawn(async move {
        loop {
            let now = Utc::now().with_timezone(&timezone);
            tracing::debug!(
                hour = now.hour(),
                minute = now.minute(),
                "running feeding nudge check"
            );
            if let Err(e) = run_feeding_nudge_check(&pool, now).await {
                tracing::warn!(error = %e, "feeding nudge check failed");
            }

            let wait = secs_until_next_slot(Utc::now().with_timezone(&timezone));
            tokio::time::sleep(std::time::Duration::from_secs(wait)).await;
        }
    });
}

fn secs_until_next_slot<TzOffset: chrono::TimeZone>(now: DateTime<TzOffset>) -> u64 {
    let secs_into_slot =
        u64::from(now.minute() % FEEDING_TIME_STEP_MINUTES as u32) * 60 + u64::from(now.second());
    let wait = SLOT_SECS.saturating_sub(secs_into_slot);
    if wait == 0 {
        SLOT_SECS
    } else {
        wait
    }
}

/// For every active schedule with `notify`, send at most one reminder per
/// reached window per day when cumulative intake is below the chart schedule.
pub async fn run_feeding_nudge_check(pool: &SqlitePool, now_local: DateTime<Tz>) -> AppResult<()> {
    let local_date = now_local.format("%Y-%m-%d").to_string();
    let as_of = now_local.format("%Y-%m-%dT%H:%M:%S").to_string();
    let at_minutes = now_local.hour() as i32 * 60 + now_local.minute() as i32;

    let schedules = nutrition_schedules::list_notify_enabled(pool).await?;
    for schedule in schedules {
        let windows = parse_schedule_windows(&schedule.rules_json);
        let reached = reached_feeding_windows(&windows, at_minutes);
        if reached.is_empty() {
            continue;
        }

        let filters = NutritionRecordFilters {
            pet_id: Some(schedule.pet_id),
            date: Some(local_date.clone()),
            date_from: None,
            date_to: None,
            category: None,
            limit: None,
            offset: None,
        };
        let records = match nutrition_records::list_records(pool, &filters).await {
            Ok(rows) => rows,
            Err(e) => {
                tracing::warn!(
                    pet_id = %schedule.pet_id,
                    error = %e,
                    "feeding_nudge: failed to load records"
                );
                continue;
            }
        };
        let intake = nutrition_status_service::accumulate_intake(&records, &as_of);
        let kind = parse_schedule_kind(&schedule.rules_json);
        // Liquid: total known fluid (chart `total`). Food: grams.
        let actual = intake.amount_for(kind);

        let pet_name = match pets::get_pet(pool, schedule.pet_id).await {
            Ok(pet) => pet.name,
            Err(_) => schedule.pet_id.to_string(),
        };

        let (expected, _, _) = schedule_projection_at(&windows, at_minutes);
        if actual >= expected {
            continue;
        }

        // One reminder per check: attach it to the latest started window so
        // earlier windows do not all fire on the same tick when far behind.
        let Some(window) = reached.iter().max_by_key(|w| parse_hhmm(&w.from).unwrap_or(-1)) else {
            continue;
        };

        tracing::info!(
            pet_id = %schedule.pet_id,
            schedule_id = %schedule.id,
            window = %window.from,
            kind = kind.noun(),
            actual,
            expected,
            "sending feeding reminder"
        );

        if let Err(e) = notification_service::notify_feeding_nudge(
            pool,
            &schedule,
            &pet_name,
            kind,
            &local_date,
            &window.from,
        )
        .await
        {
            tracing::warn!(
                error = %e,
                schedule_id = %schedule.id,
                "feeding_nudge: notify failed"
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn waits_until_next_ten_minute_boundary() {
        let at = chrono_tz::UTC
            .with_ymd_and_hms(2026, 7, 18, 8, 3, 20)
            .unwrap();
        assert_eq!(secs_until_next_slot(at), 6 * 60 + 40);

        let on_boundary = chrono_tz::UTC
            .with_ymd_and_hms(2026, 7, 18, 8, 10, 0)
            .unwrap();
        assert_eq!(secs_until_next_slot(on_boundary), SLOT_SECS);
    }
}
