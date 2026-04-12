-- ============================================================
-- Supabase SQL Schema — NPA Digital Twin Dashboard
-- Source: datadirectory.md
-- Run this in Supabase SQL Editor before data ingestion.
-- ============================================================

-- ────────────────────────────────────────────────
-- 1. ASSETS TABLE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  asset_id     TEXT PRIMARY KEY,
  tag          TEXT,
  name         TEXT,
  type         TEXT,
  subtype      TEXT,
  parent_id    TEXT,
  area         TEXT,
  location     TEXT,
  manufacturer TEXT,
  model        TEXT,
  install_date DATE,
  status       TEXT,
  criticality  TEXT
);

-- ────────────────────────────────────────────────
-- 2. SENSOR METADATA TABLE
--    Defines the "Safe Operating Envelope"
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_metadata (
  sensor_id   TEXT PRIMARY KEY,
  asset_id    TEXT REFERENCES assets(asset_id),
  tag         TEXT,
  name        TEXT,
  sensor_type TEXT,
  unit        TEXT,
  normal_min  NUMERIC,
  normal_max  NUMERIC,
  alarm_low   NUMERIC,
  alarm_high  NUMERIC,
  trip_low    NUMERIC,
  trip_high   NUMERIC,
  area        TEXT,
  location    TEXT
);

-- ────────────────────────────────────────────────
-- 3. TIMESERIES TABLE — 3.07M Rows
--    Indexed for fast sensor + time queries
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeseries (
  id           BIGSERIAL PRIMARY KEY,
  timestamp    TIMESTAMPTZ NOT NULL,
  sensor_id    TEXT NOT NULL REFERENCES sensor_metadata(sensor_id),
  asset_id     TEXT NOT NULL,
  sensor_type  TEXT,
  value        NUMERIC NOT NULL,
  unit         TEXT,
  quality_flag TEXT DEFAULT 'GOOD'
);

-- Composite index for primary query patterns
CREATE INDEX IF NOT EXISTS idx_timeseries_sensor_time 
  ON timeseries (sensor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_timeseries_asset_time 
  ON timeseries (asset_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_timeseries_timestamp 
  ON timeseries (timestamp DESC);

-- ────────────────────────────────────────────────
-- 4. MAINTENANCE HISTORY TABLE
--    "Agent Memory" for Track 3 (Stateful AI)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_history (
  work_order_id       TEXT PRIMARY KEY,
  failure_event_id    TEXT,
  asset_id            TEXT,
  tag                 TEXT,
  area                TEXT,
  work_order_type     TEXT,
  priority            TEXT,
  status              TEXT,
  raised_date         TIMESTAMPTZ,
  scheduled_date      TIMESTAMPTZ,
  completed_date      TIMESTAMPTZ,
  reported_by         TEXT,
  assigned_to         TEXT,
  supervisor          TEXT,
  work_description    TEXT,
  findings            TEXT,
  actions_taken       TEXT,
  parts_replaced      TEXT,
  labor_hours         NUMERIC,
  downtime_hours      NUMERIC,
  production_loss_bbl NUMERIC,
  scenario_id         TEXT
);

CREATE INDEX IF NOT EXISTS idx_maint_asset 
  ON maintenance_history (asset_id);

CREATE INDEX IF NOT EXISTS idx_maint_status 
  ON maintenance_history (status);

-- ────────────────────────────────────────────────
-- 5. FAILURE EVENTS TABLE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failure_events (
  failure_event_id    TEXT PRIMARY KEY,
  scenario_id         TEXT,
  asset_id            TEXT,
  tag                 TEXT,
  area                TEXT,
  event_timestamp     TIMESTAMPTZ,
  detected_by         TEXT,
  severity            TEXT,
  safety_impact       TEXT,
  failure_mode        TEXT,
  root_cause          TEXT,
  failure_mechanism   TEXT,
  immediate_action    TEXT,
  corrective_action   TEXT,
  production_loss_bbl NUMERIC,
  downtime_hours      NUMERIC
);

-- ────────────────────────────────────────────────
-- 6. DOCUMENTS TABLE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  document_id   TEXT PRIMARY KEY,
  asset_id      TEXT,
  document_type TEXT,
  title         TEXT,
  file_path     TEXT,
  revision      TEXT,
  effective_date DATE
);

-- ────────────────────────────────────────────────
-- 7. HELPER VIEW — Latest Sensor Readings
--    Used by the dashboard KPI cards
--    SECURITY INVOKER: runs as the querying user,
--    so RLS on the underlying tables is respected.
-- ────────────────────────────────────────────────
CREATE OR REPLACE VIEW latest_sensor_readings
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (t.sensor_id)
  t.sensor_id,
  t.asset_id,
  t.timestamp,
  t.value,
  t.unit,
  t.quality_flag,
  t.sensor_type,
  sm.name,
  sm.normal_min,
  sm.normal_max,
  sm.alarm_low,
  sm.alarm_high,
  sm.trip_low,
  sm.trip_high,
  CASE
    WHEN t.quality_flag = 'BAD' THEN 'OFFLINE'
    WHEN t.value >= sm.trip_high OR t.value <= sm.trip_low THEN 'TRIP'
    WHEN t.value >= sm.alarm_high OR t.value <= sm.alarm_low THEN 'ALARM'
    ELSE 'GOOD'
  END AS status
FROM timeseries t
JOIN sensor_metadata sm ON t.sensor_id = sm.sensor_id
ORDER BY t.sensor_id, t.timestamp DESC;

-- ────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS) — All public tables
-- ────────────────────────────────────────────────
ALTER TABLE assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_metadata    ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeseries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;

-- Read-only policies for the anon/public role
CREATE POLICY "Allow anon read on assets"
  ON assets             FOR SELECT USING (true);

CREATE POLICY "Allow anon read on sensor_metadata"
  ON sensor_metadata    FOR SELECT USING (true);

CREATE POLICY "Allow anon read on timeseries"
  ON timeseries         FOR SELECT USING (true);

CREATE POLICY "Allow anon read on maintenance_history"
  ON maintenance_history FOR SELECT USING (true);

CREATE POLICY "Allow anon read on failure_events"
  ON failure_events     FOR SELECT USING (true);

CREATE POLICY "Allow anon read on documents"
  ON documents          FOR SELECT USING (true);
