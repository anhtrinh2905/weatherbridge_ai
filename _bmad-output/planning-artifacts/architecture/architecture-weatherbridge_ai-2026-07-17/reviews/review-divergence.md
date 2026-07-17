# Divergence Reviewer Gate: Architecture Spine

**Review target:** `../ARCHITECTURE-SPINE.md`  
**Review date:** 2026-07-17  
**Review mode:** adversarial two-team convergence review; the spine was not edited  
**Gate question:** Can two independent teams one level below the initiative obey
every applicable AD literally and still build incompatible contracts or produce
different safety behavior?

## Gate Verdict

**RED for parallel implementation and any live pilot.** The spine has a sound
safety direction, but 7 critical, 8 high, and 3 medium divergence holes remain.
The largest risks are different safety decisions from the same evidence,
release of stale or uncorrectable alerts, unauthorized release behavior, and an
external exactly-once promise that no adapter can guarantee without provider
support.

It is usable only as an exercise-oriented direction document while all exercise
isolation rules hold. It is not yet a convergent contract for independently
built weather, risk, alert, delivery, accountability, identity, AI-release, and
deployment units.

The deterministic spine linter passed with zero findings. This report therefore
contains semantic divergence findings only.

## Review Boundary

The compliance test uses only the current text of `ARCHITECTURE-SPINE.md`.
Undistilled decisions in `.memlog.md` and scope guidance in
`AI-FIRST-DEVELOPMENT-ROADMAP.md` are not credited as ADs. The spine declares
`companions: []`, so independent builders are not required to discover or obey
those files.

Every counted finding below has all four properties:

1. Two named units can make the stated choices independently.
2. Both choices satisfy every applicable current AD literally.
3. The choices are incompatible or produce materially different safety behavior.
4. An initiative-level decision, rather than ordinary implementation detail, is
   needed to make them converge.

## Finding Summary

| Tier | Count | Gate effect |
| --- | ---: | --- |
| Critical | 7 | Blocks safe feature split and any real warning or evacuation path |
| High | 8 | Blocks convergent integration, release, and deployment planning |
| Medium | 3 | Leaves recovery and version-skew behavior implementation-dependent |

## Critical Findings

### C-01 - Named domain contracts are field inventories, not canonical semantics

**Pair A, weather producer:** Emits one `ForecastSnapshot` per provider run with
`horizon = {start, end}`, variable-keyed sampled arrays, omitted missing values,
and a `freshness` status calculated when ingestion completes.

**Pair B, risk consumer:** Expects one snapshot per valid time, a lead-time
duration as `horizon`, explicit missing/quality values, and a `valid_until`
freshness decision recalculated when assessment starts.

**Literal compliance:** Both use an immutable, versioned `ForecastSnapshot` with
location, horizon, values, canonical units, provider/model run, fetch time,
freshness, attribution, transform version, and exercise flag. Both obey the UTC,
unit, geography, and naming conventions.

**Divergence:** The pair is not wire-compatible and can make opposite
eligibility decisions for identical evidence. The same problem continues at
`RiskAssessment`, `ActionProtocol`, `ActionBulletin`, and `AlertEnvelope`: the
spine does not fix required versus optional fields, closed enums, copied values
versus stable references, cardinality, unknown-field behavior, or exact temporal
semantics. A producer can satisfy the prose while a consumer cannot interpret
its object safely.

**Missing decision:** Bind strict canonical schemas and owners for every
cross-module contract, including required/optional fields, closed vocabularies,
IDs and references, temporal/cardinality semantics, quality/missing-data rules,
unknown-field behavior, and accepted schema versions.

**Evidence:** `ARCHITECTURE-SPINE.md:55-61`, `:67-92`, `:128-133`, `:185-198`  
**Disposition:** Discuss and close before domain teams split. Gate-blocking.

### C-02 - Forecast source selection and freshness have no authoritative policy

**Pair A, weather feature:** Persists every fresh Open-Meteo, OWM, or station
snapshot and emits each one for assessment. It considers its job complete because
every snapshot is source-aware and independently valid.

**Pair B, risk feature:** Assumes weather has already selected one authoritative
snapshot per locality and horizon. A second compliant weather implementation
selects the newest candidate, while another keeps a fixed primary until its TTL
expires.

**Literal compliance:** Every implementation uses fresh, valid, canonical,
source-attributed snapshots and no learned ensemble. Open-Meteo attribution does
not make it authoritative, and the runtime diagram presents all adapters as peer
inputs.

**Divergence:** One implementation produces duplicate or contradictory
assessments; another silently switches providers; another retains older primary
data over fresher fallback data. Source switching can change severity without a
reviewable decision. `freshness` is carried but no owner defines maximum age,
required variables, evaluation time, or quality verdict.

**Missing decision:** Assign a versioned `SourcePolicy` owner and bind source
roles, candidate alignment, per-hazard/horizon freshness, required-variable and
range checks, fallback and switchback rules, disagreement behavior, degraded or
unknown outcomes, and exactly one frozen evidence selection per assessment.

**Evidence:** `ARCHITECTURE-SPINE.md:51-61`, `:220-229`, `:338-357`  
**Disposition:** Discuss before source adapters and risk evaluation proceed in
parallel. Gate-blocking.

### C-03 - Safety-policy semantics and activation can change live decisions differently

**Pair A, policy administration:** Treats a saved versioned `ThresholdPolicy` or
`ActionProtocol` row as immediately active. Its threshold evaluator uses `>=`,
the maximum hourly value in the window, and the most locality-specific protocol
with a generic fallback.

**Pair B, risk/composition:** Expects an approved effective-dated revision, uses
`>` with an averaged window, and requires an exact protocol match. It resolves
the active revision when queued work begins rather than when evidence is frozen.

**Literal compliance:** Both are deterministic; both use versioned database
records; both record a matched policy; both select protocols by hazard,
severity, occupation, and locality; neither gives an LLM policy authority.

**Divergence:** The same values can produce different hazard matches, severity,
deadline, release class, actions, or evacuation destination. A normal admin save
can become life-critical authority immediately in one implementation and remain
inactive in another. A queued assessment can also combine a newer policy or
protocol with older evidence.

**Missing decision:** Define immutable policy/protocol revisions; exact operators,
precision, window, aggregation, missing-data and boundary semantics; match
precedence and no-match behavior; draft/review/approved/active/retired states;
authority and audit; effective/expiry times; atomic activation and rollback; and
the point at which each revision is pinned. Deferring identification of the
legal owner does not close the technical activation contract.

**Evidence:** `ARCHITECTURE-SPINE.md:63-80`, `:197`, `:340-345`  
**Disposition:** Discuss before threshold or protocol administration is built.
Gate-blocking.

### C-04 - Immutable alerts have no revision, correction, expiry, or retraction contract

**Pair A, alert lifecycle:** Creates a new unrelated immutable `AlertEnvelope`
when evidence changes and leaves the old alert active until its inferred
deadline. Pending approvals remain approvable until an official acts.

**Pair B, accountability and UI:** Interprets a later assessment with the same
dedupe scope as superseding the old one, hides the old item, and emits a separate
cancellation event without a normative link. Its backend may still accept an
approval that the UI no longer shows.

**Literal compliance:** Neither mutates a released envelope. Both use append-only
events and the shown release transitions. The diagram does not state that its
terminal `Released` state expires, nor that a newer assessment invalidates
`PendingApproval`.

**Divergence:** Residents can retain obsolete advice or destinations; an
official can release an assessment after its evidence is stale; channels and
accountability views can disagree about which warning is authoritative; and a
false alert has no guaranteed correction, retraction, all-clear, or propagation
path.

**Missing decision:** Model immutable alert revisions with aggregate identity and
revision, validity windows, release-time evidence revalidation, pending-approval
expiry, supersession links, update/correction/retraction/all-clear types,
authorized transition rules, and mandatory propagation to every channel and
accountability projection.

**Evidence:** `ARCHITECTURE-SPINE.md:55-71`, `:128-133`, `:250-265`  
**Disposition:** Discuss before any non-exercise release path. Gate-blocking.

### C-05 - The external exactly-once effect promise is unenforceable

**Pair A, delivery worker:** On a provider timeout after send, retries the same
operation key to avoid omitting an evacuation message.

**Pair B, channel adapter:** On the same timeout, records `unknown` and suppresses
all repeats for that operation key to avoid a duplicate message.

**Literal compliance:** Both persist a `DeliveryAttempt`, use event ID plus an
operation key, acknowledge only after their definition of completion, and try to
prevent a second side effect. Neither can atomically commit PostgreSQL state with
an external SMS, push, Zalo, or loudspeaker provider.

**Divergence:** If the provider accepted the message but its response was lost,
Team A can duplicate it and Team B can lose it. Reversing write/send order only
reverses the failure. AD-7's unconditional statement that duplicate delivery
cannot create a second send is impossible for providers without idempotency or
receipt reconciliation. Deferring provider retry and receipt choices leaves the
current invariant false rather than implementation-neutral.

**Missing decision:** State guarantees by boundary: atomic internal state,
at-least-once transport, provider-idempotent sends only where contractually
supported, durable ambiguous-outcome state, receipt lookup/reconciliation,
bounded retry and terminal states, and an explicit duplicate-versus-omission
policy by severity and channel.

**Evidence:** `ARCHITECTURE-SPINE.md:104-112`, `:128-130`, `:346-348`  
**Disposition:** Tighten the guarantee before external channel stories. Gate-blocking.

### C-06 - Release does not freeze audience, content variant, or fan-out ownership

**Pair A, alerts feature:** Releases one envelope per assessment containing
affected villages and bulletin references. Delivery resolves current households,
occupation, language, channel preferences, and protocol text at send time.

**Pair B, accountability feature:** Freezes household/cohort membership and one
language/occupation bulletin variant at release, then expects delivery to use
those frozen rows for acknowledgements and escalation.

**Literal compliance:** Both consume a released immutable `AlertEnvelope`; both
use approved protocols and independent delivery attempts; neither channel mutates
alert truth. The envelope's normative audience and variant fields, however, are
not defined, and no owner is assigned to expansion from assessment scope to
recipient/channel work.

**Divergence:** A profile edit during fan-out can change recipients, action text,
language, destination, or follow-up obligations. Alert, delivery, and
accountability teams can disagree on envelope cardinality, attempt cardinality,
acknowledgement membership, and idempotency scope while all claim to deliver the
same immutable alert.

**Missing decision:** Assign the release/fan-out owner and freeze affected
villages, recipient or cohort membership, bulletin variant key, locale,
protocol/action/destination revisions, channel intent, and accountability cohort.
Channel adapters should receive frozen delivery commands and must not re-derive
safety content or audience from mutable profiles.

**Evidence:** `ARCHITECTURE-SPINE.md:73-92`, `:124-133`, `:275-281`  
**Disposition:** Discuss before alerts, delivery, and accountability teams split.
Gate-blocking.

### C-07 - Role and locality checks lack a shared authorization contract

**Pair A, identity platform:** Emits realm role `commune-official` and locality as
a Keycloak group path. Backend authorization treats commune membership as access
to every descendant village and trusts the API's decision in queued work.

**Pair B, backend modules:** Expects a client role named `official`, a UUID
`locality_id`, exact-locality equality, and a service principal on every worker
operation. It rejects the first team's claims or grants a different reach.

**Literal compliance:** Every implementation authenticates through Keycloak and
checks a role and locality on every operation according to its own vocabulary.
Both can call one user an authorized commune official. The event envelope is not
required to carry an actor or authorization context.

**Divergence:** Legitimate approvals can fail, village officials can gain
commune-wide reach, workers can either reject all queued user work or bypass the
stated per-operation check, and different modules can authorize the same actor
differently. The highest-consequence release command has no bound assurance,
delegation, or revocation semantics.

**Missing decision:** Bind canonical token claims, role and permission matrix,
locality hierarchy and multi-locality semantics, the machine mapping for the
authorized approver, actor/subject propagation, service-principal policy,
delegation and emergency access, approval audit evidence, and any fresh-auth or
step-up requirement. The deferred legal-person decision does not define these
machine contracts.

**Evidence:** `ARCHITECTURE-SPINE.md:67-71`, `:145-154`, `:336`, `:342-343`  
**Disposition:** Discuss with identity and operational authority before real
approval or sensitive-household work. Gate-blocking.

## High Findings

### H-01 - One-owner intent is not projected into entity ownership or dependency direction

**Pair A, risk module:** Owns `PendingApproval` on `RiskAssessment`, applies the
release gate, and creates an alert only after approval because the source layout
assigns release to `risk`.

**Pair B, alerts module:** Owns the full `Detected -> Composed -> Validated ->
PendingApproval -> Released` aggregate because the diagram is explicitly the
Alert Release State and `alerts` owns alert lifecycle.

**Literal compliance:** Each entity has exactly one owner in either design;
routes and workers call services; neither module writes the other's tables.

**Divergence:** Commands, events, transaction boundaries, foreign keys, and race
handling cannot connect without an unstated handoff. Ownership is also absent for
`ActionProtocol`, `ActionBulletin`, recipient fan-out, and outbox dispatch. AD-8
forbids cross-module writes but does not prevent shared ORM reads, duplicated
contract types, or cyclic module imports.

**Missing decision:** Add a contract/aggregate ownership map, mutation-service
owner, handoff event or command for release, and permitted module dependency/read
direction using owned queries or projections rather than foreign repositories.

**Evidence:** `ARCHITECTURE-SPINE.md:114-122`, `:250-300`  
**Disposition:** Discuss before module boundaries become code.

### H-02 - Event versioning does not define compatibility or causal order

**Pair A, event producer:** Adds fields or changes meaning under
`<event>.v2`, emits outbox rows in commit order, and assumes stream insertion
order is transition order.

**Pair B, event consumer:** Supports only v1, ignores unknown events, and
parallelizes a consumer group. Reclaim can finish revision 2 before revision 1,
while both events have unique IDs and therefore are not duplicates.

**Literal compliance:** Events are past tense and versioned, carry all five
required envelope fields, use at-least-once delivery, and are acknowledged after
completion. No rule relates the event-name suffix to payload `schema_version` or
requires aggregate ordering.

**Divergence:** Producer and consumer can become unreadable; release can arrive
before validation; a stale transition can overwrite a newer projection; and a
consumer cannot distinguish a duplicate from an old but distinct revision.

**Missing decision:** Bind schema ownership and registry location, compatible
change rules and support window, the relation between event name and payload
version, upcaster/unknown-version behavior, `aggregate_id` and monotonic revision,
causation, partition/order rules, expected-prior-state checks, stale-event
behavior, poison-event quarantine, and authorized replay semantics.

**Evidence:** `ARCHITECTURE-SPINE.md:104-112`, `:185-196`, `:250-265`  
**Disposition:** Discuss before introducing domain streams.

### H-03 - Dedupe and idempotency key spaces are not related

**Pair A, risk feature:** Derives its assessment dedupe key from hazard, village,
phenomenon window, and provider/model run. Corrected evidence is therefore a new
assessment and alert candidate.

**Pair B, alerts feature:** Coalesces all assessments by hazard, village, and
phenomenon window, while delivery keys each recipient/channel send by alert ID.
Another compliant implementation forwards every assessment key unchanged.

**Literal compliance:** Every key is an explicit operation-scoped string; every
handler combines event ID and operation key; every assessment carries a dedupe
key.

**Divergence:** One path repeats materially identical alerts; another suppresses
a necessary correction; a third sends a correction twice to some recipients.
Key retention differences can also turn a delayed retry into a new operation.

**Missing decision:** Bind canonical derivation, uniqueness scope, and retention
for assessment dedupe, alert aggregate/revision identity, event operations,
recipient/channel attempts, and offline commands, including how a corrected
assessment intentionally creates a new alert revision without becoming a
duplicate send.

**Evidence:** `ARCHITECTURE-SPINE.md:67-71`, `:104-112`, `:131-133`, `:190-192`  
**Disposition:** Discuss with alert revision and channel retry decisions.

### H-04 - Offline officer sync has no convergence or clock-authority protocol

**Pair A, officer PWA:** Uses one idempotency key per gesture, orders actions by
device timestamp, and removes an uploaded batch after one HTTP success. A
backdated acknowledgement is treated as occurring before the deadline.

**Pair B, accountability API:** Scopes keys by alert/household/operation, returns
partial per-item results, orders workflow by server receipt time, and rejects
actions after an assignment changes.

**Literal compliance:** Both cache assigned visits, queue actions offline,
preserve device timestamps, use idempotency keys, and expose typed v1 APIs.

**Divergence:** The client can lose partially rejected actions, repeat accepted
ones, suppress or retain escalation based on clock skew, act on removed
assignments, or resurrect deleted data. Append-only events do not decide which
event wins a deadline race.

**Missing decision:** Define server time as workflow authority or explicitly
choose another rule; preserve device time as separately labelled evidence;
specify assignment revision/cursor, tombstones, conflict and late-action
semantics, batch atomicity, per-item responses, duplicate-response replay, key
retention, clock-quality handling, credential revocation, and transactional
acknowledgement-versus-escalation ordering.

**Evidence:** `ARCHITECTURE-SPINE.md:124-133`, `:189-196`, `:294-310`  
**Disposition:** Discuss before offline accountability implementation.

### H-05 - A passing AI bundle has no promotion owner, atomic activation, or safe rollback

**Pair A, offline AI/eval:** Writes a passing release result and expects the
runtime to select the newest passing `AiTaskBundle` automatically.

**Pair B, runtime AI:** Requires a separately approved production-default
pointer and ignores passing candidates until an authorized operator activates
one. It resolves the pointer when a queued job starts rather than when the job is
created.

**Literal compliance:** Neither makes a failing bundle the default; both retain
schemas, prompt, provider/model, protocol/retrieval, validators, golden data,
thresholds, and release result.

**Divergence:** Workers can use different defaults, in-flight jobs can change
behavior across retry, and no team owns draft/evaluated/approved/active/retired
transitions. Rolling back a bundle that binds a protocol version can also
reactivate obsolete safety actions or destinations.

**Missing decision:** Assign the runtime release-record owner; require immutable
content-addressed manifests; define lifecycle, human authorization, atomic
environment pointer, in-flight version pinning, audit, retained known-good
release, rollback triggers and procedure, and independence of AI rollback from
current threshold/protocol activation.

**Evidence:** `ARCHITECTURE-SPINE.md:135-143`, `:197`, `:297-305`  
**Disposition:** Discuss before FR-24 controls any runtime release.

### H-06 - Localization and channel projection occur outside a final-artifact safety boundary

**Pair A, localization:** Renders every locale variant before release, validates
the localized text, and blocks that variant until audio is ready.

**Pair B, delivery:** Receives a released base envelope, renders an approved
template on demand, truncates SMS to provider limits, sends a push teaser plus a
link, and attaches audio later. It treats AD-5 validation of the base bulletin
and AD-6 review of the template as sufficient.

**Literal compliance:** Both use reviewed templates, no live machine translation,
one cached audio asset per bulletin/language, a released envelope as channel
input, and no model-authored safety facts.

**Divergence:** Residents can receive different four-part content, omitted
deadlines, mismatched language or dialect, or text and audio derived from
different revisions. The spine does not state whether localization is before or
after release, whether every final projection is validated, what a channel may
truncate, or what happens when a required template/audio asset is absent.

**Missing decision:** Define immutable localized-text and audio contracts linked
to the exact validated bulletin; locale/dialect/script and approval scope;
deterministic variable rendering; content-derived audio identity; release versus
audio readiness; approved degraded behavior; and channel-specific projection
rules that either preserve all safety content or use a fixed teaser pointing to
the immutable full artifact. Validate the artifact actually delivered.

**Evidence:** `ARCHITECTURE-SPINE.md:82-102`, `:124-130`, `:220-248`  
**Disposition:** Discuss before local-language or constrained-channel delivery.

### H-07 - Deployment profiles do not bind configuration, rollout, or version-skew behavior

**Pair A, application release:** Treats `Submission` as production, rejects mock
providers, runs the release migration, and starts the new API while old workers
finish pending messages against the prior schema.

**Pair B, infrastructure:** Treats `Submission` as a demo profile, permits mock
AI because only `Production` is forbidden, and independently scales or rolls
back API and worker images. It can also apply a destructive migration before the
old worker drains because migrations are correctly a release step rather than a
startup action.

**Literal compliance:** Both use the named environment envelopes, immutable
submission images, external secrets where required, release-step migrations,
and independent API/worker deployment. `Production` is not mapped normatively
to `Submission` or `Pilot`.

**Divergence:** App and infra can disagree on allowed providers, feature flags,
data and identity isolation, required credentials, and startup checks. Schema or
event changes can break old workers, cached frontends, pending messages, and
rollback even though every deployable unit follows its own rule.

**Missing decision:** Bind a profile matrix with canonical profile identifiers,
allowed data/providers/channels, required controls and capabilities, promotion
path, config validation, and environment isolation. Add expand/contract schema
and event compatibility, deploy/drain order, pending-work treatment, supported
API/worker/frontend skew, and rollback rules.

**Evidence:** `ARCHITECTURE-SPINE.md:41-49`, `:175-183`, `:313-322`  
**Disposition:** Discuss before submission packaging or pilot release design.

### H-08 - The 36-hour submission and pilot contracts have no binding cut line

**Pair A, submission planning:** Treats `binds: [FR-1..FR-24]` and all ADs as
non-droppable in 36 hours, implementing outbox/Streams, offline officer sync,
household credentials, TTS, external channels, telemetry, and the full AI bundle
registry before declaring the submission complete.

**Pair B, feature planning:** Treats those rules as the eventual pilot shape and
ships only a forecast/risk/card vertical slice, deferring mechanisms that the
environment envelope describes under pilot. It still plans every eventual unit
to obey the same ADs.

**Literal compliance:** The spine claims competition MVP, pilot evolution, and
runtime boundaries in one scope; gives every AD equal force; maps every FR
without phase; and names environments without mapping capabilities or ADs to
them. Nothing says which interpretation controls the current build.

**Divergence:** One team can consume the event building infrastructure while
another can omit a dependency that its neighbor assumes exists. More directly,
a conforming submission can still omit the exact minimum acceptance contract:
selectable 3-7-day forecasts for at least three locations, a simple resident UI,
and the mandatory architecture plus one-page deck. `companions: []` means the
sibling roadmap's cut line is not binding.

**Missing decision:** Add a non-droppable Submission Core, a separately ordered
Submission Differentiator, and a Pilot profile; map every capability and
cross-cutting AD to the first profile where it must be implemented; preserve
clean degradation; and bind the exact VAIC minimum and under-two-minute demo
proof. Pilot invariants may constrain later work without consuming the 36-hour
acceptance gate.

**Evidence:** `ARCHITECTURE-SPINE.md:7-15`, `:175-183`, `:313-337`  
**Disposition:** Discuss before story generation or sprint planning. Blocks use
of the spine as the sole 36-hour control document.

## Medium Findings

### M-01 - Redis reclaim has no lease, poison-event, or transport-recovery contract

**Pair A, stream operations:** Reclaims any pending event after a fixed idle
interval and prunes outbox rows once Redis accepts them.

**Pair B, task handler:** Runs TTS or a provider call longer than that interval,
acknowledges only after completion, and assumes Redis can be rebuilt from durable
outbox history after loss.

**Literal compliance:** Both acknowledge after completion, reclaim stale pending
work, keep Redis as recoverable transport, and make handlers idempotent.

**Divergence:** The same operation can run concurrently, poison events can churn
forever, and Redis loss can strand work after the publisher has marked or pruned
the outbox row. Stream/group naming, retention, ACL ownership, heartbeat, retry
ceiling, dead-letter ownership, and replay source are unbound.

**Missing decision:** Define per-task leases and heartbeats, timeout and error
taxonomy, backoff and maximum attempts, quarantine/dead-letter ownership, stream
and group topology, outbox publish/prune semantics, durable replay window, and
transport rebuild procedure.

**Evidence:** `ARCHITECTURE-SPINE.md:104-122`, `:240-247`, `:313-322`  
**Disposition:** Defer only behind an explicit pre-pilot transport contract; do
not leave it to independent handlers.

### M-02 - `/api/v1` plus generated clients does not define frontend compatibility

**Pair A, backend API:** Changes a typed response or enum under `/api/v1`,
regenerates the frontend client in the same repository, and deploys the API.

**Pair B, resident PWA:** Continues running a previously cached bundle and sends
offline commands from the older schema after reconnecting.

**Literal compliance:** Both use typed schemas and the generated client; the API
remains `/api/v1`; neither duplicates DTOs.

**Divergence:** A same-repository build can pass while independently deployed or
cached clients fail at runtime. An old offline action can become unreadable even
though its idempotency key is valid.

**Missing decision:** Define compatible API-change rules, enum evolution,
minimum client support window, deployment skew, server handling of old offline
commands, and when a breaking change requires a new API version.

**Evidence:** `ARCHITECTURE-SPINE.md:189-196`, `:307-310`, `:313-322`  
**Disposition:** Decide before pilot PWA caching/offline support; lower urgency
for a single-process exercise demo.

### M-03 - Offline evaluation can drift from the exact online AI contracts

**Pair A, offline AI:** Reimplements or snapshots schemas and validators under
`ai/evals` so the offline package remains isolated from backend runtime
dependencies, then publishes a passing bundle result.

**Pair B, online AI:** Evolves the authoritative validator and fallback under
`be/src/ai`, while workers import only the online application contracts.

**Literal compliance:** Offline datasets/evaluation stay in `ai`; online
contracts and validators stay in `be/src/ai`; workers execute asynchronous work;
the bundle records all named versions.

**Divergence:** A candidate can pass an offline copy but fail or behave
differently in production. Version labels do not prove that evaluation executed
the same schema, renderer, validator, and fallback artifacts that workers load.

**Missing decision:** Require offline evals to import or invoke the exact online
contract/render/validation code or verify content digests from the release
manifest. Keep raw datasets and training dependencies offline while handing only
immutable artifact IDs, digests, and reports to runtime release management.

**Evidence:** `ARCHITECTURE-SPINE.md:41-49`, `:135-143`, `:175-183`, `:297-305`  
**Disposition:** Close as part of H-05's release contract.

## Closed Candidate Findings Not Repeated

The current text already fixes the following earlier ambiguity classes. They are
not counted above and should not be reintroduced as findings:

- **Provider-shaped evidence is prohibited.** Adapters must emit canonical,
  source-aware snapshots with canonical units and attribution. C-01 concerns the
  remaining exact schema semantics, not whether a canonical boundary exists.
- **Double altitude correction is prohibited.** AD-2 permits provider correction
  or one versioned local lapse-rate transform, never both.
- **Missing or stale evidence cannot become a safe state.** No fresh valid
  snapshot means no new automatic assessment; stale data remains visible and an
  operational failure is raised.
- **The LLM does not own hazard, severity, deadline, actions, destinations, or
  evacuation release.** AD-3 through AD-5 correctly reserve those decisions for
  deterministic policies and authorized humans, with deterministic fallback.
- **Unsafe semantic-nearest protocol retrieval is excluded for the MVP.** AD-4
  requires deterministic relational selection over approved protocols.
- **Live machine translation of life-critical content is prohibited.** AD-6
  restricts runtime localization to reviewed templates and approved recordings.
- **The general mutation boundary is fixed.** PostgreSQL is durable truth;
  Redis is recoverable transport/cache; routes, workers, and adapters do not
  directly mutate another module's tables. H-01 concerns the still-unassigned
  concrete owners and dependency direction.
- **A channel failure does not roll back alert truth or another channel.** The
  unresolved C-05 issue is the external crash window, not channel isolation.
- **Exercise leakage is explicitly guarded.** Exercise state is immutable,
  visible, allowlisted, and partitioned end to end.
- **Online/offline process placement is fixed.** Provider/TTS/long work belongs
  in workers, online AI contracts in `be/src/ai`, and training/evaluation in
  `ai`. M-03 concerns artifact identity across that valid boundary.
- **An AI release gate exists and a failing bundle cannot become default.** H-05
  concerns the missing promotion and rollback lifecycle, not absence of a gate.
- **Environment categories exist.** H-07 and H-08 concern their missing normative
  controls and scope mapping, not absence of an environment envelope.

## Gate Exit Conditions

The divergence gate can pass only after the current spine itself, or a binding
declared companion, closes at least these seams:

1. Executable domain contract semantics and ownership.
2. Deterministic source and safety-policy selection/activation.
3. Immutable alert revision, frozen release fan-out, and final-artifact rules.
4. Truthful external delivery guarantees and related idempotency scopes.
5. Canonical authorization, event compatibility/order, and offline convergence.
6. Atomic AI release promotion/rollback tied to exact evaluated artifacts.
7. Normative deployment profiles, rollout compatibility, and a non-droppable
   36-hour submission cut line.

Until then, do not use `ARCHITECTURE-SPINE.md` alone to generate parallel feature
stories for a live pilot or to control the 36-hour submission backlog.
