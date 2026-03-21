# Canary — AI-Powered Disaster Intelligence Platform
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
- **Social media is a goldmine of real-time ground truth that goes unmined** — citizens post photos, videos, and distress calls on X, Instagram, and TikTok faster than any official channel can report, yet no tool synthesizes this signal into operational intelligence
- **Existing camera infrastructure sits idle during crises** — traffic cams, city surveillance networks, and RTSP feeds provide continuous visual ground truth, but incident commanders have no AI layer to watch them

The status quo tooling — WebEOC, ICS-based paper forms, and radio — was designed for a pre-AI world. The cognitive load on incident commanders during peak crisis is unsustainable, and mistakes cost lives.

**Core pain point: multimodal field data (photos, voice, video, social posts, live camera feeds) cannot be rapidly synthesized into structured, actionable intelligence at the speed disasters unfold.**

---

## 2. Market Opportunity

### TAM / SAM / SOM

| Segment | Size | Notes |
|---|---|---|
| Global Emergency Management Software (TAM) | $32.4B (2024) → $58.9B (2030), CAGR ~10.5% | Public sector, critical infrastructure, Fortune 500 BCP |
| AI-Assisted Disaster Response & Damage Assessment (SAM) | ~$4.2B by 2027 | ~3,800 county/state EOCs in the US; international humanitarian orgs |
| US Public Safety Agencies — 3-Year Capture (SOM) | $85M–$140M ARR | FEMA HMGP + BRIC grant programs allocated $3.46B in FY2024 |
| AI in IT Operations / AIOps (incl. DR) | $3B (2024) → $21B (2030) | CAGR ~38% — fastest growing adjacent segment |
| Social Media Intelligence for Public Safety (Adjacent) | $1.1B (2024) → $3.8B (2029) | Law enforcement, emergency management, smart city vendors |

### Key Growth Drivers

1. **Climate change frequency** — 28 billion-dollar weather disasters in the US in 2023 (NOAA record). Structurally increasing demand.
2. **AI readiness in government** — 2024 Executive Order on AI and DHS's AI roadmap explicitly mandate AI integration in emergency response.
3. **Multimodal AI maturity** — Gemini 2.0 Flash's real-time vision + audio makes field-usable AI practical on a firefighter's phone. Live video stream analysis is now viable at consumer cost.
4. **Post-COVID federal investment** — ARPA infrastructure funds flowing into state and local digital modernization.
5. **Insurance pressure** — Parametric insurance and rapid claims processing create commercial pull for AI damage assessment.
6. **Explosion of citizen reporting** — 72% of Americans post to social media during local emergencies (Pew, 2023). This is the largest unmapped real-time sensor network on Earth.
7. **Smart city camera proliferation** — US cities have deployed 100,000+ networked cameras. Most sit unmonitored during the moments they matter most.

---

## 3. Target Users & Personas

### Primary Persona 1 — The Incident Commander (IC)
- **Who:** County emergency manager or fire/police unified commander running an EOC
- **Environment:** EOC or forward command post, multiple screens, radio traffic, high stress
- **Pain:** Synthesizing field reports into a coherent operating picture faster than the situation evolves; manually scanning social media for ground-truth reports; no way to watch dozens of camera feeds simultaneously
- **Need:** A system that reads field inputs, monitors social signals, and watches cameras — then surfaces "what do I need to decide right now"
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
- **Pain:** Aggregating damage assessments across dozens of jurisdictions; sifting social media for verified intelligence; determining which camera feeds show active life-safety events
- **Need:** Automated incident summaries, structured damage reports ready for federal systems (NEMIS), trend analytics, verified social signal digest
- **Tech comfort:** High — comfortable with dashboards and data tools

### Secondary Personas
- Insurance adjusters requiring rapid post-event damage documentation
- Utility restoration crews prioritizing grid repair based on damage photos and live camera feeds
- Public information officers needing verified situational reports, including social media trend context
- Smart city operations centers monitoring camera grids for emerging incidents

---

## 4. Core Value Propositions

### VP1: Voice-to-Structured-Report in Seconds
Field responders speak what they see — *"Three-story residential, roof collapse on north side, two individuals trapped, require heavy rescue"* — and Gemini 2.0 Flash instantly generates a structured ICS-214 style incident report with severity tagging, resource requirements flagged, and GPS timestamp. Eliminates the transcription bottleneck entirely.

### VP2: Photo Intelligence That Thinks Like a Damage Assessor
Upload a photo of a flooded structure or collapsed road and get immediate AI analysis: damage category (FEMA's ATC-45 rapid assessment scale), structural integrity estimate, recommended response priority, and extracted address/location data. What takes a trained assessor 20 minutes takes 4 seconds.

### VP3: Real-Time Multimodal Situational Awareness
The EOC dashboard ingests voice, photos, text, social media signals, and live camera feeds simultaneously from distributed field teams and external sources, synthesizes them into a live operational picture, and proactively surfaces resource conflicts. The IC sees the whole incident, not 40 isolated radio calls.

### VP4: Social Media as a Real-Time Sensor Network
Canary continuously monitors geo-tagged posts on X, Instagram, Reddit, and Nextdoor during an active incident. Gemini analyzes the stream to extract verified damage sightings, distress calls, road blockages, and shelter requests — ranked by credibility score and corroborated against official reports. Citizens become involuntary field reporters. The IC sees a rolling "Social Intelligence Feed" with AI-extracted structured data: *"47 posts in the last 10 minutes mention flooding at Oak Street / Highway 9 intersection. 3 posts include photos. Credibility: HIGH (corroborated by 2 field reports)."*

### VP5: Live Camera Feed Intelligence
Canary ingests RTSP streams, city traffic camera APIs, and public webcam URLs and runs continuous Gemini Vision analysis on keyframes. When a camera feed shows structural collapse, flooding, fire spread, or crowd congestion, the system automatically creates an AI-generated incident card and alerts the IC. No human has to be watching the camera. *"Camera CAM-047 (Main St & 3rd Ave) detected: active flooding, water depth est. 18–24 inches, 2 vehicles stalled. Confidence: 92%. [View Live Feed]"*

### VP6: Automated Incident Reports, Ready for Federal Submission
When a declared disaster requires federal reporting, the system auto-drafts NIMS/ICS-compliant incident reports from accumulated multimodal field data — including social intelligence excerpts and camera-detected events — ready for commander review and one-click export. Cuts report generation from 6+ hours to under 20 minutes.

### VP7: Works on a Firefighter's Phone
No special hardware. No trained operators. A field responder opens a web app on their existing smartphone, taps record, takes photos, and is done. The intelligence lives in the cloud (Vercel + Gemini). Offline-first data capture queues for sync when connectivity returns.

---

## 5. MVP Feature Set

> **Demo philosophy:** Every feature must be demonstrable live in 90 seconds without setup friction. Build the two biggest wow moments first — voice-to-report and social feed intelligence. Camera feed AI is the showstopper third act.

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

**C. Social Media Signal Feed**
- Simulated (MVP) or live (if X API / Reddit API keys available) social stream ingestion
- Gemini analyzes each batch of posts: extracts location, damage type, severity signal, credibility score
- Rolling "Social Intelligence" panel on dashboard: geo-clustered social signals, trending keywords, distress call count
- Credibility scoring: cross-reference social claims against official field reports — boost score when corroborated
- *Demo moment:* Watch a mock social feed get processed live — posts tagged, geolocated, and ranked. Show a citizen photo that corroborates a field report, credibility score jumping to HIGH.
- **MVP shortcut:** Use pre-recorded JSON fixture of 50 realistic social posts; replay them on a timer to simulate a live stream. Gemini still runs real analysis on each batch.

**D. Live Camera Feed Intelligence**
- Accept RTSP stream URL, public webcam URL, or MP4/video file as "camera input"
- Extract keyframes every N seconds (configurable, default 5s) via server-side ffmpeg or canvas API
- Send keyframes to Gemini Vision for continuous scene monitoring: flood level, fire spread, structural collapse, crowd density
- Auto-generate incident card when anomaly detected, with confidence score and feed timestamp
- Camera grid view: thumbnail mosaic of all configured feeds, color-coded by AI alert status
- *Demo moment:* Load a pre-recorded disaster video as a "live" feed. Watch Canary auto-detect the event, create an incident card, and alert the dashboard — with zero human review.
- **MVP shortcut:** Use a local MP4 file streamed via `<video>` element; extract frames via canvas API on client. No real RTSP infrastructure needed for demo.

**E. Live EOC Dashboard**
- Single-page Next.js dashboard showing all incoming field reports, social signals, and camera alerts
- Real-time updates via Vercel AI SDK streaming
- Color-coded severity indicators (Critical / High / Medium / Low / Nominal)
- Incident count, resource requests, social signal volume, and active camera alerts aggregated at top
- *Demo moment:* Field report + social corroboration + camera alert arriving simultaneously; watch dashboard update across all three panes

**F. AI Triage & Resource Recommendation**
- After each report (field, social, or camera), Gemini generates a recommended action
- Resource conflict detection across all signal types
- *Demo moment:* Show the AI recommending a specific resource action from a camera-detected event, commander clicks "Approve" → resource marked dispatched

**G. Auto-Generated Incident Summary Report**
- One button: "Generate Incident Report"
- Gemini synthesizes all field reports, social intelligence digest, and camera-detected events into a formatted, NIMS-style incident summary
- Downloadable as PDF or copy-pasteable markdown
- *Demo moment:* Click button → full professional incident report (including social signal section and camera evidence) generated in 5 seconds

### Nice-to-Have (If Time Permits)
- Audio playback of original voice notes linked to transcripts
- Map integration (Mapbox free tier) with incident pins, social signal heat map, and camera location markers
- Multi-user simulation (two browser tabs = two field responders)
- Severity trend graph over time, overlaid with social signal volume
- Real X/Reddit API integration with keyword + geo filters

### Explicitly Out of Scope
- Real GPS/location from field devices (mock coordinates are fine)
- Offline PWA sync
- Authentication/multi-tenancy
- Integration with real federal systems (NEMIS, WebEOC)
- Production RTSP stream ingestion (use video file playback for demo)

---

## 6. Competitive Landscape

| Player | What They Do | Their Gap |
|---|---|---|
| **Esri/ArcGIS Emergency Management** | GIS-based situational awareness, widely used by FEMA | No multimodal AI; no social or camera intelligence; requires trained GIS operators; expensive |
| **RapidSOS** | Real-time data aggregation for 911 dispatch | 911-focused, not field EOC; no vision/voice/social AI analysis |
| **One Concern** | AI risk modeling for disasters | Predictive/pre-event focus; not field response tooling |
| **Palantir AIP for Government** | Data fusion and AI for government ops | Extremely expensive, long implementation cycles, not SME-accessible |
| **WebEOC (Juvare)** | EOC workflow management | No AI; form-based; zero multimodal capability; 20-year-old UX |
| **Google Crisis Response** | Maps, People Finder, crisis info | Passive/informational; no active field coordination AI |
| **Zonehaven** | Evacuation management | Narrow scope; no field reporting |
| **Dataminr** | Social media signals for enterprise/government | Social-only; no field report integration; no camera feeds; expensive ($100K+/yr) |
| **Verkada / Avigilon** | Camera management platforms | Video management only; no AI synthesis with field data or social signals |

### Differentiation

Canary occupies **white space none of the above touches**: multimodal AI at the field level, combined with social media intelligence and live camera monitoring, all synthesized into a single operational picture — accessible on commodity hardware, with real-time streaming to the EOC.

**The killer differentiator:** Three simultaneous signal layers — field responders, citizen social posts, and camera feeds — unified by Gemini into a single coherent incident picture. No competitor combines all three. No competitor makes this accessible without six-figure contracts and months of integration.

---

## 7. Go-to-Market Strategy

### Phase 1: Validation Through Grants and Pilots (Months 1–6)
- **Target:** 3–5 county emergency management agencies for tabletop exercise pilots
- **Mechanism:** FEMA BRIC and HMGP grants cover technology adoption costs
- **Channel:** NEMA and IAEM conference networks
- **Ask:** Free pilot in exchange for outcome data (time-to-report, resource allocation accuracy, social signal utility)

### Phase 2: Freemium + State Contract Land (Months 6–18)
- **Freemium tier:** Unlimited voice/photo reports, 1 EOC dashboard user, social signal monitoring (50 posts/batch), 2 camera feeds, 30-day data retention
- **EOC Pro:** Multi-user, unlimited history, federal report templates, API access, unlimited social + 20 camera feeds — **$2,400/county/year**
- **State enterprise:** Aggregate county relationships + statewide camera network integration → **$180K–$450K/state/year**
- **Channel:** NASPO and Sourcewell state procurement vehicles

### Phase 3: Insurance, Infrastructure, and Smart City Verticals (Months 18–36)
- **Target:** Parametric insurers (camera + social evidence for rapid claims), large utilities (PG&E, Duke Energy), smart city platform vendors
- **Model:** Per-event licensing or enterprise SaaS — **$50K–$500K/event or $250K–$1M ARR**
- **Smart city angle:** Camera feed intelligence as a standalone module — sell to city IT departments running existing camera networks

### Positioning
> *"Canary watches everything so your responders don't have to — turning field reports, citizen posts, and live camera feeds into structured decisions in seconds."*

### Partnership Priorities
1. **Google.org** — mission alignment, Gemini credits, co-marketing
2. **FEMA's National Integration Center** — NIMS compliance certification
3. **FirstNet (AT&T)** — distribution to first responder agencies on their network
4. **Red Cross / Team Rubicon** — NGO deployment partners for international credibility
5. **Axon / Motorola Solutions** — camera and body-cam data integration partnerships
6. **X (formerly Twitter) / Reddit** — public safety API access programs

---

## 8. UI/UX Design Specification

### Design Philosophy

Emergency responders operate under cognitive overload, physical stress, poor lighting, and time pressure. Every design decision must answer: *does this work at 2am, in the rain, with gloves on, when someone's life may depend on it?*

**Core principles:**
- **Clarity Over Cleverness** — No ambiguous icons without labels; no hover-only affordances
- **Progressive Disclosure** — Severity badge first, summary second, full detail on demand
- **Forgiving Input** — Voice, photo, text, social signals, and camera feeds are all first-class inputs; none required
- **Trust Through Transparency** — AI-generated content is always labeled; confidence indicators always visible; social posts show source and credibility score
- **System Status Always Visible** — Network state, upload progress, AI status, social feed health, camera feed status permanently accessible
- **Interrupt-Resistant Flows** — Every state is recoverable; forms auto-save; nothing silently lost

**Default mode: dark.** Emergency operations centers run dark UIs to reduce ambient light interference and operator eye fatigue during long shifts.

---

### Information Architecture

```
/                          → Redirect to /dashboard
/dashboard                 → Live incident overview (primary hub) — field, social, camera panes
/incidents/new             → New incident intake (multimodal)
/incidents/[id]            → Incident detail + AI analysis
/incidents/[id]/report     → Auto-generated report preview & export
/social                    → Social media signal feed + AI analysis
/cameras                   → Camera grid view + AI alert log
/cameras/[id]              → Single camera feed + live AI monitoring panel
/resources                 → Resource allocation panel
/settings                  → User preferences, API config, camera/social source management
```

**Navigation model:**
- **Desktop:** Persistent left sidebar (collapsible to icon-only) + status indicator at bottom. Sidebar sections: Incidents · Social · Cameras · Resources
- **Mobile:** Bottom tab bar with 5 tabs: Dashboard · New · Social · Cameras · Resources
- **Breadcrumb:** Only on Incident Detail, Camera Detail, and Report pages. Max 3 levels.
- **Back navigation:** Explicit back button on all non-root pages

---

### Key Screens

#### Screen 1 — Dashboard / Incident Overview

**Layout (desktop):** Three-column. Left (40%): scrollable incident card list. Center (35%): social signal feed. Right (25%): camera alert ticker + summary stats.
**Layout (mobile):** Single column with horizontal-scrollable tab strip: "Field" · "Social" · "Cameras."

**Components:**
- Page title: "Canary — Active Incident" with live count badge + last-updated timestamp
- 6-up statistics row: Total Active / Critical Count / Pending AI Analysis / Resources Deployed / Social Signals (last 15m) / Camera Alerts
- **Field column:** Incident cards — ID + timestamp · Location · Severity `Badge` · AI status indicator · Lead resource · One-line AI summary
- **Social column:** Rolling social signal cards — Platform icon · @handle · Post excerpt · AI-extracted tags (location, damage type) · Credibility badge (HIGH / MEDIUM / UNVERIFIED) · Corroboration count
- **Camera column:** Camera alert cards — Feed name · Thumbnail · AI detection label · Confidence % · "View Live" button · Time ago
- Sort/filter bar: text search + severity dropdown + source filter (Field / Social / Camera)
- **Empty state:** Centered SVG + "No active incidents. Canary is watching." + "Log New Incident" CTA

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

**Section 4 — Text Description:** Auto-expanding `Textarea`, 4 rows min, 2000-char soft limit with counter.

**Sticky footer:** "Save Draft" (secondary) · upload/save progress indicator · "Submit Incident" (primary)

---

#### Screen 3 — Incident Detail / AI Analysis View

**Layout (desktop):** Two-panel. Left (55%): incident metadata + evidence gallery, scrollable. Right (45%): AI analysis panel, sticky.
**Mobile:** Single column; incident detail → AI analysis in `Collapsible` accordion.

**Left panel:** Incident title/ID/badge/timestamp · inline status `Select` · assigned team popover · masonry image gallery (click → `Dialog` lightbox) · voice notes player · original text notes · **corroborating social posts section** (linked social signal cards that reference same location/event) · **corroborating camera alerts** (thumbnail + link to camera feed) · Edit button.

**Right panel — AI Analysis:**
- Header: "AI Analysis" label + "Powered by Gemini 2.0 Flash" attribution
- **Streaming state:** `Skeleton` placeholders + "Analyzing…" spinner
- **Complete state (in order):**
  1. Severity card — full-width color bar + score + confidence % + one-sentence justification
  2. Damage summary — bordered card with severity-color left accent stripe
  3. Identified hazards — bulleted list with icon-labeled hazard types + severity chips
  4. Resource recommendations — 3–5 items with resource type icons + "Add to Resource Plan" per item
  5. Affected population estimate — range with "AI estimate" label
  6. **Social corroboration** — "X social posts mention this location. Credibility: HIGH." with post count and platform breakdown
  7. **Camera evidence** — "Camera CAM-047 detected related activity at 14:32." with thumbnail
- "Regenerate Analysis" text link at bottom
- "Open Full Report" primary button

---

#### Screen 4 — Social Media Signal Feed

**Layout:** Two-column. Left (65%): live social signal stream. Right (35%): AI intelligence panel (extracted structured data).

**Left — Social Stream:**
- Filter bar: platform chips (X / Reddit / Instagram / Nextdoor / All) + keyword search + geo filter + credibility filter
- Signal cards (chronological, newest first):
  - Platform icon + @handle + timestamp
  - Post text excerpt (truncated to 3 lines, expandable)
  - Attached media thumbnail if present
  - AI-extracted tags: `location chip` · `damage-type chip` · `severity chip`
  - Credibility badge: HIGH (green) / MEDIUM (amber) / UNVERIFIED (gray) / DISPUTED (red)
  - "Corroborates: Incident #1042" link if matched
  - "Create Incident from Post" secondary button (→ pre-fills New Incident form with extracted data)
- Infinite scroll / pagination

**Right — AI Intelligence Panel:**
- **Trending signals:** top 5 locations mentioned in last 15 minutes with post count
- **Distress call count:** posts containing calls for help, color-coded by volume trend (↑ / → / ↓)
- **Keyword cloud:** real-time weighted word cloud of AI-extracted damage terms
- **Credibility summary:** breakdown by credibility tier (HIGH: N, MEDIUM: N, UNVERIFIED: N)
- **"Generate Social Intelligence Brief"** button → Gemini synthesizes current social stream into a 3-paragraph situation summary for inclusion in official reports

---

#### Screen 5 — Camera Grid View

**Layout:** Responsive CSS grid — 2 columns on mobile, 3 on tablet, 4 on desktop. Sticky "Add Camera Feed" button top-right.

**Camera tiles:**
- Live video thumbnail (refreshed every 5s for MVP; true streaming for production)
- Feed name + location label
- Status badge: MONITORING (blue) / ALERT (red, pulsing) / OFFLINE (gray)
- Last AI detection label: "No anomalies detected" or "⚠ Flooding detected — 14:47"
- Confidence bar (thin, under thumbnail)
- "View Feed" button → opens Camera Detail (Screen 6)

**Alert ticker (top of page):** Horizontal scrolling strip of recent camera alerts, newest first. Click to open camera detail.

---

#### Screen 6 — Camera Detail / Live AI Monitoring

**Layout (desktop):** Two-panel. Left (60%): video player / keyframe viewer. Right (40%): live AI monitoring panel, sticky.

**Left — Feed:**
- Video player (native `<video>` for MVP; HLS.js for production RTSP)
- Timeline scrubber with AI-detected event markers (color-coded by severity)
- "Take Snapshot" button → sends current frame to Gemini for immediate on-demand analysis
- Keyframe gallery: last 12 extracted keyframes, AI label on each

**Right — Live AI Monitoring Panel:**
- **Current scene analysis** (updates every keyframe): scene type, detected objects, anomaly status
- **Active alerts:** chronological list of AI-generated alerts from this feed — timestamp · detection · severity · confidence
- **"Create Incident from Alert"** button → pre-fills New Incident with camera feed URL, timestamp, and AI detection summary
- **Analysis settings:** keyframe interval (5s / 15s / 30s), detection sensitivity (Low / Medium / High), monitored event types (checkboxes: Flooding · Fire · Structural Collapse · Crowd · Smoke · Vehicle Incident)

---

#### Screen 7 — Resource Allocation Panel

**Layout:** Full-width. Filter chips at top. Left column: resource inventory. Right column: active deployments list.

**Resource cards:** Name + type icon · Availability badge (Available/Deployed/En Route/Offline) · Location/unit ID · "Assign to Incident" button → `Popover` with `Command` component for incident search.

**Deployments list:** Incident ID + severity badge · Resource name · Time deployed · Status · "Release Resource" (→ `AlertDialog` confirmation).

---

#### Screen 8 — Auto-Generated Report Preview

**Layout:** Centered single-column, max-width 800px, document-style.

**Sections:** Report header · Executive Summary · Damage Assessment · Hazard Identification · Affected Population & Infrastructure · **Social Media Intelligence Summary** · **Camera-Detected Events** · Resource Deployment Record · Recommended Actions · Evidence Attachments · AI Analysis Metadata (model, confidence, timestamp).

**Social Media Intelligence Summary section:**
- AI-drafted paragraph summarizing the social signal picture at time of report
- Table: Top 5 locations mentioned + post counts + credibility distribution
- "Disclaimer: Social media data is unverified citizen reporting. Cross-reference with official field assessments before operational decisions."

**Camera-Detected Events section:**
- Table of all camera-generated alerts included in this incident: Camera ID · Location · Detection · Timestamp · Confidence · Keyframe thumbnail

**Editing:** Pencil icon per section converts it to inline `Textarea`.

**AI content watermark:** Subtle "AI-assisted content" label at the top of each AI-generated section.

**Sticky top action bar:** "Export PDF" (primary) · "Copy to Clipboard" · "Share Link" · "Back to Incident" text link.

---

### Component Inventory

| Use Case | shadcn/ui Component | Notes |
|---|---|---|
| Severity badge | `Badge` with custom `cva` variants | 5 semantic severity levels |
| Incident card | `Card`, `CardHeader`, `CardContent` | Hover via Tailwind `group` |
| Social signal card | `Card` | Platform icon, credibility badge, AI tags |
| Camera tile | `Card` | Thumbnail, alert badge, status indicator |
| Statistics tiles | `Card` | Non-interactive, numeric-focused |
| Incident type selector | `Select` | Searchable for long lists |
| Filter/sort controls | `DropdownMenu` | Severity, status, source, date range |
| Platform filter chips | `ToggleGroup` | X / Reddit / Instagram / Nextdoor |
| Incident status update | `Select` | Inline, optimistic update |
| Hazard/incident search | `Command` inside `Popover` | Combobox pattern |
| Voice record button | Custom on `Button` | Pulse animation via CSS keyframes |
| File upload zone | Custom on `Button` + native input | `react-dropzone` |
| Image lightbox | `Dialog` | Full-screen, prev/next navigation |
| Camera detail (mobile) | `Sheet` | Bottom sheet, full height |
| Destructive confirmations | `AlertDialog` | Release resource, delete, reset |
| Report section inline edit | `Textarea` | Auto-resize on focus |
| Section collapse (mobile) | `Collapsible` | AI analysis section |
| AI streaming status | `Skeleton` | Pulsing placeholder during generation |
| Priority selector | `ToggleGroup` | 4-item: Critical/High/Medium/Low |
| Confidence score | `Progress` | Subdued horizontal bar |
| Credibility badge | `Badge` with custom `cva` variants | HIGH / MEDIUM / UNVERIFIED / DISPUTED |
| System status indicator | `Badge` + `Tooltip` | Connectivity, sync, social feed, camera feed health |
| Toast notifications | `Sonner` | Upload complete, AI ready, camera alert, new social signal, errors |
| Top-level navigation | Sidebar (desktop) / custom bottom bar (mobile) | |
| Form fields | `Input`, `Textarea`, `Label` | Standard shadcn form primitives |
| Camera grid | CSS Grid + `AspectRatio` | Responsive 2–4 column mosaic |
| Alert ticker | Custom marquee / scroll container | Camera alerts horizontal strip |

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

/* Social signal credibility */
--credibility-high:       hsl(142 71% 45%);  /* green-600  */
--credibility-medium:     hsl(38 92% 50%);   /* amber-600  */
--credibility-unverified: hsl(217 20% 60%);  /* slate-500  */
--credibility-disputed:   hsl(0 72% 51%);    /* red-600    */

/* Camera feed status */
--camera-monitoring: hsl(217 91% 60%);  /* blue-600  — actively watched */
--camera-alert:      hsl(0 72% 51%);    /* red-600   — anomaly detected */
--camera-offline:    hsl(217 20% 40%);  /* slate-600 — no signal       */
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
Social panel tint:  #0A0F1A   (subtle blue — "this is social data")
Camera panel tint:  #0A1410   (subtle teal — "this is camera data")
```

---

### Interaction Patterns

**Drag-and-drop upload states:** idle (dashed border, muted) → drag active (solid primary border, scale 1.02, tinted background) → uploading (linear `Progress` bar per file) → complete (thumbnail grid, "Add more files" secondary button) → error (red border, inline error with fix description).

**Voice recording states:** idle (mic icon, neutral) → recording (red background, pulsing ring animation, stop icon, MM:SS counter) → processing (spinner, muted background).

**Streaming AI response states:** waiting → skeleton with `Analyzing with Gemini 2.0 Flash…` → streaming (tokens appear with blinking cursor at leading edge, incomplete sections remain as skeleton) → complete (cursor disappears, `Sonner` toast fires, action buttons activate) → error (error card with Retry button, partial results preserved).

**Social signal arrival:** New signal cards animate in from top of stream (slide down + fade in, 200ms). HIGH credibility signals trigger a subtle `Sonner` toast. CRITICAL-corroborated signals trigger a persistent alert banner.

**Camera alert states:** tile border flashes red on alert detection → alert badge animates in → `Sonner` toast fires with camera name and detection type → alert persists in camera alert log until manually acknowledged.

---

### Mobile Considerations

- **Touch targets:** 48×48px minimum; 56px for primary actions; 72px for voice record button
- **Bottom tab bar:** "New Incident" center tab is 56px tall (vs 48px), accent-colored, `+` icon prefix
- **Camera grid (mobile):** 2-column grid; tiles expand to full-screen on tap
- **Social feed (mobile):** Full-width cards; platform chip filter horizontally scrollable at top
- **Camera integration:** `Sheet` with two options — "Take Photo Now" (`input[capture=environment]`) + "Choose from Library"
- **Thumb zones:** All primary CTAs in bottom 40% of screen
- **Offline:** `localStorage` persists form state; persistent `Sonner` toast when offline
- **Haptic feedback:** `navigator.vibrate(50)` on record start/stop, successful submission, critical alerts, camera alert detection

---

### Accessibility

- **Color is never the sole indicator** — every severity level and credibility tier uses color + icon + text label
- **Touch targets:** Custom `touch-target` Tailwind utility enforcing `min-h-[48px] min-w-[48px]`
- **ARIA live regions:** AI analysis panel has `role="status"` + `aria-live="polite"` + `aria-busy="true"` during streaming; social feed has `aria-live="polite"` for new signal announcements; camera alerts have `aria-live="assertive"` for CRITICAL detections
- **Keyboard navigation:** Full keyboard operability; 3px high-contrast focus ring
- **Error messaging:** `role="alert"` on all form errors; error messages describe problem *and* fix
- **Reduced motion:** All CSS animations wrapped in `@media (prefers-reduced-motion: reduce)` overrides
- **Font size:** 16px base minimum; no text below 14px anywhere

---

### Implementation Priority (48-Hour Build Order)

1. **New Incident Intake** — core input flow; photo upload + text first, voice second
2. **Dashboard** — three-pane layout with incident cards, social feed stub, camera alert stub
3. **Incident Detail / AI Analysis** — streaming AI output is the "wow" moment
4. **Social Signal Feed** — fixture data + Gemini analysis; rolling stream simulation
5. **Camera Feed Intelligence** — local MP4 playback + canvas keyframe extraction + Gemini Vision loop
6. **Auto-generated Report** — include social and camera sections; display only for MVP

---

## 9. Technical Architecture

### Tech Stack

| Layer | Technology | Version | Justification |
|---|---|---|---|
| Framework | Next.js | 15.x (App Router) | Server Components, Route Handlers, native streaming, Vercel-native |
| Language | TypeScript | 5.x | Type-safe schema enforcement for incident data; required for `generateObject` Zod schemas |
| AI SDK | `ai` (Vercel AI SDK) | 6.x | Unified streaming primitives, `streamText`, `generateObject`, `useChat`/`useCompletion` |
| AI Provider | `@ai-sdk/google` | ^1.x | First-class Gemini 2.0 Flash support, multimodal content parts, inline media |
| Model | `gemini-2.0-flash` | — | Best price/performance for multimodal; 1M token context; fast TTFT; supports image + video |
| File Storage | Vercel Blob (`@vercel/blob`) | latest | Zero-config on Vercel; client-side uploads avoid 4.5MB body limit |
| Schema Validation | Zod | 3.x | Required by `generateObject`; validates incident API payloads and social/camera schemas |
| UI | shadcn/ui + Tailwind CSS | latest | Rapid prototyping; pre-built components for ops dashboards |
| State / Data | localStorage + React state | — | Hackathon shortcut; zero DB setup; sufficient for demo |
| Video (client) | HTML5 `<video>` + Canvas API | — | Keyframe extraction from local MP4 without server infrastructure |
| Video (production) | HLS.js + ffmpeg (server) | — | True RTSP stream ingestion and keyframe extraction |
| Social (MVP) | JSON fixture + timer | — | Pre-recorded social posts replayed to simulate live stream |
| Social (production) | X API v2 + Reddit API + Nextdoor Partner API | — | Filtered streams with geo + keyword filters |
| Deployment | Vercel Fluid Compute | — | Long-running streaming responses; no 10s timeout; automatic scaling |
| Runtime | Node.js | 20.x | Fluid Compute requires Node.js; Edge runtime lacks full Node APIs |

---

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Next.js Client)                         │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Upload UI   │  │  Incident Feed   │  │  Social  │  │   Camera    │ │
│  │  (photos,    │  │  (streaming AI   │  │  Signal  │  │   Grid +    │ │
│  │   audio,     │  │   response via   │  │   Feed   │  │  Keyframe   │ │
│  │   video)     │  │   useCompletion) │  │  (timer) │  │  Extractor  │ │
│  └──────┬───────┘  └────────┬─────────┘  └────┬─────┘  └──────┬──────┘ │
│         │                   │  SSE / Stream     │ batch        │frames  │
└─────────┼───────────────────┼───────────────────┼──────────────┼────────┘
          │                   │                   │              │
          ▼                   ▼                   ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     VERCEL (Fluid Compute, Node.js)                      │
│                                                                          │
│  /api/upload    /api/analyze    /api/social/analyze    /api/camera/frame │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ @vercel/  │  │ streamText │  │  generateObject  │  │  streamText   │ │
│  │  blob     │  │ multimodal │  │  social batch    │  │  vision scene │ │
│  │ .upload() │  │ narrative  │  │  structured tags │  │  analysis     │ │
│  └───────────┘  └──────┬─────┘  └────────┬─────────┘  └───────┬───────┘ │
│                         │                 │                     │         │
└─────────────────────────┼─────────────────┼─────────────────────┼────────┘
                          │                 │                     │
                          └─────────────────┴─────────────────────┘
                                            │ HTTPS
                                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      GOOGLE AI (Gemini 2.0 Flash)                        │
│                                                                          │
│   Input:  image parts · audio parts · text parts · video frames         │
│   Output: streamed text tokens  OR  structured JSON (via schema)        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Request flows:**

**Field report flow:**
1. User selects files → client calls `PUT /api/upload` → files stream to Vercel Blob
2. Blob returns stable `url` → client posts to `POST /api/analyze` with blob URLs
3. API route fetches blob bytes, constructs multimodal content parts, calls `streamText`
4. Route returns streaming SSE → `useCompletion` renders tokens in real-time
5. On stream finish → client calls `POST /api/report` (`generateObject`) to extract structured JSON
6. Completed incident persisted to localStorage

**Social signal flow:**
1. Client timer fires every 30s → fetches next batch of social posts (fixture JSON for MVP; real API for production)
2. Client posts batch to `POST /api/social/analyze` with post text + any attached media URLs
3. Gemini `generateObject` returns structured tags: location, damage type, severity, credibility score
4. Structured signals update Social Feed UI; high-credibility matches trigger incident corroboration check
5. Social signals persisted to localStorage alongside incidents

**Camera frame flow:**
1. Canvas API extracts keyframe from `<video>` element every N seconds → converts to base64 PNG
2. Client posts frame to `POST /api/camera/frame` with camera ID, timestamp, feed metadata
3. Gemini Vision analyzes scene: anomaly detection, damage type, severity, confidence
4. If anomaly detected → server returns alert payload → client creates camera alert card + `Sonner` toast
5. If CRITICAL → auto-draft incident card surfaces for IC approval

---

### Key API Routes

| Route | Method | Purpose | AI SDK Function |
|---|---|---|---|
| `/api/upload` | `PUT` | Stream file to Vercel Blob; return blob URL + metadata | None (Vercel Blob SDK) |
| `/api/analyze` | `POST` | Multimodal damage analysis; streams severity + recommendations | `streamText` |
| `/api/report` | `POST` | Generate structured incident report JSON from blob URLs | `generateObject` |
| `/api/transcribe` | `POST` | Transcribe audio voice note; return text + analysis | `generateText` |
| `/api/social/analyze` | `POST` | Analyze batch of social posts; return structured tags + credibility | `generateObject` |
| `/api/camera/frame` | `POST` | Analyze single camera keyframe; return anomaly detection result | `generateObject` |
| `/api/incidents` | `GET` | Return stored incidents (localStorage shim for MVP) | None |
| `/api/incidents` | `POST` | Persist completed incident record | None |

All AI routes export `runtime = 'nodejs'` and `maxDuration` to activate Fluid Compute.

---

### Data Model

```typescript
// types/incident.ts

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNKNOWN';
export type CredibilityLevel = 'HIGH' | 'MEDIUM' | 'UNVERIFIED' | 'DISPUTED';
export type CameraStatus = 'MONITORING' | 'ALERT' | 'OFFLINE';

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

// --- Social Signal Types ---

export interface SocialPost {
  id: string;
  platform: 'X' | 'REDDIT' | 'INSTAGRAM' | 'NEXTDOOR';
  handle: string;
  text: string;
  mediaUrls: string[];
  postedAt: string;       // ISO 8601
  location?: { label: string; lat?: number; lng?: number; };
  rawUrl: string;
}

export interface SocialSignal {
  id: string;
  post: SocialPost;
  analyzedAt: string;
  extractedLocation: string | null;
  damageType: string | null;
  severitySignal: SeverityLevel;
  credibility: CredibilityLevel;
  credibilityReason: string;
  corroboratesIncidentId: string | null;
  aiTags: string[];
}

// --- Camera Feed Types ---

export interface CameraFeed {
  id: string;
  name: string;
  location: { label: string; lat?: number; lng?: number; };
  sourceUrl: string;         // RTSP URL, HTTP stream, or MP4 path
  status: CameraStatus;
  keyframeIntervalSeconds: number;
  lastKeyframeAt: string | null;
}

export interface CameraAlert {
  id: string;
  cameraId: string;
  cameraName: string;
  detectedAt: string;       // ISO 8601
  keyframeUrl: string;      // Vercel Blob URL of the frame that triggered the alert
  detectionType: string;    // e.g. "Flooding", "Structural collapse", "Fire"
  severityLevel: SeverityLevel;
  confidence: number;       // 0–1
  aiDescription: string;
  acknowledgedAt: string | null;
  linkedIncidentId: string | null;
}

// --- Core Incident Types ---

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
  socialSignalCount: number;        // how many social posts corroborate this incident
  cameraAlertIds: string[];         // camera alerts linked to this incident
}

export interface Incident {
  id: string;                        // crypto.randomUUID()
  createdAt: string;                 // ISO 8601
  updatedAt: string;
  location: { label: string; lat?: number; lng?: number; };
  responderName: string;
  mediaAssets: MediaAsset[];
  streamingAnalysis: string;         // raw streamed text from /api/analyze
  report: IncidentReport | null;
  status: 'ANALYZING' | 'COMPLETE' | 'ERROR';
  linkedSocialSignalIds: string[];
  linkedCameraAlertIds: string[];
}
```

---

### Social Signal Analysis Route

```typescript
// app/api/social/analyze/route.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { geminiFlash } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SocialBatchSchema = z.object({
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

export async function POST(request: Request) {
  const { posts } = await request.json() as { posts: Array<{ id: string; text: string; mediaUrls: string[] }> };

  const parts = [
    {
      type: 'text' as const,
      text: `You are an emergency management analyst monitoring social media during an active disaster event.
Analyze the following batch of social media posts. For each post extract:
- Location mentioned (street, intersection, neighborhood, or null)
- Type of damage or emergency described
- Severity signal inferred from language and imagery
- Credibility: HIGH (eyewitness + specific detail + media), MEDIUM (plausible secondhand), UNVERIFIED (vague/rumor), DISPUTED (contradicts verified reports)
- 2-5 short AI tags (e.g. "flooding", "road-blocked", "persons-trapped")

Posts:
${posts.map(p => `[${p.id}] "${p.text}"`).join('\n')}`,
    },
  ];

  const { object } = await generateObject({
    model: geminiFlash,
    schema: SocialBatchSchema,
    messages: [{ role: 'user', content: parts }],
  });

  return Response.json(object);
}
```

---

### Camera Frame Analysis Route

```typescript
// app/api/camera/frame/route.ts
import { generateObject } from 'ai';
import { z } from 'zod';
import { geminiFlash } from '@/lib/ai';
import type { CoreMessage } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CameraFrameSchema = z.object({
  anomalyDetected: z.boolean(),
  detectionType: z.string().nullable(),      // "Flooding", "Fire", "Structural Collapse", null
  severityLevel: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'UNKNOWN']),
  confidence: z.number().min(0).max(1),
  description: z.string(),                   // one-sentence human-readable summary
  recommendedAction: z.string().nullable(),
});

export async function POST(request: Request) {
  const { frameBase64, cameraId, cameraLocation, monitoredEventTypes } = await request.json() as {
    frameBase64: string;
    cameraId: string;
    cameraLocation: string;
    monitoredEventTypes: string[];
  };

  const parts: CoreMessage['content'] = [
    {
      type: 'image',
      image: frameBase64,
      mimeType: 'image/png',
    },
    {
      type: 'text',
      text: `Camera: ${cameraId} at ${cameraLocation}.
Monitor for: ${monitoredEventTypes.join(', ')}.
Analyze this camera frame. Determine if any of the monitored event types are present.
If an anomaly is detected, provide a concise description and recommended response action.
If no anomaly: set anomalyDetected=false, detectionType=null, severityLevel=UNKNOWN.`,
    },
  ];

  const { object } = await generateObject({
    model: geminiFlash,
    schema: CameraFrameSchema,
    messages: [{ role: 'user', content: parts }],
  });

  return Response.json(object);
}
```

---

### Client Camera Frame Extraction

```typescript
// components/CameraMonitor.tsx
'use client';
import { useEffect, useRef, useCallback } from 'react';

interface CameraMonitorProps {
  videoSrc: string;
  cameraId: string;
  cameraLocation: string;
  intervalSeconds: number;
  monitoredEventTypes: string[];
  onAlert: (alert: CameraAlertPayload) => void;
}

export function CameraMonitor({
  videoSrc, cameraId, cameraLocation,
  intervalSeconds, monitoredEventTypes, onAlert,
}: CameraMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const extractAndAnalyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.paused || video.ended) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = 640;
    canvas.height = 360;
    ctx.drawImage(video, 0, 0, 640, 360);
    const frameBase64 = canvas.toDataURL('image/png').split(',')[1];

    const res = await fetch('/api/camera/frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameBase64, cameraId, cameraLocation, monitoredEventTypes }),
    });

    const result = await res.json();
    if (result.anomalyDetected) {
      onAlert({ cameraId, cameraLocation, ...result, keyframeDataUrl: canvas.toDataURL('image/png') });
    }
  }, [cameraId, cameraLocation, monitoredEventTypes, onAlert]);

  useEffect(() => {
    const interval = setInterval(extractAndAnalyzeFrame, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [extractAndAnalyzeFrame, intervalSeconds]);

  return (
    <>
      <video ref={videoRef} src={videoSrc} autoPlay muted loop className="w-full rounded-lg" />
      <canvas ref={canvasRef} className="hidden" />
    </>
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
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Vercel Blob — auto-populated via `vercel env pull`
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Social API keys (optional for MVP — fixture data works without these)
# X_BEARER_TOKEN=...
# REDDIT_CLIENT_ID=...
# REDDIT_CLIENT_SECRET=...
```

---

### Deployment Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/analyze/route.ts":        { "maxDuration": 300 },
    "app/api/report/route.ts":         { "maxDuration": 120 },
    "app/api/transcribe/route.ts":     { "maxDuration": 60  },
    "app/api/social/analyze/route.ts": { "maxDuration": 60  },
    "app/api/camera/frame/route.ts":   { "maxDuration": 60  }
  }
}
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
| Real RTSP streams | Local MP4 playback is visually identical for judges | HLS.js + ffmpeg server-side |
| Live social API | Fixture JSON replays realistically on a timer | X API v2 filtered stream |
| Map integration | Free-text location field is sufficient for MVP | Mapbox GL or Google Maps |
| Video frame extraction server-side | Canvas API on client is sufficient | ffmpeg Route Handler |
| Multi-responder real-time sync | No WebSocket/DB needed | Pusher or Supabase Realtime |
| Input validation / rate limiting | Internal tool demo at low volume | Zod + Upstash rate limiting |
| Social credibility ML model | Gemini rule-based scoring is strong enough | Fine-tuned classifier |

**Most impactful shortcut:** Pre-record a 2-minute disaster video clip and a 50-post social fixture. These two files alone make the camera and social features fully demonstrable with zero external API dependencies.

**Do NOT skip:** The camera frame loop — even a 5-second interval producing a live alert is the demo showstopper. Build it.

---

## 10. Success Metrics

### Demo Performance Targets

| Action | Target Time |
|---|---|
| Voice input → structured report | < 4 seconds (live on stage) |
| Photo upload → AI damage assessment | < 5 seconds |
| Social batch (10 posts) → structured signals | < 3 seconds |
| Camera keyframe → anomaly detection result | < 4 seconds |
| Camera anomaly → auto incident card | < 6 seconds end-to-end |
| Full incident report generation (incl. social + camera sections) | < 15 seconds |
| Crashes / loading spinners during demo | 0 |

### Quantitative Claims for the Pitch

> *"Traditional damage assessment: 15–25 minutes per structure. Canary: 4 seconds."*

> *"Manual social media monitoring: 1 dedicated analyst, 60% signal missed. Canary: 100% of geo-tagged posts processed and ranked in under 3 seconds per batch."*

> *"Camera networks go unmonitored during the first critical hour of most disasters. Canary watches every feed simultaneously — and wakes the IC only when something matters."*

> *"Field responder training required: 0 minutes."*

### Judging Criteria Alignment

| Typical Hackathon Criterion | How Canary Wins |
|---|---|
| **Technical Impressiveness** | Three simultaneous AI signal pipelines (field multimodal + social NLP + camera vision) streaming in real-time on Vercel Fluid Compute |
| **Market Potential** | $32B emergency management + $3.8B social intelligence markets; explicit federal policy tailwind; climate change as structural driver |
| **Social Impact** | Direct life-safety application — the camera + social layers can surface incidents before any official report is filed |
| **Use of Sponsor Tech** | Deep Gemini 2.0 Flash multimodal + Vercel AI SDK 6 streaming + Vercel Blob = all sponsor criteria satisfied across three distinct use cases |
| **Demo Quality** | Live end-to-end in 90 seconds; three wow moments (voice report, social batch analysis, camera alert auto-incident); no slides needed |

### Post-Demo Validation Targets

- **3 emergency managers** willing to schedule a follow-up call → validates market pull
- **1 letter of intent** from a county agency within 30 days → validates willingness to pay
- **Vercel/Google hackathon prize** → validates technical execution
- **1 smart city / traffic authority conversation** → validates camera feed monetization path

---

## Appendix: Key References

- Vercel AI SDK 6 docs: [ai-sdk.dev](https://ai-sdk.dev)
- `@ai-sdk/google` provider: [ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai](https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai)
- Google AI Studio (API key): [aistudio.google.com](https://aistudio.google.com)
- Vercel Blob docs: [vercel.com/docs/storage/vercel-blob](https://vercel.com/docs/storage/vercel-blob)
- FEMA BRIC grant program: [fema.gov/grants/mitigation/bric](https://www.fema.gov/grants/mitigation/bric)
- NIMS/ICS reference: [training.fema.gov/nims](https://training.fema.gov/nims)
- shadcn/ui components: [ui.shadcn.com](https://ui.shadcn.com)
- X API v2 filtered stream: [developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream](https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream)
- Reddit API (r/emergency, geo-tagged posts): [reddit.com/dev/api](https://www.reddit.com/dev/api)
- Gemini video/vision capabilities: [ai.google.dev/gemini-api/docs/vision](https://ai.google.dev/gemini-api/docs/vision)

---

*Iterated from the original Disaster Recovery Product Research document · Product name updated to **Canary** · Social media signal intelligence and live camera feed AI added throughout · 2026-03-21*
