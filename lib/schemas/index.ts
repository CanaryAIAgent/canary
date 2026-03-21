/**
 * Canary — Complete Zod Data Model
 *
 * All entities used across the backend: API routes, agent pipelines,
 * database persistence, and streaming responses.
 *
 * Import pattern:
 *   import { IncidentSchema, type Incident } from '@/lib/schemas';
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared / primitive schemas
// ---------------------------------------------------------------------------

export const SeverityLevelSchema = z.number().int().min(1).max(5);
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export const CredibilitySchema = z.enum(['high', 'medium', 'unverified', 'disputed']);
export type Credibility = z.infer<typeof CredibilitySchema>;

export const LocationSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).optional(),
  description: z.string().optional(), // e.g. "Oak Street near Highway 9"
});
export type Location = z.infer<typeof LocationSchema>;

// ---------------------------------------------------------------------------
// AI Analysis Result — embedded in Incident and returned from analysis routes
// ---------------------------------------------------------------------------

export const ResourceRecommendationSchema = z.object({
  type: z.string().describe('Resource type, e.g. "heavy rescue unit", "hazmat team"'),
  quantity: z.number().int().positive().optional(),
  priority: z.enum(['immediate', 'urgent', 'standard']),
  notes: z.string().optional(),
});
export type ResourceRecommendation = z.infer<typeof ResourceRecommendationSchema>;

export const AIAnalysisSchema = z.object({
  summary: z.string().describe('Concise narrative of the incident or signal'),
  severity: SeverityLevelSchema,
  confidence: z.number().min(0).max(1),
  hazards: z.array(z.string()),
  resourceRecommendations: z.array(ResourceRecommendationSchema),
  affectedPopulationEstimate: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    })
    .optional(),
  rootCause: z.string().optional(),
  blastRadius: z.string().optional().describe('Description of systems/areas affected'),
  rtoEstimateMinutes: z.number().int().nonnegative().optional(),
  rpoEstimateMinutes: z.number().int().nonnegative().optional(),
  recommendedActions: z.array(z.string()).default([]),
  complianceFlags: z.array(z.string()).default([]).describe('e.g. "DORA RTO breached"'),
  generatedAt: z.string().datetime(),
  modelUsed: z.string().optional().describe('e.g. gemini-2.0-flash'),
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ---------------------------------------------------------------------------
// Incident — core entity
// ---------------------------------------------------------------------------

export const IncidentTypeSchema = z.enum([
  'flood',
  'fire',
  'structural',
  'medical',
  'hazmat',
  'earthquake',
  'infrastructure',
  'cyber',
  'other',
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const IncidentStatusSchema = z.enum([
  'new',
  'triaging',
  'responding',
  'resolved',
  'closed',
  'escalated',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentSourceSchema = z.enum(['field', 'social', 'camera', 'integration', 'xbot']);
export type IncidentSource = z.infer<typeof IncidentSourceSchema>;

export const IncidentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: IncidentTypeSchema,
  severity: SeverityLevelSchema,
  status: IncidentStatusSchema,
  location: LocationSchema,
  sources: z.array(IncidentSourceSchema).min(1),
  aiAnalysis: AIAnalysisSchema.optional(),
  // Media attached to this incident
  mediaUrls: z.array(z.string().url()).default([]),
  // Agent execution tracking
  orchestratorSessionId: z.string().optional(),
  triageCompletedAt: z.string().datetime().optional(),
  recoveryStartedAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
  // Human approvals
  approvedBy: z.string().optional(),
  approvalNotes: z.string().optional(),
  // Relationships
  corroboratedBySignals: z.array(z.string()).default([]).describe('SocialSignal IDs'),
  linkedCameraAlerts: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Incident = z.infer<typeof IncidentSchema>;

// Create/update shapes (API request bodies)
export const CreateIncidentSchema = IncidentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiAnalysis: true,
  orchestratorSessionId: true,
  triageCompletedAt: true,
  recoveryStartedAt: true,
  resolvedAt: true,
  approvedBy: true,
  approvalNotes: true,
}).partial({
  status: true,
  sources: true,
  mediaUrls: true,
  corroboratedBySignals: true,
  linkedCameraAlerts: true,
});
export type CreateIncident = z.infer<typeof CreateIncidentSchema>;

export const UpdateIncidentSchema = IncidentSchema.partial().omit({
  id: true,
  createdAt: true,
});
export type UpdateIncident = z.infer<typeof UpdateIncidentSchema>;

// ---------------------------------------------------------------------------
// Social Signal — from X, Reddit, Instagram, Nextdoor
// ---------------------------------------------------------------------------

export const SocialPlatformSchema = z.enum(['x', 'reddit', 'instagram', 'nextdoor', 'bluesky']);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const SocialSignalSchema = z.object({
  id: z.string(), // platform-native ID
  platform: SocialPlatformSchema,
  handle: z.string(),
  displayName: z.string().optional(),
  text: z.string(),
  mediaUrls: z.array(z.string().url()).default([]),
  originalUrl: z.string().url().optional(),
  // AI-extracted fields
  credibility: CredibilitySchema,
  extractedLocation: z.string().optional(),
  extractedZipCode: z.string().optional(),
  extractedDamageType: z.string().optional(),
  extractedSeverity: SeverityLevelSchema.optional(),
  extractedKeywords: z.array(z.string()).default([]),
  aiSummary: z.string().optional(),
  // Relationships
  corroboratesIncidentId: z.string().uuid().optional(),
  dispatchedToSinkIds: z.array(z.string().uuid()).default([]),
  // Metadata
  platformTimestamp: z.string().datetime(),
  ingestedAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});
export type SocialSignal = z.infer<typeof SocialSignalSchema>;

export const IngestSocialSignalSchema = z.object({
  platform: SocialPlatformSchema,
  handle: z.string(),
  displayName: z.string().optional(),
  text: z.string().min(1),
  mediaUrls: z.array(z.string().url()).default([]),
  originalUrl: z.string().url().optional(),
  platformTimestamp: z.string().datetime().optional(),
  externalId: z.string().optional(), // platform-native tweet/post ID
});
export type IngestSocialSignal = z.infer<typeof IngestSocialSignalSchema>;

// ---------------------------------------------------------------------------
// Camera / Video Feed
// ---------------------------------------------------------------------------

export const CameraFeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string().describe('Human-readable location, e.g. "Main St & 3rd Ave"'),
  coords: LocationSchema.optional(),
  feedType: z.enum(['rtsp', 'hls', 'webcam_url', 'mp4_file', 'api']),
  feedUrl: z.string(),
  keyframeIntervalSeconds: z.number().int().positive().default(5),
  isActive: z.boolean().default(true),
  lastAnalyzedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});
export type CameraFeed = z.infer<typeof CameraFeedSchema>;

export const CreateCameraFeedSchema = CameraFeedSchema.omit({
  id: true,
  createdAt: true,
  lastAnalyzedAt: true,
}).partial({ isActive: true, keyframeIntervalSeconds: true });
export type CreateCameraFeed = z.infer<typeof CreateCameraFeedSchema>;

export const CameraAlertSchema = z.object({
  id: z.string().uuid(),
  cameraId: z.string().uuid(),
  cameraName: z.string(),
  location: z.string(),
  detectedEvent: z.string().describe('AI-generated description of the anomaly'),
  eventCategory: IncidentTypeSchema.optional(),
  confidence: z.number().min(0).max(1),
  severity: SeverityLevelSchema,
  frameTimestamp: z.string().datetime(),
  blobUrl: z.string().url().optional().describe('Vercel Blob URL for the keyframe image'),
  aiAnalysis: z.string().optional(),
  incidentId: z.string().uuid().optional().describe('Linked incident if one was created'),
  acknowledged: z.boolean().default(false),
  acknowledgedBy: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type CameraAlert = z.infer<typeof CameraAlertSchema>;

// ---------------------------------------------------------------------------
// Sink — downstream intelligence distribution endpoints
// ---------------------------------------------------------------------------

export const SinkTypeSchema = z.enum(['webhook', 'email', 'api_pull']);
export type SinkType = z.infer<typeof SinkTypeSchema>;

export const SinkFilterSchema = z.object({
  eventTypes: z.array(IncidentTypeSchema).default([]),
  minSeverity: SeverityLevelSchema.default(1),
  geographies: z.array(z.string()).default([]).describe('Zip codes or region identifiers'),
  platforms: z.array(SocialPlatformSchema).default([]).describe('For social-only sinks'),
  sources: z.array(IncidentSourceSchema).default([]),
});
export type SinkFilter = z.infer<typeof SinkFilterSchema>;

export const SinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: SinkTypeSchema,
  endpoint: z.string().describe('Webhook URL, email address, or API pull URL'),
  secret: z.string().optional().describe('HMAC secret for webhook signature verification'),
  filters: SinkFilterSchema,
  status: z.enum(['active', 'paused', 'error']),
  lastDeliveredAt: z.string().datetime().optional(),
  lastHttpStatus: z.number().int().optional(),
  consecutiveFailures: z.number().int().nonnegative().default(0),
  totalDeliveries: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Sink = z.infer<typeof SinkSchema>;

export const CreateSinkSchema = SinkSchema.omit({
  id: true,
  status: true,
  lastDeliveredAt: true,
  lastHttpStatus: true,
  consecutiveFailures: true,
  totalDeliveries: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateSink = z.infer<typeof CreateSinkSchema>;

export const UpdateSinkSchema = CreateSinkSchema.partial();
export type UpdateSink = z.infer<typeof UpdateSinkSchema>;

// Payload delivered to sinks
export const SinkDeliveryPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.enum(['incident.created', 'incident.updated', 'social.signal', 'camera.alert']),
  timestamp: z.string().datetime(),
  source: IncidentSourceSchema,
  severity: SeverityLevelSchema,
  location: LocationSchema.optional(),
  summary: z.string(),
  data: z.record(z.string(), z.unknown()),
  canaryVersion: z.string().default('1.0.0'),
});
export type SinkDeliveryPayload = z.infer<typeof SinkDeliveryPayloadSchema>;

// ---------------------------------------------------------------------------
// Subscriber — zip code alert subscriptions
// ---------------------------------------------------------------------------

export const NotificationChannelSchema = z.enum(['email', 'sms', 'push', 'telegram']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const SubscriberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  pushToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  zipCodes: z.array(z.string()).min(1),
  channels: z.array(NotificationChannelSchema).min(1),
  minSeverity: SeverityLevelSchema.default(3),
  isActive: z.boolean().default(true),
  unsubscribeToken: z.string().describe('Unique token for one-click unsubscribe'),
  confirmedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Subscriber = z.infer<typeof SubscriberSchema>;

export const CreateSubscriberSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  telegramChatId: z.string().optional(),
  zipCodes: z.array(z.string().regex(/^\d{5}(-\d{4})?$/)).min(1).max(10),
  channels: z.array(NotificationChannelSchema).min(1),
  minSeverity: SeverityLevelSchema.optional(),
});
export type CreateSubscriber = z.infer<typeof CreateSubscriberSchema>;

// ---------------------------------------------------------------------------
// Agent Log — append-only audit trail for every agent action
// ---------------------------------------------------------------------------

export const AgentTypeSchema = z.enum([
  'orchestrator',
  'triage',
  'recovery',
  'compliance',
  'runbook',
  'xbot',
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const AgentLogSchema = z.object({
  id: z.string().uuid(),
  agentType: AgentTypeSchema,
  incidentId: z.string().uuid().optional(),
  sessionId: z.string().describe('Groups all logs from one agent invocation'),
  stepIndex: z.number().int().nonnegative(),
  // What the agent reasoned and decided
  decisionRationale: z.string(),
  confidenceScore: z.number().min(0).max(1).optional(),
  // Tools called in this step
  toolCallsAttempted: z.array(z.string()).default([]),
  toolCallsSucceeded: z.array(z.string()).default([]),
  toolCallsFailed: z.array(z.string()).default([]),
  // Human escalation
  actionsEscalated: z.array(z.string()).default([]),
  escalationReason: z.string().optional(),
  // Recovery / undo
  rollbackPlan: z.string().optional(),
  // Raw step data for debugging
  rawStepJson: z.string().optional(),
  // Timing
  durationMs: z.number().int().nonnegative().optional(),
  timestamp: z.string().datetime(),
});
export type AgentLog = z.infer<typeof AgentLogSchema>;

// ---------------------------------------------------------------------------
// Runbook — generated / managed runbook steps
// ---------------------------------------------------------------------------

export const RunbookStepStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'awaiting_approval',
]);
export type RunbookStepStatus = z.infer<typeof RunbookStepStatusSchema>;

export const RunbookStepSchema = z.object({
  id: z.string().uuid(),
  runbookId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  actionType: z.enum([
    'automated',
    'human_required',
    'validation',
    'notification',
    'rollback',
  ]),
  isReversible: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  command: z.string().optional().describe('Shell command, API call, or IaC operation'),
  validationCriteria: z.string().optional(),
  rollbackCommand: z.string().optional(),
  status: RunbookStepStatusSchema,
  executedAt: z.string().datetime().optional(),
  executedBy: z.string().optional().describe('"agent" or human username'),
  output: z.string().optional(),
  error: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().datetime().optional(),
});
export type RunbookStep = z.infer<typeof RunbookStepSchema>;

export const RunbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  incidentType: IncidentTypeSchema,
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  generatedFromIncidentId: z.string().uuid().optional(),
  steps: z.array(RunbookStepSchema),
  // Compliance mapping
  complianceControls: z.array(z.string()).default([]).describe('e.g. "SOC2-A1.2", "DORA-RTO"'),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  lastValidatedAt: z.string().datetime().optional(),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Runbook = z.infer<typeof RunbookSchema>;

// ---------------------------------------------------------------------------
// X Bot / Webhook Integration Schemas
// ---------------------------------------------------------------------------

/**
 * XMention — In-memory type used by the xbot-handler and polling route.
 * Maps to the `xbot_mentions` table in Supabase.
 */
export const XMentionSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorHandle: z.string(),
  text: z.string(),
  mediaKeys: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string().url()).default([]),
  createdAt: z.string().datetime(),
  conversationId: z.string().optional(),
  inReplyToUserId: z.string().optional(),
  lang: z.string().optional(),
  geo: z
    .object({
      placeId: z.string().optional(),
      coordinates: z
        .object({
          lat: z.number(),
          lng: z.number(),
        })
        .optional(),
    })
    .optional(),
});
export type XMention = z.infer<typeof XMentionSchema>;

export const IntegrationWebhookPayloadSchema = z.object({
  source: z.enum(['pagerduty', 'datadog', 'cloudwatch', 'prometheus', 'custom']),
  eventType: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
  title: z.string(),
  description: z.string().optional(),
  resourceId: z.string().optional(),
  rawPayload: z.record(z.string(), z.unknown()),
  receivedAt: z.string().datetime(),
});
export type IntegrationWebhookPayload = z.infer<typeof IntegrationWebhookPayloadSchema>;

// ---------------------------------------------------------------------------
// API Request/Response shapes
// ---------------------------------------------------------------------------

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const IncidentListQuerySchema = PaginationSchema.extend({
  status: IncidentStatusSchema.optional(),
  type: IncidentTypeSchema.optional(),
  minSeverity: z.coerce.number().int().min(1).max(5).optional(),
  zipCode: z.string().optional(),
  source: IncidentSourceSchema.optional(),
  since: z.string().datetime().optional(),
});
export type IncidentListQuery = z.infer<typeof IncidentListQuerySchema>;

export const SocialFeedQuerySchema = PaginationSchema.extend({
  platform: SocialPlatformSchema.optional(),
  minSeverity: z.coerce.number().int().min(1).max(5).optional(),
  credibility: CredibilitySchema.optional(),
  zipCode: z.string().optional(),
  since: z.string().datetime().optional(),
  hasMedia: z.coerce.boolean().optional(),
});
export type SocialFeedQuery = z.infer<typeof SocialFeedQuerySchema>;

export const NotifySubscribersRequestSchema = z.object({
  incidentId: z.string().uuid(),
  zipCodes: z.array(z.string()),
  severity: SeverityLevelSchema,
  message: z.string().optional().describe('Override AI-drafted message if provided'),
});
export type NotifySubscribersRequest = z.infer<typeof NotifySubscribersRequestSchema>;

// Orchestrator request
export const OrchestratorRequestSchema = z.object({
  incidentId: z.string().uuid().optional(),
  alertPayload: z.record(z.string(), z.unknown()).optional(),
  source: IncidentSourceSchema,
  priority: z.enum(['critical', 'high', 'normal']).default('normal'),
  context: z.string().optional().describe('Additional context for the orchestrator'),
});
export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;

// Triage request
export const TriageRequestSchema = z.object({
  incidentId: z.string().uuid(),
  incidentData: IncidentSchema,
  additionalContext: z.string().optional(),
});
export type TriageRequest = z.infer<typeof TriageRequestSchema>;

// Recovery request
export const RecoveryRequestSchema = z.object({
  incidentId: z.string().uuid(),
  runbookId: z.string().uuid().optional(),
  stepIds: z.array(z.string().uuid()).optional().describe('Specific steps to execute'),
  dryRun: z.boolean().default(false),
});
export type RecoveryRequest = z.infer<typeof RecoveryRequestSchema>;

// Compliance request
export const ComplianceRequestSchema = z.object({
  incidentId: z.string().uuid().optional(),
  frameworks: z
    .array(z.enum(['DORA', 'SOC2', 'ISO22301', 'HIPAA']))
    .default(['DORA', 'SOC2', 'ISO22301']),
  generateEvidencePackage: z.boolean().default(false),
});
export type ComplianceRequest = z.infer<typeof ComplianceRequestSchema>;

// Voice analysis request (multipart form)
export const VoiceAnalysisResponseSchema = AIAnalysisSchema.extend({
  transcript: z.string(),
  durationSeconds: z.number().optional(),
});
export type VoiceAnalysisResponse = z.infer<typeof VoiceAnalysisResponseSchema>;

// Video analysis response
export const VideoTimestampEventSchema = z.object({
  timestamp: z.string().describe('Timestamp in HH:MM:SS or MM:SS format'),
  seconds: z.number().describe('Timestamp in total seconds from start'),
  event: z.string().describe('Description of what happened at this timestamp'),
  severity: SeverityLevelSchema.describe('Severity of this specific event'),
  category: z.string().describe('Category: damage, hazard, movement, structural, environmental, human_activity, other'),
});
export type VideoTimestampEvent = z.infer<typeof VideoTimestampEventSchema>;

export const VideoAnalysisResponseSchema = AIAnalysisSchema.extend({
  timeline: z.array(VideoTimestampEventSchema).describe('Chronological list of significant events with timestamps'),
  damageCategory: z.string().optional().describe('e.g. ATC-45 rapid assessment category'),
  structuralIntegrity: z.enum(['intact', 'moderate_damage', 'severe_damage', 'destroyed']).optional(),
  detectedObjects: z.array(z.string()).default([]),
  extractedAddress: z.string().optional(),
  videoDurationSeconds: z.number().optional(),
  sceneSummary: z.string().describe('Overall scene description covering the entire video'),
  progressionAnalysis: z.string().optional().describe('How the situation changes over the course of the video'),
});
export type VideoAnalysisResponse = z.infer<typeof VideoAnalysisResponseSchema>;

// Photo analysis response
export const PhotoAnalysisResponseSchema = AIAnalysisSchema.extend({
  damageCategory: z.string().optional().describe('e.g. ATC-45 rapid assessment category'),
  structuralIntegrity: z.enum(['intact', 'moderate_damage', 'severe_damage', 'destroyed']).optional(),
  detectedObjects: z.array(z.string()).default([]),
  extractedAddress: z.string().optional(),
  blobUrl: z.string().url().optional(),
});
export type PhotoAnalysisResponse = z.infer<typeof PhotoAnalysisResponseSchema>;

// ---------------------------------------------------------------------------
// Compliance mapping
// ---------------------------------------------------------------------------

export const ComplianceControlSchema = z.object({
  framework: z.enum(['DORA', 'SOC2', 'ISO22301', 'HIPAA']),
  controlId: z.string(),
  controlName: z.string(),
  status: z.enum(['compliant', 'partial', 'non_compliant', 'not_applicable', 'unknown']),
  evidence: z.string().optional(),
  gapDescription: z.string().optional(),
  remediationSteps: z.array(z.string()).default([]),
  lastAssessedAt: z.string().datetime(),
});
export type ComplianceControl = z.infer<typeof ComplianceControlSchema>;

export const ComplianceReportSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid().optional(),
  frameworks: z.array(z.enum(['DORA', 'SOC2', 'ISO22301', 'HIPAA'])),
  controls: z.array(ComplianceControlSchema),
  overallPosture: z.enum(['strong', 'adequate', 'at_risk', 'critical']),
  executiveSummary: z.string(),
  generatedAt: z.string().datetime(),
  agentSessionId: z.string().optional(),
});
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

// ---------------------------------------------------------------------------
// API standard response envelope
// ---------------------------------------------------------------------------

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        page: z.number().optional(),
        limit: z.number().optional(),
        total: z.number().optional(),
      })
      .optional(),
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
