# Canary — Technical Architecture

> **Stack:** Next.js 15 App Router · Vercel AI SDK 6 · Vercel Fluid Compute · Google Gemini 2.0 Flash / 2.5 Pro · Vercel Postgres (Neon) · Vercel Blob · Vercel KV · Resend · X API v2
>
> **This document is the single source of truth for building the Canary backend.** It covers every API route, all five agent pipelines, the full data model, Vercel infrastructure config, AI SDK function choices, external integrations, real-time strategy, security, and deployment.

---

## Table of Contents

1. [Project Directory Structure](#1-project-directory-structure)
2. [API Route Inventory](#2-api-route-inventory)
3. [Multi-Agent Pipeline Design](#3-multi-agent-pipeline-design)
4. [Data Model](#4-data-model)
5. [Vercel Infrastructure](#5-vercel-infrastructure)
6. [AI Pipeline Patterns](#6-ai-pipeline-patterns)
7. [External Integrations](#7-external-integrations)
8. [Real-Time Strategy](#8-real-time-strategy)
9. [Security Considerations](#9-security-considerations)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Project Directory Structure

```
canary/
├── app/
│   ├── layout.tsx                     # Root layout — dark mode, Sonner toaster
│   ├── page.tsx                       # Redirects to /dashboard
│   ├── dashboard/page.tsx             # Main EOC dashboard — field/social/camera panes
│   ├── incidents/
│   │   ├── new/page.tsx               # Multimodal incident intake
│   │   └── [id]/
│   │       ├── page.tsx               # Incident detail + AI analysis
│   │       └── report/page.tsx        # Auto-generated NIMS report preview
│   ├── social/page.tsx                # Social signal feed
│   ├── cameras/
│   │   ├── page.tsx                   # Camera grid view
│   │   └── [id]/page.tsx              # Single camera + live AI monitoring
│   ├── sinks/
│   │   ├── page.tsx                   # Sink registry management
│   │   └── new/page.tsx               # Add sink wizard
│   ├── subscribe/page.tsx             # Public zip code subscription page
│   ├── settings/
│   │   └── subscriptions/page.tsx     # Admin subscriber analytics
│   └── api/
│       ├── incidents/
│       │   ├── route.ts               # GET (list), POST (create)
│       │   └── [id]/
│       │       └── route.ts           # GET (detail), PATCH (update status)
│       ├── analysis/
│       │   ├── voice/route.ts         # POST — audio transcription + structured extraction
│       │   ├── photo/route.ts         # POST — Gemini Vision damage assessment
│       │   ├── social/route.ts        # POST — batch social post analysis
│       │   ├── camera/route.ts        # POST — keyframe anomaly detection
│       │   └── report/route.ts        # POST — full NIMS report generation
│       ├── agents/
│       │   ├── orchestrate/route.ts   # POST — main orchestrator agent
│       │   ├── triage/route.ts        # POST — root cause + blast radius agent
│       │   ├── recovery/route.ts      # POST — runbook execution agent
│       │   ├── compliance/route.ts    # POST — compliance mapping agent
│       │   └── runbook/route.ts       # POST — runbook generation/update agent
│       ├── social/
│       │   ├── ingest/route.ts        # POST — receive and store social posts
│       │   ├── feed/route.ts          # GET — paginated social signal feed
│       │   └── brief/route.ts         # POST — AI intelligence brief generation
│       ├── cameras/
│       │   ├── route.ts               # GET (list), POST (register)
│       │   └── [id]/
│       │       ├── analyze/route.ts   # POST — submit keyframe for analysis
│       │       └── alerts/route.ts    # GET — alerts for this camera
│       ├── xbot/
│       │   ├── webhook/route.ts       # POST — X Account Activity API receiver
│       │   └── log/route.ts           # GET — processed mentions + dispatch status
│       ├── subscribers/
│       │   ├── route.ts               # POST (subscribe)
│       │   ├── [token]/route.ts       # DELETE (unsubscribe via token)
│       │   └── notify/route.ts        # POST — internal zip code fan-out
│       ├── sinks/
│       │   ├── route.ts               # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts           # PATCH (update), DELETE (remove)
│       │       └── test/route.ts      # POST — test payload delivery
│       └── integrations/
│           ├── webhook/route.ts       # POST — PagerDuty/Datadog/CloudWatch receiver
│           └── status/route.ts        # GET — health check all integrations
│
├── lib/
│   ├── ai.ts                          # Gemini model instances, shared AI config
│   ├── db.ts                          # Vercel Postgres client + query helpers
│   ├── blob.ts                        # Vercel Blob upload/fetch helpers
│   ├── kv.ts                          # Vercel KV client + pub/sub helpers
│   │
│   ├── schemas/
│   │   ├── index.ts                   # Re-exports all schemas
│   │   ├── incident.ts                # IncidentSchema, IncidentReportSchema, AIAnalysisSchema
│   │   ├── social.ts                  # SocialSignalSchema, SocialPostSchema, SocialBriefSchema
│   │   ├── camera.ts                  # CameraFeedSchema, CameraAlertSchema, CameraFrameResultSchema
│   │   ├── sink.ts                    # SinkSchema, SinkDeliverySchema, SinkPayloadSchema
│   │   ├── subscriber.ts              # SubscriberSchema, ZipAlertNotificationSchema
│   │   ├── runbook.ts                 # RunbookSchema, RunbookStepSchema
│   │   └── agent.ts                   # AgentLogSchema, OrchestratorDecisionSchema
│   │
│   ├── agents/
│   │   ├── orchestrator.ts            # Orchestrator agent — routing logic + system prompt
│   │   ├── triage.ts                  # Triage agent — root cause, blast radius, RTO/RPO
│   │   ├── recovery.ts                # Recovery agent — runbook execution with HITL gates
│   │   ├── compliance.ts              # Compliance agent — DORA/SOC2/ISO22301 mapping
│   │   ├── runbook.ts                 # Runbook agent — generation + validation
│   │   └── tools/
│   │       ├── index.ts               # Re-exports all tools
│   │       ├── fetchIncident.ts       # Fetch incident record from DB
│   │       ├── fetchSocialSignals.ts  # Query social signals for an incident
│   │       ├── fetchCameraAlerts.ts   # Query camera alerts for an incident
│   │       ├── fetchRunbook.ts        # Retrieve runbook by type or incident ID
│   │       ├── createIncident.ts      # Persist a new incident record
│   │       ├── updateIncidentStatus.ts # Change incident lifecycle status
│   │       ├── executeRunbookStep.ts  # Run one runbook step (with needsApproval gate)
│   │       ├── fetchIntegrationMetrics.ts # Pull from Datadog/CloudWatch/Prometheus
│   │       ├── notifySubscribers.ts   # Trigger zip code fan-out
│   │       ├── dispatchToSinks.ts     # POST to matching registered sinks
│   │       ├── generateRunbook.ts     # Invoke the Runbook agent as a sub-agent
│   │       └── logAgentDecision.ts    # Append-only agent audit log write
│   │
│   └── integrations/
│       ├── gemini.ts                  # @ai-sdk/google model config, context caching setup
│       ├── xapi.ts                    # X API v2 — filtered stream + webhook CRC verification
│       ├── resend.ts                  # Resend email client + alert templates
│       ├── datadog.ts                 # Datadog metrics fetch (stub + live)
│       ├── cloudwatch.ts              # AWS CloudWatch fetch (stub + live)
│       ├── pagerduty.ts               # PagerDuty incident receive + status sync
│       └── sinkDelivery.ts            # Webhook delivery engine with retry logic
│
├── components/                        # shadcn/ui + custom UI components
│   ├── ui/                            # shadcn generated components
│   ├── incidents/                     # IncidentCard, IncidentDetail, SeverityBadge
│   ├── social/                        # SocialSignalCard, CredibilityBadge, SocialBrief
│   ├── cameras/                       # CameraTile, CameraGrid, AlertTicker
│   ├── sinks/                         # SinkCard, SinkWizard, DeliveryLog
│   └── shared/                        # AIStatusIndicator, StreamingSkeleton, ConfidenceBar
│
├── hooks/
│   ├── useIncidentStream.ts           # SSE consumer for incident analysis streaming
│   ├── useSocialFeed.ts               # Polling + optimistic social signal updates
│   └── useCameraAnalysis.ts           # Canvas keyframe extraction + frame submission
│
├── types/
│   └── index.ts                       # TypeScript interface exports (derived from Zod schemas)
│
├── vercel.json                        # Fluid Compute config + function duration overrides
├── next.config.ts
└── package.json
```

---

## 2. API Route Inventory

All routes use Node.js runtime (`export const runtime = 'nodejs'`). Routes marked **Fluid** export `export const maxDuration = 300` (Hobby) or `800` (Pro). Streaming routes return `ReadableStream` via AI SDK helpers.

### Incident Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/incidents` | Create incident from field report | `{ title, type, severity, location, sources, mediaAssetUrls[], textDescription?, responderName }` | `{ id, createdAt, status: 'ANALYZING' }` | None (triggers async analysis) | No |
| `GET` | `/api/incidents` | List incidents with filters | Query: `?status=&severity=&type=&zipCode=&page=&limit=` | `{ incidents: Incident[], total, page }` | None | No |
| `GET` | `/api/incidents/[id]` | Get full incident detail | — | `Incident` with nested `IncidentReport`, linked signals, camera alerts | None | No |
| `PATCH` | `/api/incidents/[id]` | Update status or approval | `{ status?, approvedBy?, notes? }` | `{ updated: true, incident: Incident }` | None | No |

### Analysis Pipeline Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/analysis/voice` | Transcribe audio + extract structured incident data | `FormData: { audio: File }` | `streamObject` — partial `IncidentReportSchema` tokens streamed | `gemini-2.0-flash` | **Yes** — `streamObject` |
| `POST` | `/api/analysis/photo` | Gemini Vision damage assessment | `{ blobUrl: string, incidentId?: string }` | `streamObject` — partial `AIAnalysisSchema` tokens streamed | `gemini-2.0-flash` | **Yes** — `streamObject` |
| `POST` | `/api/analysis/social` | Analyze batch of social posts for structured intelligence | `{ posts: Array<{ id, text, mediaUrls[] }> }` | `{ signals: SocialSignalAnalysis[] }` — complete JSON | `gemini-2.0-flash` | No |
| `POST` | `/api/analysis/camera` | Analyze video keyframe for anomalies | `{ frameBase64: string, cameraId, cameraLocation, monitoredEventTypes[] }` | `CameraFrameResult` — complete JSON | `gemini-2.0-flash` | No |
| `POST` | `/api/analysis/report` | Generate full NIMS incident report | `{ incidentId: string }` (fetches all signals from DB) | `streamText` — NIMS-structured markdown streamed | `gemini-2.5-pro` | **Yes** — `streamText` |

### Agent Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/agents/orchestrate` | Route alert to specialist agents, manage gates | `{ alertPayload: string, incidentId?: string, source: 'integration'\|'field'\|'xbot' }` | `streamText` — orchestrator reasoning + routing decisions streamed | `gemini-2.0-flash` | **Yes** — `streamText` |
| `POST` | `/api/agents/triage` | Root cause analysis, blast radius, RTO/RPO estimate | `{ incidentId: string, context?: string }` | `streamText` — triage reasoning streamed; `AgentLog` persisted on finish | `gemini-2.0-flash` | **Yes** — `streamText` |
| `POST` | `/api/agents/recovery` | Execute runbook steps with human-in-the-loop gates | `{ incidentId: string, runbookId: string, approvals?: Record<string, boolean> }` | `streamText` — step execution log streamed | `gemini-2.0-flash` | **Yes** — `streamText` |
| `POST` | `/api/agents/compliance` | Map system posture to DORA/SOC2/ISO22301 | `{ incidentId?: string, scope: 'full'\|'incident' }` | `generateObject` — `ComplianceReport` complete JSON | `gemini-2.5-pro` | No |
| `POST` | `/api/agents/runbook` | Generate or update runbook from IaC or incident history | `{ incidentType: string, triggeredByIncidentId?: string, infraContext?: string }` | `generateObject` — `Runbook` with steps complete JSON | `gemini-2.5-pro` | No |

### Social Intelligence Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/social/ingest` | Receive raw social posts, analyze, store | `{ posts: SocialPost[] }` | `{ processed: number, stored: number }` | `gemini-2.0-flash` (via `/api/analysis/social`) | No |
| `GET` | `/api/social/feed` | Paginated signal feed with filters | Query: `?platform=&credibility=&incidentId=&page=&limit=` | `{ signals: SocialSignal[], total, page }` | None | No |
| `POST` | `/api/social/brief` | AI intelligence brief from current feed | `{ windowMinutes?: number, incidentId?: string }` | `streamText` — structured situation summary streamed | `gemini-2.5-pro` | **Yes** — `streamText` |

### Camera Feed Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/cameras` | Register camera feed | `{ name, location, sourceUrl, keyframeIntervalSeconds, monitoredEventTypes[] }` | `CameraFeed` created record | None | No |
| `GET` | `/api/cameras` | List all registered cameras | Query: `?status=` | `{ cameras: CameraFeed[] }` | None | No |
| `POST` | `/api/cameras/[id]/analyze` | Submit keyframe for analysis, create alert if anomaly | `{ frameBase64: string, timestamp: string }` | `CameraFrameResult` — anomaly detection JSON | `gemini-2.0-flash` | No |
| `GET` | `/api/cameras/[id]/alerts` | Get alerts for a specific camera | Query: `?acknowledged=&limit=` | `{ alerts: CameraAlert[] }` | None | No |

### X Bot Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/xbot/webhook` | Receive X Account Activity API events (CRC + mentions) | X webhook envelope (see X API v2 spec) | `{ received: true }` or CRC response token | None | No |
| `GET` | `/api/xbot/log` | Paginated log of processed mentions and dispatch status | Query: `?status=&page=&limit=` | `{ mentions: XBotMention[], total }` | None | No |

### Subscriber Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/subscribers` | Create zip code subscription | `{ email, zipCodes[], channel, severityThreshold, phone? }` | `{ subscriberId, confirmationEmailSent: true }` | None | No |
| `DELETE` | `/api/subscribers/[token]` | Unsubscribe via one-click token | — | `{ unsubscribed: true }` | None | No |
| `POST` | `/api/subscribers/notify` | Internal — fan-out zip code alerts on incident creation | `{ incidentId: string, zipCode: string, severity: SeverityLevel }` | `{ notified: number }` | `gemini-2.0-flash` (plain-language alert copy) | No |

### Sink Registry Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/sinks` | Register new intelligence sink | `SinkCreateInput` (see Data Model) | `Sink` created record | None | No |
| `GET` | `/api/sinks` | List all sinks | Query: `?status=&type=` | `{ sinks: Sink[] }` | None | No |
| `PATCH` | `/api/sinks/[id]` | Update sink config or status | Partial `SinkUpdateInput` | `{ updated: true, sink: Sink }` | None | No |
| `DELETE` | `/api/sinks/[id]` | Remove sink | — | `{ deleted: true }` | None | No |
| `POST` | `/api/sinks/[id]/test` | Send test payload to verify endpoint | — | `{ delivered: boolean, httpStatus: number, latencyMs: number }` | None | No |

### Integration Routes

| Method | Path | Purpose | Request Shape | Response Shape | AI Model | Streaming |
|---|---|---|---|---|---|---|
| `POST` | `/api/integrations/webhook` | Receive PagerDuty / Datadog / CloudWatch alerts | Provider-specific envelope (signature verified) | `{ received: true, incidentId? }` | None | No |
| `GET` | `/api/integrations/status` | Health check all configured integrations | — | `{ integrations: Array<{ name, status, lastCheckedAt }> }` | None | No |

---

## 3. Multi-Agent Pipeline Design

### Architecture Overview

```
                         INBOUND TRIGGERS
                ┌──────────────────────────────┐
                │  Field Report                │
                │  X Bot Mention               │
                │  PagerDuty / Datadog Webhook │
                │  Camera Anomaly Alert        │
                └──────────────┬───────────────┘
                               │
                               ▼
          ┌────────────────────────────────────────┐
          │           ORCHESTRATOR AGENT           │
          │   POST /api/agents/orchestrate          │
          │                                        │
          │  Model: gemini-2.0-flash               │
          │  Pattern: generateText + tools +       │
          │           stopWhen(stepCountIs(10))    │
          │                                        │
          │  Responsibilities:                     │
          │  - Parse incoming alert                │
          │  - Determine severity and type         │
          │  - Route to 1–N specialist agents      │
          │  - Coordinate parallel workstreams     │
          │  - Manage human-in-the-loop gates      │
          │  - Track all agent results             │
          └──────────┬──────────┬────────┬─────────┘
                     │          │        │
           ┌─────────▼──┐  ┌────▼───┐  ┌▼──────────┐
           │  TRIAGE    │  │RECOVERY│  │COMPLIANCE │
           │  AGENT     │  │ AGENT  │  │  AGENT    │
           └─────────┬──┘  └────┬───┘  └─────┬─────┘
                     │          │             │
                     └──────────┼─────────────┘
                                │
                     ┌──────────▼──────────┐
                     │    RUNBOOK AGENT    │
                     │  (called by any of  │
                     │  the above as sub-  │
                     │  agent tool)        │
                     └─────────────────────┘
```

---

### Agent 1 — Orchestrator

**Route:** `POST /api/agents/orchestrate`
**Model:** `gemini-2.0-flash`
**AI SDK Pattern:** `streamText` with tools + `stopWhen: stepCountIs(10)`
**Max Duration:** 300s

**Responsibilities:**
- Receive an alert payload (from any inbound trigger)
- Classify the alert: incident type, severity, affected systems
- Decide which specialist agents to invoke (can be parallel)
- Pass structured context to each specialist
- Aggregate specialist results into a unified incident state
- Enforce human-in-the-loop gates before irreversible actions
- Persist all routing decisions to `AgentLog`

**System Prompt:**
```
You are the Orchestrator Agent for Canary, an AI-native disaster intelligence platform.
Your role is to receive incoming alerts and intelligently route them to the correct
specialist agents. You coordinate parallel workstreams and manage human approval gates.

Rules:
1. Always classify the alert severity before routing.
2. CRITICAL or HIGH severity → invoke triageAgent immediately.
3. When triage identifies a recovery path → invoke recoveryAgent.
4. For compliance-related incidents → invoke complianceAgent in parallel.
5. If no matching runbook exists → invoke runbookAgent.
6. NEVER execute irreversible actions (failover, data restore) without a recorded
   human approval. Use the requestHumanApproval tool for these.
7. Log every routing decision with rationale.
```

**Tools available to Orchestrator:**

| Tool | Description | Input | Output |
|---|---|---|---|
| `fetchIncidentTool` | Retrieve full incident from DB | `{ incidentId }` | `Incident` record |
| `classifyAlertTool` | Classify alert into type/severity | `{ alertText, metadata }` | `{ type, severity, urgency }` |
| `routeToTriageTool` | Invoke Triage agent | `{ incidentId, context }` | Triage result summary |
| `routeToRecoveryTool` | Invoke Recovery agent | `{ incidentId, runbookId }` | Recovery step log |
| `routeToComplianceTool` | Invoke Compliance agent | `{ incidentId, scope }` | Compliance report |
| `routeToRunbookTool` | Invoke Runbook agent | `{ incidentType, infraContext }` | Generated runbook |
| `requestHumanApprovalTool` | Gate irreversible action (`needsApproval: true`) | `{ action, description, riskLevel }` | `{ approved: boolean, approvedBy }` |
| `notifySubscribersTool` | Trigger zip code subscriber fan-out | `{ incidentId, zipCode }` | `{ notified: number }` |
| `dispatchToSinksTool` | Send intelligence to matching sinks | `{ incidentId, payload }` | `{ dispatched: number }` |
| `logAgentDecisionTool` | Persist decision to audit log | `{ agentType, decision, confidence, actions }` | `{ logId }` |

**Input:**
```typescript
{
  alertPayload: string;          // raw alert text or JSON string
  incidentId?: string;           // if already created
  source: 'integration' | 'field' | 'xbot' | 'camera';
  metadata?: Record<string, unknown>;
}
```

**Output (streamed):** Real-time reasoning text + tool call events; on finish, `AgentLog` record persisted.

---

### Agent 2 — Triage

**Route:** `POST /api/agents/triage`
**Model:** `gemini-2.0-flash`
**AI SDK Pattern:** `streamText` with tools + `stopWhen: stepCountIs(15)`
**Max Duration:** 300s

**Responsibilities:**
- Perform root-cause analysis by correlating logs, metrics, social signals, and camera alerts
- Map the blast radius: which systems, customers, and SLAs are affected
- Estimate current RTO/RPO exposure
- Recommend a recovery approach (runbook to execute or new runbook to generate)
- Assign a final triage severity with confidence score

**System Prompt:**
```
You are the Triage Agent for Canary. Your job is to determine the root cause of an
incident, quantify the blast radius, and estimate RTO/RPO exposure.

Approach:
1. Fetch the full incident record including all media assets.
2. Fetch corroborating social signals and camera alerts.
3. Fetch any relevant integration metrics (CloudWatch, Datadog).
4. Reason through the evidence: what failed, why, what is cascading.
5. Estimate blast radius: affected systems, impacted users, SLAs at risk.
6. Estimate RTO: realistic time-to-recovery given current state.
7. Estimate RPO: data loss exposure window.
8. Recommend the most appropriate runbook (fetch existing or flag need for new one).
9. Assign a final severity (CRITICAL/HIGH/MODERATE/LOW) with confidence score 0–1.
10. Log your decision rationale.
```

**Tools available to Triage:**

| Tool | Description | Input | Output |
|---|---|---|---|
| `fetchIncidentTool` | Get full incident record | `{ incidentId }` | `Incident` |
| `fetchSocialSignalsTool` | Query corroborating social posts | `{ incidentId, limit? }` | `SocialSignal[]` |
| `fetchCameraAlertsTool` | Query linked camera alerts | `{ incidentId, limit? }` | `CameraAlert[]` |
| `fetchIntegrationMetricsTool` | Pull Datadog/CloudWatch metrics | `{ source, resourceId, metrics[], windowMinutes }` | `{ metrics: MetricPoint[] }` |
| `fetchRunbookTool` | Get runbook by type or incident | `{ incidentType?, incidentId? }` | `Runbook \| null` |
| `updateIncidentStatusTool` | Set incident to 'triaging' | `{ incidentId, status }` | `{ updated: true }` |
| `logAgentDecisionTool` | Persist triage log entry | `{ agentType: 'triage', ... }` | `{ logId }` |

**Input:**
```typescript
{
  incidentId: string;
  context?: string;  // optional additional context from Orchestrator
}
```

**Output (streamed):** Reasoning text ending with structured triage summary:
```
ROOT CAUSE: [analysis]
BLAST RADIUS: [affected systems/users]
RTO ESTIMATE: [N] minutes
RPO ESTIMATE: [N] minutes
SEVERITY: CRITICAL | HIGH | MODERATE | LOW
CONFIDENCE: 0.85
RECOMMENDED RUNBOOK: [runbookId or "GENERATE_NEW"]
```

---

### Agent 3 — Recovery

**Route:** `POST /api/agents/recovery`
**Model:** `gemini-2.0-flash`
**AI SDK Pattern:** `streamText` with tools + `stopWhen: stepCountIs(20)` + `needsApproval` on irreversible tools
**Max Duration:** 300s

**Responsibilities:**
- Execute runbook steps sequentially or in parallel where safe
- Apply human-in-the-loop gates before any step marked `requiresApproval: true`
- Validate each step's success before proceeding to the next
- Track rollback plan for every automated action
- Pause execution if a step fails and escalate back to Orchestrator

**System Prompt:**
```
You are the Recovery Agent for Canary. You execute disaster recovery runbooks with
precision and safety. You operate within defined boundaries — autonomous for safe,
reversible steps; human-approval-gated for irreversible actions.

Rules:
1. Execute runbook steps in order unless parallelism is explicitly marked safe.
2. Before executing any step with requiresApproval=true, call requestHumanApprovalTool.
3. After each step, validate success using the step's successCriteria.
4. If a step fails: stop, log the failure, and call escalateToOrchestratorTool.
5. Maintain a rollback plan for every automated action you execute.
6. Never execute a failover, data restore, or traffic cut without explicit human approval.
7. Log every step execution with: tool called, result, duration, rollback plan.
```

**Tools available to Recovery:**

| Tool | Description | Input | Output |
|---|---|---|---|
| `fetchRunbookTool` | Get runbook with all steps | `{ runbookId }` | `Runbook` with `RunbookStep[]` |
| `executeRunbookStepTool` | Execute a single runbook step | `{ stepId, parameters }` (`needsApproval: async ({ step }) => step.requiresApproval`) | Step execution result |
| `validateStepSuccessTool` | Check step success criteria | `{ stepId, successCriteria }` | `{ passed: boolean, reason }` |
| `requestHumanApprovalTool` | Gate on human decision | `{ action, description, riskLevel }` (`needsApproval: true`) | `{ approved: boolean }` |
| `escalateToOrchestratorTool` | Hand off failure to Orchestrator | `{ incidentId, failedStep, error }` | `{ escalated: true }` |
| `updateIncidentStatusTool` | Update incident to 'responding' | `{ incidentId, status }` | `{ updated: true }` |
| `logAgentDecisionTool` | Log recovery step audit | `{ agentType: 'recovery', ... }` | `{ logId }` |

**Input:**
```typescript
{
  incidentId: string;
  runbookId: string;
  approvals?: Record<string, boolean>;  // pre-submitted approvals from HITL UI
}
```

**Output (streamed):** Step-by-step execution log with success/failure markers.

---

### Agent 4 — Compliance

**Route:** `POST /api/agents/compliance`
**Model:** `gemini-2.5-pro` (reasoning quality matters for compliance accuracy)
**AI SDK Pattern:** `generateObject` with `ComplianceReportSchema`
**Max Duration:** 300s

**Responsibilities:**
- Map the current incident and system state to DORA, SOC 2 Type II, ISO 22301, and HIPAA DR controls
- Identify control gaps or drift
- Generate audit-ready evidence excerpts from the incident record
- Produce a structured compliance report

**System Prompt:**
```
You are the Compliance Agent for Canary. You evaluate incidents and system state
against disaster recovery compliance frameworks: DORA, SOC 2 Type II, ISO 22301,
and HIPAA. You generate audit-ready evidence packages.

For each applicable framework:
1. Map the incident's characteristics to relevant controls.
2. Assess whether each control was satisfied during this incident.
3. Identify any control gaps or drift.
4. Extract specific evidence (runbook steps executed, RTO achieved, approval records).
5. Draft a findings summary for each framework.
6. Assign overall compliance posture: COMPLIANT | PARTIAL | NON_COMPLIANT.
```

**Tools available to Compliance:**

| Tool | Description | Input | Output |
|---|---|---|---|
| `fetchIncidentTool` | Full incident with all agent logs | `{ incidentId }` | `Incident` with `AgentLog[]` |
| `fetchRunbookTool` | Retrieve executed runbook | `{ runbookId }` | `Runbook` |
| `logAgentDecisionTool` | Persist compliance log | `{ agentType: 'compliance', ... }` | `{ logId }` |

**Input:**
```typescript
{
  incidentId?: string;
  scope: 'full' | 'incident';  // 'full' = org-wide posture; 'incident' = single event
}
```

**Output (complete JSON):** `ComplianceReport` object — see Data Model section.

---

### Agent 5 — Runbook

**Route:** `POST /api/agents/runbook`
**Model:** `gemini-2.5-pro` (complex reasoning over IaC docs and incident history)
**AI SDK Pattern:** `generateObject` with `RunbookSchema`
**Max Duration:** 300s

**Responsibilities:**
- Generate a new runbook from infrastructure-as-code context (Terraform state, Kubernetes manifests, AWS configs)
- Update existing runbooks when infrastructure changes
- Validate runbooks against observed system behavior from incident history
- Structure runbooks as ordered, executable steps with approval gates marked

**System Prompt:**
```
You are the Runbook Agent for Canary. You generate, update, and validate disaster
recovery runbooks from infrastructure context and incident history.

A runbook must be:
1. Specific — steps reference actual resource IDs, commands, or API calls
2. Ordered — sequential by default; parallel steps explicitly marked
3. Safe — every irreversible step (failover, restore, traffic cut) must have
   requiresApproval: true and a rollbackProcedure defined
4. Validated — each step must have measurable successCriteria
5. Versioned — increment version on every update; include changeReason

Generate steps that a human operator could execute without additional context.
Each step: title, description, command or API call, successCriteria,
requiresApproval, estimatedDurationMinutes, rollbackProcedure.
```

**Input:**
```typescript
{
  incidentType: string;              // e.g. 'database-failover', 'region-outage'
  triggeredByIncidentId?: string;   // link to incident that revealed need
  infraContext?: string;            // Terraform state JSON, K8s manifests, etc.
  existingRunbookId?: string;       // if updating
}
```

**Output (complete JSON):** `Runbook` with full `RunbookStep[]` array.

---

### Agent Handoff Protocol

Agents hand off via tool calls, not HTTP calls. The Orchestrator holds the top-level `generateText` loop; specialist agents are invoked as tool executions within that loop.

```typescript
// Orchestrator tool that invokes Triage as a sub-agent
const routeToTriageTool = tool({
  description: 'Route this incident to the Triage Agent for root cause analysis',
  parameters: z.object({
    incidentId: z.string(),
    context: z.string().optional(),
  }),
  execute: async ({ incidentId, context }) => {
    // POST to /api/agents/triage and collect result
    // OR inline: run triage generateText loop here and return summary
    const triageResult = await runTriageAgent({ incidentId, context });
    return triageResult;
  },
});
```

**Handoff data contract:** Each agent tool returns a summary string + structured result object. The Orchestrator uses these results to decide next steps in its own loop.

**Audit trail:** Every agent (Orchestrator and all specialists) calls `logAgentDecisionTool` at the end of each meaningful step. This writes an append-only `AgentLog` row to Postgres.

---

## 4. Data Model

All schemas are defined with Zod. TypeScript types are derived via `z.infer<>`. Postgres tables mirror the Zod schemas.

### Incident

```typescript
// lib/schemas/incident.ts

const LocationSchema = z.object({
  label: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  zipCode: z.string().optional(),
});

const MediaAssetSchema = z.object({
  url: z.string().url(),              // Vercel Blob URL
  type: z.enum(['image', 'audio', 'video']),
  mimeType: z.string(),
  uploadedAt: z.string().datetime(),
  sizeBytes: z.number().int(),
});

const ResourceRecommendationSchema = z.object({
  type: z.enum([
    'SEARCH_AND_RESCUE', 'MEDICAL', 'WATER_SUPPLY', 'SHELTER',
    'HEAVY_EQUIPMENT', 'HAZMAT', 'FOOD_SUPPLY', 'POWER_RESTORATION',
  ]),
  quantity: z.number().int().optional(),
  priority: z.enum(['immediate', 'urgent', 'standard']),
});

const AIAnalysisSchema = z.object({
  summary: z.string(),
  severityScore: z.number().min(1).max(10),
  severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  confidence: z.number().min(0).max(1),
  hazardsIdentified: z.array(z.string()),
  resourceRecommendations: z.array(ResourceRecommendationSchema),
  affectedPopulationEstimate: z.object({
    min: z.number(),
    max: z.number(),
  }).optional(),
  structuralDamage: z.string().optional(),
  accessRoutesClear: z.boolean().optional(),
  survivorIndicators: z.boolean().optional(),
  rootCause: z.string().optional(),
  blastRadius: z.string().optional(),
  rtoEstimateMinutes: z.number().optional(),
  rpoEstimateMinutes: z.number().optional(),
  rawTranscription: z.string().optional(),  // for voice-derived reports
});

const IncidentReportSchema = z.object({
  incidentId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  nimsCompliant: z.boolean().default(true),
  executiveSummary: z.string(),
  damageAssessment: z.string(),
  hazardIdentification: z.string(),
  affectedPopulationSection: z.string(),
  socialMediaIntelligenceSummary: z.string(),
  cameraEvidenceSummary: z.string(),
  resourceDeploymentRecord: z.string(),
  recommendedActions: z.array(z.string()),
  generatedByModel: z.string(),
});

const IncidentSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  title: z.string().min(1).max(255),
  type: z.enum(['flood', 'fire', 'structural', 'medical', 'hazmat', 'earthquake', 'other']),
  status: z.enum(['new', 'triaging', 'responding', 'resolved', 'closed']),
  location: LocationSchema,
  responderName: z.string(),
  mediaAssets: z.array(MediaAssetSchema).default([]),
  textDescription: z.string().optional(),
  sources: z.array(z.enum(['field', 'social', 'camera', 'integration', 'xbot'])),
  aiAnalysis: AIAnalysisSchema.optional(),
  report: IncidentReportSchema.optional(),
  linkedSocialSignalIds: z.array(z.string()).default([]),
  linkedCameraAlertIds: z.array(z.string().uuid()).default([]),
  linkedRunbookId: z.string().uuid().optional(),
  approvedBy: z.string().optional(),
  approvalNotes: z.string().optional(),
});
```

### SocialSignal

```typescript
// lib/schemas/social.ts

const SocialPostSchema = z.object({
  id: z.string(),
  platform: z.enum(['X', 'REDDIT', 'INSTAGRAM', 'NEXTDOOR']),
  handle: z.string(),
  text: z.string(),
  mediaUrls: z.array(z.string().url()).default([]),
  postedAt: z.string().datetime(),
  rawUrl: z.string().url(),
  location: z.object({
    label: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
});

const SocialSignalSchema = z.object({
  id: z.string().uuid(),
  post: SocialPostSchema,
  analyzedAt: z.string().datetime(),
  extractedLocation: z.string().nullable(),
  damageType: z.string().nullable(),
  severitySignal: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  credibility: z.enum(['HIGH', 'MEDIUM', 'UNVERIFIED', 'DISPUTED']),
  credibilityReason: z.string(),
  corroboratesIncidentId: z.string().uuid().nullable(),
  aiTags: z.array(z.string()).default([]),
});

// Schema returned by /api/analysis/social (batch)
const SocialBatchResultSchema = z.object({
  signals: z.array(z.object({
    postId: z.string(),
    extractedLocation: z.string().nullable(),
    damageType: z.string().nullable(),
    severitySignal: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
    credibility: z.enum(['HIGH', 'MEDIUM', 'UNVERIFIED', 'DISPUTED']),
    credibilityReason: z.string(),
    aiTags: z.array(z.string()),
  })),
});
```

### CameraFeed and CameraAlert

```typescript
// lib/schemas/camera.ts

const CameraFeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.object({
    label: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  sourceUrl: z.string(),                    // RTSP URL, HTTP stream URL, or local MP4 path
  status: z.enum(['MONITORING', 'ALERT', 'OFFLINE']),
  keyframeIntervalSeconds: z.number().int().min(1).default(5),
  monitoredEventTypes: z.array(z.string()).default(['Flooding', 'Fire', 'Structural Collapse', 'Crowd']),
  lastKeyframeAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

const CameraAlertSchema = z.object({
  id: z.string().uuid(),
  cameraId: z.string().uuid(),
  cameraName: z.string(),
  cameraLocation: z.string(),
  detectedAt: z.string().datetime(),
  keyframeUrl: z.string().url(),            // Vercel Blob URL of triggering frame
  detectionType: z.string(),                // "Flooding", "Structural collapse", "Fire"
  severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  confidence: z.number().min(0).max(1),
  aiDescription: z.string(),
  recommendedAction: z.string().nullable(),
  acknowledgedAt: z.string().datetime().nullable(),
  linkedIncidentId: z.string().uuid().nullable(),
});

// Schema for /api/analysis/camera response
const CameraFrameResultSchema = z.object({
  anomalyDetected: z.boolean(),
  detectionType: z.string().nullable(),
  severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  recommendedAction: z.string().nullable(),
});
```

### Sink and SinkDelivery

```typescript
// lib/schemas/sink.ts

const SinkFiltersSchema = z.object({
  eventTypes: z.array(z.string()),          // ["flooding", "fire", "structural"]
  minSeverity: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW']),
  zipCodes: z.array(z.string()).default([]), // empty = all geographies
});

const SinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum(['INSURANCE', 'NEWSROOM', 'UTILITY', 'MUNICIPAL', 'CUSTOM']),
  type: z.enum(['WEBHOOK', 'EMAIL_DIGEST', 'API_PULL']),
  endpointUrl: z.string().url().optional(),   // WEBHOOK type
  emailAddress: z.string().email().optional(), // EMAIL_DIGEST type
  authHeader: z.string().optional(),           // Bearer token for webhook auth
  payloadFormat: z.enum(['JSON', 'MARKDOWN']),
  filters: SinkFiltersSchema,
  status: z.enum(['ACTIVE', 'PAUSED', 'ERROR']),
  lastDeliveredAt: z.string().datetime().nullable(),
  lastDeliveryStatusCode: z.number().int().nullable(),
  deliveryCount30d: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SinkDeliverySchema = z.object({
  id: z.string().uuid(),
  sinkId: z.string().uuid(),
  incidentId: z.string().uuid(),
  sourceType: z.enum(['FIELD_REPORT', 'X_BOT', 'SOCIAL_SIGNAL', 'CAMERA_ALERT']),
  deliveredAt: z.string().datetime(),
  httpStatusCode: z.number().int().nullable(),
  success: z.boolean(),
  errorMessage: z.string().nullable(),
  payloadSnapshot: z.string(),               // JSON stringified payload sent
  attemptCount: z.number().int().default(1),
});

// Standard sink payload — sent to all WEBHOOK sinks
const SinkPayloadSchema = z.object({
  source: z.enum(['canary_field', 'canary_xbot', 'canary_social', 'canary_camera']),
  eventId: z.string().uuid(),
  receivedAt: z.string().datetime(),
  incidentId: z.string().uuid().optional(),
  analysis: z.object({
    location: z.string().nullable(),
    damageType: z.string().nullable(),
    severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
    credibility: z.enum(['HIGH', 'MEDIUM', 'UNVERIFIED', 'DISPUTED']).optional(),
    summary: z.string(),
    aiTags: z.array(z.string()),
  }),
  sourceData: z.record(z.unknown()),          // raw tweet, field report excerpt, etc.
  mediaUrls: z.array(z.string().url()).default([]),
});
```

### Subscriber

```typescript
// lib/schemas/subscriber.ts

const SubscriberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().optional(),
  zipCodes: z.array(z.string()).min(1).max(5),
  channel: z.enum(['EMAIL', 'SMS', 'BOTH']),
  severityThreshold: z.enum(['CRITICAL_ONLY', 'HIGH_AND_CRITICAL', 'ALL']),
  confirmed: z.boolean().default(false),
  confirmationToken: z.string(),              // for unsubscribe link
  confirmedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

const ZipAlertNotificationSchema = z.object({
  id: z.string().uuid(),
  subscriberId: z.string().uuid(),
  incidentId: z.string().uuid(),
  zipCode: z.string(),
  channel: z.enum(['EMAIL', 'SMS', 'BOTH']),
  sentAt: z.string().datetime(),
  delivered: z.boolean(),
  plainLanguageSummary: z.string(),          // Gemini-generated consumer alert text
  resendMessageId: z.string().optional(),    // Resend delivery ID
});
```

### AgentLog

```typescript
// lib/schemas/agent.ts

const AgentLogSchema = z.object({
  id: z.string().uuid(),
  agentType: z.enum(['orchestrator', 'triage', 'recovery', 'compliance', 'runbook']),
  incidentId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  stepIndex: z.number().int(),
  decisionRationale: z.string(),
  confidenceScore: z.number().min(0).max(1).optional(),
  actionsTaken: z.array(z.string()),         // tool names called
  actionsEscalated: z.array(z.string()),     // actions passed to human
  rollbackPlan: z.string().optional(),
  toolCalls: z.array(z.object({
    toolName: z.string(),
    input: z.record(z.unknown()),
    output: z.record(z.unknown()),
    durationMs: z.number().int(),
  })).default([]),
  modelId: z.string(),
  tokenUsage: z.object({
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
  }).optional(),
});
```

### Runbook and RunbookStep

```typescript
// lib/schemas/runbook.ts

const RunbookStepSchema = z.object({
  id: z.string().uuid(),
  runbookId: z.string().uuid(),
  stepOrder: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
  commandOrApiCall: z.string().optional(),   // executable command or API spec
  requiresApproval: z.boolean().default(false),
  estimatedDurationMinutes: z.number().int().optional(),
  successCriteria: z.string(),               // how to verify the step worked
  rollbackProcedure: z.string().optional(),
  parallelWith: z.array(z.string().uuid()).default([]),  // step IDs that can run in parallel
  status: z.enum(['pending', 'in_progress', 'complete', 'failed', 'skipped']).default('pending'),
  executedAt: z.string().datetime().nullable(),
  executionResult: z.string().nullable(),
});

const RunbookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  incidentType: z.string(),                  // e.g. "database-failover", "region-outage"
  description: z.string(),
  version: z.number().int().default(1),
  changeReason: z.string().optional(),
  steps: z.array(RunbookStepSchema),
  validatedAt: z.string().datetime().nullable(),
  validatedByIncidentId: z.string().uuid().nullable(),
  generatedByModel: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

### XBotMention

```typescript
const XBotMentionSchema = z.object({
  id: z.string().uuid(),
  tweetId: z.string(),
  authorHandle: z.string(),
  text: z.string(),
  mediaUrls: z.array(z.string().url()).default([]),
  receivedAt: z.string().datetime(),
  processingStatus: z.enum(['PENDING', 'ANALYZING', 'DISPATCHED', 'FAILED']),
  geminiAnalysis: z.object({
    extractedLocation: z.string().nullable(),
    damageType: z.string().nullable(),
    severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
    credibility: z.enum(['HIGH', 'MEDIUM', 'UNVERIFIED', 'DISPUTED']),
    summary: z.string(),
    aiTags: z.array(z.string()),
  }).nullable(),
  sinksDispatched: z.array(z.string().uuid()).default([]),
  linkedIncidentId: z.string().uuid().nullable(),
});
```

---

## 5. Vercel Infrastructure

### Fluid Compute Configuration

All AI routes must opt into Fluid Compute by setting `maxDuration`. Fluid Compute is enabled globally via `vercel.json`.

**`vercel.json`:**
```json
{
  "fluid": true,
  "functions": {
    "app/api/agents/**": {
      "maxDuration": 300
    },
    "app/api/analysis/**": {
      "maxDuration": 300
    },
    "app/api/social/brief/route.ts": {
      "maxDuration": 120
    },
    "app/api/xbot/webhook/route.ts": {
      "maxDuration": 60
    },
    "app/api/subscribers/notify/route.ts": {
      "maxDuration": 120
    }
  }
}
```

**Per-route declarations** (also required in each route file):
```typescript
export const runtime = 'nodejs';    // required — Edge runtime lacks full Node APIs
export const maxDuration = 300;     // activates Fluid Compute for this route
export const dynamic = 'force-dynamic';  // disable static caching for AI routes
```

**Why Fluid Compute:**
- AI inference has long idle periods (waiting for Gemini token generation); Fluid only bills active CPU, not wait time — up to 95% cost savings vs standard serverless.
- In-function concurrency allows multiple simultaneous streaming requests to share one warm instance.
- `waitUntil()` enables fire-and-forget post-response tasks (audit log writes, sink dispatch) without blocking the response stream.

**`waitUntil` pattern for non-blocking sink dispatch:**
```typescript
import { after } from 'next/server';

// After streaming response is sent, dispatch to sinks in background
after(async () => {
  await dispatchToMatchingSinks({ incidentId, payload });
  await persistAgentLog(logData);
});
```

---

### Vercel Blob Storage

Used for all binary file storage: uploaded photos, audio voice memos, video keyframes, and report attachments.

**Key operations:**

| Operation | Function | Use Case |
|---|---|---|
| Upload from client | `upload()` — client-side direct upload | Photos/audio from field responder UI |
| Upload from server | `put()` — server-side upload | Camera keyframes extracted server-side |
| Retrieve bytes | `fetch(url)` — standard fetch to Blob URL | Fetch media bytes for Gemini multimodal input |
| Delete | `del(url)` | Cleanup old keyframes |
| List | `list({ prefix })` | Admin view of stored assets |

**Blob URL patterns:**
- Photos: `https://[token].public.blob.vercel-storage.com/incidents/[incidentId]/photo-[timestamp].jpg`
- Keyframes: `https://[token].public.blob.vercel-storage.com/cameras/[cameraId]/frame-[timestamp].png`
- Audio: `https://[token].public.blob.vercel-storage.com/incidents/[incidentId]/voice-[timestamp].webm`

**Client-side upload pattern** (avoids 4.5MB body limit):
```typescript
// Client calls Blob directly — server returns URL
const { url } = await upload(filename, file, {
  access: 'public',
  handleUploadUrl: '/api/blob/upload',  // server-side token exchange
});
```

---

### Vercel KV (Redis) — Pub/Sub and Ephemeral State

| Use Case | KV Pattern | Key Pattern |
|---|---|---|
| Active incident state cache | `SET` with TTL | `incident:{id}:state` (TTL: 1h) |
| Social signal stream buffer | `LPUSH` / `LRANGE` | `social:feed:buffer` (list, max 500 items) |
| Camera alert deduplication | `SET NX` with TTL | `camera:{id}:last_alert:{hash}` (TTL: 60s) |
| Rate limiting per IP | `INCR` + `EXPIRE` | `ratelimit:{ip}:{route}:{minute}` |
| X webhook CRC state | `SET` with TTL | `xbot:crc:pending:{token}` (TTL: 5m) |
| Subscriber confirmation tokens | `SET` with TTL | `subscriber:confirm:{token}` (TTL: 48h) |
| Sink delivery retry queue | Sorted Set by retry time | `sink:retry:queue` |
| Agent loop state (mid-execution) | `SET` with TTL | `agent:{runId}:state` (TTL: 10m) |

**Pub/Sub for real-time dashboard updates:**
```typescript
// Publisher (in API route after incident created)
await kv.publish('incidents:updates', JSON.stringify({ type: 'INCIDENT_CREATED', incidentId }));

// Subscriber (in SSE route handler — see Real-Time Strategy section)
const subscriber = kv.subscribe('incidents:updates');
```

---

### Vercel Postgres (Neon) Schema

All tables use UUID primary keys generated server-side with `crypto.randomUUID()`. Timestamps are `TIMESTAMPTZ` stored as ISO 8601 strings in the application layer.

```sql
-- Incidents
CREATE TABLE incidents (
  id              UUID PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('flood','fire','structural','medical','hazmat','earthquake','other')),
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaging','responding','resolved','closed')),
  location_label  TEXT,
  location_lat    DOUBLE PRECISION,
  location_lng    DOUBLE PRECISION,
  location_zip    TEXT,
  responder_name  TEXT NOT NULL,
  text_description TEXT,
  sources         TEXT[] NOT NULL DEFAULT '{}',
  ai_analysis     JSONB,          -- AIAnalysisSchema
  approved_by     TEXT,
  approval_notes  TEXT
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_zip ON incidents(location_zip);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);

-- Incident Reports (separate table for large report text)
CREATE TABLE incident_reports (
  id              UUID PRIMARY KEY,
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executive_summary TEXT NOT NULL,
  damage_assessment TEXT NOT NULL,
  hazard_identification TEXT NOT NULL,
  affected_population_section TEXT,
  social_media_intelligence_summary TEXT,
  camera_evidence_summary TEXT,
  resource_deployment_record TEXT,
  recommended_actions TEXT[] NOT NULL DEFAULT '{}',
  generated_by_model TEXT NOT NULL,
  full_report_blob_url TEXT         -- Vercel Blob URL for PDF export
);

-- Media Assets
CREATE TABLE media_assets (
  id              UUID PRIMARY KEY,
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  blob_url        TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('image','audio','video')),
  mime_type       TEXT NOT NULL,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  size_bytes      BIGINT NOT NULL
);

-- Social Signals
CREATE TABLE social_signals (
  id              UUID PRIMARY KEY,
  post_id         TEXT NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('X','REDDIT','INSTAGRAM','NEXTDOOR')),
  handle          TEXT NOT NULL,
  text            TEXT NOT NULL,
  media_urls      TEXT[] DEFAULT '{}',
  posted_at       TIMESTAMPTZ NOT NULL,
  raw_url         TEXT NOT NULL,
  post_location_label TEXT,
  post_location_lat   DOUBLE PRECISION,
  post_location_lng   DOUBLE PRECISION,
  analyzed_at     TIMESTAMPTZ,
  extracted_location TEXT,
  damage_type     TEXT,
  severity_signal TEXT CHECK (severity_signal IN ('CRITICAL','HIGH','MODERATE','LOW','UNKNOWN')),
  credibility     TEXT CHECK (credibility IN ('HIGH','MEDIUM','UNVERIFIED','DISPUTED')),
  credibility_reason TEXT,
  corroborates_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  ai_tags         TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_social_incident ON social_signals(corroborates_incident_id);
CREATE INDEX idx_social_posted ON social_signals(posted_at DESC);
CREATE INDEX idx_social_platform ON social_signals(platform);

-- Camera Feeds
CREATE TABLE camera_feeds (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  location_label  TEXT NOT NULL,
  location_lat    DOUBLE PRECISION,
  location_lng    DOUBLE PRECISION,
  source_url      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'MONITORING' CHECK (status IN ('MONITORING','ALERT','OFFLINE')),
  keyframe_interval_seconds INTEGER NOT NULL DEFAULT 5,
  monitored_event_types TEXT[] DEFAULT '{}',
  last_keyframe_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Camera Alerts
CREATE TABLE camera_alerts (
  id              UUID PRIMARY KEY,
  camera_id       UUID NOT NULL REFERENCES camera_feeds(id) ON DELETE CASCADE,
  camera_name     TEXT NOT NULL,
  camera_location TEXT NOT NULL,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  keyframe_url    TEXT NOT NULL,
  detection_type  TEXT NOT NULL,
  severity_level  TEXT NOT NULL CHECK (severity_level IN ('CRITICAL','HIGH','MODERATE','LOW','UNKNOWN')),
  confidence      DOUBLE PRECISION NOT NULL,
  ai_description  TEXT NOT NULL,
  recommended_action TEXT,
  acknowledged_at TIMESTAMPTZ,
  linked_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL
);

CREATE INDEX idx_camera_alerts_camera ON camera_alerts(camera_id);
CREATE INDEX idx_camera_alerts_detected ON camera_alerts(detected_at DESC);

-- Sinks
CREATE TABLE sinks (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('INSURANCE','NEWSROOM','UTILITY','MUNICIPAL','CUSTOM')),
  type            TEXT NOT NULL CHECK (type IN ('WEBHOOK','EMAIL_DIGEST','API_PULL')),
  endpoint_url    TEXT,
  email_address   TEXT,
  auth_header     TEXT,               -- stored encrypted at rest
  payload_format  TEXT NOT NULL DEFAULT 'JSON' CHECK (payload_format IN ('JSON','MARKDOWN')),
  filters_event_types TEXT[] DEFAULT '{}',
  filters_min_severity TEXT NOT NULL DEFAULT 'LOW',
  filters_zip_codes TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','ERROR')),
  last_delivered_at TIMESTAMPTZ,
  last_delivery_status_code INTEGER,
  delivery_count_30d INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sink Deliveries (audit log)
CREATE TABLE sink_deliveries (
  id              UUID PRIMARY KEY,
  sink_id         UUID NOT NULL REFERENCES sinks(id) ON DELETE CASCADE,
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN ('FIELD_REPORT','X_BOT','SOCIAL_SIGNAL','CAMERA_ALERT')),
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  http_status_code INTEGER,
  success         BOOLEAN NOT NULL,
  error_message   TEXT,
  payload_snapshot TEXT NOT NULL,      -- JSON string
  attempt_count   INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_sink_deliveries_sink ON sink_deliveries(sink_id);
CREATE INDEX idx_sink_deliveries_incident ON sink_deliveries(incident_id);

-- Subscribers
CREATE TABLE subscribers (
  id              UUID PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  zip_codes       TEXT[] NOT NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('EMAIL','SMS','BOTH')),
  severity_threshold TEXT NOT NULL CHECK (severity_threshold IN ('CRITICAL_ONLY','HIGH_AND_CRITICAL','ALL')),
  confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_token TEXT NOT NULL UNIQUE,
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscribers_zip ON subscribers USING GIN(zip_codes);

-- Zip Alert Notifications
CREATE TABLE zip_alert_notifications (
  id              UUID PRIMARY KEY,
  subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  zip_code        TEXT NOT NULL,
  channel         TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  plain_language_summary TEXT NOT NULL,
  resend_message_id TEXT
);

-- X Bot Mentions
CREATE TABLE xbot_mentions (
  id              UUID PRIMARY KEY,
  tweet_id        TEXT NOT NULL UNIQUE,
  author_handle   TEXT NOT NULL,
  text            TEXT NOT NULL,
  media_urls      TEXT[] DEFAULT '{}',
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING','ANALYZING','DISPATCHED','FAILED')),
  gemini_analysis JSONB,              -- structured extraction result
  sinks_dispatched UUID[] DEFAULT '{}',
  linked_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL
);

-- Runbooks
CREATE TABLE runbooks (
  id              UUID PRIMARY KEY,
  title           TEXT NOT NULL,
  incident_type   TEXT NOT NULL,
  description     TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  change_reason   TEXT,
  validated_at    TIMESTAMPTZ,
  validated_by_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  generated_by_model TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Runbook Steps
CREATE TABLE runbook_steps (
  id              UUID PRIMARY KEY,
  runbook_id      UUID NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE,
  step_order      INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  command_or_api_call TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_duration_minutes INTEGER,
  success_criteria TEXT NOT NULL,
  rollback_procedure TEXT,
  parallel_with   UUID[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','complete','failed','skipped')),
  executed_at     TIMESTAMPTZ,
  execution_result TEXT,
  UNIQUE(runbook_id, step_order)
);

-- Agent Logs (append-only audit trail)
CREATE TABLE agent_logs (
  id              UUID PRIMARY KEY,
  agent_type      TEXT NOT NULL CHECK (agent_type IN ('orchestrator','triage','recovery','compliance','runbook')),
  incident_id     UUID REFERENCES incidents(id) ON DELETE SET NULL,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  step_index      INTEGER NOT NULL,
  decision_rationale TEXT NOT NULL,
  confidence_score DOUBLE PRECISION,
  actions_taken   TEXT[] DEFAULT '{}',
  actions_escalated TEXT[] DEFAULT '{}',
  rollback_plan   TEXT,
  tool_calls      JSONB NOT NULL DEFAULT '[]',
  model_id        TEXT NOT NULL,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER
);

CREATE INDEX idx_agent_logs_incident ON agent_logs(incident_id);
CREATE INDEX idx_agent_logs_agent_type ON agent_logs(agent_type);
CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp DESC);
```

**Table Relationships:**
- `incidents` ← `media_assets` (1:many)
- `incidents` ← `incident_reports` (1:1)
- `incidents` ← `social_signals.corroborates_incident_id` (1:many)
- `incidents` ← `camera_alerts.linked_incident_id` (1:many)
- `incidents` ← `agent_logs.incident_id` (1:many)
- `incidents` ← `xbot_mentions.linked_incident_id` (1:many)
- `camera_feeds` ← `camera_alerts` (1:many)
- `sinks` ← `sink_deliveries` (1:many)
- `subscribers` ← `zip_alert_notifications` (1:many)
- `runbooks` ← `runbook_steps` (1:many)

---

### Environment Variables

```bash
# ─── Google AI ───────────────────────────────────────────────────
GOOGLE_GENERATIVE_AI_API_KEY=          # @ai-sdk/google — Gemini API key

# ─── Vercel Storage ──────────────────────────────────────────────
POSTGRES_URL=                          # Vercel Postgres connection string (pooled)
POSTGRES_URL_NON_POOLING=              # Direct connection for migrations
BLOB_READ_WRITE_TOKEN=                 # Vercel Blob read/write token
KV_URL=                                # Vercel KV Redis URL
KV_REST_API_URL=                       # KV REST API endpoint
KV_REST_API_TOKEN=                     # KV REST API token
KV_REST_API_READ_ONLY_TOKEN=           # KV read-only token (optional)

# ─── X API v2 ────────────────────────────────────────────────────
X_API_KEY=                             # OAuth 1.0a consumer key
X_API_SECRET=                          # OAuth 1.0a consumer secret
X_ACCESS_TOKEN=                        # OAuth 1.0a access token
X_ACCESS_TOKEN_SECRET=                 # OAuth 1.0a access token secret
X_BEARER_TOKEN=                        # OAuth 2.0 bearer token (filtered stream)
X_WEBHOOK_SECRET=                      # HMAC-SHA256 secret for CRC verification

# ─── Resend (Email) ───────────────────────────────────────────────
RESEND_API_KEY=                        # Resend transactional email API key
RESEND_FROM_ADDRESS=alerts@canary.app  # Verified sender address

# ─── Integrations (Cloud Monitoring) ─────────────────────────────
DATADOG_API_KEY=                       # Datadog API key (optional — stub if absent)
DATADOG_APP_KEY=                       # Datadog application key
AWS_ACCESS_KEY_ID=                     # AWS credentials for CloudWatch
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
PAGERDUTY_INTEGRATION_KEY=             # PagerDuty Events API v2 routing key
PAGERDUTY_WEBHOOK_SECRET=              # PagerDuty webhook signature secret

# ─── Internal ─────────────────────────────────────────────────────
CANARY_INTERNAL_API_SECRET=            # Shared secret for internal route-to-route calls
NEXT_PUBLIC_APP_URL=https://canary.app # Base URL for subscription confirmation links

# ─── Telemetry (optional) ─────────────────────────────────────────
OTEL_EXPORTER_OTLP_ENDPOINT=          # OpenTelemetry collector endpoint
```

---

## 6. AI Pipeline Patterns

### Function Selection Rationale

| Route / Feature | AI SDK Function | Reason |
|---|---|---|
| `/api/analysis/voice` | `streamObject` | Audio → structured `IncidentReportSchema`. Streaming lets UI render partial fields as Gemini fills them — critical for "wow" demo moment |
| `/api/analysis/photo` | `streamObject` | Vision → structured `AIAnalysisSchema`. Same rationale — streaming partial JSON shows real-time analysis |
| `/api/analysis/social` | `generateObject` | Batch of posts → structured array. Non-streaming is fine; batch completes fast. UI updates atomically |
| `/api/analysis/camera` | `generateObject` | Single frame → binary anomaly result. Fast, structured, non-streaming. Alert card appears instantly on return |
| `/api/analysis/report` | `streamText` | NIMS report is long-form prose. `streamText` lets the report render progressively, feels live. Gemini 2.5 Pro for reasoning quality |
| `/api/agents/orchestrate` | `streamText` + tools + `stopWhen` | Multi-step agent loop with tool calls. Streaming lets UI show "Orchestrator is routing to Triage Agent..." in real-time |
| `/api/agents/triage` | `streamText` + tools + `stopWhen` | Multi-step reasoning loop. Streaming surfaces root-cause analysis as it develops |
| `/api/agents/recovery` | `streamText` + tools + `needsApproval` | Step execution with HITL gates. Streaming shows step progress; `needsApproval: true` on irreversible tool calls pauses for approval |
| `/api/agents/compliance` | `generateObject` | Structured compliance report. `gemini-2.5-pro` for accurate framework mapping. Complete JSON preferred over streaming for compliance evidence |
| `/api/agents/runbook` | `generateObject` | Structured runbook with ordered steps. `gemini-2.5-pro` for IaC reasoning. Complete JSON required — partial runbooks are dangerous |
| `/api/social/brief` | `streamText` | Situation summary prose. Streaming renders brief progressively. `gemini-2.5-pro` for synthesis quality |
| `/api/subscribers/notify` | `generateText` | One-shot plain-language alert copy. Non-streaming — result is sent via email, not rendered live. Fast `gemini-2.0-flash` |
| X Bot processing | `generateObject` | Extract structured fields from tweet. Non-streaming — result feeds sink dispatch immediately |

### Model Selection Rationale

| Model | Used For | Reason |
|---|---|---|
| `gemini-2.0-flash` | All high-throughput paths: photo analysis, social analysis, camera analysis, orchestrator, triage, recovery, subscriber alert copy | Lowest latency, best price/performance, native multimodal. Handles image + audio + video natively. 1M token context for long incident histories |
| `gemini-2.5-pro` | Runbook generation, compliance mapping, social intelligence brief, full NIMS report | Complex multi-step reasoning where output quality directly affects operational outcomes. Worth higher cost and latency for compliance accuracy and runbook correctness |
| `text-embedding-004` (via `@ai-sdk/google`) | RAG over runbook library and incident history (future iteration) | Google-native embedding, compatible with Neon pgvector without cross-provider setup |

### Multimodal Content Part Construction

Gemini 2.0 Flash accepts inline media via `content parts`. Example for photo analysis:

```typescript
// lib/agents/tools pattern for multimodal input
const messages = [
  {
    role: 'user' as const,
    content: [
      { type: 'image' as const, image: blobUrl },  // Blob URL — Gemini fetches it
      { type: 'text' as const, text: PHOTO_ANALYSIS_PROMPT },
    ],
  },
];
```

For voice analysis, pass `ArrayBuffer` with mimeType:
```typescript
{ type: 'file' as const, data: await audioFile.arrayBuffer(), mimeType: 'audio/webm' }
```

For camera keyframes, pass base64 PNG:
```typescript
{ type: 'image' as const, image: frameBase64, mimeType: 'image/png' }
```

### Agent Loop Configuration

```typescript
// Standard agent loop pattern — used in orchestrator, triage, recovery
import { streamText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';

const result = streamText({
  model: google('gemini-2.0-flash'),
  system: AGENT_SYSTEM_PROMPT,
  tools: agentTools,
  toolChoice: 'auto',
  stopWhen: stepCountIs(15),        // safety cap — prevents runaway loops
  prompt: alertContext,
  onStepFinish: async ({ stepType, text, toolCalls, toolResults, usage }) => {
    // Append step to agent log — non-blocking via after()
    after(async () => {
      await logAgentStep({ agentType, incidentId, stepType, text, toolCalls, usage });
    });
  },
  onFinish: async ({ text, steps, totalUsage }) => {
    after(async () => {
      await persistFinalAgentLog({ agentType, incidentId, steps, totalUsage });
    });
  },
  experimental_telemetry: {
    isEnabled: true,
    functionId: `agent-${agentType}`,
    metadata: { incidentId },
  },
});

return result.toUIMessageStreamResponse();
```

### Context Caching

For the Compliance and Runbook agents that repeatedly query large compliance framework documents (SOC 2 controls, ISO 22301 clauses), Gemini's automatic implicit caching reduces latency and cost on repeated calls. No configuration needed — `@ai-sdk/google` enables it automatically when the same content appears in the system prompt.

```typescript
// Large framework document injected once — cached automatically by Gemini
const { object } = await generateObject({
  model: google('gemini-2.5-pro'),
  system: `${COMPLIANCE_SYSTEM_PROMPT}\n\n${SOC2_CONTROLS_DOCUMENT}\n\n${ISO22301_CLAUSES}`,
  schema: ComplianceReportSchema,
  prompt: incidentContext,
});
```

---

## 7. External Integrations

### Google Gemini via `@ai-sdk/google`

**Setup (`lib/ai.ts`):**
```typescript
import { google } from '@ai-sdk/google';

// Fast, multimodal — default for all high-throughput routes
export const geminiFlash = google('gemini-2.0-flash');

// Reasoning-optimized — for runbook gen, compliance, NIMS reports, social briefs
export const geminiPro = google('gemini-2.5-pro');

// Embeddings — for future RAG over runbook library
export const geminiEmbedding = google.textEmbeddingModel('text-embedding-004');
```

**Model Capabilities Summary:**

| Model | Context Window | Multimodal Inputs | Streaming | Best For |
|---|---|---|---|---|
| `gemini-2.0-flash` | 1M tokens | Image, Audio, Video, Text | Yes | All real-time paths |
| `gemini-2.5-pro` | 1M tokens | Image, Audio, Video, Text | Yes | Complex reasoning |
| `text-embedding-004` | 2048 tokens (input) | Text | No | Semantic similarity |

**Error handling:** Wrap all `generateObject` / `streamObject` calls with retry on `429 Too Many Requests`:
```typescript
import { generateObject } from 'ai';
// AI SDK 6 retries on rate limit by default (maxRetries: 2)
// Override: { maxRetries: 3 }
```

---

### X API v2 — Webhook and Filtered Stream

**Setup (`lib/integrations/xapi.ts`):**

Two integration modes:

**Mode 1 — Account Activity API Webhook (production):**
- Register webhook URL: `POST /api/xbot/webhook` with X Account Activity API
- Receive `mention_create` events for the `@CanaryAlert` account
- CRC challenge response required on `GET /api/xbot/webhook?crc_token=...`

**CRC Verification:**
```typescript
import { createHmac } from 'crypto';

export function generateCRCResponse(crcToken: string): string {
  const hmac = createHmac('sha256', process.env.X_WEBHOOK_SECRET!);
  hmac.update(crcToken);
  return `sha256=${hmac.digest('base64')}`;
}

// GET handler in /api/xbot/webhook/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const crcToken = searchParams.get('crc_token');
  if (!crcToken) return new Response('Missing crc_token', { status: 400 });
  return Response.json({ response_token: generateCRCResponse(crcToken) });
}
```

**Webhook Signature Verification (POST handler):**
```typescript
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-twitter-webhooks-signature');

  const expectedSig = `sha256=${createHmac('sha256', process.env.X_WEBHOOK_SECRET!)
    .update(body)
    .digest('base64')}`;

  if (signature !== expectedSig) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(body);
  // Process mention_create events
  for (const event of payload.tweet_create_events ?? []) {
    await kv.lpush('xbot:pending_mentions', JSON.stringify(event));
  }

  return Response.json({ received: true });
}
```

**Mode 2 — Filtered Stream (alternative / monitoring additional keywords):**
```typescript
// X API v2 filtered stream — connect and handle tweet stream
const stream = await fetchFilteredStream(bearerToken, ['@CanaryAlert', '#CanaryAlert']);
for await (const tweet of stream) {
  await processXBotMention(tweet);
}
```

**X Bot Processing Pipeline (async, called from `/api/xbot/webhook`):**
1. Extract tweet text + media URLs
2. Fetch media bytes from Twitter CDN
3. `generateObject` with `geminiFlash` → structured analysis
4. Match against registered sinks (filter check: event type, severity, zip code)
5. Parallel `POST` to each matching sink endpoint
6. Persist `XBotMention` + `SinkDelivery` records
7. If severity `HIGH` or `CRITICAL`: auto-create linked `Incident`

---

### Resend — Email Alerts

**Setup (`lib/integrations/resend.ts`):**
```typescript
import { Resend } from 'resend';
export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Two email types:**

**1. Subscriber Alert Email:**
```typescript
await resend.emails.send({
  from: process.env.RESEND_FROM_ADDRESS,
  to: subscriber.email,
  subject: `⚠ ${severityLevel} alert — ${zipCode}`,
  html: buildSubscriberAlertHtml({
    plainLanguageSummary,
    incidentId,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    unsubscribeToken: subscriber.confirmationToken,
  }),
});
```

**2. Subscription Confirmation Email:**
```typescript
await resend.emails.send({
  from: process.env.RESEND_FROM_ADDRESS,
  to: email,
  subject: 'Confirm your Canary alert subscription',
  html: buildConfirmationHtml({ confirmationUrl }),
});
```

---

### Webhook Sink Delivery with Retry Logic

**`lib/integrations/sinkDelivery.ts` — core delivery engine:**

```
Retry schedule:
  Attempt 1:  Immediately
  Attempt 2:  30 seconds
  Attempt 3:  5 minutes
  Attempt 4:  30 minutes
  Attempt 5:  2 hours
  After 5 failures: mark sink status = 'ERROR'; stop retrying
```

**Delivery logic:**
1. POST to `sink.endpointUrl` with `SinkPayload` JSON
2. Set `Authorization: ${sink.authHeader}` if configured
3. Set `Content-Type: application/json`
4. Timeout: 10 seconds
5. On `2xx` → mark delivery `success: true`; update `sink.lastDeliveredAt` and `lastDeliveryStatusCode`
6. On `4xx` → do NOT retry (client error); mark `success: false`; log error
7. On `5xx` or network error → schedule retry via KV sorted set:

```typescript
// Schedule retry
const retryAt = Date.now() + RETRY_DELAYS_MS[attemptCount];
await kv.zadd('sink:retry:queue', { score: retryAt, member: deliveryId });

// Retry worker (called by cron or background job)
const due = await kv.zrangebyscore('sink:retry:queue', '-inf', Date.now(), { limit: 50 });
for (const deliveryId of due) {
  await retryDelivery(deliveryId);
  await kv.zrem('sink:retry:queue', deliveryId);
}
```

---

## 8. Real-Time Strategy

### Strategy Matrix

| Feature | Mechanism | Reason |
|---|---|---|
| AI analysis streaming (voice, photo, report) | **AI SDK `streamObject` / `streamText` → SSE** | AI SDK's `.toTextStreamResponse()` and `.toUIMessageStreamResponse()` return `ReadableStream` over HTTP — natural SSE. No WebSocket needed for unidirectional server-to-client push |
| Agent loop streaming (orchestrator, triage, recovery) | **AI SDK `streamText` → SSE via `toUIMessageStreamResponse()`** | Same SSE mechanism; client uses `useChat` hook which handles reconnect, tool-call UI events, and approval gate rendering |
| Dashboard live updates (new incidents, alerts) | **Server-Sent Events (custom SSE route)** | Dashboard needs to be notified when any new incident/camera alert/social signal arrives. SSE (not WebSocket) because updates are unidirectional (server → client). Client uses native `EventSource` API |
| Camera keyframe analysis loop | **Client polling** (every N seconds canvas extract → `POST /api/analysis/camera`) | For MVP: client drives the loop. In production: server-side ffmpeg keyframe extraction with SSE push-back of alerts |
| Social signal feed | **Polling** (`GET /api/social/feed` every 30s) | Social signals arrive in batches, not continuously. Polling sufficient; SSE would be over-engineered for batch ingestion |
| X Bot sink dispatch status | **Polling** (`GET /api/xbot/log`) | Low-frequency admin view. Polling at 10s interval acceptable |
| Human-in-the-loop approval gates | **AI SDK tool `needsApproval: true` → SSE `tool-approval-request` part** | AI SDK 6 native HITL mechanism. Agent loop pauses mid-stream; client renders approval UI from the `tool-approval-request` message part; user responds via `addToolApprovalResponse()` |

### Custom SSE Route for Dashboard

```typescript
// app/api/stream/dashboard/route.ts
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Subscribe to KV pub/sub channels
      const sub = kv.subscribe([
        'incidents:updates',
        'camera:alerts',
        'social:signals',
      ]);

      for await (const message of sub) {
        send(message.channel, JSON.parse(message.message));
      }
    },
    cancel() {
      // KV subscription cleanup handled by GC / connection drop
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // disable Nginx buffering on Vercel
    },
  });
}
```

**Why SSE over WebSocket:**
- All Canary real-time updates are unidirectional (server → client). WebSocket's bidirectional channel is unnecessary overhead.
- SSE works natively over HTTP/2, is proxy-friendly, and reconnects automatically via `EventSource`.
- Vercel Fluid Compute handles long-lived SSE connections efficiently with in-function concurrency.

**Why AI SDK streaming over raw SSE for AI routes:**
- `streamText().toUIMessageStreamResponse()` sends a rich event stream including `text-delta`, `tool-call`, `tool-result`, `tool-approval-request`, and `finish` events — all typed and handled by `useChat` on the client.
- Building this event protocol manually would duplicate work the AI SDK already provides.

---

## 9. Security Considerations

### Rate Limiting

All public-facing routes are rate-limited using Vercel KV with a sliding window counter:

```typescript
// lib/rateLimit.ts
import { kv } from '@vercel/kv';

export async function rateLimit(
  identifier: string,  // IP address or API key
  route: string,
  limit: number,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}:${route}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, windowSeconds);
  }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
```

**Per-route limits:**

| Route | Limit | Window | Identifier |
|---|---|---|---|
| `POST /api/analysis/*` | 20 req | 60s | IP address |
| `POST /api/agents/*` | 5 req | 60s | IP address |
| `POST /api/incidents` | 30 req | 60s | IP address |
| `POST /api/subscribers` | 10 req | 300s | IP address |
| `POST /api/xbot/webhook` | 1000 req | 60s | X-signed requests only |
| `POST /api/integrations/webhook` | 500 req | 60s | Known provider IPs |
| `POST /api/sinks/[id]/test` | 5 req | 300s | IP address |

Rate limit response:
```typescript
if (!allowed) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: { 'Retry-After': windowSeconds.toString() },
  });
}
```

---

### Webhook Signature Verification

**X API v2 (HMAC-SHA256):** Described in Section 7. All POST requests to `/api/xbot/webhook` must pass signature check before any processing.

**PagerDuty (HMAC-SHA256):**
```typescript
export function verifyPagerDutySignature(body: string, signature: string): boolean {
  const hmac = createHmac('sha256', process.env.PAGERDUTY_WEBHOOK_SECRET!);
  hmac.update(`v1:${body}`);
  const expected = `v1=${hmac.digest('hex')}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

**Datadog (shared secret header):**
```typescript
export function verifyDatadogWebhook(req: Request): boolean {
  const secret = req.headers.get('x-datadog-secret');
  return secret === process.env.DATADOG_WEBHOOK_SECRET;
}
```

All signature verification uses `timingSafeEqual` from Node.js `crypto` to prevent timing attacks.

**Internal routes** (`/api/subscribers/notify`, background tasks) validate a shared secret header:
```typescript
const secret = req.headers.get('x-canary-internal-secret');
if (secret !== process.env.CANARY_INTERNAL_API_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

### Input Validation

All API route handlers validate request bodies against Zod schemas before any processing:

```typescript
// Standard validation pattern used in every POST/PATCH handler
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { title, type, severity, location } = parsed.data;
  // ... proceed with validated data
}
```

**File upload validation:**
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `audio/webm`, `audio/mp4`, `video/mp4`, `video/quicktime`
- Max file size: 50MB per file enforced via `Content-Length` check before Blob upload
- Filename sanitization: strip path components, enforce alphanumeric + `-_` characters

**SQL injection prevention:** All DB queries use parameterized queries via Vercel Postgres prepared statements. No raw string interpolation into SQL.

**XSS prevention:** All text content from social posts, incident descriptions, and X bot tweets is stored as-is but escaped on render. No user-provided HTML is rendered directly.

**Sink auth header storage:** The `authHeader` field on `Sink` records is stored encrypted at rest using a symmetric key derived from `CANARY_INTERNAL_API_SECRET`. Decrypted only at delivery time in `sinkDelivery.ts`.

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Vercel project settings (see Section 5 env vars list)
- [ ] Vercel Postgres (Neon) provisioned and connected — run migrations from `lib/db/migrations/`
- [ ] Vercel Blob storage configured — `BLOB_READ_WRITE_TOKEN` set
- [ ] Vercel KV (Redis) provisioned and connected — `KV_URL` and `KV_REST_API_*` set
- [ ] Google Cloud project with Gemini API enabled — `GOOGLE_GENERATIVE_AI_API_KEY` set
- [ ] Resend account set up — domain verified, `RESEND_FROM_ADDRESS` domain matches verified sender
- [ ] X developer account with Elevated access for Account Activity API webhook registration

### `vercel.json` Configuration

```json
{
  "fluid": true,
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/agents/**": {
      "maxDuration": 300
    },
    "app/api/analysis/**": {
      "maxDuration": 300
    },
    "app/api/social/brief/route.ts": {
      "maxDuration": 120
    },
    "app/api/analysis/report/route.ts": {
      "maxDuration": 300
    },
    "app/api/subscribers/notify/route.ts": {
      "maxDuration": 120
    },
    "app/api/stream/**": {
      "maxDuration": 300
    }
  },
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/api/stream/:path*",
      "headers": [
        { "key": "X-Accel-Buffering", "value": "no" },
        { "key": "Cache-Control", "value": "no-cache, no-transform" }
      ]
    }
  ]
}
```

### `next.config.ts` Required Settings

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@vercel/blob', '@vercel/kv', '@vercel/postgres'],
  images: {
    remotePatterns: [
      { hostname: '*.public.blob.vercel-storage.com' },
      { hostname: 'pbs.twimg.com' },
    ],
  },
  experimental: {
    after: true,  // enable after() for post-response background tasks
  },
};

export default nextConfig;
```

### Database Migrations

Run migrations before first deploy:
```bash
npx tsx lib/db/migrate.ts
```

Migration files in `lib/db/migrations/` — named sequentially:
- `001_create_incidents.sql`
- `002_create_media_assets.sql`
- `003_create_social_signals.sql`
- `004_create_camera_feeds_alerts.sql`
- `005_create_sinks_deliveries.sql`
- `006_create_subscribers_notifications.sql`
- `007_create_xbot_mentions.sql`
- `008_create_runbooks_steps.sql`
- `009_create_agent_logs.sql`
- `010_create_incident_reports.sql`

### X Webhook Registration

After first deployment:
1. Register webhook URL with X Account Activity API:
   ```bash
   curl -X POST "https://api.twitter.com/1.1/account_activity/all/:env_name/webhooks.json" \
     -d "url=https://canary.app/api/xbot/webhook" \
     --oauth-header "..."
   ```
2. Subscribe the `@CanaryAlert` account to the webhook environment
3. Verify CRC challenge passes (check Vercel function logs)

### Fluid Compute Verification

After deployment, confirm Fluid Compute is active:
- Navigate to Vercel Dashboard → Project → Functions
- Agent route functions should show "Fluid" badge
- Test with a long-running agent request — should complete without 30s timeout

### Production Checklist

- [ ] `vercel.json` has `"fluid": true` at root level
- [ ] All agent/analysis routes export `export const maxDuration = 300`
- [ ] All agent/analysis routes export `export const runtime = 'nodejs'`
- [ ] Database migrations applied successfully
- [ ] Blob storage test upload succeeds
- [ ] KV pub/sub test: publish to `incidents:updates`, confirm SSE route receives it
- [ ] Gemini API test: `POST /api/analysis/social` with a fixture post returns structured JSON
- [ ] X webhook CRC test: `GET /api/xbot/webhook?crc_token=test` returns valid HMAC response
- [ ] Resend test email: `POST /api/subscribers` followed by confirming the email delivery
- [ ] Sink delivery test: register a sink pointing to `webhook.site`, trigger a test delivery
- [ ] Rate limiting test: exceed limit on `POST /api/analysis/photo`, confirm 429 response
- [ ] Agent streaming test: `POST /api/agents/triage` returns SSE stream with text deltas

---

## Appendix: Request/Response Examples

### Voice Analysis — Request
```
POST /api/analysis/voice
Content-Type: multipart/form-data

audio: [binary .webm file]
```

### Voice Analysis — Streaming Response
```
data: {"type":"text-delta","textDelta":"{\"severityScore\":"}
data: {"type":"text-delta","textDelta":"7"}
data: {"type":"text-delta","textDelta":",\"severityLevel\":\"HIGH\""}
...
data: {"type":"finish","finishReason":"stop"}
```

### Sink Webhook Payload
```json
{
  "source": "canary_field",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "receivedAt": "2026-03-21T14:32:00Z",
  "incidentId": "123e4567-e89b-12d3-a456-426614174000",
  "analysis": {
    "location": "Oak Street & Highway 9, Sacramento, CA 95814",
    "damageType": "Flooding",
    "severityLevel": "HIGH",
    "credibility": "HIGH",
    "summary": "Field responder reports active flooding at Oak/Hwy9. Water depth 18-24 inches. 2 vehicles stalled. Heavy rescue required.",
    "aiTags": ["flooding", "road-blocked", "vehicles-stalled", "heavy-rescue-required"]
  },
  "sourceData": {
    "responderName": "Unit 7 - Rodriguez",
    "incidentTitle": "Active flooding - Oak St / Hwy 9"
  },
  "mediaUrls": ["https://abc123.public.blob.vercel-storage.com/incidents/123.../photo-1711027600.jpg"]
}
```

### Agent Log Entry
```json
{
  "id": "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
  "agentType": "triage",
  "incidentId": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2026-03-21T14:33:15Z",
  "stepIndex": 3,
  "decisionRationale": "After correlating 3 social signals reporting flooding at Oak/Hwy9 (credibility HIGH), 1 camera alert from CAM-047 (confidence 0.92), and field report from Unit 7, root cause is determined to be storm drain overflow from overnight precipitation. Blast radius: 4-block radius, est. 2,400 residents, 12 businesses. Oak Street completely impassable.",
  "confidenceScore": 0.87,
  "actionsTaken": ["fetchIncidentTool", "fetchSocialSignalsTool", "fetchCameraAlertsTool"],
  "actionsEscalated": [],
  "rollbackPlan": null,
  "toolCalls": [
    {
      "toolName": "fetchSocialSignalsTool",
      "input": { "incidentId": "123e4567-e89b-12d3-a456-426614174000", "limit": 20 },
      "output": { "count": 3, "highCredibility": 3 },
      "durationMs": 42
    }
  ],
  "modelId": "gemini-2.0-flash",
  "tokenUsage": { "promptTokens": 2847, "completionTokens": 412 }
}
```
