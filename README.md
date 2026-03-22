# Canary

AI-native disaster recovery platform that detects, reasons about, and responds to infrastructure failures — before they become outages.

Canary watches systems continuously using autonomous AI agents, correlates signals from field reports, social media, and camera feeds, performs root-cause analysis and blast radius assessment, then proposes and executes recovery paths with human approval gates.

## Core Principles

- **Agents over alerts** — autonomous specialists that act within defined boundaries, not dashboards that surface noise
- **Multimodal intelligence** — photo, video, text, and social signals fused into a single operational picture
- **Human-in-the-loop** — AI proposes, humans approve; every action is auditable
- **Compliance by default** — maps posture to DORA, SOC2, ISO 22301, and HIPAA automatically

## Features

### EOC Command Dashboard
Real-time emergency operations center with active incident overview, signal cards, field activity log, AI strategy recommendation panel with confidence scoring, and response protocol checklists.

### Incident Management
Full lifecycle management from detection through resolution. Incidents are created from field reports, photos, videos, or social signals and tracked through `new → triaging → responding → resolved → closed`. Supports multi-source correlation, severity classification (1–5), and searchable incident history.

### Multi-Agent AI Swarm
Five specialist agents coordinated by an orchestrator:

| Agent | Role | Model |
|-------|------|-------|
| **Orchestrator** | Routes alerts to specialists, manages approval gates | Gemini 2.0 Flash |
| **Triage** | Root-cause analysis, blast radius, RTO/RPO estimates | Gemini 2.0 Flash / 2.5 Pro |
| **Recovery** | Executes runbook steps with human approval gates | Gemini 2.0 Flash |
| **Runbook** | Generates and updates runbooks from IaC | Gemini 2.5 Pro |
| **Compliance** | Maps posture to regulatory frameworks | Gemini 2.5 Pro |

Each agent logs every decision with rationale, confidence scores, tool calls, and rollback plans for full auditability.

### Multimodal AI Analysis
- **Photo Analysis** — Gemini Vision for structural damage assessment, hazard detection, severity estimation, and resource recommendations
- **Video Analysis** — timeline extraction from video feeds with timestamped event progression and structural integrity assessment
- **AI Chat** — streaming conversational interface with photo upload support, scoped per-incident or global

### AI Triage Panel
Per-incident AI strategy recommendation with confidence scoring, action sequences, key metrics, and approve/dismiss workflow. Includes field activity log and response protocol checklist with real-time step tracking.

### Signal Ingestion
Unified intake for multiple signal sources:
- **Field reports** — manual incident creation with location, severity, and media
- **Social media** — automated X/Twitter monitoring via @canaryaiagent with AI credibility scoring
- **Camera feeds** — video frame analysis with event detection and severity classification
- **Webhooks** — PagerDuty, Datadog, CloudWatch integration points

### X Bot Integration
X API v2 bot that monitors mentions for disaster signals, extracts location and damage information, correlates with existing incidents or creates new ones, and auto-replies with incident status. Includes CRC verification, OAuth 1.0a auth, and filtered streaming.

### Reports
Three auto-generated report types per incident:
- **Emergency** — field-focused response timeline
- **Insurance** — damage and cost assessment
- **Research** — root cause and preventive analysis

### Resource Management
Request and track emergency resources (medical teams, search & rescue, fire engines, HAZMAT units, ambulances, shelter supplies, etc.) with priority levels (immediate/urgent/standard) and approval workflow through dispatched to fulfilled.

### Public Status Pages
Publish incident status pages for public/stakeholder visibility with real-time updates. Publish and unpublish from the incident detail page.

### Subscriber Notifications
Zip code-based alert subscriptions via email (Resend) and Telegram with configurable severity thresholds.

### Runbooks
AI-generated disaster recovery procedures from infrastructure-as-code (Terraform, Kubernetes). Step-by-step execution with human approval gates, validation criteria, rollback commands, and compliance control mapping.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Frontend | React 19, Tailwind CSS 4 |
| AI Models | Google Gemini 2.0 Flash, Gemini 2.5 Pro |
| AI SDK | Vercel AI SDK v6 (`@ai-sdk/react`, `ai`) |
| Database | Supabase (PostgreSQL) |
| Media Storage | Vercel Blob |
| Deployment | Vercel (Fluid Compute for long-running agents) |
| Social API | X API v2 (`twitter-api-v2`) |
| Notifications | Resend (email), Telegram Bot API |
| Validation | Zod 4 |

## Database Schema

| Table | Purpose |
|-------|---------|
| `incidents` | Incident records with location, severity, status, AI analysis, media, and approval tracking |
| `agent_logs` | Agent decision audit trail with rationale, confidence, tool calls, and rollback plans |
| `runbooks` | Recovery procedures with versioning, compliance controls, and validation history |
| `runbook_steps` | Individual runbook instructions with execution status, approval, and rollback commands |
| `social_signals` | Ingested social media posts with credibility, extracted location, and incident correlation |
| `camera_alerts` | Video frame analysis results with event detection, severity, and incident linking |
| `resource_requests` | Emergency resource allocation with priority, approval workflow, and fulfillment tracking |
| `subscribers` | Alert subscriptions by zip code, channel, and severity threshold |

## Project Structure

```
canary/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # EOC command dashboard
│   ├── incidents/[id]/           # Incident detail with triage panel and AI chat
│   ├── chat/                     # Global AI chat interface
│   ├── mentions/                 # X bot mentions log
│   ├── reports/[id]/             # Generated reports (emergency, insurance, research)
│   ├── resources/                # Resource request management
│   ├── status/[id]/              # Public incident status pages
│   ├── video/                    # Video analysis
│   ├── settings/                 # Configuration
│   └── api/                      # API routes
│       ├── dashboard/            # Dashboard data, approve, dismiss, activity
│       ├── incidents/            # CRUD, search, publish, swarm, resources
│       ├── agents/               # Orchestrator and triage endpoints
│       ├── photos/analyze/       # Gemini Vision photo analysis
│       ├── video/analyze/        # Video timeline extraction
│       ├── chat/                 # Streaming AI chat
│       ├── signals/ingest/       # Unified signal intake
│       ├── xbot/                 # X bot polling, webhook, status
│       ├── telegram/             # Telegram bot webhook and setup
│       ├── reports/              # Report generation
│       ├── resources/            # Resource request lifecycle
│       ├── subscribers/          # Alert subscription management
│       └── db/migrate/           # Schema migrations
│
├── lib/
│   ├── agents/                   # AI agent implementations
│   │   ├── orchestrator.ts       # Multi-agent coordinator
│   │   ├── triage.ts             # Damage assessment specialist
│   │   ├── xbot-handler.ts       # X mention processor
│   │   ├── prompts.ts            # System prompts for all agents
│   │   └── tools.ts              # Shared agent tools (shelter lookup, incident CRUD, etc.)
│   ├── data/store.ts             # In-memory dashboard state with Supabase sync
│   ├── db.ts                     # Typed Supabase CRUD helpers
│   ├── ai/config.ts              # Gemini model instances and context caching
│   ├── integrations/             # X API, Telegram, Supabase clients
│   └── schemas/                  # Zod validation schemas
│
├── components/ui/                # shadcn/ui components
├── supabase/migrations/          # Database schema migrations
└── vercel.json                   # Fluid Compute configuration
```

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase project (or local instance)
- Google AI API key (Gemini models)

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=

# X Bot (optional)
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_SECRET=
X_BEARER_TOKEN=

# Telegram (optional)
TELEGRAM_BOT_TOKEN=

# Resend (optional)
RESEND_API_KEY=
```

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the EOC dashboard.

### Database Setup

Run the schema migration:

```bash
curl -X POST http://localhost:3000/api/db/migrate
```

## Design System

Built on the Monolith / Precision Studio design system with Tailwind CSS 4. Uses semantic color tokens (`healthy`, `degraded`, `critical`, `recovering`), a tight 4px grid, Geist font family, and dark-mode-first theming via CSS variables.
