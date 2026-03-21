/**
 * Canary — Data Access Layer
 *
 * Wraps Supabase queries for all core entities.
 * Maps between snake_case DB columns and camelCase TypeScript types.
 *
 * Import pattern:
 *   import { dbInsertIncident, dbGetIncident } from '@/lib/db';
 */

import { createClient } from '@/lib/integrations/supabase/server';
import type {
  Incident,
  AgentLog,
  Runbook,
  RunbookStep,
  SocialSignal,
  CameraAlert,
} from '@/lib/schemas';

// ---------------------------------------------------------------------------
// Row ↔ Entity mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToIncident(row: any): Incident {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    type: row.type,
    severity: row.severity,
    status: row.status,
    location: {
      lat: row.location_lat ?? undefined,
      lng: row.location_lng ?? undefined,
      address: row.location_address ?? undefined,
      zipCode: row.location_zip_code ?? undefined,
      description: row.location_description ?? undefined,
    },
    sources: row.sources ?? [],
    aiAnalysis: row.ai_analysis ?? undefined,
    mediaUrls: row.media_urls ?? [],
    orchestratorSessionId: row.orchestrator_session_id ?? undefined,
    triageCompletedAt: row.triage_completed_at ?? undefined,
    recoveryStartedAt: row.recovery_started_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvalNotes: row.approval_notes ?? undefined,
    corroboratedBySignals: row.corroborated_by_signals ?? [],
    linkedCameraAlerts: row.linked_camera_alerts ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function incidentToRow(data: Partial<Incident>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.type !== undefined) row.type = data.type;
  if (data.severity !== undefined) row.severity = data.severity;
  if (data.status !== undefined) row.status = data.status;

  if (data.location) {
    if (data.location.lat !== undefined) row.location_lat = data.location.lat;
    if (data.location.lng !== undefined) row.location_lng = data.location.lng;
    if (data.location.address !== undefined) row.location_address = data.location.address;
    if (data.location.zipCode !== undefined) row.location_zip_code = data.location.zipCode;
    if (data.location.description !== undefined) row.location_description = data.location.description;
  }

  if (data.sources !== undefined) row.sources = data.sources;
  if (data.aiAnalysis !== undefined) row.ai_analysis = data.aiAnalysis;
  if (data.mediaUrls !== undefined) row.media_urls = data.mediaUrls;
  if (data.orchestratorSessionId !== undefined) row.orchestrator_session_id = data.orchestratorSessionId;
  if (data.triageCompletedAt !== undefined) row.triage_completed_at = data.triageCompletedAt;
  if (data.recoveryStartedAt !== undefined) row.recovery_started_at = data.recoveryStartedAt;
  if (data.resolvedAt !== undefined) row.resolved_at = data.resolvedAt;
  if (data.approvedBy !== undefined) row.approved_by = data.approvedBy;
  if (data.approvalNotes !== undefined) row.approval_notes = data.approvalNotes;
  if (data.corroboratedBySignals !== undefined) row.corroborated_by_signals = data.corroboratedBySignals;
  if (data.linkedCameraAlerts !== undefined) row.linked_camera_alerts = data.linkedCameraAlerts;

  return row;
}

function rowToRunbookStep(row: any): RunbookStep {
  return {
    id: row.id,
    runbookId: row.runbook_id,
    stepNumber: row.step_number,
    title: row.title,
    description: row.description,
    actionType: row.action_type,
    isReversible: row.is_reversible,
    requiresApproval: row.requires_approval,
    command: row.command ?? undefined,
    validationCriteria: row.validation_criteria ?? undefined,
    rollbackCommand: row.rollback_command ?? undefined,
    status: row.status,
    executedAt: row.executed_at ?? undefined,
    executedBy: row.executed_by ?? undefined,
    output: row.output ?? undefined,
    error: row.error ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
  };
}

function rowToRunbook(row: any, steps: any[]): Runbook {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    incidentType: row.incident_type,
    version: row.version,
    isActive: row.is_active,
    generatedFromIncidentId: row.generated_from_incident_id ?? undefined,
    steps: steps.map(rowToRunbookStep),
    complianceControls: row.compliance_controls ?? [],
    estimatedDurationMinutes: row.estimated_duration_minutes ?? undefined,
    lastValidatedAt: row.last_validated_at ?? undefined,
    generatedAt: row.generated_at,
    updatedAt: row.updated_at,
  };
}

function rowToSocialSignal(row: any): SocialSignal {
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    displayName: row.display_name ?? undefined,
    text: row.text,
    mediaUrls: row.media_urls ?? [],
    originalUrl: row.original_url ?? undefined,
    credibility: row.credibility,
    extractedLocation: row.extracted_location ?? undefined,
    extractedZipCode: row.extracted_zip_code ?? undefined,
    extractedDamageType: row.extracted_damage_type ?? undefined,
    extractedSeverity: row.extracted_severity ?? undefined,
    extractedKeywords: row.extracted_keywords ?? [],
    aiSummary: row.ai_summary ?? undefined,
    corroboratesIncidentId: row.corroborates_incident_id ?? undefined,
    dispatchedToSinkIds: row.dispatched_to_sink_ids ?? [],
    platformTimestamp: row.platform_timestamp,
    ingestedAt: row.ingested_at,
    processedAt: row.processed_at ?? undefined,
  };
}

function rowToCameraAlert(row: any): CameraAlert {
  return {
    id: row.id,
    cameraId: row.camera_id,
    cameraName: row.camera_name,
    location: row.location,
    detectedEvent: row.detected_event,
    eventCategory: row.event_category ?? undefined,
    confidence: Number(row.confidence),
    severity: row.severity,
    frameTimestamp: row.frame_timestamp,
    blobUrl: row.blob_url ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    incidentId: row.incident_id ?? undefined,
    acknowledged: row.acknowledged,
    acknowledgedBy: row.acknowledged_by ?? undefined,
    createdAt: row.created_at,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export async function dbInsertIncident(
  data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Incident> {
  const supabase = await createClient();
  const row = incidentToRow(data);

  const { data: inserted, error } = await supabase
    .from('incidents')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`dbInsertIncident failed: ${error.message}`);
  return rowToIncident(inserted);
}

export async function dbGetIncident(id: string): Promise<Incident | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`dbGetIncident failed: ${error.message}`);
  }
  return row ? rowToIncident(row) : null;
}

export async function dbUpdateIncident(
  id: string,
  data: Partial<Incident>,
): Promise<Incident | null> {
  const supabase = await createClient();
  const row = incidentToRow(data);

  const { data: updated, error } = await supabase
    .from('incidents')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`dbUpdateIncident failed: ${error.message}`);
  }
  return updated ? rowToIncident(updated) : null;
}

export async function dbListIncidents(filters?: {
  status?: string | string[];
  type?: string;
  minSeverity?: number;
  zipCode?: string;
  since?: string;
  limit?: number;
  offset?: number;
}): Promise<Incident[]> {
  const supabase = await createClient();
  let query = supabase.from('incidents').select('*');

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }
  if (filters?.type) query = query.eq('type', filters.type);
  if (filters?.minSeverity) query = query.gte('severity', filters.minSeverity);
  if (filters?.zipCode) query = query.eq('location_zip_code', filters.zipCode);
  if (filters?.since) query = query.gte('created_at', filters.since);

  query = query.order('created_at', { ascending: false });
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);

  const { data: rows, error } = await query;
  if (error) throw new Error(`dbListIncidents failed: ${error.message}`);
  return (rows ?? []).map(rowToIncident);
}

// ---------------------------------------------------------------------------
// Agent Logs
// ---------------------------------------------------------------------------

export async function dbInsertAgentLog(
  log: Omit<AgentLog, 'id'>,
): Promise<void> {
  const supabase = await createClient();

  const row = {
    agent_type: log.agentType,
    incident_id: log.incidentId ?? null,
    session_id: log.sessionId,
    step_index: log.stepIndex,
    decision_rationale: log.decisionRationale,
    confidence_score: log.confidenceScore ?? null,
    tool_calls_attempted: log.toolCallsAttempted ?? [],
    tool_calls_succeeded: log.toolCallsSucceeded ?? [],
    tool_calls_failed: log.toolCallsFailed ?? [],
    actions_escalated: log.actionsEscalated ?? [],
    escalation_reason: log.escalationReason ?? null,
    rollback_plan: log.rollbackPlan ?? null,
    raw_step_json: log.rawStepJson ?? null,
    duration_ms: log.durationMs ?? null,
    timestamp: log.timestamp,
  };

  const { error } = await supabase.from('agent_logs').insert(row);
  if (error) throw new Error(`dbInsertAgentLog failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Agent Logs — query helpers
// ---------------------------------------------------------------------------

export async function dbListAgentLogs(filters?: {
  limit?: number;
  since?: string;
}): Promise<Array<{
  id: string;
  agentType: string;
  incidentId: string | null;
  sessionId: string;
  stepIndex: number;
  decisionRationale: string;
  timestamp: string;
}>> {
  const supabase = await createClient();
  let query = supabase
    .from('agent_logs')
    .select('id, agent_type, incident_id, session_id, step_index, decision_rationale, timestamp')
    .order('timestamp', { ascending: false });

  if (filters?.since) query = query.gte('timestamp', filters.since);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data: rows, error } = await query;
  if (error) throw new Error(`dbListAgentLogs failed: ${error.message}`);

  return (rows ?? []).map((r) => ({
    id: r.id,
    agentType: r.agent_type,
    incidentId: r.incident_id ?? null,
    sessionId: r.session_id,
    stepIndex: r.step_index,
    decisionRationale: r.decision_rationale,
    timestamp: r.timestamp,
  }));
}

// ---------------------------------------------------------------------------
// Runbooks
// ---------------------------------------------------------------------------

export async function dbGetRunbook(filters: {
  incidentType?: string;
  id?: string;
}): Promise<Runbook | null> {
  const supabase = await createClient();

  let query = supabase.from('runbooks').select('*');

  if (filters.id) {
    query = query.eq('id', filters.id);
  } else if (filters.incidentType) {
    query = query
      .eq('incident_type', filters.incidentType)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1);
  } else {
    return null;
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(`dbGetRunbook failed: ${error.message}`);
  if (!rows || rows.length === 0) return null;

  const runbookRow = rows[0];

  // Fetch steps
  const { data: stepRows, error: stepError } = await supabase
    .from('runbook_steps')
    .select('*')
    .eq('runbook_id', runbookRow.id)
    .order('step_number', { ascending: true });

  if (stepError) throw new Error(`dbGetRunbook (steps) failed: ${stepError.message}`);

  return rowToRunbook(runbookRow, stepRows ?? []);
}

// ---------------------------------------------------------------------------
// Social Signals
// ---------------------------------------------------------------------------

export async function dbInsertSocialSignal(
  signal: Omit<SocialSignal, 'ingestedAt'>,
): Promise<SocialSignal> {
  const supabase = await createClient();

  const row = {
    id: signal.id,
    platform: signal.platform,
    handle: signal.handle,
    display_name: signal.displayName ?? null,
    text: signal.text,
    media_urls: signal.mediaUrls ?? [],
    original_url: signal.originalUrl ?? null,
    credibility: signal.credibility,
    extracted_location: signal.extractedLocation ?? null,
    extracted_zip_code: signal.extractedZipCode ?? null,
    extracted_damage_type: signal.extractedDamageType ?? null,
    extracted_severity: signal.extractedSeverity ?? null,
    extracted_keywords: signal.extractedKeywords ?? [],
    ai_summary: signal.aiSummary ?? null,
    corroborates_incident_id: signal.corroboratesIncidentId ?? null,
    dispatched_to_sink_ids: signal.dispatchedToSinkIds ?? [],
    platform_timestamp: signal.platformTimestamp,
    processed_at: signal.processedAt ?? null,
  };

  const { data: inserted, error } = await supabase
    .from('social_signals')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`dbInsertSocialSignal failed: ${error.message}`);
  return rowToSocialSignal(inserted);
}

export async function dbListSocialSignals(filters?: {
  limit?: number;
  since?: string;
}): Promise<SocialSignal[]> {
  const supabase = await createClient();
  let query = supabase
    .from('social_signals')
    .select('*')
    .order('ingested_at', { ascending: false });

  if (filters?.since) query = query.gte('ingested_at', filters.since);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data: rows, error } = await query;
  if (error) throw new Error(`dbListSocialSignals failed: ${error.message}`);
  return (rows ?? []).map(rowToSocialSignal);
}

// ---------------------------------------------------------------------------
// Camera Alerts
// ---------------------------------------------------------------------------

export async function dbInsertCameraAlert(
  alert: Omit<CameraAlert, 'id' | 'createdAt'>,
): Promise<CameraAlert> {
  const supabase = await createClient();

  const row = {
    camera_id: alert.cameraId,
    camera_name: alert.cameraName,
    location: alert.location,
    detected_event: alert.detectedEvent,
    event_category: alert.eventCategory ?? null,
    confidence: alert.confidence,
    severity: alert.severity,
    frame_timestamp: alert.frameTimestamp,
    blob_url: alert.blobUrl ?? null,
    ai_analysis: alert.aiAnalysis ?? null,
    incident_id: alert.incidentId ?? null,
    acknowledged: alert.acknowledged ?? false,
    acknowledged_by: alert.acknowledgedBy ?? null,
  };

  const { data: inserted, error } = await supabase
    .from('camera_alerts')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`dbInsertCameraAlert failed: ${error.message}`);
  return rowToCameraAlert(inserted);
}

export async function dbListCameraAlerts(filters?: {
  limit?: number;
  since?: string;
}): Promise<CameraAlert[]> {
  const supabase = await createClient();
  let query = supabase
    .from('camera_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.since) query = query.gte('created_at', filters.since);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data: rows, error } = await query;
  if (error) throw new Error(`dbListCameraAlerts failed: ${error.message}`);
  return (rows ?? []).map(rowToCameraAlert);
}
