use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const WET_FOOD_FLUID_RATIO: f64 = 0.77;

#[derive(Debug, Clone, Serialize)]
pub struct NutritionStatus {
    pub pet_id: Uuid,
    pub local_date: String,
    pub as_of: String,
    /// `true` when direct liquid intake meets or exceeds schedule expectation; `false` when behind; `null` when no liquid schedule.
    pub on_track: Option<bool>,
    pub intake: NutritionStatusIntake,
    pub schedule: Option<NutritionStatusSchedule>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NutritionStatusIntake {
    pub liquids_ml: f64,
    pub water_ml: f64,
    pub direct_liquid_ml: f64,
    pub wet_food_g: f64,
    pub wet_food_fluid_ml: f64,
    pub dry_food_g: f64,
    pub total_known_fluid_ml: f64,
}

impl NutritionStatusIntake {
    /// Intake compared against a schedule's due amount.
    ///
    /// Liquid reminders use `total_known_fluid_ml` (direct liquids + wet-food
    /// moisture), matching the cumulative fluid chart's **total** series. Food
    /// reminders stay in grams.
    pub fn amount_for(&self, kind: ScheduleKind) -> f64 {
        match kind {
            ScheduleKind::Liquid => self.total_known_fluid_ml,
            ScheduleKind::Food => self.wet_food_g + self.dry_food_g,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct NutritionStatusSchedule {
    pub schedule_id: String,
    pub schedule_name: String,
    pub expected_ml: f64,
    pub daily_min_ml: f64,
    pub daily_max_ml: f64,
    pub delta_ml: f64,
}

#[derive(Debug, Clone, Deserialize)]
struct ParsedScheduleRules {
    #[serde(rename = "type")]
    schedule_type: Option<String>,
    windows: Option<Vec<ScheduleWindow>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ScheduleWindow {
    pub from: String,
    pub to: String,
    pub min: f64,
    pub max: f64,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScheduleKind {
    Liquid,
    Food,
}

impl ScheduleKind {
    pub fn noun(self) -> &'static str {
        match self {
            ScheduleKind::Liquid => "liquid",
            ScheduleKind::Food => "food",
        }
    }
}

pub fn parse_schedule_kind(rules_json: &str) -> ScheduleKind {
    let Ok(parsed) = serde_json::from_str::<ParsedScheduleRules>(rules_json) else {
        return ScheduleKind::Liquid;
    };
    if parsed.schedule_type.as_deref() == Some("food") {
        ScheduleKind::Food
    } else {
        ScheduleKind::Liquid
    }
}

pub fn parse_schedule_windows(rules_json: &str) -> Vec<ScheduleWindow> {
    let Ok(parsed) = serde_json::from_str::<ParsedScheduleRules>(rules_json) else {
        return Vec::new();
    };
    parsed.windows.unwrap_or_default()
}

pub fn parse_liquid_schedule_windows(rules_json: &str) -> Vec<ScheduleWindow> {
    if parse_schedule_kind(rules_json) != ScheduleKind::Liquid {
        return Vec::new();
    }
    parse_schedule_windows(rules_json)
}

/// Cumulative amount due once each window's `from` time has been reached.
/// Feeding reminders use [`schedule_projection_at`] (midpoint stepping, same
/// as the chart) rather than this window-start total.
pub fn schedule_due_at(windows: &[ScheduleWindow], at_minutes: i32) -> f64 {
    let mut due = 0.0;
    for window in windows {
        if window.max <= 0.0 {
            continue;
        }
        let Some(from_m) = parse_hhmm(&window.from) else {
            continue;
        };
        if at_minutes >= from_m {
            due += window.max;
        }
    }
    due
}

/// Windows whose start time has been reached and that contribute an amount.
pub fn reached_feeding_windows(
    windows: &[ScheduleWindow],
    at_minutes: i32,
) -> Vec<&ScheduleWindow> {
    windows
        .iter()
        .filter(|window| {
            window.max > 0.0 && parse_hhmm(&window.from).is_some_and(|from_m| at_minutes >= from_m)
        })
        .collect()
}

/// Feeding reminders and window times align to this step so the worker
/// (every 10 minutes) can match a window start without waiting a full hour.
pub const FEEDING_TIME_STEP_MINUTES: i32 = 10;

/// Floor an `HH:MM` time down to a `step_minutes` boundary.
/// `23:55` with a 10-minute step becomes `23:50` — never wraps to the next day.
pub fn floor_hhmm_to_step(time: &str, step_minutes: i32) -> Option<String> {
    if step_minutes <= 0 {
        return None;
    }
    let mins = parse_hhmm(time)?;
    let floored = (mins / step_minutes) * step_minutes;
    Some(format!("{:02}:{:02}", floored / 60, floored % 60))
}

pub fn parse_hhmm(time: &str) -> Option<i32> {
    let (hours, minutes) = time.split_once(':')?;
    let hours: i32 = hours.parse().ok()?;
    let minutes: i32 = minutes.parse().ok()?;
    if !(0..=23).contains(&hours) || !(0..=59).contains(&minutes) {
        return None;
    }
    Some(hours * 60 + minutes)
}

pub fn window_midpoint_minutes(from: &str, to: &str) -> Option<i32> {
    let from_m = parse_hhmm(from)?;
    let to_m = parse_hhmm(to)?;
    Some(((from_m + to_m) as f64 / 2.0).round() as i32)
}

/// Cumulative schedule expectation at a time-of-day, matching the frontend
/// `buildScheduleCurve` midpoint stepping logic.
pub fn schedule_projection_at(windows: &[ScheduleWindow], at_minutes: i32) -> (f64, f64, f64) {
    let daily_min_ml: f64 = windows.iter().map(|w| w.min).sum();
    let daily_max_ml: f64 = windows.iter().map(|w| w.max).sum();

    let mut active: Vec<&ScheduleWindow> = windows.iter().filter(|w| w.max > 0.0).collect();
    active.sort_by(|left, right| left.from.cmp(&right.from));

    let mut expected_ml = 0.0;
    for window in active {
        let Some(midpoint) = window_midpoint_minutes(&window.from, &window.to) else {
            continue;
        };
        if at_minutes >= midpoint {
            expected_ml += window.max;
        }
    }

    (expected_ml, daily_min_ml, daily_max_ml)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schedule_projection_steps_at_window_midpoints() {
        let windows = vec![
            ScheduleWindow {
                from: "08:00".to_string(),
                to: "10:00".to_string(),
                min: 10.0,
                max: 100.0,
                note: None,
            },
            ScheduleWindow {
                from: "12:00".to_string(),
                to: "14:00".to_string(),
                min: 20.0,
                max: 50.0,
                note: None,
            },
        ];

        assert_eq!(
            schedule_projection_at(&windows, 8 * 60 + 59),
            (0.0, 30.0, 150.0)
        );
        assert_eq!(
            schedule_projection_at(&windows, 9 * 60),
            (100.0, 30.0, 150.0)
        );
        assert_eq!(
            schedule_projection_at(&windows, 12 * 60 + 59),
            (100.0, 30.0, 150.0)
        );
        assert_eq!(
            schedule_projection_at(&windows, 13 * 60),
            (150.0, 30.0, 150.0)
        );
    }

    #[test]
    fn parse_liquid_schedule_windows_ignores_food_schedules() {
        let rules = r#"{"type":"food","windows":[{"from":"08:00","to":"09:00","min":1,"max":2}]}"#;
        assert!(parse_liquid_schedule_windows(rules).is_empty());
    }

    #[test]
    fn liquid_amount_for_matches_chart_total() {
        let intake = NutritionStatusIntake {
            liquids_ml: 100.0,
            water_ml: 20.0,
            direct_liquid_ml: 120.0,
            wet_food_g: 100.0,
            wet_food_fluid_ml: 77.0,
            dry_food_g: 10.0,
            total_known_fluid_ml: 197.0,
        };
        assert_eq!(intake.amount_for(ScheduleKind::Liquid), 197.0);
        assert_eq!(intake.amount_for(ScheduleKind::Food), 110.0);
        assert!(
            intake.amount_for(ScheduleKind::Liquid) > 190.0,
            "wet-food moisture must keep a 197 ml total ahead of a 190 ml due"
        );
        assert!(intake.direct_liquid_ml < 190.0);
    }

    #[test]
    fn schedule_due_at_steps_at_window_from() {
        let windows = vec![
            ScheduleWindow {
                from: "08:00".to_string(),
                to: "09:00".to_string(),
                min: 10.0,
                max: 50.0,
                note: None,
            },
            ScheduleWindow {
                from: "12:00".to_string(),
                to: "13:00".to_string(),
                min: 10.0,
                max: 40.0,
                note: None,
            },
        ];

        assert_eq!(schedule_due_at(&windows, 7 * 60 + 59), 0.0);
        assert_eq!(schedule_due_at(&windows, 8 * 60), 50.0);
        assert_eq!(schedule_due_at(&windows, 11 * 60 + 59), 50.0);
        assert_eq!(schedule_due_at(&windows, 12 * 60), 90.0);
        assert_eq!(reached_feeding_windows(&windows, 8 * 60).len(), 1);
        assert_eq!(reached_feeding_windows(&windows, 12 * 60).len(), 2);
    }

    #[test]
    fn floor_hhmm_to_step_ten() {
        assert_eq!(floor_hhmm_to_step("08:04", 10).as_deref(), Some("08:00"));
        assert_eq!(floor_hhmm_to_step("08:05", 10).as_deref(), Some("08:00"));
        assert_eq!(floor_hhmm_to_step("08:00", 10).as_deref(), Some("08:00"));
        assert_eq!(floor_hhmm_to_step("08:09", 10).as_deref(), Some("08:00"));
        assert_eq!(floor_hhmm_to_step("23:55", 10).as_deref(), Some("23:50"));
        assert_eq!(floor_hhmm_to_step("23:54", 10).as_deref(), Some("23:50"));
    }
}
