# Disaster Recovery Multimodal Tool
## Product Research & Design Document — Hackathon MVP

> **Stack:** Next.js 15 · Vercel Fluid Compute · Vercel AI SDK 6 · Google Gemini 2.0 Flash · shadcn/ui · Tailwind CSS
> **Scope:** 48-hour hackathon MVP · Demo-first design · Production-ready architecture

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Market Opportunity](#2-market-opportunity)
3. [Target Users & Personas](#3-target-users--personas)
4. [Core Value Propositions](#4-core-value-propositions)
5. [MVP Feature Set](#5-mvp-feature-set)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Go-to-Market Strategy](#7-go-to-market-strategy)
8. [UI/UX Design Specification](#8-uiux-design-specification)
9. [Technical Architecture](#9-technical-architecture)
10. [Success Metrics](#10-success-metrics)

---

## 1. Problem Statement

Disaster response coordination fails at the information layer. When a hurricane, wildfire, or earthquake hits, incident commanders are drowning in fragmented inputs — radio chatter, handwritten damage logs, blurry photos texted from field teams, and spreadsheets that are outdated the moment they're created. The result:

- **Triage decisions are made on gut instinct**, not synthesized field data
- **Resource allocation lags reality by hours** — generators sent to the wrong site, rescue teams dispatched without damage context
- **Incident reports are written retrospectively**, after the window for preventing secondary harm has closed
- **Communication between field responders and EOC coordinators is lossy** — critical details fall out in translation

The status quo tooling — WebEOC, ICS-based paper forms, and radio — was designed for a pre-AI world. The cognitive load on incident commanders during peak crisis is unsustainable, and mistakes cost lives.

**Core pain point: multimodal field data (photos, voice, video) cannot be rapidly synthesized into structured, actionable intelligence at the speed disasters unfold.**

---

## 2. Market Opportunity

### TAM / SAM / SOM

| Segment | Size | Notes |
|---|---|---|
| Global Emergency Management Software (TAM) | $32.4B (2024) → $58.9B (2030), CAGR ~10.5% | Public sector, critical infrastructure, Fortune 500 BCP |
| AI-Assisted Disaster Response & Damage Assessment (SAM) | ~$4.2B by 2027 | ~3,800 county/state EOCs in the US; international humanitarian orgs |
| US Public Safety Agencies — 3-Year Capture (SOM) | $85M–$140M ARR | FEMA HMGP + BRIC grant programs allocated $3.46B in FY2024 |

| AI in IT Operations / AIOps (incl. DR) | $3B (2024) → $21B (2030) | CAGR ~38% — fastest growing adjacent segment |

### Key Growth Drivers

1. **Climate change frequency** — 28 billion-dollar weather disasters in the US in 2023 (NOAA record). Structurally increasing demand.
2. **AI readiness in government** — 2024 Executive Order on AI and DHS's AI roadmap explicitly mandate AI integration in emergency response.
3. **Multimodal AI maturity** — Gemini 2.0 Flash's real-time vision + audio makes field-usable AI practical on a firefighter's phone.
4. **Post-COVID federal investment** — ARPA infrastructure funds flowing into state and local digital modernization.
5. **Insurance pressure** — Parametric insurance and rapid claims processing create commercial pull for AI damage assessment.

---

## 3. Target Users & Personas

### Primary Persona 1 — The Incident Commander (IC)
- **Who:** County emergency manager or fire/police unified commander running an EOC
- **Environment:** EOC or forward command post, multiple screens, radio traffic, high stress
- **Pain:** Synthesizing field reports into a coherent operating picture faster than the situation evolves
- **Need:** A system that reads field inputs and surfaces "what do I need to decide right now"
- **Tech comfort:** Moderate — uses WebEOC or similar; needs zero training curve under pressure

### Primary Persona 2 — The Field Responder
- **Who:** Firefighter, search-and-rescue technician, National Guard soldier, or Red Cross volunteer
- **Environment:** On-site at damaged structures, often without reliable connectivity, hands often occupied
- **Pain:** Documenting what they're seeing without stopping work; communicating damage severity accurately
- **Need:** Voice-first input, photo capture, instant acknowledgment that EOC received the report
- **Tech comfort:** Variable — needs something that works like their existing apps (camera, voice memo)

### Primary Persona 3 — The FEMA/State Coordinator
- **Who:** FEMA Region administrator or State Emergency Management Director
- **Environment:** State EOC, Washington DC, or deployed Joint Field Office (JFO)
- **Pain:** Aggregating damage assessments across dozens of jurisdictions to make resource deployment decisions and federal disaster declaration recommendations
- **Need:** Automated incident summaries, structured damage reports ready for federal systems (NEMIS), trend analytics
- **Tech comfort:** High — comfortable with dashboards and data tools

### Secondary Personas
- Insurance adjusters requiring rapid post-event damage documentation
- Utility restoration crews prioritizing grid repair based on damage photos
- Public information officers needing verified situational reports

---

## 4. Core Value Propositions

### VP1: Voice-to-Structured-Report in Seconds
Field responders speak what they see — *"Three-story residential, roof collapse on north side, two individuals trapped, require heavy rescue"* — and Gemini 2.0 Flash instantly generates a structured ICS-214 style incident report with severity tagging, resource requirements flagged, and GPS timestamp. Eliminates the transcription bottleneck entirely.

### VP2: Photo Intelligence That Thinks Like a Damage Assessor
Upload a photo of a flooded structure or collapsed road and get immediate AI analysis: damage category (FEMA's ATC-45 rapid assessment scale), structural integrity estimate, recommended response priority, and extracted address/location data. What takes a trained assessor 20 minutes takes 4 seconds.

### VP3: Real-Time Multimodal Situational Awareness
The EOC dashboard ingests voice, photos, and text simultaneously from distributed field teams, synthesizes them into a live operational picture, and proactively surfaces resource conflicts. The IC sees the whole incident, not 40 isolated radio calls.

### VP4: Automated Incident Reports, Ready for Federal Submission
When a declared disaster requires federal reporting, the system auto-drafts NIMS/ICS-compliant incident reports from accumulated multimodal field data — ready for commander review and one-click export. Cuts report generation from 6+ hours to under 20 minutes.

### VP5: Works on a Firefighter's Phone
No special hardware. No trained operators. A field responder opens a web app on their existing smartphone, taps record, takes photos, and is done. The intelligence lives in the cloud (Vercel + Gemini). Offline-first data capture queues for sync when connectivity returns.

---

## 5. MVP Feature Set

> **Demo philosophy:** Every feature must be demonstrable live in 90 seconds without setup friction. Build the two biggest wow moments first — voice-to-report and photo-to-assessment.

### Must-Have Features (Build These)

**A. Voice Incident Logging**
- Browser-based voice capture via `MediaRecorder` API
- Gemini 2.0 Flash streaming transcription + structured data extraction
- Output: JSON incident record with location, damage type, severity (1–5), resources needed, timestamp
- *Demo moment:* Speak a messy, realistic voice memo → watch structured report appear in real-time

**B. Photo Damage Assessment**
- Drag-and-drop or mobile camera upload → Vercel Blob
- Gemini Vision analysis: damage category, severity score, structural concerns, recommended priority
- Overlay bounding boxes on damaged areas if Gemini returns coordinates
- *Demo moment:* Upload a real disaster photo → AI annotated assessment appears in 3 seconds

**C. Live EOC Dashboard**
- Single-page Next.js dashboard showing all incoming field reports
- Real-time updates via Vercel AI SDK streaming
- Color-coded severity indicators (Critical / High / Medium / Low / Nominal)
- Incident count, resource requests aggregated at top
- *Demo moment:* Two "field reports" coming in simultaneously, watch dashboard update live

**D. AI Triage & Resource Recommendation**
- After each report, Gemini generates a recommended action: *"Dispatch heavy rescue to Grid 4C. Structural collapse. Priority 1."*
- Resource conflict detection: *"Warning: Only 1 water tender available. Two Priority-1 requests active."*
- *Demo moment:* Show the AI recommending a specific resource action, commander clicks "Approve" → resource marked dispatched

**E. Auto-Generated Incident Summary Report**
- One button: "Generate Incident Report"
- Gemini synthesizes all field reports into a formatted, NIMS-style incident summary
- Downloadable as PDF or copy-pasteable markdown
- *Demo moment:* Click button → full professional incident report generated in 5 seconds

### Nice-to-Have (If Time Permits)
- Audio playback of original voice notes linked to transcripts
- Map integration (Mapbox free tier) with incident pins
- Multi-user simulation (two browser tabs = two field responders)
- Severity trend graph over time

### Explicitly Out of Scope
- Real GPS/location from field devices (mock coordinates are fine)
- Offline PWA sync
- Authentication/multi-tenancy
- Integration with real federal systems (NEMIS, WebEOC)

---

## 6. Competitive Landscape

| Player | What They Do | Their Gap |
|---|---|---|
| **Esri/ArcGIS Emergency Management** | GIS-based situational awareness, widely used by FEMA | No multimodal AI; requires trained GIS operators; expensive |
| **RapidSOS** | Real-time data aggregation for 911 dispatch | 911-focused, not field EOC; no vision/voice AI analysis |
| **One Concern** | AI risk modeling for disasters | Predictive/pre-event focus; not field response tooling |
| **Palantir AIP for Government** | Data fusion and AI for government ops | Extremely expensive, long implementation cycles, not SME-accessible |
| **WebEOC (Juvare)** | EOC workflow management | No AI; form-based; zero multimodal capability; 20-year-old UX |
| **Google Crisis Response** | Maps, People Finder, crisis info | Passive/informational; no active field coordination AI |
| **Zonehaven** | Evacuation management | Narrow scope; no field reporting |

### Differentiation

This tool occupies **white space none of the above touches**: multimodal AI at the field level, accessible on commodity hardware, with real-time synthesis to the EOC.

**The killer differentiator:** A single field responder with a smartphone generates AI-structured damage intelligence in seconds, without any training. No competitor offers this today.

---

## 7. Go-to-Market Strategy

### Phase 1: Validation Through Grants and Pilots (Months 1–6)
- **Target:** 3–5 county emergency management agencies for tabletop exercise pilots
- **Mechanism:** FEMA BRIC and HMGP grants cover technology adoption costs
- **Channel:** NEMA and IAEM conference networks
- **Ask:** Free pilot in exchange for outcome data (time-to-report, resource allocation accuracy)

### Phase 2: Freemium + State Contract Land (Months 6–18)
- **Freemium tier:** Unlimited voice/photo reports, 1 EOC dashboard user, 30-day data retention
- **EOC Pro:** Multi-user, unlimited history, federal report templates, API access — **$2,400/county/year**
- **State enterprise:** Aggregate county relationships → **$180K–$450K/state/year**
- **Channel:** NASPO and Sourcewell state procurement vehicles

### Phase 3: Insurance and Infrastructure Vertical (Months 18–36)
- **Target:** Parametric insurers and large utilities (PG&E, Duke Energy)
- **Model:** Per-event licensing or enterprise SaaS — **$50K–$500K/event or $250K–$1M ARR**

### Positioning
> *"The AI field intelligence layer for disaster response — turning what responders see and hear into structured decisions in seconds."*

### Partnership Priorities
1. **Google.org** — mission alignment, Gemini credits, co-marketing
2. **FEMA's National Integration Center** — NIMS compliance certification
3. **FirstNet (AT&T)** — distribution to first responder agencies on their network
4. **Red Cross / Team Rubicon** — NGO deployment partners for international credibility

---

## 8. UI/UX Design Specification

### Design Philosophy

Emergency responders operate under cognitive overload, physical stress, poor lighting, and time pressure. Every design decision must answer: *does this work at 2am, in the rain, with gloves on, when someone's life may depend on it?*

**Core principles:**
- **Clarity Over Cleverness** — No ambiguous icons without labels; no hover-only affordances
- **Progressive Disclosure** — Severity badge first, summary second, full detail on demand
- **Forgiving Input** — Voice, photo, and text are all valid first-class inputs; none required
- **Trust Through Transparency** — AI-generated content is always labeled; confidence indicators always visible
- **System Status Always Visible** — Network state, upload progress, AI status permanently accessible
- **Interrupt-Resistant Flows** — Every state is recoverable; forms auto-save; nothing silently lost

**Default mode: dark.** Emergency operations centers run dark UIs to reduce ambient light interference and operator eye fatigue during long shifts.

---

### Information Architecture

```
/                          → Redirect to /dashboard
/dashboard                 → Live incident overview (primary hub)
/incidents/new             → New incident intake (multimodal)
/incidents/[id]            → Incident detail + AI analysis
/incidents/[id]/report     → Auto-generated report preview & export
/resources                 → Resource allocation panel
/settings                  → User preferences, API config (MVP stub)
```

**Navigation model:**
- **Desktop:** Persistent left sidebar (collapsible to icon-only) + status indicator at bottom
- **Mobile:** Bottom tab bar with 4 tabs; "New Incident" center tab is larger, accent-colored
- **Breadcrumb:** Only on Incident Detail and Report pages. Max 3 levels.
- **Back navigation:** Explicit back button on all non-root pages

---

### Key Screens

#### Screen 1 — Dashboard / Incident Overview

**Layout (desktop):** Two-column. Left (60%): scrollable incident card list. Right (40%): summary stats + map placeholder.
**Layout (mobile):** Single column. Stats row at top (horizontally scrollable), then incident cards.

**Components:**
- Page title: "Active Incidents" with live count badge
- 4-up statistics row: Total Active / Critical Count / Pending AI Analysis / Resources Deployed
- Incident cards: ID + timestamp · Location · Severity `Badge` · AI status indicator · Lead resource · One-line AI summary
- Sort/filter bar: text search + severity dropdown + status dropdown
- **Empty state:** Centered SVG illustration + "No active incidents" headline + "Log New Incident" CTA

---

#### Screen 2 — New Incident Intake

**Layout:** Single-column, vertically stacked. Sticky "Submit Incident" button in viewport footer.

**Section 1 — Basics:** Incident title (large, 18px+), location field with "Use My Location" button, incident type `Select`, priority 4-button `ToggleGroup` (Critical/High/Medium/Low).

**Section 2 — Photo/Video Upload:**
- Full-width drag-and-drop zone with `react-dropzone`
- Mobile: single full-width `Button` opening native camera/gallery picker
- Thumbnail grid of uploaded files; individual upload progress bars
- Accepts: JPG, PNG, WEBP, MP4, MOV; 50MB max per file

**Section 3 — Voice Notes:**
- 72px minimum diameter circular record button
- States: idle (mic icon, neutral) → recording (red, pulsing CSS keyframe ring, stop icon, MM:SS counter) → processing (spinner)
- Recorded clips: `Card` rows with waveform decoration, play/pause, duration, delete
- "Upload audio file" text link for pre-recorded files

**Section 4 — Text Description:** Auto-expanding `Textarea`, 4 rows min, 2000-char soft limit with counter.

**Sticky footer:** "Save Draft" (secondary) · upload/save progress indicator · "Submit Incident" (primary)

---

#### Screen 3 — Incident Detail / AI Analysis View

**Layout (desktop):** Two-panel. Left (55%): incident metadata + evidence gallery, scrollable. Right (45%): AI analysis panel, sticky.
**Mobile:** Single column; incident detail → AI analysis in `Collapsible` accordion.
**Mobile navigation:** Tapping a dashboard card opens a bottom `Sheet` (full-height) instead of full navigation.

**Left panel:** Incident title/ID/badge/timestamp · inline status `Select` · assigned team popover · masonry image gallery (click → `Dialog` lightbox) · voice notes player · original text notes · Edit button.

**Right panel — AI Analysis:**
- Header: "AI Analysis" label + "Powered by Gemini 2.0 Flash" attribution
- **Streaming state:** `Skeleton` placeholders at correct heights + "Analyzing…" spinner + estimated time
- **Complete state (in order):**
  1. Severity card — full-width color bar + score + confidence percentage + one-sentence justification
  2. Damage summary — bordered card with severity-color left accent stripe
  3. Identified hazards — bulleted list with icon-labeled hazard types + severity chips
  4. Resource recommendations — 3–5 items with resource type icons + "Add to Resource Plan" per item
  5. Affected population estimate — range with "AI estimate" label
- "Regenerate Analysis" text link at bottom
- "Open Full Report" primary button

---

#### Screen 4 — Resource Allocation Panel

**Layout:** Full-width. Filter chips at top. Left column: resource inventory. Right column: active deployments list (no map for MVP — stub card).

**Resource cards:** Name + type icon · Availability badge (Available/Deployed/En Route/Offline) · Location/unit ID · "Assign to Incident" button → `Popover` with `Command` component for incident search.

**Deployments list:** Incident ID + severity badge · Resource name · Time deployed · Status · "Release Resource" (→ `AlertDialog` confirmation).

---

#### Screen 5 — Auto-Generated Report Preview

**Layout:** Centered single-column, max-width 800px, document-style.

**Sections:** Report header · Executive Summary · Damage Assessment · Hazard Identification · Affected Population & Infrastructure · Resource Deployment Record · Recommended Actions · Evidence Attachments · AI Analysis Metadata (model, confidence, timestamp).

**Editing:** Pencil icon per section converts it to inline `Textarea` — section-by-section, no full-page edit mode.

**AI content watermark:** Subtle "AI-assisted content" label at the top of each AI-generated section.

**Sticky top action bar:** "Export PDF" (primary) · "Copy to Clipboard" · "Share Link" · "Back to Incident" text link.

---

### Component Inventory

| Use Case | shadcn/ui Component | Notes |
|---|---|---|
| Severity badge | `Badge` with custom `cva` variants | 5 semantic severity levels |
| Incident card | `Card`, `CardHeader`, `CardContent` | Hover via Tailwind `group` |
| Statistics tiles | `Card` | Non-interactive, numeric-focused |
| Incident type selector | `Select` | Searchable for long lists |
| Filter/sort controls | `DropdownMenu` | Severity, status, date range |
| Incident status update | `Select` | Inline, optimistic update |
| Hazard/incident search | `Command` inside `Popover` | Combobox pattern |
| Voice record button | Custom on `Button` | Pulse animation via CSS keyframes |
| File upload zone | Custom on `Button` + native input | `react-dropzone` |
| Image lightbox | `Dialog` | Full-screen, prev/next navigation |
| Incident detail (mobile) | `Sheet` | Bottom sheet, full height |
| Destructive confirmations | `AlertDialog` | Release resource, delete, reset |
| Report section inline edit | `Textarea` | Auto-resize on focus |
| Section collapse (mobile) | `Collapsible` | AI analysis section |
| AI streaming status | `Skeleton` | Pulsing placeholder during generation |
| Priority selector | `ToggleGroup` | 4-item: Critical/High/Medium/Low |
| Confidence score | `Progress` | Subdued horizontal bar |
| System status indicator | `Badge` + `Tooltip` | Connectivity and sync state |
| Toast notifications | `Sonner` | Upload complete, AI ready, errors |
| Top-level navigation | Sidebar (desktop) / custom bottom bar (mobile) | |
| Form fields | `Input`, `Textarea`, `Label` | Standard shadcn form primitives |

---

### Color System

```css
/* Severity palette — light mode */
--severity-critical:  hsl(0 72% 51%);     /* red-600    */
--severity-high:      hsl(21 90% 48%);    /* orange-600 */
--severity-medium:    hsl(38 92% 50%);    /* amber-600  */
--severity-low:       hsl(142 71% 45%);   /* green-600  */
--severity-nominal:   hsl(217 91% 60%);   /* blue-600   */

/* AI-generated content */
--ai-accent:          hsl(263 70% 50%);   /* violet-700 */
```

**Dark mode severity variants (lighter for dark backgrounds):**

```
Critical:  text-red-400    bg-red-950/50    border-red-900
High:      text-orange-400 bg-orange-950/50 border-orange-900
Medium:    text-amber-400  bg-amber-950/50  border-amber-900
Low:       text-green-400  bg-green-950/50  border-green-900
Nominal:   text-blue-400   bg-blue-950/50   border-blue-900
```

**Dark mode surfaces:**
```
Background:         #0A0A0F   (near-black, slightly blue-tinted)
Surface (cards):    #111118
Surface elevated:   #1A1A24   (modals, sheets, popovers)
Border:             #2A2A3A
Text primary:       #F4F4F8
Text secondary:     #8B8BA8
AI panel tint:      #0F0A1A   (subtle violet — "this is AI-generated")
```

---

### Interaction Patterns

**Drag-and-drop upload states:** idle (dashed border, muted) → drag active (solid primary border, scale 1.02, tinted background) → uploading (linear `Progress` bar per file) → complete (thumbnail grid, "Add more files" secondary button) → error (red border, inline error with fix description).

**Voice recording states:** idle (mic icon, neutral) → recording (red background, pulsing ring animation, stop icon, MM:SS counter) → processing (spinner, muted background).

**Streaming AI response states:** waiting → skeleton with `Analyzing with Gemini 2.0 Flash…` → streaming (tokens appear with blinking cursor at leading edge, incomplete sections remain as skeleton) → complete (cursor disappears, `Sonner` toast fires, action buttons activate) → error (error card with Retry button, partial results preserved).

---

### Mobile Considerations

- **Touch targets:** 48×48px minimum; 56px for primary actions; 72px for voice record button
- **Bottom tab bar:** "New Incident" center tab is 56px tall (vs 48px), accent-colored, `+` icon prefix
- **Camera integration:** `Sheet` with two options — "Take Photo Now" (`input[capture=environment]`) + "Choose from Library"
- **Thumb zones:** All primary CTAs in bottom 40% of screen
- **Offline:** `localStorage` persists form state; persistent `Sonner` toast when offline: *"Incident saved locally and will submit when connected"*
- **Haptic feedback:** `navigator.vibrate(50)` on record start/stop, successful submission, critical alerts

---

### Accessibility

- **Color is never the sole indicator** — every severity level uses color + icon + text label
- **Touch targets:** Custom `touch-target` Tailwind utility enforcing `min-h-[48px] min-w-[48px]`
- **ARIA live regions:** AI analysis panel has `role="status"` + `aria-live="polite"` + `aria-busy="true"` during streaming
- **Keyboard navigation:** Full keyboard operability; 3px high-contrast focus ring (override shadcn's default 1px)
- **Error messaging:** `role="alert"` on all form errors; error messages describe problem *and* fix
- **Reduced motion:** All CSS animations wrapped in `@media (prefers-reduced-motion: reduce)` overrides
- **Font size:** 16px base minimum; no text below 14px anywhere

---

### Implementation Priority (48-Hour Build Order)

1. **New Incident Intake** — core input flow; photo upload + text first, voice second
2. **Dashboard** — incident card list with severity badges; static layout first, then live polling
3. **Incident Detail / AI Analysis** — the demo centerpiece; streaming AI output is the "wow" moment
4. **Auto-generated Report** — display only for MVP; export as browser print
5. **Resource Allocation** — list view only, mock data stub, no map

---

## 9. Technical Architecture

### Tech Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Framework | Next.js | 15.x (App Router) | Server Components, Route Handlers, native streaming, Vercel-native |
| Language | TypeScript | 5.x | Type-safe schema enforcement for incident data; required for `generateObject` Zod schemas |
| AI SDK | `ai` (Vercel AI SDK) | 6.x | Unified streaming primitives, `streamText`, `generateObject`, `useChat`/`useCompletion` |
| AI Provider | `@ai-sdk/google` | ^1.x | First-class Gemini 2.0 Flash support, multimodal content parts, inline media |
| Model | `gemini-2.0-flash` | — | Best price/performance for multimodal; 1M token context; fast TTFT for streaming |
| File Storage | Vercel Blob (`@vercel/blob`) | latest | Zero-config on Vercel; client-side uploads avoid 4.5MB body limit |
| Schema Validation | Zod | 3.x | Required by `generateObject`; validates incident API payloads |
| UI | shadcn/ui + Tailwind CSS | latest | Rapid prototyping; pre-built components for ops dashboards |
| State / Data | localStorage + React state | — | Hackathon shortcut; zero DB setup; sufficient for demo |
| Deployment | Vercel Fluid Compute | — | Long-running streaming responses; no 10s timeout; automatic scaling |
| Runtime | Node.js | 20.x | Fluid Compute requires Node.js; Edge runtime lacks full Node APIs |

---

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js Client)                     │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │  Upload UI   │   │  Incident Feed   │   │   Dashboard        │  │
│  │  (photos,    │   │  (streaming AI   │   │   /incidents       │  │
│  │   audio,     │   │   response via   │   │   (localStorage)   │  │
│  │   video)     │   │   useCompletion) │   │                   │  │
│  └──────┬───────┘   └────────┬─────────┘   └───────────────────┘  │
│         │                    │ SSE / ReadableStream                  │
└─────────┼────────────────────┼─────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Fluid Compute, Node.js)                  │
│                                                                     │
│  POST /api/upload          POST /api/analyze           GET /api/    │
│  ┌─────────────────┐      ┌──────────────────────┐   incidents     │
│  │ @vercel/blob    │      │ streamText()          │   ┌──────────┐ │
│  │ .upload()       │      │ generateObject()      │   │ Returns  │ │
│  │                 │      │                       │   │ stored   │ │
│  │ Returns: url,   │      │ Builds multimodal     │   │ incident │ │
│  │ pathname        │      │ content[] array       │   │ JSON     │ │
│  └─────────────────┘      │ with image/audio/text │   └──────────┘ │
│                            └──────────┬───────────┘                │
│                                       │ HTTPS                       │
└───────────────────────────────────────┼─────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE AI (Gemini 2.0 Flash)                     │
│                                                                     │
│   Input:  image parts + audio parts + system prompt + user text    │
│   Output: streamed text tokens  OR  structured JSON (via schema)   │
└─────────────────────────────────────────────────────────────────────┘
```

**Request flow:**
1. User selects files → client calls `PUT /api/upload` → files stream to Vercel Blob
2. Blob returns stable `url` → client posts `{ blobUrls, voiceNoteUrl, incidentContext }` to `POST /api/analyze`
3. API route fetches blob bytes, constructs multimodal content parts, calls `streamText` with Gemini 2.0 Flash
4. Route returns streaming `Response` (SSE) → `useCompletion` consumes stream, renders tokens in real-time
5. On stream finish → client calls `POST /api/report` (`generateObject`) to extract structured `IncidentReport` JSON
6. Completed incident persisted to localStorage

---

### Key API Routes

| Route | Method | Purpose | AI SDK Function |
|---|---|---|---|
| `/api/upload` | `PUT` | Stream file to Vercel Blob; return blob URL + metadata | None (Vercel Blob SDK) |
| `/api/analyze` | `POST` | Multimodal damage analysis; streams severity + recommendations | `streamText` |
| `/api/report` | `POST` | Generate structured incident report JSON from blob URLs | `generateObject` |
| `/api/transcribe` | `POST` | Transcribe audio voice note; return text + analysis | `generateText` |
| `/api/incidents` | `GET` | Return stored incidents (localStorage shim for MVP) | None |
| `/api/incidents` | `POST` | Persist completed incident record | None |

All AI routes export `runtime = 'nodejs'` and `maxDuration` to activate Fluid Compute.

---

### Data Model

```typescript
// types/incident.ts

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';

export type ResourceType =
  | 'SEARCH_AND_RESCUE' | 'MEDICAL' | 'WATER_SUPPLY' | 'SHELTER'
  | 'HEAVY_EQUIPMENT' | 'HAZMAT' | 'FOOD_SUPPLY' | 'POWER_RESTORATION';

export interface MediaAsset {
  url: string;           // Vercel Blob URL
  type: 'image' | 'audio' | 'video';
  mimeType: string;
  uploadedAt: string;    // ISO 8601
  sizeBytes: number;
}

export interface IncidentReport {
  severityScore: number;            // 1-10
  severityLevel: SeverityLevel;
  affectedAreaEstimateM2: number | null;
  structuralDamage: string;
  hazardsIdentified: string[];
  resourcesRequired: ResourceType[];
  priorityActions: string[];        // ordered
  estimatedResponseTimeHours: number | null;
  survivorIndicators: boolean;
  accessRoutesClear: boolean;
  rawTranscription: string | null;
  confidence: number;               // 0–1
}

export interface Incident {
  id: string;                        // crypto.randomUUID()
  createdAt: string;                 // ISO 8601
  updatedAt: string;
  location: { label: string; lat?: number; lng?: number; };
  responderName: string;
  mediaAssets: MediaAsset[];
  streamingAnalysis: string;         // raw streamed text from /api/analyze
  report: IncidentReport | null;     // null until generateObject completes
  status: 'ANALYZING' | 'COMPLETE' | 'ERROR';
}
```

---

### Streaming Architecture

```
streamText (server)                     useCompletion (client)
─────────────────────────────────────────────────────────────

POST /api/analyze                       const { completion,
  │                                           isLoading,
  │  result = streamText({...})               complete } = useCompletion({
  │                                             api: '/api/analyze',
  └─► return result.toDataStreamResponse()  })
            │                               │
            │  Transfer-Encoding: chunked   │
            │  Content-Type: text/event-stream
            ├──── data: "Structural..."  ──►│ completion updates token by token
            ├──── data: " damage..."    ──►│ React re-renders
            └──── [DONE]             ──►│ isLoading = false
                                        │
                                        └─► POST /api/report (generateObject)
                                              → structured IncidentReport JSON
```

**Two-phase approach:**
- **Phase 1 — `streamText`:** Fast, streaming narrative analysis visible immediately
- **Phase 2 — `generateObject`:** After streaming, extract structured JSON for dashboard cards and persistence

---

### Critical Code Snippets

#### Provider Setup

```typescript
// lib/ai.ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export const geminiFlash = google('gemini-2.0-flash');
```

#### Multimodal Streaming Analysis Route

```typescript
// app/api/analyze/route.ts
import { streamText } from 'ai';
import { geminiFlash } from '@/lib/ai';
import type { CoreMessage } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const { imageUrls, audioUrl, incidentContext } = await request.json() as {
    imageUrls: string[];
    audioUrl?: string;
    incidentContext: string;
  };

  const userContentParts: CoreMessage['content'] = [];

  // Add images from Vercel Blob URLs
  for (const url of imageUrls) {
    userContentParts.push({ type: 'image', image: new URL(url) });
  }

  // Add audio as base64 inline
  if (audioUrl) {
    const audioRes = await fetch(audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get('content-type') ?? 'audio/webm';
    userContentParts.push({
      type: 'file',
      data: Buffer.from(audioBuffer).toString('base64'),
      mimeType: contentType as `audio/${string}`,
    });
  }

  userContentParts.push({ type: 'text', text: `Responder notes: ${incidentContext}` });

  const result = streamText({
    model: geminiFlash,
    system: `You are an expert disaster response analyst. Analyze the provided images and audio from a disaster scene.
Provide:
1. Immediate severity assessment (1-10) with clear reasoning
2. Specific hazards visible (structural, chemical, biological, etc.)
3. Estimated number of people needing assistance
4. Priority resource recommendations in order of urgency
5. Suggested access routes or blockages
6. Immediate life-safety concerns requiring action in the next 30 minutes
Be concise and direct. Lead with the most critical findings.`,
    messages: [{ role: 'user', content: userContentParts }],
    temperature: 0.2,
  });

  return result.toDataStreamResponse();
}
```

#### Structured Report Generation

```typescript
// app/api/report/route.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { geminiFlash } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 120;

const IncidentReportSchema = z.object({
  severityScore: z.number().min(1).max(10),
  severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  affectedAreaEstimateM2: z.number().nullable(),
  structuralDamage: z.string(),
  hazardsIdentified: z.array(z.string()),
  resourcesRequired: z.array(z.enum([
    'SEARCH_AND_RESCUE', 'MEDICAL', 'WATER_SUPPLY', 'SHELTER',
    'HEAVY_EQUIPMENT', 'HAZMAT', 'FOOD_SUPPLY', 'POWER_RESTORATION',
  ])),
  priorityActions: z.array(z.string()),
  estimatedResponseTimeHours: z.number().nullable(),
  survivorIndicators: z.boolean(),
  accessRoutesClear: z.boolean(),
  rawTranscription: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export async function POST(request: Request) {
  const { imageUrls, audioUrl, streamingAnalysis } = await request.json() as {
    imageUrls: string[];
    audioUrl?: string;
    streamingAnalysis: string;
  };

  const parts: CoreMessage['content'] = imageUrls.map(
    (url) => ({ type: 'image', image: new URL(url) })
  );

  if (audioUrl) {
    const buf = await (await fetch(audioUrl)).arrayBuffer();
    parts.push({ type: 'file', data: Buffer.from(buf).toString('base64'), mimeType: 'audio/webm' });
  }

  parts.push({
    type: 'text',
    text: `Previous analysis: ${streamingAnalysis}\n\nExtract a structured incident report.`,
  });

  const { object } = await generateObject({
    model: geminiFlash,
    schema: IncidentReportSchema,
    messages: [{ role: 'user', content: parts }],
  });

  return Response.json(object);
}
```

#### Client Upload + Streaming Flow

```typescript
// components/IncidentUploader.tsx
'use client';
import { upload } from '@vercel/blob/client';
import { useCompletion } from 'ai/react';
import { useState } from 'react';

export function IncidentUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const incidentId = crypto.randomUUID();

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/analyze',
    onFinish: async (_prompt, completion) => {
      // Phase 2: structured extraction after streaming completes
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: uploadedUrls, streamingAnalysis: completion }),
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Upload all files to Vercel Blob in parallel
    const uploadedAssets = await Promise.all(
      files.map((file) =>
        upload(file.name, file, { access: 'public', handleUploadUrl: '/api/upload' })
      )
    );

    const imageUrls = uploadedAssets
      .filter((_, i) => files[i].type.startsWith('image'))
      .map((b) => b.url);

    // Start Phase 1 streaming analysis
    await complete('', { body: { imageUrls, incidentContext: 'Field report' } });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* file inputs, voice recorder, text area */}
      {isLoading && <p>Analyzing with Gemini 2.0 Flash…</p>}
      {completion && <pre className="whitespace-pre-wrap">{completion}</pre>}
    </form>
  );
}
```

---

### File Upload Strategy

Use **Vercel Blob client-side uploads** — do not pipe large files through API routes (4.5MB serverless body limit).

```typescript
// app/api/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: [
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm',
        'audio/webm', 'audio/mp4', 'audio/wav',
      ],
      maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
    }),
    onUploadCompleted: async ({ blob }) => {
      console.log('Upload completed:', blob.url);
    },
  });

  return NextResponse.json(jsonResponse);
}
```

---

### Environment Variables

```bash
# .env.local

# Google AI — https://aistudio.google.com/app/apikey
# Free tier: 15 RPM, 1M TPM for Gemini 2.0 Flash
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Vercel Blob — auto-populated via `vercel env pull` after adding Blob storage in Vercel dashboard
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

### Deployment Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/analyze/route.ts": { "maxDuration": 300 },
    "app/api/report/route.ts":  { "maxDuration": 120 },
    "app/api/transcribe/route.ts": { "maxDuration": 60 }
  }
}
```

Each AI route file must declare:
```typescript
export const runtime = 'nodejs';
export const maxDuration = 300;
```

**Fluid Compute notes:**
- Activated automatically on Pro/Enterprise when a function streams a response
- `maxDuration` up to 800s on Pro; 300s is sufficient for demo
- Keeps execution context warm between token flushes — critical for streaming AI responses

**Deploy commands:**
```bash
npm i -g vercel
vercel link
vercel env pull    # pulls BLOB_READ_WRITE_TOKEN etc. to .env.local
vercel deploy      # preview
vercel --prod      # production
```

---

### Hackathon Shortcuts (Safe Cuts)

| What to skip | Why safe | Post-hackathon fix |
|---|---|---|
| Authentication | Single-team demo; no real data at risk | Clerk or NextAuth.js (~2 hrs) |
| Database | localStorage survives demo; no multi-user needed | Vercel KV or Neon Postgres |
| Video frame extraction | Extract 1 keyframe via canvas API or skip video | Gemini File API for full video |
| Input validation / rate limiting | Internal tool demo at low volume | Zod + Upstash rate limiting |
| Error retry logic | Won't hit rate limits at demo volume | Exponential backoff |
| Map integration | Use free-text location field | Mapbox GL or Google Maps |
| Multi-responder real-time sync | No WebSocket/DB needed | Pusher or Supabase Realtime |
| Image compression | Vercel Blob handles large files; Gemini accepts up to 20MB | Client-side `canvas` resize |

**Most impactful shortcut:** Skip all backend persistence. localStorage eliminates database provisioning, schema migrations, and auth — saving 6-8 hours. The demo runs entirely in the browser post-deploy, which is also faster and more reliable for a live presentation.

**Do NOT skip:** The voice recording UI. It's a demo wow-factor moment (20 lines with `MediaRecorder`). Build it.

---

## 10. Success Metrics

### Demo Performance Targets

| Action | Target Time |
|---|---|
| Voice input → structured report | < 4 seconds (live on stage) |
| Photo upload → AI damage assessment | < 5 seconds |
| Full incident report generation | < 10 seconds |
| Crashes / loading spinners during demo | 0 |

### Quantitative Claims for the Pitch

> *"Traditional damage assessment: 15–25 minutes per structure. Our tool: 4 seconds."*

> *"Manual incident report writing: 2–6 hours after an event. Our tool: instant, continuous, one-click export."*

> *"Field responder training required: 0 minutes."*

### Judging Criteria Alignment

| Typical Hackathon Criterion | How This Demo Wins |
|---|---|
| **Technical Impressiveness** | Real-time multimodal streaming (voice + vision + text simultaneously) on Vercel Fluid Compute |
| **Market Potential** | $32B market, explicit federal policy tailwind, climate change as structural driver |
| **Social Impact** | Direct life-safety application — hard to argue against |
| **Use of Sponsor Tech** | Deep Gemini 2.0 Flash multimodal + Vercel AI SDK 6 streaming = judging criteria satisfied |
| **Demo Quality** | Live end-to-end in 90 seconds; no slides needed |

### Post-Demo Validation Targets

- **3 emergency managers** willing to schedule a follow-up call → validates market pull
- **1 letter of intent** from a county agency within 30 days → validates willingness to pay
- **Vercel/Google hackathon prize** → validates technical execution

---

## Appendix: Key References

- Vercel AI SDK 6 docs: [ai-sdk.dev](https://ai-sdk.dev)
- `@ai-sdk/google` provider: [ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
- Google AI Studio (API key): [aistudio.google.com](https://aistudio.google.com)
- Vercel Blob docs: [vercel.com/docs/storage/vercel-blob](https://vercel.com/docs/storage/vercel-blob)
- FEMA BRIC grant program: [fema.gov/grants/mitigation/bric](https://www.fema.gov/grants/mitigation/bric)
- NIMS/ICS reference: [training.fema.gov/nims](https://training.fema.gov/nims)
- shadcn/ui components: [ui.shadcn.com](https://ui.shadcn.com)

---

*Generated collaboratively by the Product Agent, Product Design Agent, and Vercel Expert Agent · 2026-03-21*
