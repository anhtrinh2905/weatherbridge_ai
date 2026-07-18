---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/prd.md
  - docs/prd-addendum.md
  - docs/architecture/README.md
  - docs/architecture/auth-keycloak.md
  - docs/architecture/deployment.md
  - docs/adr/0001-modular-monorepo.md
  - docs/adr/0002-keycloak-identity.md
  - docs/adr/0003-online-offline-ai-split.md
  - docs/design/handoff.md
---

# WeatherBridge AI - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for WeatherBridge AI, decomposing the requirements from the PRD, PRD Addendum, Architecture, and Design handoff into implementable stories.

Scope reminder (from PRD): MVP for VAIC 2026, single commune **Mường Pồn**, hazards **flash flood + landslide**, model **Level A (heuristic/AHP + calibrated I–D)**. Human/last-mile layer (speaker/TTS/relay) is **simulated only** in MVP.

**FR status legend:** ✅ **Core** (delivered, runs for real) · 🔶 **Mock** (demo on simulated data) · 🗓 **Roadmap** (future direction, not built in MVP).

## Requirements Inventory

### Functional Requirements

**Group A — Model & Heatmap (Core)**
- **FR1 ✅** Generate a **grid heatmap** for the whole commune, resolution ≤100m, with **flash flood** and **landslide** as separate layers. *AC:* each layer is a 5-level raster covering the commune boundary.
- **FR2 ✅** Per-cell hazard score = *static terrain susceptibility* × *per-type rain trigger*; binned to 5 levels. *AC:* deterministic, reproducible function; **flash flood uses basin-integrated rainfall, landslide uses I–D** (not a shared curve).
- **FR3 ✅** Heatmap updates from **3–7 day rainfall forecast** (source: Open-Meteo/GFS/IFS — **not** ERA5); has a **day-based time axis**. *AC:* changing the day changes the map; ≥3 day marks.
- **FR4 ✅** Project the 5 levels down to **2 levels** for residents: "prepare" / "go now". *AC:* every cell has one of the two labels.
- **FR5 ✅** **Backtest validation** on the 25/7/2024 event. *AC:* report AUC/recall; explicitly marked as internal evaluation, not presented as an achievement while labels are bootstrap.

**Group B — Alerts & action bulletins (Core)**
- **FR6 ✅** When a village exceeds threshold → generate an **alert**. *AC:* an alert event bound to village + type + level.
- **FR7 ✅** Alert has **4 parts**: what / how dangerous / what to do / **by when (countdown)**. *AC:* missing one part = invalid.
- **FR8 ✅** Resident UI is **layered**: color card + icon + action sentence on top; numbers (rainfall mm, level, confidence) below. *AC:* action shown before numbers.
- **FR9 ✅** **Configurable threshold table** per hazard type; officer can edit. *AC:* thresholds read from config, not hardcoded; source/justification recorded.

**Group C — Occupation personalization (Mock — simulated data)**
- **FR10 🔶** Resident profile (**simulated**: name/age/occupation/location/priority) → danger = the cell at their location.
- **FR11 🔶** Recommendation via matrix **Occupation × Type × Level → (action + deadline)**; LLM fills the wording (no scoring). *AC:* each combination has one sample recommendation.
- **FR12 🗓** Suggest **nearest safe point** ("where to run"). *(Needs evacuation-point layer + routing — Roadmap.)*

**Group D — Multi-channel & last-mile relay (Roadmap — simulated in MVP)**
- **FR13 🗓** Multi-channel: web + **speaker/TTS Mông–Thái** + SMS; red alert Amber-Alert sound. *(TTS/speaker simulated with a script; mistranslated TTS = life risk, needs native-speaker validation before real use.)*
- **FR14 🗓** Priority-support household registry (neutral term: **"hộ ưu tiên hỗ trợ"**).
- **FR15a 🗓** "Reminded" confirm button. **FR15b 🗓** Automatic accountability log. **FR15c 🗓** Escalation when overdue without confirmation.
- **FR16 🗓** Resident self-confirms status ("safe" / "need help").

**Group E — Role-based access control (Core — real mechanism, simulated resident data)**
- **FR17 ✅** **4 roles** with separated permissions: **admin, commune officer, village head, resident**. *AC:* each role only accesses its own data/action scope; token **not** in localStorage.
- **FR18 ✅** Officer/village-head dashboard: list + status, **triage = Exposure × Priority** (simulated resident data). *AC:* sorted by triage score descending.
- **FR19 🔶** Export alert report/log (who received, when) — simulated data.

### NonFunctional Requirements

- **NFR1 — Safety:** bias toward **reducing misses**; recall over precision in hazardous areas; always show **confidence**. **Mandatory disclaimer:** "support tool, does **not replace** official KTTV/PCTT warnings".
- **NFR2 — Signal-dead zones:** 🗓 core content reaches users without a smartphone (Roadmap; MVP is web).
- **NFR3 — Vulnerable users:** icon + color + short sentence; TTS Mông/Thái is Roadmap, requires native-speaker validation.
- **NFR4 — Timeliness:** heatmap refreshes when a new forecast arrives; *measure:* pipeline latency ≤ ~15 min [ASSUMPTION].
- **NFR5 — Architecture:** **no** train/GPU in the API; separate offline (train/backtest) from online (serving); refresh/dispatch tasks live in `worker/`.
- **NFR6 — Security & privacy:** **no** `localStorage` for tokens; **no real PII** in repo/demo; role-based access.
- **NFR7 — Transparency:** hazard score is **deterministic, explainable**; LLM stays outside the safety-scoring path.

### Additional Requirements

*(From Architecture README, ADRs, auth-keycloak, deployment)*

- **AR1 — Runtime boundaries:** `fe/` (browser, never touches PostgreSQL/Redis directly), `be/` (HTTP API, code in `src/`), `worker/` (separate process, imports backend AI runtime), `be/src/ai/` (online providers/retrieval/inference/observability), `ai/` (offline train/pretrain/dataset/eval only), `infra/` (deployment/Docker/Compose/Keycloak/observability).
- **AR2 — Project scaffold (greenfield):** modular monorepo with separate runtime images (fe, be, worker, optional model-server). No external starter template named; Epic 1 Story 1 = scaffold + local topology.
- **AR3 — Identity via Keycloak:** OIDC Authorization Code with **PKCE (S256)**; public browser client with no secret; tokens kept **in memory**; API validates access token signature via cached **JWKS** and checks issuer, algorithm, expiry, client binding. API never handles passwords or client secret.
- **AR4 — Keycloak realm & theme:** realm imported from `infra/keycloak/realm-export.json`; custom login theme at `infra/keycloak/themes/weather-bridge/login` using shared visual tokens.
- **AR5 — Keycloak production hardening:** managed PostgreSQL for Keycloak, real hostname + HTTPS-only redirect URIs, Secret Manager admin creds, `KEYCLOAK_ISSUER`/`KEYCLOAK_AUDIENCE`, SMTP, email verification, password policy, MFA, brute-force detection, session timeouts, audited realm export.
- **AR6 — Async job flow:** `be` creates an AI job → Redis carries the job id → `worker` calls `be/src/ai` runtime, writes result to PostgreSQL, exits.
- **AR7 — Module discipline:** feature modules + application services (no god-services); keep DB models, HTTP schemas, and AI contracts separate; thin route handlers; use generated OpenAPI client in `fe/src/shared/api/`.
- **AR8 — Migrations:** run as a release step / one-off job, not from every API replica.
- **AR9 — Deployment topology:** root `compose.yaml` full local topology (fe, api, worker, keycloak theme, proxy, postgres, redis, mailpit, keycloak, migrations one-off, readiness gates); `compose.prod.yaml` single-host; cloud = one immutable image per deploy unit; optional `litellm` gateway and `langfuse` observability as backing services (not imported into API process).
- **AR10 — Offline/online AI split:** online adapters in `be/src/ai`, product use cases in `be/src/services`; `ai/` holds only dataset/train/pretrain/eval/registry with no HTTP API or production image; training deps out of the API image.
- **AR11 — Data provenance & compliance:** public data only, no real PII; record dataset/model provenance in `oss-register.yaml` + `data-provenance` before use; no secrets/weights/`.env` in Git.

### UX Design Requirements

*(Design handoff is thin — derived from `docs/design/handoff.md` plus PRD FR4/FR8 and NFR3. Flag: no dedicated UX spec exists; these should be expanded or a `bmad-ux` run done for full fidelity.)*

- **UX-DR1** Open Design tokens are the **single canonical visual source**, adapted into: `fe/src/shared/styles/`, shared React UI components, landing + auth entry surfaces, and the Keycloak login theme at `infra/keycloak/themes/weather-bridge`.
- **UX-DR2** **One design system only** — do not introduce a second color, type, spacing, or component system.
- **UX-DR3** Resident view is **layered / low-literacy first**: color card + icon + single action sentence above the fold; supporting numbers (rainfall, level, confidence) below (implements FR8).
- **UX-DR4** **Two-level resident semantics** rendered clearly as "prepare" vs "go now" with distinct color + icon (implements FR4).
- **UX-DR5** Accessibility for vulnerable users: high-contrast color + icon + short sentences; confidence always visible; mandatory non-replacement disclaimer present on hazard surfaces (implements NFR1/NFR3).
- **UX-DR6** Heatmap UI: 5-level legend, per-type layer toggle (flash flood / landslide), and a day-based time slider (≥3 marks) (supports FR1/FR2/FR3).
- **UX-DR7** Role-scoped navigation: admin, commune officer, village head, resident each see only their own surfaces (supports FR17).

### FR Coverage Map

- **FR1** → Epic 2 — Commune hazard heatmap (grid, flood + landslide layers)
- **FR2** → Epic 2 — Per-cell hazard score with per-type trigger
- **FR3** → Epic 2 — 3–7 day forecast-driven update + time axis
- **FR4** → Epic 2 — 5→2 level projection for residents
- **FR5** → Epic 5 — Backtest validation on 25/7/2024 event
- **FR6** → Epic 3 — Threshold exceedance generates an alert
- **FR7** → Epic 3 — 4-part action bulletin with countdown
- **FR8** → Epic 3 — Layered resident alert card
- **FR9** → Epic 3 — Configurable per-type threshold table
- **FR10** → Epic 4 — Simulated resident profile → cell danger
- **FR11** → Epic 4 — Occupation × Type × Level recommendation matrix (LLM wording)
- **FR12** → Epic 6 (Roadmap, no MVP stories) — Nearest safe point
- **FR13** → Epic 6 (Roadmap) — Multi-channel + TTS Mông/Thái + SMS
- **FR14** → Epic 6 (Roadmap) — Priority-support household registry
- **FR15a/b/c** → Epic 6 (Roadmap) — Reminder confirm / accountability log / escalation
- **FR16** → Epic 6 (Roadmap) — Resident self-status confirmation
- **FR17** → Epic 1 — 4-role RBAC + Keycloak identity
- **FR18** → Epic 4 — Officer/village-head triage dashboard
- **FR19** → Epic 4 — Export alert report/log (simulated)

## Epic List

### Epic 1: Platform Foundation & Role-Based Access
Stand up the modular monorepo, local Docker topology, and Keycloak identity so all four roles (admin, commune officer, village head, resident) can sign in and land on a role-scoped shell wired to the shared design system. Delivers a secure, deployable walking skeleton every later epic builds on.
**FRs covered:** FR17
**Also covers:** AR1, AR2, AR3, AR4, AR5, AR6 (queue plumbing), AR7, AR8, AR9, NFR6, UX-DR1, UX-DR2, UX-DR7

### Epic 2: Commune Hazard Heatmap
Let a commune officer open a 3–7 day, 5-level hazard heatmap for Mường Pồn with separate flash-flood and landslide layers, a per-type physical trigger (basin rainfall vs I–D), and a day time-slider. Includes the offline terrain-feature pipeline (`ai/`), forecast ingestion, the deterministic scoring service, and the worker refresh job.
**FRs covered:** FR1, FR2, FR3, FR4
**Also covers:** AR10, NFR1 (safety bias + disclaimer), NFR4, NFR5, NFR7, UX-DR3, UX-DR4, UX-DR5, UX-DR6

### Epic 3: Threshold Alerts & Action Bulletins
When a village crosses a configurable threshold, generate a 4-part action bulletin (what / how dangerous / what to do / by when) and render it to residents as a layered, low-literacy card with the action first and numbers below. Officers manage the per-type threshold table from config.
**FRs covered:** FR6, FR7, FR8, FR9
**Also covers:** NFR1, NFR3, NFR5, UX-DR3, UX-DR5

### Epic 4: Resident Profiles, Triage & Recommendations (simulated)
On a simulated resident/household dataset, map each resident to their cell's danger, produce an occupation-tailored recommendation (Occupation × Type × Level matrix, LLM wording only), give officers and village heads an Exposure × Priority triage dashboard scoped by role, and export an alert log. No real PII.
**FRs covered:** FR10, FR11, FR18, FR19
**Also covers:** AR7, AR11, NFR6, NFR7 (LLM outside the scoring path)

### Epic 5: Model Validation & Provenance
Give admins/officers a backtest report on the 25/7/2024 event — digitized ground truth, recall@τ + FPR, and (stretch) regional ROC-AUC — computed offline in `ai/`, with dataset/model provenance recorded before use. Explicitly framed as internal evaluation, not a headline metric.
**FRs covered:** FR5
**Also covers:** AR10, AR11, NFR7

### Epic 6: Human Relay & Multi-channel (Roadmap — not implemented in MVP)
Traceability only — no MVP stories. Captures the future last-mile human layer: nearest safe-point routing, multi-channel dispatch with native-language TTS and SMS, the priority-support household registry, reminder/accountability/escalation workflow, and resident self-status. Requires native-speaker TTS validation and evacuation-point data before any real deployment.
**FRs covered:** FR12, FR13, FR14, FR15a, FR15b, FR15c, FR16
**Also covers:** NFR2

---

## Epic 1: Platform Foundation & Role-Based Access

Stand up the modular monorepo, local Docker topology, and Keycloak identity so all four roles can sign in and land on a role-scoped shell wired to the shared design system. Delivers a secure, deployable walking skeleton.

### Story 1.1: Scaffold the modular monorepo and local topology

As a developer,
I want the `fe/`, `be/`, `worker/`, `ai/`, `infra/` structure with a one-command local Docker topology,
So that the team has a running, deployable skeleton to build every feature on.

**Acceptance Criteria:**

**Given** a clean clone
**When** I run `docker compose up`
**Then** the frontend, API, worker, Keycloak (with theme), proxy, PostgreSQL, Redis, and Mailpit start with readiness gates
**And** database migrations run as a one-off job, not from an API replica
**And** `be` exposes a health endpoint that returns ok and `fe` serves a placeholder shell.

**Given** the runtime boundaries in `docs/architecture`
**When** I inspect the scaffold
**Then** `fe` has no direct PostgreSQL/Redis access, `ai/` contains only offline entrypoints, and no secrets or `.env` files are committed.

### Story 1.2: Sign in with Keycloak using Authorization Code + PKCE

As a user,
I want to log in through Keycloak with tokens kept in memory,
So that my session is secure and the app never stores my password.

**Acceptance Criteria:**

**Given** the realm imported from `infra/keycloak/realm-export.json`
**When** I start the login flow from `fe`
**Then** the browser uses Authorization Code with PKCE (`S256`) against a public client with no secret
**And** the access token is held in memory only — never in `localStorage`.

**Given** a successful login
**When** the token expires
**Then** the session refreshes or prompts re-authentication without exposing the token to persistent storage.

### Story 1.3: Validate access tokens at the API

As the API,
I want to validate incoming Bearer tokens against Keycloak JWKS,
So that only authenticated callers reach protected routes.

**Acceptance Criteria:**

**Given** a request with a Bearer token
**When** the API validates it
**Then** it checks signature via cached JWKS, plus issuer, algorithm, expiry, and client binding, and rejects otherwise with 401
**And** the API never receives or handles a client secret or user password.

**Given** an audience-configured realm
**When** `KEYCLOAK_AUDIENCE` is set
**Then** the API also enforces the audience claim.

### Story 1.4: Enforce four-role access control

As a security-conscious product,
I want admin, commune officer, village head, and resident roles enforced end to end,
So that each role only reaches its own data and actions (FR17).

**Acceptance Criteria:**

**Given** a signed-in user with a role claim
**When** they call an API route or open a UI surface
**Then** access is granted only for their role's scope and denied (403) otherwise.

**Given** a village head
**When** they request resident data
**Then** they can only see residents of their own village (scope check), not other villages.

### Story 1.5: Role-scoped app shell on the shared design system

As a user,
I want to land on a shell that shows only my role's navigation and uses the product's visual identity,
So that the experience is coherent and role-appropriate (UX-DR1, UX-DR2, UX-DR7).

**Acceptance Criteria:**

**Given** the Open Design tokens
**When** the shell, landing/auth surfaces, and Keycloak login theme render
**Then** they all use the same color, type, spacing, and component system with no second system introduced.

**Given** a logged-in role
**When** the shell renders navigation
**Then** only that role's surfaces are shown (admin sees all; resident sees their own).

---

## Epic 2: Commune Hazard Heatmap

Let a commune officer open a 3–7 day, 5-level hazard heatmap for Mường Pồn with separate flash-flood and landslide layers, per-type physical triggers, and a day time-slider.

### Story 2.1: Build the offline terrain-feature pipeline

As an AI engineer,
I want an offline pipeline that derives terrain features from the 30m DEM for the commune,
So that hazard scoring has reproducible static inputs (FR2 static term).

**Acceptance Criteria:**

**Given** SRTM 30m DEM clipped to the commune bbox (reprojected to UTM 48N)
**When** the `ai/` pipeline runs
**Then** it produces slope, aspect, HAND, TWI, SPI, flow accumulation, and stream-distance rasters covering the commune boundary
**And** the run is deterministic and records dataset provenance.

**Given** the architecture split
**When** the pipeline executes
**Then** it runs entirely in `ai/` (offline), not in the API process.

### Story 2.2: Ingest 3–7 day rainfall forecast

As the system,
I want to fetch and store 3–7 day rainfall forecasts for the commune coordinates,
So that the heatmap reflects current predicted rain (FR3).

**Acceptance Criteria:**

**Given** a forecast source (Open-Meteo/GFS/IFS)
**When** the worker ingest job runs
**Then** it stores per-day rainfall for the commune and does **not** use ERA5 as a forecast source
**And** the async path is `be` creates job → Redis job id → `worker` executes → result to PostgreSQL.

**Given** a forecast fetch failure
**When** the job runs
**Then** it fails safely, logs the error, and keeps the last known forecast rather than blanking the map.

### Story 2.3: Compute the per-type hazard score

As an AI engineer,
I want a deterministic scoring service that combines terrain susceptibility with a per-type rain trigger,
So that each cell gets an explainable 5-level hazard score (FR1, FR2, NFR7).

**Acceptance Criteria:**

**Given** terrain features and forecast rainfall
**When** scoring runs for a hazard type
**Then** landslide uses the I–D Guzzetti trigger and flash flood uses basin-integrated rainfall — never a shared curve
**And** the score bins to 5 calibrated levels (not fixed even bins) with a feature-contribution breakdown.

**Given** identical inputs
**When** scoring runs twice
**Then** it returns identical outputs (reproducible), and no LLM is in the scoring path.

### Story 2.4: Refresh the heatmap when a new forecast arrives

As a commune officer,
I want the heatmap to update automatically on new forecasts,
So that I always see current 3–7 day hazard (FR3, NFR4, NFR5).

**Acceptance Criteria:**

**Given** a new forecast is ingested
**When** the worker refresh job runs
**Then** it regenerates the flash-flood and landslide 5-level rasters per day and persists them to PostgreSQL
**And** the refresh runs in `worker/`, not in the API request process, within the ~15-min latency target.

### Story 2.5: View the interactive commune heatmap

As a commune officer,
I want a map with a 5-level legend, hazard-type toggle, and day slider,
So that I can read hazard across space and time (FR1, UX-DR6).

**Acceptance Criteria:**

**Given** persisted heatmap layers
**When** I open the map
**Then** I see the commune boundary, a 5-level color legend, and a toggle between flash-flood and landslide layers.

**Given** a day time-slider with ≥3 marks
**When** I change the day
**Then** the map updates to that day's hazard for the selected layer.

### Story 2.6: Project 5 levels to a resident-facing 2-level view

As a resident,
I want the hazard shown as "prepare" or "go now" with confidence and a disclaimer,
So that I understand the danger without reading numbers (FR4, UX-DR4, NFR1).

**Acceptance Criteria:**

**Given** a 5-level cell score
**When** the resident view renders
**Then** every cell shows exactly one of "prepare" / "go now" with a distinct color + icon.

**Given** any hazard surface
**When** it renders
**Then** the confidence is always visible and the mandatory disclaimer ("support tool, does not replace official KTTV/PCTT warnings") is present.

---

## Epic 3: Threshold Alerts & Action Bulletins

When a village crosses a configurable threshold, generate a 4-part action bulletin and render it to residents as a layered, low-literacy card.

### Story 3.1: Manage the configurable per-type threshold table

As a commune officer,
I want to read and edit hazard thresholds per type from configuration,
So that warning levels are tunable and auditable, not hardcoded (FR9).

**Acceptance Criteria:**

**Given** the threshold table
**When** the system evaluates hazard
**Then** thresholds are read from config (not hardcoded), each with a recorded source/justification.

**Given** an authorized officer
**When** they edit a threshold
**Then** the change is persisted and takes effect on the next evaluation; unauthorized roles are denied.

### Story 3.2: Generate an alert when a village exceeds threshold

As the system,
I want to raise an alert event when a village crosses its threshold,
So that at-risk villages are flagged for action (FR6).

**Acceptance Criteria:**

**Given** per-day village hazard and the threshold table
**When** a village's hazard exceeds the threshold
**Then** an alert event is created bound to village + hazard type + level
**And** generation/dispatch runs in the worker path, not the API request process.

**Given** a village below threshold
**When** evaluation runs
**Then** no alert is generated (no duplicate/noise alerts for the same unchanged state).

### Story 3.3: Compose the 4-part action bulletin

As a commune officer,
I want each alert expressed as what / how dangerous / what to do / by when,
So that residents get a complete, decision-ready message (FR7).

**Acceptance Criteria:**

**Given** an alert event
**When** the bulletin is composed
**Then** it contains all four parts including a "by when" countdown to the deadline.

**Given** a bulletin missing any of the four parts
**When** it is validated
**Then** it is rejected as invalid and not shown to residents.

### Story 3.4: Show the layered resident alert card

As a resident with limited literacy,
I want a color + icon + single action sentence first, with numbers below,
So that I know what to do at a glance (FR8, UX-DR3, UX-DR5, NFR3).

**Acceptance Criteria:**

**Given** a valid bulletin
**When** the resident card renders
**Then** the color card, icon, and action sentence appear above the supporting numbers (rainfall mm, level, confidence).

**Given** the card
**When** it renders
**Then** the non-replacement disclaimer is present and the layout is legible with high contrast for low-literacy users.

---

## Epic 4: Resident Profiles, Triage & Recommendations (simulated)

On a simulated resident/household dataset, map residents to hazard, produce occupation-tailored recommendations, give officers a triage dashboard, and export logs. No real PII.

### Story 4.1: Seed simulated resident profiles mapped to hazard

As the system,
I want a simulated resident/household dataset with each resident mapped to their cell's danger,
So that role dashboards and recommendations have data without real PII (FR10, NFR6).

**Acceptance Criteria:**

**Given** simulated profiles (name/age/occupation/location/priority)
**When** the dataset loads
**Then** each resident's danger equals the hazard of the cell at their location, and the data is clearly flagged simulated with no real PII.

**Given** the repository
**When** the dataset is stored
**Then** no real personal data is committed and provenance/synthetic-nature is recorded.

### Story 4.2: Generate occupation-based recommendations

As a resident,
I want a recommendation tailored to my occupation, the hazard type, and the level,
So that I get relevant guidance (FR11, NFR7).

**Acceptance Criteria:**

**Given** the Occupation × Type × Level matrix
**When** a recommendation is produced
**Then** each combination yields one action + deadline, and the LLM only fills the wording — it does not compute any score.

**Given** the online AI adapter
**When** wording is generated
**Then** it runs through `be/src/ai` and stays outside the deterministic hazard-scoring path.

### Story 4.3: Officer and village-head triage dashboard

As a commune officer or village head,
I want a resident list ranked by Exposure × Priority scoped to my role,
So that I can act on the highest-risk residents first (FR18).

**Acceptance Criteria:**

**Given** simulated residents with exposure and priority
**When** the dashboard loads
**Then** the list is sorted by triage score (Exposure × Priority) descending.

**Given** a village head
**When** they open the dashboard
**Then** they see only residents in their own village; a commune officer sees all villages.

### Story 4.4: Export the alert report/log

As a commune officer,
I want to export a log of alerts (who received what, when),
So that I have an auditable record (FR19).

**Acceptance Criteria:**

**Given** dispatched alerts on simulated data
**When** I export the report
**Then** it lists recipient, alert, and timestamp, and is scoped to the exporter's role.

---

## Epic 5: Model Validation & Provenance

Give admins/officers a backtest report on the 25/7/2024 event, computed offline, with provenance recorded and framed as internal evaluation.

### Story 5.1: Digitize ground truth for the 25/7/2024 event

As an AI engineer,
I want positive/negative cell sets digitized from Sentinel-2 (and/or COOLR points) for the 2024 event,
So that the backtest has ground truth (addendum §8).

**Acceptance Criteria:**

**Given** pre/post Sentinel-2 imagery of the event
**When** scars/flooded areas are digitized
**Then** affected cells are labeled positive and the rest negative, with the label source and known positional error recorded.

**Given** the 2024 event data
**When** it is stored
**Then** it is marked backtest-only and never used for training.

### Story 5.2: Run the offline backtest evaluation

As an AI engineer,
I want recall@τ + FPR and ROC-AUC computed offline against the ground truth,
So that model performance is measured honestly (FR5, AR10).

**Acceptance Criteria:**

**Given** hazard scores and the labeled cells
**When** the `ai/` evaluation runs
**Then** it reports recall@τ with FPR (primary) and, as a stretch, regional ROC-AUC with spatial cross-validation.

**Given** the evaluation
**When** it completes
**Then** it emits a report artifact and runs entirely offline, not in the API.

### Story 5.3: Record dataset and model provenance

As a compliance-conscious team,
I want dataset and model provenance recorded before use,
So that every input is traceable and licensed (AR11).

**Acceptance Criteria:**

**Given** each dataset and model used
**When** it is introduced
**Then** its provenance is recorded in `oss-register.yaml` and data-provenance before use, with no weights/secrets in Git.

### Story 5.4: View the validation report

As an admin or commune officer,
I want to see the backtest results framed as internal evaluation,
So that I trust the model without overclaiming (FR5, NFR1).

**Acceptance Criteria:**

**Given** a completed backtest
**When** I open the validation view
**Then** I see recall@τ, FPR, and AUC clearly labeled as internal evaluation, not a headline achievement.

**Given** bootstrap labels
**When** the report renders
**Then** it carries a caveat that results are not presented as an achievement until real labels exist.
