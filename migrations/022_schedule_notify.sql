-- Per-schedule feeding reminder flag. When set, the feeding nudge worker
-- notifies all users if a window's start time has passed and today's intake
-- is still below the cumulative amount due at that time.
ALTER TABLE nutrition_schedules ADD COLUMN notify INTEGER NOT NULL DEFAULT 0;
