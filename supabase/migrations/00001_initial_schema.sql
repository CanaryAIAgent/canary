-- ============================================================================
-- Canary — Initial Database Schema
-- AI-native disaster intelligence and emergency response platform
--
-- Migration: 00001_initial_schema
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE incident_type AS ENUM (
  'flood', 'fire', 'structural', 'medical', 'hazmat',
  'earthquake', 'infrastructure', 'cyber', 'other'
);

CREATE TYPE incident_status AS ENUM (
  'new', 'triaging', 'responding', 'resolved', 'closed', 'escalated'
);

CREATE TYPE incident_source AS ENUM (
  'field', 'social', 'camera', 'integration', 'xbot'
);

CREATE TYPE social_platform AS ENUM (
  'x', 'reddit', 'instagram', 'nextdoor', 'bluesky'
);

CREATE TYPE credibility_level AS ENUM (
  'high', 'medium', 'unverified', 'disputed'
);

CREATE TYPE camera_feed_type AS ENUM (
  'rtsp', 'hls', 'webcam_url', 'mp4_file', 'api'
);

CREATE TYPE sink_type AS ENUM (
  'webhook', 'email', 'api_pull'
);

CREATE TYPE sink_status AS ENUM (
  'active', 'paused', 'error'
);

CREATE TYPE subscriber_channel AS ENUM (
  'email', 'sms', 'push'
);

CREATE TYPE agent_type AS ENUM (
  'orchestrator', 'triage', 'recovery', 'compliance', 'runbook'
);

CREATE TYPE action_type AS ENUM (
  'automated', 'human_required', 'validation', 'notification', 'rollback'
);

CREATE TYPE runbook_step_status AS ENUM (
  'pending', 'running', 'completed', 'failed', 'skipped', 'awaiting_approval'
);

CREATE TYPE compliance_framework AS ENUM (
  'DORA', 'SOC2', 'ISO22301', 'HIPAA'
);

CREATE TYPE compliance_status AS ENUM (
  'compliant', 'partial', 'non_compliant', 'not_applicable', 'unknown'
);

CREATE TYPE compliance_posture AS ENUM (
  'strong', 'adequate', 'at_risk', 'critical'
);

CREATE TYPE integration_source AS ENUM (
  'pagerduty', 'datadog', 'cloudwatch', 'prometheus', 'custom'
);

CREATE TYPE integration_severity AS ENUM (
  'critical', 'high', 'medium', 'low', 'info'
);


-- ---------------------------------------------------------------------------
-- Utility: updated_at trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- CORE: Incidents
-- ============================================================================

CREATE TABLE incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description     TEXT,
  type            incident_type NOT NULL,
  severity        INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  status          incident_status NOT NULL DEFAULT 'new',
  -- Location (flattened from LocationSchema)
  location_lat         DOUBLE PRECISION,
  location_lng         DOUBLE PRECISION,
  location_address     TEXT,
  location_zip_code    TEXT CHECK (location_zip_code ~ '^\d{5}(-\d{4})?$'),
  location_description TEXT,
  -- Sources
  sources              incident_source[] NOT NULL DEFAULT '{}',
  -- AI analysis stored as JSONB
  ai_analysis          JSONB,
  -- Media
  media_urls           TEXT[] NOT NULL DEFAULT '{}',
  -- Agent execution tracking
  orchestrator_session_id TEXT,
  triage_completed_at     TIMESTAMPTZ,
  recovery_started_at     TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  -- Human approvals
  approved_by       TEXT,
  approval_notes    TEXT,
  -- Relationships (stored as arrays of UUIDs)
  corroborated_by_signals TEXT[] NOT NULL DEFAULT '{}',
  linked_camera_alerts    UUID[] NOT NULL DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_incidents_status     ON incidents (status);
CREATE INDEX idx_incidents_severity   ON incidents (severity);
CREATE INDEX idx_incidents_type       ON incidents (type);
CREATE INDEX idx_incidents_created_at ON incidents (created_at);
CREATE INDEX idx_incidents_zip_code   ON incidents (location_zip_code);
CREATE INDEX idx_incidents_ai_analysis ON incidents USING GIN (ai_analysis);


-- ============================================================================
-- SOCIAL INTELLIGENCE: Social Signals
-- ============================================================================

CREATE TABLE social_signals (
  id                     TEXT PRIMARY KEY,  -- platform-native ID
  platform               social_platform NOT NULL,
  handle                 TEXT NOT NULL,
  display_name           TEXT,
  text                   TEXT NOT NULL,
  media_urls             TEXT[] NOT NULL DEFAULT '{}',
  original_url           TEXT,
  -- AI-extracted fields
  credibility            credibility_level NOT NULL,
  extracted_location     TEXT,
  extracted_zip_code     TEXT,
  extracted_damage_type  TEXT,
  extracted_severity     INTEGER CHECK (extracted_severity IS NULL OR extracted_severity BETWEEN 1 AND 5),
  extracted_keywords     TEXT[] NOT NULL DEFAULT '{}',
  ai_summary             TEXT,
  -- Relationships
  corroborates_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  dispatched_to_sink_ids   UUID[] NOT NULL DEFAULT '{}',
  -- Timestamps
  platform_timestamp     TIMESTAMPTZ NOT NULL,
  ingested_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at           TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_social_signals_platform   ON social_signals (platform);
CREATE INDEX idx_social_signals_credibility ON social_signals (credibility);
CREATE INDEX idx_social_signals_incident   ON social_signals (corroborates_incident_id);
CREATE INDEX idx_social_signals_ingested   ON social_signals (ingested_at);
CREATE INDEX idx_social_signals_zip        ON social_signals (extracted_zip_code);


-- ============================================================================
-- VIDEO INTELLIGENCE: Camera Feeds & Alerts
-- ============================================================================

CREATE TABLE camera_feeds (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  location                  TEXT NOT NULL,
  -- Optional structured coords
  coords_lat                DOUBLE PRECISION,
  coords_lng                DOUBLE PRECISION,
  coords_address            TEXT,
  coords_zip_code           TEXT CHECK (coords_zip_code IS NULL OR coords_zip_code ~ '^\d{5}(-\d{4})?$'),
  coords_description        TEXT,
  -- Feed config
  feed_type                 camera_feed_type NOT NULL,
  feed_url                  TEXT NOT NULL,
  keyframe_interval_seconds INTEGER NOT NULL DEFAULT 5 CHECK (keyframe_interval_seconds > 0),
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  last_analyzed_at          TIMESTAMPTZ,
  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camera_feeds_active ON camera_feeds (is_active);


CREATE TABLE camera_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id       UUID NOT NULL REFERENCES camera_feeds(id) ON DELETE CASCADE,
  camera_name     TEXT NOT NULL,
  location        TEXT NOT NULL,
  detected_event  TEXT NOT NULL,
  event_category  incident_type,
  confidence      NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  severity        INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  frame_timestamp TIMESTAMPTZ NOT NULL,
  blob_url        TEXT,
  ai_analysis     TEXT,
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  acknowledged    BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camera_alerts_camera    ON camera_alerts (camera_id);
CREATE INDEX idx_camera_alerts_incident  ON camera_alerts (incident_id);
CREATE INDEX idx_camera_alerts_severity  ON camera_alerts (severity);
CREATE INDEX idx_camera_alerts_created   ON camera_alerts (created_at);
CREATE INDEX idx_camera_alerts_ack       ON camera_alerts (acknowledged);


-- ============================================================================
-- DISTRIBUTION: Sinks
-- ============================================================================

CREATE TABLE sinks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  description           TEXT,
  type                  sink_type NOT NULL,
  endpoint              TEXT NOT NULL,
  secret                TEXT,
  filters               JSONB NOT NULL DEFAULT '{}',
  status                sink_status NOT NULL DEFAULT 'active',
  last_delivered_at     TIMESTAMPTZ,
  last_http_status      INTEGER,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  total_deliveries      INTEGER NOT NULL DEFAULT 0 CHECK (total_deliveries >= 0),
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER sinks_updated_at
  BEFORE UPDATE ON sinks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_sinks_status ON sinks (status);
CREATE INDEX idx_sinks_type   ON sinks (type);
CREATE INDEX idx_sinks_filters ON sinks USING GIN (filters);


-- ============================================================================
-- SUBSCRIBERS: Zip code alert subscriptions
-- ============================================================================

CREATE TABLE subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT,
  phone             TEXT,
  push_token        TEXT,
  zip_codes         TEXT[] NOT NULL CHECK (array_length(zip_codes, 1) >= 1),
  channels          subscriber_channel[] NOT NULL CHECK (array_length(channels, 1) >= 1),
  min_severity      INTEGER NOT NULL DEFAULT 3 CHECK (min_severity BETWEEN 1 AND 5),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  unsubscribe_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  confirmed_at      TIMESTAMPTZ,
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_subscribers_zip_codes ON subscribers USING GIN (zip_codes);
CREATE INDEX idx_subscribers_active    ON subscribers (is_active);
CREATE UNIQUE INDEX idx_subscribers_unsub_token ON subscribers (unsubscribe_token);


-- ============================================================================
-- AI AGENTS: Agent Logs (append-only audit trail)
-- ============================================================================

CREATE TABLE agent_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type            agent_type NOT NULL,
  incident_id           UUID REFERENCES incidents(id) ON DELETE SET NULL,
  session_id            TEXT NOT NULL,
  step_index            INTEGER NOT NULL CHECK (step_index >= 0),
  -- Decision details
  decision_rationale    TEXT NOT NULL,
  confidence_score      NUMERIC(4,3) CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
  -- Tool calls
  tool_calls_attempted  TEXT[] NOT NULL DEFAULT '{}',
  tool_calls_succeeded  TEXT[] NOT NULL DEFAULT '{}',
  tool_calls_failed     TEXT[] NOT NULL DEFAULT '{}',
  -- Escalation
  actions_escalated     TEXT[] NOT NULL DEFAULT '{}',
  escalation_reason     TEXT,
  -- Recovery
  rollback_plan         TEXT,
  -- Debug
  raw_step_json         TEXT,
  -- Timing
  duration_ms           INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agent_logs_agent_type  ON agent_logs (agent_type);
CREATE INDEX idx_agent_logs_incident    ON agent_logs (incident_id);
CREATE INDEX idx_agent_logs_session     ON agent_logs (session_id);
CREATE INDEX idx_agent_logs_timestamp   ON agent_logs (timestamp);


-- ============================================================================
-- RUNBOOKS: Recovery playbooks with compliance controls
-- ============================================================================

CREATE TABLE runbooks (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  incident_type               incident_type NOT NULL,
  version                     INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active                   BOOLEAN NOT NULL DEFAULT true,
  generated_from_incident_id  UUID REFERENCES incidents(id) ON DELETE SET NULL,
  -- Compliance
  compliance_controls         TEXT[] NOT NULL DEFAULT '{}',
  estimated_duration_minutes  INTEGER CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  last_validated_at           TIMESTAMPTZ,
  -- Timestamps
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER runbooks_updated_at
  BEFORE UPDATE ON runbooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_runbooks_incident_type ON runbooks (incident_type);
CREATE INDEX idx_runbooks_active        ON runbooks (is_active);


CREATE TABLE runbook_steps (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_id          UUID NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE,
  step_number         INTEGER NOT NULL CHECK (step_number >= 1),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  action_type         action_type NOT NULL,
  is_reversible       BOOLEAN NOT NULL DEFAULT true,
  requires_approval   BOOLEAN NOT NULL DEFAULT false,
  command             TEXT,
  validation_criteria TEXT,
  rollback_command    TEXT,
  status              runbook_step_status NOT NULL DEFAULT 'pending',
  executed_at         TIMESTAMPTZ,
  executed_by         TEXT,
  output              TEXT,
  error               TEXT,
  approved_by         TEXT,
  approved_at         TIMESTAMPTZ
);

CREATE INDEX idx_runbook_steps_runbook ON runbook_steps (runbook_id);
CREATE INDEX idx_runbook_steps_status  ON runbook_steps (status);
CREATE UNIQUE INDEX idx_runbook_steps_order ON runbook_steps (runbook_id, step_number);


-- ============================================================================
-- COMPLIANCE: Reports & Controls
-- ============================================================================

CREATE TABLE compliance_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id       UUID REFERENCES incidents(id) ON DELETE SET NULL,
  frameworks        compliance_framework[] NOT NULL,
  overall_posture   compliance_posture NOT NULL,
  executive_summary TEXT NOT NULL,
  agent_session_id  TEXT,
  -- Timestamps
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_reports_incident ON compliance_reports (incident_id);
CREATE INDEX idx_compliance_reports_posture  ON compliance_reports (overall_posture);


CREATE TABLE compliance_controls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES compliance_reports(id) ON DELETE CASCADE,
  framework         compliance_framework NOT NULL,
  control_id        TEXT NOT NULL,
  control_name      TEXT NOT NULL,
  status            compliance_status NOT NULL,
  evidence          TEXT,
  gap_description   TEXT,
  remediation_steps TEXT[] NOT NULL DEFAULT '{}',
  last_assessed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compliance_controls_report    ON compliance_controls (report_id);
CREATE INDEX idx_compliance_controls_framework ON compliance_controls (framework);
CREATE INDEX idx_compliance_controls_status    ON compliance_controls (status);


-- ============================================================================
-- INTEGRATIONS: X Mentions & Inbound Webhooks
-- ============================================================================

CREATE TABLE xbot_mentions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id        TEXT NOT NULL UNIQUE,
  author_id       TEXT NOT NULL,
  author_handle   TEXT NOT NULL,
  tweet_text      TEXT NOT NULL,
  media_urls      TEXT[] DEFAULT '{}',
  has_media       BOOLEAN DEFAULT FALSE,
  has_location    BOOLEAN DEFAULT FALSE,
  confidence      TEXT CHECK (confidence IN ('confirmed', 'potential')),
  ai_response     TEXT,
  incident_id     UUID,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xbot_mentions_processed_at ON xbot_mentions (processed_at DESC);
CREATE INDEX idx_xbot_mentions_confidence   ON xbot_mentions (confidence);
CREATE INDEX idx_xbot_mentions_tweet_id     ON xbot_mentions (tweet_id);


CREATE TABLE integration_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        integration_source NOT NULL,
  event_type    TEXT NOT NULL,
  severity      integration_severity,
  title         TEXT NOT NULL,
  description   TEXT,
  resource_id   TEXT,
  raw_payload   JSONB NOT NULL DEFAULT '{}',
  -- Timestamps
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_webhooks_source   ON integration_webhooks (source);
CREATE INDEX idx_integration_webhooks_severity ON integration_webhooks (severity);
CREATE INDEX idx_integration_webhooks_received ON integration_webhooks (received_at);
CREATE INDEX idx_integration_webhooks_payload  ON integration_webhooks USING GIN (raw_payload);


-- ============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables with permissive service_role policies.
-- Application-level policies will be added as auth is implemented.
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'incidents', 'social_signals', 'camera_feeds', 'camera_alerts',
      'sinks', 'subscribers', 'agent_logs', 'runbooks', 'runbook_steps',
      'compliance_reports', 'compliance_controls', 'xbot_mentions',
      'integration_webhooks'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t
    );
    -- Allow anon/authenticated read for now (permissive MVP)
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END;
$$;


-- ============================================================================
-- Done
-- ============================================================================
