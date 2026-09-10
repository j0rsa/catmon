use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct NutritionSchedule {
    pub id: String,
    pub pet_id: Uuid,
    pub name: String,
    pub active: bool,
    /// When true, the feeding nudge worker reminds all users if a window's
    /// start time has passed and today's intake is still below the amount due.
    #[serde(default)]
    pub notify: bool,
    pub rules_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNutritionSchedule {
    pub pet_id: Uuid,
    pub name: String,
    pub active: Option<bool>,
    pub notify: Option<bool>,
    pub rules: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNutritionSchedule {
    pub name: Option<String>,
    pub active: Option<bool>,
    pub notify: Option<bool>,
    pub rules: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RulesJsonError {
    LegacyArray,
    NotObject,
}

pub fn default_rules_json() -> String {
    r#"{"type":"liquid","windows":[]}"#.to_string()
}

/// Normalize schedule rules for storage. Rejects the legacy array format.
pub fn normalize_rules_json(rules: Option<serde_json::Value>) -> Result<String, RulesJsonError> {
    let Some(mut value) = rules else {
        return Ok(default_rules_json());
    };
    if value.is_array() {
        return Err(RulesJsonError::LegacyArray);
    }
    if !value.is_object() {
        return Err(RulesJsonError::NotObject);
    }
    strip_stored_targets(&mut value);
    snap_window_times(&mut value);
    sort_windows_by_time(&mut value);
    Ok(value.to_string())
}

pub fn normalize_rules_json_str(rules_json: &str) -> String {
    let Ok(mut value) = serde_json::from_str::<serde_json::Value>(rules_json) else {
        return default_rules_json();
    };
    if value.is_array() {
        return default_rules_json();
    }
    if !value.is_object() {
        return default_rules_json();
    }
    strip_stored_targets(&mut value);
    snap_window_times(&mut value);
    sort_windows_by_time(&mut value);
    value.to_string()
}

fn strip_stored_targets(value: &mut serde_json::Value) {
    if let serde_json::Value::Object(map) = value {
        map.remove("target_min");
        map.remove("target_max");
        map.remove("target_min_ml");
        map.remove("target_max_ml");
    }
}

fn snap_window_times(value: &mut serde_json::Value) {
    let Some(windows) = value.get_mut("windows").and_then(|w| w.as_array_mut()) else {
        return;
    };
    for window in windows {
        let Some(obj) = window.as_object_mut() else {
            continue;
        };
        obj.remove("to");
        if let Some(raw) = obj.get("from").and_then(|v| v.as_str()) {
            if let Some(floored) = crate::domain::nutrition_status::floor_hhmm_to_step(
                raw,
                crate::domain::nutrition_status::FEEDING_TIME_STEP_MINUTES,
            ) {
                obj.insert("from".to_string(), serde_json::Value::String(floored));
            }
        }
    }
}

fn sort_windows_by_time(value: &mut serde_json::Value) {
    let Some(windows) = value.get_mut("windows").and_then(|w| w.as_array_mut()) else {
        return;
    };
    windows.sort_by(|left, right| {
        let left_from = left
            .get("from")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let right_from = right
            .get("from")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        left_from.cmp(right_from)
    });
}

impl NutritionSchedule {
    pub fn new(req: CreateNutritionSchedule) -> Result<Self, RulesJsonError> {
        let now = Utc::now().to_rfc3339();
        Ok(NutritionSchedule {
            id: Uuid::new_v4().to_string(),
            pet_id: req.pet_id,
            name: req.name,
            active: req.active.unwrap_or(true),
            notify: req.notify.unwrap_or(false),
            rules_json: normalize_rules_json(req.rules)?,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn with_normalized_rules(mut self) -> Self {
        self.rules_json = normalize_rules_json_str(&self.rules_json);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn normalize_rules_json_strips_stored_targets() {
        let raw = json!({
            "type": "liquid",
            "target_min": 79,
            "target_max": 109,
            "target_min_ml": 70,
            "target_max_ml": 120,
            "windows": [{ "from": "08:00", "min": 10, "max": 12 }]
        });
        let normalized = normalize_rules_json(Some(raw)).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&normalized).unwrap();
        assert_eq!(parsed["type"], "liquid");
        assert!(parsed.get("target_min").is_none());
        assert!(parsed.get("target_max").is_none());
        assert!(parsed.get("target_min_ml").is_none());
        assert!(parsed.get("target_max_ml").is_none());
        assert_eq!(parsed["windows"].as_array().unwrap().len(), 1);
        assert_eq!(parsed["windows"][0]["from"], "08:00");
        assert!(parsed["windows"][0].get("to").is_none());
    }

    #[test]
    fn normalize_rules_json_floors_window_times_to_ten_minutes() {
        let raw = json!({
            "type": "liquid",
            "windows": [{ "from": "08:07", "min": 10, "max": 12 }]
        });
        let normalized = normalize_rules_json(Some(raw)).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&normalized).unwrap();
        assert_eq!(parsed["windows"][0]["from"], "08:00");
        assert!(parsed["windows"][0].get("to").is_none());
    }

    #[test]
    fn normalize_rules_json_sorts_windows_by_time() {
        let raw = json!({
            "type": "liquid",
            "windows": [
                { "from": "22:00", "min": 10, "max": 12 },
                { "from": "01:00", "min": 8, "max": 10 }
            ]
        });
        let normalized = normalize_rules_json(Some(raw)).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&normalized).unwrap();
        let windows = parsed["windows"].as_array().unwrap();
        assert_eq!(windows[0]["from"], "01:00");
        assert_eq!(windows[1]["from"], "22:00");
    }

    #[test]
    fn normalize_rules_json_rejects_legacy_array() {
        let raw = json!([{ "category": "liquids", "target_amount": 10.0 }]);
        assert_eq!(
            normalize_rules_json(Some(raw)),
            Err(RulesJsonError::LegacyArray)
        );
    }

    #[test]
    fn normalize_rules_json_defaults_when_missing() {
        assert_eq!(normalize_rules_json(None).unwrap(), default_rules_json());
    }
}
