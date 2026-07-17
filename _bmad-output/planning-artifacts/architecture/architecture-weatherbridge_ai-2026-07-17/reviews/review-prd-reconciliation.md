# PRD / VAIC Prompt Reconciliation Review

**Target:** `../ARCHITECTURE-SPINE.md`  
**Inputs:** `prd.md`, `addendum.md`, and the recoverable VAIC-prompt record  
**Review date:** 2026-07-17  
**Review mode:** reconciliation only; no source artifact was edited

## Verdict

**RED for use as the controlling 36-hour submission contract. AMBER as a
future-facing product/pilot architecture.**

The spine is technically coherent and preserves the central safety model, but
it does not preserve the load-bearing competition cut line. It binds
`FR-1..FR-24` and several pilot-grade mechanisms without saying which must be
built in 36 hours, while the exact minimum submission requirements are not
stated as acceptance gates. A team can comply with this spine, spend the event
on infrastructure, and still fail the VAIC minimum.

The spine should not be used by itself to generate the 36-hour backlog. The
sibling `AI-FIRST-DEVELOPMENT-ROADMAP.md` contains a much safer cut line, but the
spine declares `companions: []`, so that cut line is not part of the spine's
binding contract.

## Review Basis

The original VAIC user prompt is not stored verbatim in the repository. This
review therefore uses only prompt facts preserved by the run records:

- Architecture `.memlog.md:8-9`: the prompt required both a build substrate and
  a human-readable AI-first architecture proof for the team and VAIC judges.
- PRD `.memlog.md:21-23`: 3 rounds, automated AI screening first, final pitch of
  4 minutes plus 2 minutes Q&A, six weighted judging criteria, 6 builders, and
  a 36-hour build window.
- `prd.md:315-318`: submission documents must be self-explanatory, and the full
  demo chain must run in under 2 minutes.

No claim below is attributed to the prompt unless it is preserved in those
records. `addendum.md:3` explicitly says it is context and technical decisions,
not a second requirements specification; its suggestions are treated as
binding only where the PRD or spine adopts them.

## What Landed Correctly

The following load-bearing input decisions are preserved well:

| Input decision | Spine coverage | Assessment |
| --- | --- | --- |
| Existing `fe` / `be` / `worker` / `ai` / `infra` boundaries | AD-1, AD-14 | Strong |
| Source-aware normalized forecast evidence and stale-data behavior | AD-2 | Strong; improves the double-elevation-correction ambiguity |
| Rules own hazard, severity, scope, and deadline | AD-3 | Strong |
| Authorized human approves evacuation-class release | AD-3 | Strong |
| LLM is bounded to communication, with typed output, validation, timeout, and template fallback | AD-4, AD-5 | Strong |
| Prompt/model/protocol/validator/golden-set versioning and eval gate | AD-10 | Strong |
| Exercise data follows the real pipeline but cannot reach real recipients | AD-13 | Stronger than the PRD |
| Synthetic demo data and locality-scoped access for vulnerable households | AD-11 | Strong |
| No competition-time forecasting model training | AD-14 and Deferred | Strong |
| Flash-flood/landslide capability is not presented as validated prediction | Deferred, lines 358-360 | Strong |
| Channel adapters and optional CAP compatibility | AD-9 | Consistent with the addendum |

## Minimum Submission Reconciliation

The PRD's minimum is explicit at `prd.md:342-351`. The spine does not reproduce
it as a submission gate.

| VAIC minimum | Status in spine | Finding |
| --- | --- | --- |
| Forecast 3-7 days for at least 3 locations | **Partial** | AD-2 carries a generic `horizon`; the environment seed mentions five locations. Neither fixes a 3-7-day selectable forecast acceptance test, and the hourly/daily coverage in FR-1/FR-12 is absent. |
| Threshold-based warning | **Covered** | AD-3 fixes a deterministic `Risk Engine` and versioned threshold evidence. |
| Simple interface | **Missing as a constraint** | The capability map points to resident UI, but no invariant preserves progressive disclosure, the action-first card, 360 px/no-scroll behavior, or a simple safe-state forecast. |
| Architecture document | **Artifact exists, gate absent** | The spine itself satisfies the artifact type, but remains `status: draft` and does not identify submission completeness as a release gate. |
| One-page deck | **Artifact exists, trace absent** | `ONE-PAGE-DECK.md` exists, but the spine says `companions: []` and never identifies the deck as mandatory. |

**Minimum-submission conclusion:** only the threshold requirement is fully
encoded as a binding architecture rule. The package happens to contain the two
documents, but the spine does not make the four minimum requirements
non-droppable.

## 36-Hour Feasibility

### Source Cut Line

The formal PRD Must tier is `FR-1, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 23`, plus
the architecture document and one-page deck (`prd.md:275-285`). Human relay and
eval are Should-1; altitude/locality detail and local-language audio are
Should-2; countdown, red audio, and Zalo/SMS are Could.

The PRD also requires every non-Must capability to degrade cleanly without
breaking the demo (`prd.md:315-317`). That degradation rule did not land in the
spine.

### Spine Scope Inflation

The spine gives every AD the same apparent competition-time force. The
following are reasonable pilot decisions but are not grounded as 36-hour Musts:

| Unconditional spine rule | Added implementation burden | Source position |
| --- | --- | --- |
| AD-7: transactional outbox, Redis Streams consumer groups, reclaim, and exactly-once-in-effect handlers | Queue migration, outbox schema/dispatcher, retry/idempotency design, and failure tests | Not required by PRD/addendum |
| AD-8: object storage port for audio and reports | New storage abstraction and lifecycle | PRD permits a browser print view; demo can use local files |
| AD-9: offline officer cache, local action queue, device timestamps, and sync conflict handling | Offline data model and sync protocol | Not in the PRD; the prior judge review proposed it for reliability |
| AD-10: release-gated `AiTaskBundle` for every AI change | Registry, default-bundle transition, and release workflow | FR-24 is Should-1, not Must |
| AD-11: household-scoped revocable credentials | Credential issuance/revocation flow | PRD permits household identification and a demo role switch |
| AD-12: full-chain trace and broad telemetry | Cross-module instrumentation and privacy filtering | Valuable, but not a VAIC minimum |
| AD-13: allowlisted exercise destinations and partitioned reports/metrics | Additional isolation and reporting behavior | Exercise labeling is required; full partitioning is an architecture expansion |
| Submission environment: immutable images, TLS reverse proxy, migration release flow | Deployment hardening during the event | Not in the VAIC minimum |

### Baseline Corroboration

The current repository makes this more than a theoretical concern:

- `be/src/modules/` currently contains only the generic `ai_jobs` module; the
  six WeatherBridge modules in the structural seed are new.
- No `fe/src/features/forecast`, `alerts`, or `officer` implementation exists.
- The queue is currently `RPUSH`/`BLPOP`
  (`be/src/queues/redis_queue.py:15-17`, `worker/src/job_queue.py:9-14`), not an
  outbox plus Redis Streams.
- The worker currently mirrors the API table
  (`worker/src/job_store.py:8-22`), exactly the behavior AD-1 requires replacing.
- Keycloak verification and frontend PKCE wiring already exist, so reusing
  seeded demo identities is plausible; locality authorization and resident
  credential lifecycle are still new work.

No hours estimate is needed to reach the conclusion: the spine requires both
the product vertical slice and a foundational queue/module/state rewrite, with
no phase tags or permitted shortcuts. That is not a credible 36-hour contract.

## Detailed Findings

### C-01 - No Binding Competition Profile or Tier Boundary

**Severity:** Critical  
**Type:** Scope nuance lost / feasibility contradiction

**Source:** `prd.md:258-287` distinguishes target breadth from a formal
Must/Should/Could execution order. `prd.md:315-317` says non-Must features must
be removable without breaking the demo.

**Spine:** Frontmatter says `scope: ... competition MVP, pilot evolution, and
product runtime boundaries` and `binds: [FR-1..FR-24]`. AD-1 through AD-14 are
unconditional. The capability map also gives every FR equal status.

**Gap:** Competition, pilot, and production invariants are merged into one
contract. No reader can tell whether implementing AD-7, offline officer sync,
local TTS, human relay, CAP mapping, or production telemetry is required before
submission.

**Impact:** Story generation from the spine will over-scope the event and can
drop the actual minimum while satisfying future-facing architecture work.

**Required reconciliation:** Add a binding submission profile or phase marker
for every AD/capability. State that only the PRD Must tier plus mandatory
artifacts is non-droppable in 36 hours; all other decisions constrain later work
without requiring event-time implementation.

### C-02 - Exact VAIC Minimum Is Not an Architecture Acceptance Gate

**Severity:** Critical  
**Type:** Requirement omission

**Source:** `prd.md:342-351` fixes four minimum outputs: 3-7-day forecast for at
least three locations, threshold alerts, a simple UI, and architecture plus a
one-page deck.

**Spine:** AD-2 uses a generic horizon; the environment seed mentions five
locations; AD-3 covers thresholds; the resident UI has only a source-layout and
capability-map entry; submission artifacts are absent.

**Gap:** A conforming implementation could expose one forecast point, no
simple resident forecast view, and no linked deck while still obeying every AD.

**Impact:** Direct risk of failing eligibility/minimum scoring despite
architecture compliance.

**Required reconciliation:** Put the exact four-item VAIC minimum and its demo
proof at the top of the competition profile. Treat it as a release gate that no
other architecture work may displace.

### C-03 - Pilot-Grade Reliability Is Mandated Before the Vertical Slice

**Severity:** Critical  
**Type:** Ungrounded scope expansion / 36-hour feasibility

**Source:** The PRD Must tier asks for a demonstrable pipeline and permits
degradation. The addendum suggests a worker pipeline and channel adapters but
does not require a transactional outbox, Streams migration, offline sync, or
production deployment hardening.

**Spine:** AD-7 through AD-14 make those mechanisms universal. The source seed
also assumes six new backend modules and a queue redesign.

**Gap:** The spine does not distinguish architecture shape from implementation
required now. In particular, AD-7 is a replacement project for existing queue
code, not an inherited capability.

**Impact:** The infrastructure path can consume the build window before
FR-1/3/4/10/12 are demoable.

**Required reconciliation:** Preserve these as pilot invariants, but explicitly
permit a competition adapter/profile using the existing queue, local artifact
storage, polling/in-app delivery, and synthetic identities where doing so does
not violate safety truth.

### H-04 - Prompt Audience and Judging Constraints Did Not Land

**Severity:** High  
**Type:** Prompt requirement omission

**Source:** The prompt record requires a build substrate and an architecture
proof for judges. The PRD records automated first-round screening, six weighted
criteria, a 4-minute pitch, 2-minute Q&A, self-explaining documents, and a demo
under 2 minutes (`prd.md:315-318`, `prd.md:353-362`).

**Spine:** Frontmatter reduces purpose to `build-substrate`. It contains no
judge/rubric map, no demo-time constraint, no self-contained minimum summary,
and no companion links.

**Gap:** The architecture is strong engineering material but weak standalone
submission evidence. It assumes the reader will follow FR references into the
PRD.

**Impact:** An automated screener or judge reading only the architecture cannot
verify minimum compliance, 36-hour realism, business/pilot fit, UX intent, or
demo readiness.

**Required reconciliation:** Restore the dual audience, link the roadmap and
deck as companions, and include a compact submission-evidence map without
turning the spine into a full solution-design document.

### H-05 - Demo Authentication Concession Is Silently Replaced

**Severity:** High  
**Type:** Direct contradiction / unresolved source conflict

**Source:** FR-23 explicitly permits role-switch plus a simple password during
the 36-hour event (`prd.md:241-246`). The standing repository architecture uses
Keycloak for production identity.

**Spine:** AD-11 unconditionally requires Keycloak for officials/admins and
revocable household-scoped credentials for residents.

**Gap:** The spine silently chooses the production rule without recording the
conflict or defining demo fidelity. Keycloak itself is already scaffolded, but
household credential lifecycle and locality authorization are not.

**Impact:** Builders may either violate the spine to honor the PRD shortcut or
spend event time implementing credential flows that do not prove a VAIC
minimum.

**Required reconciliation:** State one explicit competition mode. The least
costly compatible option is likely seeded Keycloak official identities plus
synthetic/pre-bound resident devices, with no new registration/recovery
lifecycle during the event; otherwise record role-switch as a deliberate demo
exception rather than leaving contradictory instructions.

### H-06 - Demo Channel and Local-Language Priority Is Unresolved

**Severity:** High  
**Type:** Source contradiction not surfaced

**Source:** `prd.md:183-196` says Web Push plus in-app local-language audio must
run in the demo. The formal tier table puts FR-14 Web Push in Must but FR-15 TTS
in Should-2 (`prd.md:279-285`). Zalo/SMS are best-effort.

**Spine:** AD-6 and AD-9 define safe channel architecture but no competition
priority. The sibling roadmap makes in-app delivery primary, Web Push
conditional, and local audio stretch, but the spine does not adopt or link that
decision.

**Gap:** The source itself conflicts on TTS priority, and the spine neither
flags nor resolves it. It also does not preserve FR-15's downloaded-audio
offline playback requirement or FR-14's tap-through behavior.

**Impact:** Different lanes can build against different definitions of “demo
complete.”

**Required reconciliation:** Obtain one owner decision and encode it. Until
then, FR-14 is formally Must; FR-15 cannot be claimed as both mandatory and
Should-2.

### H-07 - Human-Relay Architecture Loses Its Defining Behaviors

**Severity:** High  
**Type:** Partial requirement landing

**Source:** FR-18 through FR-22 define manual vulnerable-household entry,
configurable escalation times, immediate escalation on “Không gặp,” a visit
list with reason/location/sample phrase, explicit statuses, locality visibility,
and an accountability report (`prd.md:211-239`). This is the product's stated
primary differentiator.

**Spine:** AD-7/8/9/11/12 establish durable event and ownership mechanics, and
the capability map assigns an `accountability` module.

**Gap:** The spine does not preserve manual-only registry population,
non-inference of vulnerability, X/Y/Z timing policy, immediate “Không gặp”
transition, required visit-list content, status vocabulary, or report evidence.
Offline sync is added, while several source behaviors are dropped.

**Impact:** Independently built accountability and officer units can be
architecturally consistent yet fail the differentiating user journey.

**Required reconciliation:** Keep the storage/event decisions, but preserve the
human-relay state machine and manual/non-inference safety boundary. Mark the
whole capability Should-1 for the competition rather than making infrastructure
unconditional and behavior implicit.

### H-08 - Local-Language Assumptions Become Facts and License Constraints Vanish

**Severity:** High  
**Type:** Assumption promotion / constraint omission

**Source:** The PRD treats native review during the competition as an explicit
assumption and defers real verification (`prd.md:193-200`, `prd.md:364-377`). The
addendum identifies Hmong Daw/RPA readability uncertainty and the Thai
`facebook/mms-tts-blt` CC-BY-NC 4.0 restriction (`addendum.md:34-46`). The PRD
requires recording the model in the OSS register (`prd.md:320-322`).

**Spine:** AD-6 states that runtime templates are human-reviewed and Hmong
segments are consented. Deferred then says native-speaker validation and
licenses still happen before pilot. The model/license, Hmong orthography risk,
Google Translation terms, attribution, and non-commercial limit are absent.

**Gap:** An unresolved assumption is presented as a current invariant, and AD-6
is internally tensioned with Deferred. The architecture also lacks the license
condition that affects the claimed B2G pilot path.

**Impact:** The demo may not satisfy its own architecture claim; downstream
work can accidentally carry an NC model into a paid pilot.

**Required reconciliation:** Tag contest language assets as synthetic/review-
assumed, preserve the real verification gate, and bind model/data/license
provenance to the competition versus commercial deployment profiles.

### H-09 - Operational and Demo Acceptance Constraints Are Missing

**Severity:** High  
**Type:** Non-functional requirement omission

**Source:** The PRD sets a 60-minute evaluation cycle, 5-minute release latency,
Web Push within 1 minute, visit-list creation within 1 minute, card behavior at
360 px, 6-hour action lead-time target, closure/usability metrics, and a full
demo under 2 minutes (`prd.md:103-121`, `161-190`, `215-239`, `289-318`).

**Spine:** AD-12 says which telemetry to record, but no target or acceptance
budget is fixed. The time convention covers representation, not service/demo
performance.

**Gap:** Observability exists without the input's success thresholds.

**Impact:** The system can be instrumented and still miss every user-visible
deadline or overrun the pitch.

**Required reconciliation:** Carry only the thresholds that coordinate multiple
units or prove submission readiness: forecast/evaluation cadence, release and
delivery latency, UI breakpoint, and demo duration. Product outcome targets may
remain in the PRD but need explicit verification ownership.

### M-10 - MVP Non-Goals Are Blurred by Unphased Runtime Diagrams

**Severity:** Medium  
**Type:** Scope ambiguity

**Source:** The MVP excludes physical loudspeaker integration, original weather
forecasting, learned thresholds, lot-level personalization, local station/maps,
and several later features (`prd.md:248-273`).

**Spine:** The runtime diagram includes station and loudspeaker adapters without
phase labels. The submission environment adds TLS and immutable-image concerns.
Deferred later limits some of these, but the main build diagram still presents
them as peers of submission components.

**Gap:** A reader can reasonably interpret future ports as current
implementation scope.

**Impact:** Scope creep and misleading submission claims, especially around
physical loudspeaker support and authoritative station data.

**Required reconciliation:** Mark diagram nodes by `submission`, `stretch`, and
`pilot`, or remove non-submission adapters from the submission rendering while
retaining their ports in Deferred.

### M-11 - UX and Two-Level Alert Semantics Are Not Preserved

**Severity:** Medium  
**Type:** Requirement omission

**Source:** The product uses exactly two user-facing levels, action-first
progressive disclosure, color/icon/audio semantics, a two-line action card, a
safe state, detailed evidence below, and countdown/acknowledgement behavior
(`prd.md:57-75`, `157-181`, `201-204`).

**Spine:** AD-3 uses preparation and evacuation-class concepts, but it does not
fix the two-level public vocabulary or mapping. The UI appears only in source
layout and capability mapping.

**Gap:** Risk, API, and frontend units can choose incompatible severity enums,
colors, sound behavior, and information hierarchy.

**Impact:** This fails the spine's own test for a divergence-prone,
cross-unit decision and weakens the minimum “simple interface” requirement.

**Required reconciliation:** Preserve the public two-level contract and the
action-first/evidence-second information invariant. Pixel detail can remain in
UX specifications.

### M-12 - Provider Priority, Fallback, Cost, and Terms Are Only Partially Carried

**Severity:** Medium  
**Type:** Constraint/context loss

**Source:** Open-Meteo is primary, OpenWeatherMap is fallback, five exact seed
locations are chosen by elevation/risk, free-tier operation is preferred, and
provider limitations must prevent flash-flood overclaiming (`prd.md:79-90`,
`320-322`; `addendum.md:26-32`).

**Spine:** AD-2 correctly normalizes providers and avoids double downscaling;
the diagram lists Open-Meteo/OWM/stations together. Only Open-Meteo attribution
is fixed.

**Gap:** Primary/fallback policy, OWM uncertainty/terms, call-budget behavior,
and the exact seed acceptance data are not assigned. Provider neutrality does
not answer which adapter must work in 36 hours.

**Impact:** Teams can duplicate source work, depend on credentials unnecessarily,
or omit the five-point evidence needed by the promised demo.

**Required reconciliation:** Fix Open-Meteo plus scenario fixtures as the
submission source set; keep OWM/stations as optional adapters with explicit
credential/quality gates.

### M-13 - Pilot/Business Constraints Do Not Match the Claimed Spine Scope

**Severity:** Medium  
**Type:** Scope omission

**Source:** The PRD proposes B2G ownership, a six-month one-commune pilot,
low-cost operation, configurable provincial scaling, legal prerequisites, and
a commercial replacement path for the NC Thai model (`prd.md:324-340`). Business
and pilot feasibility carry 20 judging points in the prompt record.

**Spine:** The pilot environment covers managed infrastructure, privacy jobs,
secrets, backups, and monitoring, but not the buyer/operator boundary, pilot
unit, low-connectivity operating model, configurable onboarding promise, or
license replacement condition.

**Gap:** The spine claims `pilot evolution` scope while carrying mostly
technical hosting evolution.

**Impact:** Judge-facing architecture does not demonstrate that the proposed
pilot and scaling model are technically enabled, and paid-pilot license risk is
easy to miss.

**Required reconciliation:** Either narrow the spine scope to runtime technical
boundaries or preserve the few business constraints that genuinely shape
architecture: operator/authority ownership, one-commune pilot isolation,
configuration-based locality onboarding, low-connectivity channels, and
commercially usable language assets.

### M-14 - The Assumption Ledger Is Not Propagated

**Severity:** Medium  
**Type:** Assumption omission

**Source:** The PRD explicitly indexes assumptions for altitude correction,
channel availability, Hmong text/audio, escalation timings, local data access,
lead time, feature priority, and business validation (`prd.md:372-382`).

**Spine:** Some become decisions, some appear in Deferred, and others disappear.
No architecture statement is tagged as an assumption.

**Gap:** Important uncertainties lose both status and revisit conditions.
Examples are the assumed X/Y/Z escalation timing, 6-hour lead time, Hmong Daw
readability, channel credentials, and unvalidated buyer model.

**Impact:** Downstream builders and judges cannot distinguish evidence-backed
invariants from competition assumptions.

**Required reconciliation:** Carry only architecture-affecting assumptions, but
tag them visibly and name the event that resolves each one. Do not promote
“treated as reviewed for demo” into “human-reviewed” without evidence.

## Contradiction Register

| Conflict | Input side | Spine side | Disposition |
| --- | --- | --- | --- |
| 36-hour scope | Formal Must/Should/Could tiers and graceful degradation | All FRs and ADs appear equally binding | **Unresolved; blocking** |
| Demo authentication | Role-switch/simple password explicitly allowed | Keycloak plus resident credential lifecycle required | **Silent override; resolve** |
| Local TTS priority | Narrative says mandatory; formal tier says Should-2 | No priority in spine; sibling roadmap says stretch | **Upstream conflict; owner decision needed** |
| Native review status | Assumed reviewed for competition; real review deferred | AD-6 states reviewed/consented; Deferred still calls for validation | **Fact/assumption contradiction** |
| Physical loudspeaker | Explicitly outside MVP | Present in unphased runtime flow | **Phase ambiguity** |
| Submission companions | Architecture and deck are mandatory and both files exist | `companions: []` | **Traceability contradiction** |

## Recommended 36-Hour Control Boundary

This is not a request to weaken the pilot architecture. It is the minimum
separation needed to make the existing decisions executable:

| Profile | Binding implementation scope |
| --- | --- |
| **Submission core** | PRD Must FRs; five seeded locations with 7-day view; one real frost/cold threshold vertical slice; four-part bulletin with validator/fallback; simple resident card and evidence view; scenario; household target/acknowledgement; Web Push if the formal Must remains; existing/seeded demo identity; architecture and one-page deck |
| **Submission differentiator** | Should-1 human relay and eval, only after the core passes end-to-end; native audio only after its priority conflict is resolved |
| **Pilot contract** | Outbox/Streams hardening, offline officer sync, full locality credential lifecycle, object storage, external channels, production telemetry/SLOs, privacy retention, CAP profile, authoritative thresholds/data, and commercially licensed language assets |

The architecture may continue to define pilot invariants now, but they must not
be interpreted as event-time acceptance criteria.

## Final Gate Decision

**Do not hand `ARCHITECTURE-SPINE.md` alone to story generation or sprint
planning for the 36-hour build.** It first needs a binding submission profile,
exact VAIC minimum gates, explicit companion links, resolution of auth and TTS
conflicts, and visible assumption/phase markers. Without those changes, the
most likely failure mode is a technically ambitious partial platform with no
complete minimum-submission demo.
