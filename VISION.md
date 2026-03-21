# Canary — Product Vision

## The Problem

Disasters don't wait for business hours. When a database fails, a region goes dark, or ransomware hits at 2am, the people responsible for recovery are doing three things at once: reading stale runbooks written months ago, paging engineers who don't know the current state of the system, and manually triaging alerts across five different dashboards — all while a clock ticks toward an SLA breach.

The tools that exist today were built for a world where DR was a quarterly exercise. They store runbooks. They back up data. They generate compliance reports. None of them *act*. None of them think.

---

## The Vision

**Canary is an AI-native disaster recovery platform that detects, reasons about, and responds to infrastructure failures — before they become outages.**

Canary watches your systems continuously. When something goes wrong, it doesn't just alert you — it understands what happened, identifies the blast radius, proposes a recovery path, and executes the safe steps automatically while holding the irreversible ones for human approval. It learns from every incident. It keeps your runbooks current. It proves your DR posture to auditors without manual work.

For the first time, a small team can operate enterprise-grade DR across complex, multi-cloud infrastructure — with the confidence of a war-room full of senior engineers, available at any hour.

---

## Core Beliefs

**1. Agents over alerts.**
Alerting tells you something broke. Canary tells you what to do about it — and starts doing it. The future of DR is autonomous agents that act within defined boundaries, not dashboards that surface more noise.

**2. Humans stay in the loop for what matters.**
Full automation is not the goal. The goal is the right automation: agents handle detection, triage, and safe remediation steps autonomously. Humans approve failovers, validate restores, and sign off on anything irreversible. Canary makes that approval fast and informed, not a bottleneck.

**3. Runbooks should write themselves.**
Most DR documentation is out of date the moment it's published. Canary generates, validates, and continuously updates runbooks from live infrastructure state — Terraform, Pulumi, AWS configs, Kubernetes manifests. Documentation is an output, not a maintenance burden.

**4. Compliance is a byproduct.**
SOC 2, ISO 22301, DORA, HIPAA — these frameworks all require documented, tested DR posture. Canary generates the evidence continuously. Audit prep goes from weeks to hours.

**5. Every incident makes the system smarter.**
Each recovery event — whether handled by an agent or a human — trains Canary's understanding of your specific environment. The second incident of the same type takes less time to resolve than the first.

---

## Who We Serve

### Primary: Mid-Market Technical Teams (100–2,000 employees)

Teams large enough to have real DR requirements but too small to staff a dedicated DR function. They're often:
- SaaS companies past Series B, with investors and enterprise customers demanding SOC 2 and formal DR plans.
- Financial services firms under DORA or SOC 2 compliance pressure with limited IT staff.
- Healthcare organizations navigating HIPAA with legacy infrastructure and underfunded ops teams.

These teams need enterprise-grade DR outcomes without enterprise-grade headcount.

### Secondary: Platform / DevOps Engineers at Scale

Senior engineers at larger companies who own DR as one slice of a broad infrastructure mandate. They want agents that handle the routine — failover validation, runbook execution, RTO/RPO reporting — so they can focus on architecture, not firefighting.

---

## What Canary Does

### Continuous Monitoring & Detection
- Ingest signals from CloudWatch, Datadog, PagerDuty, Prometheus, and custom webhooks.
- Correlate disparate signals into coherent incident narratives using Gemini's multimodal reasoning.
- Detect anomalies before they cascade: slow replication lag before it becomes data loss, degraded health checks before they trip circuit breakers.

### Intelligent Triage
- Root-cause analysis agents that trace an alert back to its origin across logs, metrics, and traces.
- Blast radius assessment: which systems are affected, which customers are impacted, what SLAs are at risk.
- RTO/RPO status: real-time estimate of current data loss exposure and time-to-recovery.

### Automated Recovery Execution
- Execute pre-approved runbook steps autonomously: scaling, rerouting, restarting, promoting replicas.
- Human-in-the-loop gates for irreversible actions: failovers, data restores, traffic cuts.
- Parallel workstream coordination across multiple systems during a complex incident.

### Runbook Intelligence
- Auto-generate runbooks from infrastructure-as-code and observed system behavior.
- Keep runbooks synchronized with infrastructure changes — no manual update cycle.
- Validate runbooks through scheduled DR drills and chaos engineering runs.

### Compliance Automation
- Map system posture continuously to DORA, SOC 2 Type II, ISO 22301, and HIPAA DR controls.
- Generate audit-ready evidence packages on demand.
- Alert on posture drift before auditors find it.

### Post-Incident Learning
- Automated post-incident reports: timeline reconstruction, contributing factors, action items.
- Feed incident data back into Canary's agent models to improve future triage accuracy.
- Trend analysis: MTTR, incident frequency, SLA breach risk over time.

---

## Technical Architecture

### AI Layer — Google Gemini

Canary's intelligence runs on Google Gemini, chosen for its native multimodal capabilities, long context window (1M+ tokens), and built-in reasoning mode.

- **Gemini 2.5 Pro** (thinking mode): Complex triage, root-cause reasoning, runbook generation, compliance mapping — tasks where reasoning quality directly affects outcomes.
- **Gemini 2.0 Flash**: Real-time monitoring analysis, alert correlation, chat interfaces, high-throughput classification. Speed and cost efficiency for always-on workloads.
- **Gemini 2.0 Flash Live API**: Real-time audio for incident bridge calls — live transcription, action item extraction, and agent assistance during active incidents.
- **text-embedding-004**: Semantic search over runbook libraries, incident history, and infrastructure documentation for RAG pipelines.
- **Context caching**: Large infrastructure documents (Terraform state, Kubernetes configs, DR plans) cached to reduce latency and cost on repeated queries.
- **File API**: Ingest PDFs (compliance frameworks, vendor runbooks), architecture diagrams, and video recordings of past DR drills.

### Application Layer — Vercel AI SDK + Next.js

The application tier is built on the Vercel AI SDK (v6), which provides:
- Streaming `streamText` and `streamObject` for real-time agent output in the UI.
- `generateObject` with Zod schemas for structured outputs from triage agents (incident summaries, runbook steps, compliance findings).
- Multi-step agentic loops with `stopWhen` for autonomous recovery execution with defined bounds.
- Server-side tools connected to AWS, GCP, Azure, PagerDuty, and internal APIs.
- Full observability via AI SDK telemetry integration.

**Deployment**: Next.js App Router on Vercel with Fluid Compute for long-running agentic tasks and streaming responses without timeout constraints.

### Interface Layer — shadcn/ui + Tailwind CSS

The operator interface is designed for high-stress, time-critical use — an incident is not the time for a confusing UI.

- **Incident command center**: Real-time agent status, decision audit trail, one-click approval gates — built for clarity under pressure.
- **Runbook editor**: Step-by-step wizard interface for reviewing, editing, and approving AI-generated runbooks before they go live.
- **Compliance dashboard**: Control coverage maps, evidence status, and drift alerts — designed for both engineers and auditors.
- **DR drill scheduler**: Calendar and configuration interface for scheduling chaos experiments and tabletop exercises.
- **Mobile-first on-call views**: Critical alerts, approval gates, and agent status designed for small screens and 2am fatigue.

Design system: shadcn/ui primitives on a tight 4px grid, semantic color tokens for `healthy/degraded/critical/recovering` states, and dark mode as a first-class requirement — not an afterthought.

### Infrastructure Integrations

**Cloud platforms**: AWS (CloudWatch, RDS, ECS, Lambda, Route 53), GCP (Cloud SQL, GKE, Cloud Monitoring), Azure (Azure Monitor, SQL Managed Instance, AKS)

**Observability**: Datadog, Prometheus/Grafana, New Relic, Splunk

**Incident management**: PagerDuty, Opsgenie, VictorOps

**IaC / Config**: Terraform, Pulumi, Ansible, Kubernetes manifests

**Communication**: Slack, Microsoft Teams (incident bridge, approval notifications)

**ITSM**: Jira, ServiceNow (incident ticket lifecycle)

---

## Agent Architecture

Canary runs a multi-agent system where specialized agents handle distinct phases of the DR lifecycle:

```
┌─────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR AGENT                     │
│  Receives alerts → routes to specialists → coordinates      │
│  parallel workstreams → manages human approval gates        │
└──────────┬──────────────┬──────────────┬───────────────────┘
           │              │              │
    ┌──────▼─────┐ ┌──────▼─────┐ ┌─────▼──────┐
    │  TRIAGE    │ │  RECOVERY  │ │ COMPLIANCE │
    │  AGENT     │ │  AGENT     │ │ AGENT      │
    │            │ │            │ │            │
    │ Root cause │ │ Executes   │ │ Maps state │
    │ Blast      │ │ runbook    │ │ to controls│
    │ radius     │ │ steps      │ │ Generates  │
    │ RTO/RPO    │ │ Validates  │ │ evidence   │
    │ estimate   │ │ recovery   │ │            │
    └────────────┘ └────────────┘ └────────────┘
           │              │              │
    ┌──────▼──────────────▼──────────────▼──────┐
    │              RUNBOOK AGENT                 │
    │  Generates, updates, and validates         │
    │  runbooks from IaC + incident history      │
    └────────────────────────────────────────────┘
```

Every agent action is logged with:
- Decision rationale (what the agent saw, what it concluded)
- Confidence score
- Actions taken vs. actions escalated to human
- Rollback plan for every automated action

---

## Success Metrics

### For customers
- **MTTR reduction**: Target 60% reduction in mean time to recovery within 90 days.
- **RTO achievement**: >95% of incidents resolved within defined RTO windows.
- **Runbook coverage**: 100% of production systems with current, validated runbooks.
- **Audit prep time**: DR compliance evidence generated in <1 hour vs. current 2–4 weeks.

### For Canary as a business
- **Time-to-value**: Customer goes from signup to first monitored system in <30 minutes.
- **Automation rate**: >70% of incident triage and safe remediation steps handled without human intervention.
- **Expansion**: Customers expand coverage from initial 1–2 systems to full infrastructure within 6 months.
- **Retention**: DR platforms are high-retention due to deep infrastructure integration and regulatory dependency.

---

## What Canary Is Not

- **Not a backup tool.** Canary orchestrates recovery; it doesn't replace Veeam, Commvault, or cloud-native backup services.
- **Not a general observability platform.** Canary ingests from Datadog and Prometheus but doesn't replace them.
- **Not fully autonomous.** Every irreversible action — failover, data restore, traffic cut — requires explicit human approval. Always.
- **Not a compliance framework.** Canary generates evidence for SOC 2, DORA, and ISO 22301, but customers are still responsible for their audits.

---

## The Name

A canary in a coal mine detects danger before it's visible. It gives the people who matter a chance to act before the situation becomes unrecoverable.

That's what this platform does. It watches constantly, reasons quietly, and gives your team the signal — and the plan — before the damage is done.
