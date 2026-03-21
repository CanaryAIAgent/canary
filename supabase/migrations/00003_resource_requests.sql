-- Resource request status lifecycle
CREATE TYPE resource_request_status AS ENUM (
  'pending', 'approved', 'denied', 'dispatched', 'fulfilled', 'cancelled'
);

CREATE TABLE resource_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  -- What is being requested
  resource_type   TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  priority        TEXT NOT NULL CHECK (priority IN ('immediate', 'urgent', 'standard')),
  description     TEXT,
  -- Status
  status          resource_request_status NOT NULL DEFAULT 'pending',
  -- Who requested / approved
  requested_by    TEXT NOT NULL DEFAULT 'AI Agent',
  approved_by     TEXT,
  denied_reason   TEXT,
  -- Timestamps
  approved_at     TIMESTAMPTZ,
  dispatched_at   TIMESTAMPTZ,
  fulfilled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER resource_requests_updated_at
  BEFORE UPDATE ON resource_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_resource_requests_status ON resource_requests (status);
CREATE INDEX idx_resource_requests_incident ON resource_requests (incident_id);
CREATE INDEX idx_resource_requests_priority ON resource_requests (priority);
CREATE INDEX idx_resource_requests_created ON resource_requests (created_at);

-- RLS
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON resource_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full_access" ON resource_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
