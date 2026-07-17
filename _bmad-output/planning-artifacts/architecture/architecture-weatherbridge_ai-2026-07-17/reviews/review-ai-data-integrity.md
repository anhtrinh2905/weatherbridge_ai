# AI/Data Architecture Integrity Review — WeatherBridge AI

**Review target:** `ARCHITECTURE-SPINE.md` dated 2026-07-17  
**Review scope:** typed online contracts, grounding, version identity,
deterministic validation, local-language/TTS boundaries, source provenance and
freshness, multi-source uncertainty, evaluation/promotion/rollback, offline
`ai/` versus online `be/src/ai`, and AI-first credibility without model
authority.  
**Disposition:** review only; the architecture spine was not edited.

## Verdict

**Conditional pass for an exercise/demo architecture; not ready to govern a
live pilot.** The spine gets the most important safety principle right:
forecast evidence, deterministic risk decisions, approved protocols, model
wording, and human release authority are separate. It also has sound fail-safe
fallbacks and a substantially correct process boundary between `ai/`,
`be/src/ai`, the API, and `worker`.

The remaining gaps are architectural rather than editorial. The document names
typed artifacts but does not yet define an enforceable contract system; shows
multiple sources without defining deterministic alignment, disagreement, or
failover semantics; validates the AI draft but does not place localization,
TTS, and channel rendering inside an end-to-end validation boundary; and gates
promotion without defining immutable release identity, atomic activation, or
rollback. Telemetry is also being asked to stand in for a provenance registry,
which it cannot do.

The system is **credibly safety-first and AI-assisted**, with a plausible route
to being AI-first as an engineering system. It is **not yet credibly AI-first
as written**, because the measurable contribution of the model over the
deterministic template baseline and the complete model/prompt/eval release loop
are unspecified. This must not be “fixed” by allowing an LLM to reconcile
sources, choose severity, select actions, infer deadlines, or issue evacuation
instructions. AI-first credibility should come from a rigorously evaluated,
bounded communication transform—not additional model authority.

## Integrity scorecard

| Dimension | Assessment | Review summary |
| --- | --- | --- |
| Human/model authority | **Strong** | AD-3 and AD-4 correctly reserve risk, deadlines, protocols, destinations, and evacuation release for deterministic or authorized-human control. |
| Typed online contracts | **Partial** | Contract names and intended fields exist, but strict schemas, references, compatibility rules, and final-artifact types are absent. |
| Grounding | **Strong direction, incomplete enforcement** | Approved protocol lookup and fallback are sound; generated qualitative claims and post-composition artifacts remain insufficiently bounded. |
| Prompt/model/protocol versioning | **Partial** | Versions “travel” with results, but aliases versus immutable artifacts, decoding/config identity, digests, and compatibility are undefined. |
| Deterministic validators | **Partial** | The right checks are listed, but several cannot safely be implemented by parsing prose, and validation does not cover the complete delivery artifact. |
| Local language and TTS | **Partial** | Reviewed templates, no live MT, worker-only TTS, and caching are good; dialect, approval state, audio provenance, and degraded behavior are missing. |
| Source provenance and freshness | **Partial** | Model run, fetch time, freshness, transform version, and attribution are present; source issue/validity times, expiry policy, raw lineage, and authority records are not. |
| Multi-source uncertainty | **Missing** | The diagram fans several sources into ingestion but defines neither an evidence set nor source-role, conflict, quality, or failover policy. |
| Eval/promotion/rollback | **Partial / rollback missing** | AD-10 defines a useful bundle and a no-pass/no-promote rule; release states, atomic activation, rollback triggers, and protocol-safe rollback are absent. |
| Offline/online boundary | **Strong direction, handoff unclear** | AD-1 and AD-14 are correct; the immutable artifact handoff and shared-validator strategy need definition. |
| Provenance, cost, and privacy | **Partial** | Trace, token cost, and log minimization are present; provider/artifact records required by repository policy are not. |
| AI-first credibility | **Conditional** | Bounded generation plus eval can be AI-first, but no baseline comparison or demonstrated model-dependent user benefit is required yet. |

## What the spine already gets right

- **No unsafe model authority.** AD-3 keeps hazard matching, severity, scope,
  phenomenon time, action lead time, and deadline in a deterministic Risk
  Engine; evacuation-class output requires an authorized official.
- **Grounding is protocol-first, not retrieval theater.** AD-4 selects approved
  `ActionProtocol` records by deterministic keys and explicitly rejects vector
  similarity for the MVP. The model may arrange approved actions, not invent
  them.
- **AI failure is not warning failure.** AD-5 discards invalid or timed-out
  output and uses a deterministic template. That is the correct safety property
  even if it makes the model operationally optional.
- **Local-language caution is appropriate.** AD-6 prohibits live machine
  translation for life-critical copy, places TTS in `worker`, and avoids
  per-household inference.
- **The runtime/offline split is directionally correct.** AD-1 and AD-14 keep
  online contracts/adapters in `be/src/ai`, offline datasets/evaluation/training
  in `ai/`, and provider/TTS execution out of the API request process.
- **The release unit is larger than a model name.** AD-10 recognizes that
  prompt, schema, protocol/retrieval, validators, data, and thresholds must be
  evaluated together, and correctly makes LLM-as-judge advisory.
- **Traceability is designed through the whole chain.** AD-12 links evidence,
  assessment, composition, validation, approval, and delivery while excluding
  household-sensitive content from logs by default.

## Tier 0 — integrity decisions required before implementation is treated as authoritative

### T0.1 — The contracts are named, but not yet executable as safety boundaries

**References:** AD-2 through AD-5 (lines 51–92), conventions (lines 185–199),
and the ownership sketch (lines 267–284).

`ForecastSnapshot`, `RiskAssessment`, `ActionProtocol`, `ActionBulletin`, and
`AlertEnvelope` are useful domain names, but prose descriptions do not define:

- required versus optional fields;
- closed enums and bounded strings;
- stable IDs versus copied text;
- schema evolution and producer/consumer compatibility;
- whether unknown fields are rejected;
- exact evidence references carried into each public claim;
- how a raw provider response becomes a validated domain object; or
- types for localized text, audio, validation reports, and AI releases.

This leaves room for the online path to collapse into generic `text`,
`metadata`, and `dict` payloads while still appearing to comply with the spine.
That would make the validator responsible for rediscovering facts from prose,
which is not a safe contract boundary.

**Required architecture decision:** mandate domain-specific, strict online
schemas at the application/AI boundary (`extra = forbid` or equivalent), with
explicit schema versions and reference IDs. A generic provider request may
exist privately inside a provider adapter, but application services must never
submit arbitrary free text or consume arbitrary dictionaries. Define a
compatibility matrix: each consumer states the input schema versions it accepts
and each producer emits exactly one declared output version.

### T0.2 — “Multiple sources” currently means multiple inputs, not multi-source evidence

**References:** AD-2 (lines 51–61) and runtime flow (lines 224–229).

The runtime diagram connects Open-Meteo, OWM, and station adapters to one ingest
stage, while AD-2 says each adapter emits a `ForecastSnapshot`. No contract or
policy explains whether the sources are primary, fallback, corroborating, or
members of an ensemble. There is no deterministic answer for:

- different model run and valid times;
- conflicting temperature/rain/visibility values;
- different spatial resolution and elevation handling;
- a stale primary with a fresh fallback;
- a partial response missing only one required variable;
- two source snapshots producing duplicate or contradictory assessments; or
- switching back to the primary without alert flapping.

An LLM must not fill this gap. Model-written “confidence” would create precisely
the unsafe authority AD-3 is intended to prevent.

**Required architecture decision:** choose one of two honest MVP modes:

1. **Primary plus fallback:** Open-Meteo is authoritative for an assessment;
   OWM is used only under a versioned, deterministic failover policy. Do not
   market this as multi-source fusion.
2. **Deterministic comparison:** create a versioned `ForecastEvidenceSet` that
   time-aligns eligible snapshots, computes variable/horizon-specific
   disagreement and data-quality labels, and applies an approved source policy.

In both modes, the resulting `RiskAssessment` must reference exactly one frozen
evidence set and one source-policy version. The LLM may verbalize an already
computed uncertainty label but may not calculate or override it.

### T0.3 — The safest validator is deterministic construction, not prose comparison

**References:** AD-5 (lines 82–92) and Safety copy convention (line 198).

The proposed checks—copied values, severity, deadline, action allowlist, and
destination—are necessary, but checking these after the model has rewritten
them as natural language is brittle. Numeric equivalence becomes ambiguous
under rounding, units, words instead of digits, negative temperatures, local
time formatting, and paraphrases. Action and destination matching by string can
also produce false acceptance or false rejection. The listed checks do not
bound unsupported qualitative claims such as “extreme,” “certain,” “safe,” or
causal explanations absent from the evidence.

**Required architecture decision:** use anchored generation:

- the model may produce bounded connective/explanatory text and ordering;
- critical facts are referenced by immutable fact IDs;
- actions and destinations remain protocol IDs, not model-authored strings;
- severity, phenomenon time, deadline, values, units, place names, and approved
  action text are inserted by a deterministic renderer after generation; and
- the final validator checks IDs, cardinality, allowed claim classes, exact
  render variables, output bounds, and absence of unsupported text.

Prompt input must be structured and length-bounded, with locality/protocol text
treated as data rather than instructions. Tool use, remote retrieval, and
provider-side prompt augmentation must be disabled for this task unless a later
architecture decision explicitly governs them.

### T0.4 — Localization and TTS sit outside the shown validation/release chain

**References:** AD-6 (lines 94–102), runtime flow (lines 220–248), and release
state (lines 250–265).

The principal flow is `Composer → deterministic validators → release gate`, but
it contains no localization or TTS stage. AD-6 separately creates Thái and
Mông/Hmong artifacts. Consequently, the spine does not establish that the text
and audio residents actually receive are derived from the exact validated
facts. “Language” validation in AD-5 cannot prove semantic correctness in a
local language, and it cannot validate pronunciation or segment concatenation.

There is also a status contradiction: AD-6 describes human-reviewed templates,
while Deferred says native-speaker validation occurs before a real-world pilot
(lines 344–345). Nothing prevents an exercise-only template from being mistaken
for a live-approved asset.

**Required architecture decision:** add explicit derived-artifact contracts and
gates:

`ValidatedBulletin → ApprovedLocaleTemplate render → LocalizedBulletin
validation → immutable text artifact → worker TTS/segment assembly → AudioAsset`

- Every locale asset needs an explicit locale/dialect/script profile, template
  version, reviewer/approver, approval scope (`exercise_only` or `live`),
  approval/effective dates, and render-variable schema.
- Critical numbers, dates, village names, and destinations need deterministic
  locale renderers and boundary tests; they must not be free-form MT output.
- Runtime audio checks can prove decodability, duration bounds, checksum, and
  lineage—not semantic pronunciation. Pronunciation and intelligibility require
  versioned offline native-speaker evaluation and a restricted lexicon or
  pre-reviewed segments for critical phrases.
- Channel truncation/serialization must not alter the four-part message; either
  validate every final channel projection or send only a short approved teaser
  plus a link/reference to the immutable full bulletin.
- Define degraded behavior. TTS failure must not suppress the core alert, but
  voice-dependent recipients need an explicit fallback, such as a pre-recorded
  generic attention message plus immediate human-relay escalation.

### T0.5 — Freshness is a field, not yet a deterministic eligibility policy

**References:** AD-2 (lines 51–61), AD-12 (lines 156–164), and time/geography
conventions (lines 192–194).

Provider/model run, fetch time, freshness, attribution, and transform version
are a good start. Fetch time alone can make an old upstream model run look new,
however. Forecast data also has issue time, model-run time, valid interval,
lead time, parameter coverage, and sometimes revision time. Freshness must vary
by source, parameter, hazard, and forecast horizon.

**Required architecture decision:** make freshness a deterministic verdict
generated from a versioned `FreshnessPolicy`, not an adapter-supplied boolean.
At minimum preserve:

- source/provider/product and exact upstream model or dataset revision;
- upstream issue/model-run time;
- forecast valid-from/valid-to and horizon;
- retrieved-at time and calculated expiry;
- required-variable completeness and missing/imputed flags;
- source and target coordinates/elevations plus their provenance;
- raw payload/content digest and storage reference where terms permit;
- the ordered transform chain, parameters, code version, and output digest; and
- source license/terms/attribution record ID.

Assessment eligibility must fail closed when required temporal or lineage fields
are absent. The UI may display stale historical evidence, but no new automatic
assessment may be inferred from it, as AD-2 already intends.

### T0.6 — AD-10 defines a gate but not a releasable or reversible system

**References:** AD-10 (lines 135–143), configuration convention (line 197), and
AD-12 (lines 156–164).

“A failing bundle cannot become the production/default bundle” is necessary but
does not define how a passing bundle becomes default, how all workers observe
one version atomically, or how an unsafe release is rolled back. Storing
“versioned database records” does not guarantee immutability; a mutable model
alias or edited prompt under the same version defeats auditability.

Binding a protocol version into the same rollback unit introduces another
hazard: rolling back a bad prompt must not silently reactivate an obsolete
safety protocol or evacuation destination.

**Required architecture decision:** define an immutable release state machine:

`draft → evaluated → approved → active → retired/revoked`

- A content-addressed `AiTaskRelease` manifest binds exact schema, prompt,
  context builder, provider route, actual model identity, inference parameters,
  validator code/config, fallback template, dataset manifest, eval report, cost
  and privacy records, source commit, and artifact digests.
- Human approval creates an immutable release; an atomic environment pointer
  selects one active release. Workers snapshot that ID when a job starts and
  attach it to the result.
- Rollback is an atomic pointer change to a retained approved release, with an
  audit event and explicit triggers such as any safety-validator escape,
  abnormal fallback rate, provider identity drift, latency breach, or cost
  breach.
- Current `ThresholdPolicy` and `ActionProtocol` records retain independent
  authority/effective-time lifecycles. A result binds the concrete policy and
  protocol used, but rolling back AI composition must not roll them back.
- No runtime feedback, LLM judge, or worker may promote a release automatically.

## Tier 1 — controls required before a credible pilot

### T1.1 — “Version” must mean immutable identity, not a mutable name

**References:** AD-5 (lines 91–92), AD-10 (lines 135–143), and AD-12
(lines 160–164).

The architecture should distinguish display versions from reproducible
identity. A provider alias such as `latest`, a LiteLLM route name, or an
upstream model string is not enough. Record both the requested route and the
actual provider/model reported for each call, plus prompt content digest,
structured-output grammar/schema digest, system and user template digests,
temperature/top-p/seed where supported, maximum tokens, stop rules, timeout and
retry policy, locale context version, and provider adapter version.

External hosted models may still be nondeterministic or silently revised.
Therefore the audit promise should be **exact traceability**, not guaranteed
byte-for-byte replay. Preserve sanitized request/response hashes and, under a
privacy/retention policy, the minimum encrypted payload needed for incident
reconstruction.

### T1.2 — Protocols and threshold policies need human provenance and effective-time governance

**References:** AD-3 (lines 63–71), AD-4 (lines 73–80), and Deferred
(lines 340–345).

Deterministic selection is only as safe as the records selected. The spine
defers the legal owner of hazard thresholds but does not define contract fields
or activation controls for either thresholds or protocols. A normal admin edit
must not silently become life-critical authority at the next cycle.

Each policy/protocol/destination needs source authority, source citation or
document digest, jurisdiction and applicability, author, reviewer/approver,
effective and expiry times, superseded-by relation, review status, change
reason, and exercise/live scope. Live activation should require an authorized
workflow and audit event. Models may neither author nor approve these records.

### T1.3 — Telemetry does not satisfy provider and artifact provenance policy

**References:** AD-12 (lines 156–164), attribution convention (line 199), and
Deferred (lines 340–345).

Trace IDs, token cost, and source attribution are operational telemetry. The
repository policy requires durable provenance for every provider or artifact:
model, dataset, prompt, evaluation, license, cost, and privacy. The spine lacks
the governing manifest and storage owner.

Define an `ArtifactProvenanceRecord` (or equivalent registry entry) with:

- artifact/provider kind, stable ID, owner, purpose, and intended use;
- source URL/organization and exact version, revision, or digest;
- license/terms snapshot, attribution, commercial restrictions, and review;
- dataset collection/consent basis, transformations, sensitive-data class,
  retention/deletion, and limitations;
- prompt source and content digest;
- evaluation dataset/report IDs, evaluator versions, and approvals;
- expected and actual cost/unit plus budget or rate limit; and
- fields transmitted, redaction, provider training/retention policy, processing
  region, access controls, and privacy approval.

This record is required **before use**, including competition/demo use; model
and recording rights cannot be deferred until pilot. The single Open-Meteo
attribution sentence must point to a reviewed terms/license record rather than
serve as the record itself.

### T1.4 — Evaluation coverage is narrower than the failure surface

**References:** AD-10 (lines 135–143), AD-6 (lines 94–102), and `ai/evals` in
the layout (lines 303–305).

The golden dataset and slice thresholds are good foundations, but the spine
does not define mandatory slices, absolute safety gates, a baseline, or
native-language/audio evaluation. A mean score can conceal one catastrophic
case. Model-assisted clarity scoring also requires its own versioned provider,
prompt, cost, privacy, and eval provenance.

At minimum the release report should contain:

- **100% pass, no averaging:** schema, references, critical values, units,
  severity/deadline immutability, action/destination allowlists, unsupported
  claim rejection, exercise isolation, and deterministic fallback validity;
- **Boundary cases:** missing/partial/stale/conflicting sources, midnight and
  date boundaries, negative and zero values, long and Unicode locality names,
  malformed provider output, duplicate events, prompt-injection strings,
  channel limits, and timeout/retry races;
- **Slices:** hazard, severity, occupation, locality, source mode, horizon,
  language/dialect, template, channel, and fallback path;
- **Operational tests:** provider outage, source outage, cache expiry, worker
  restart, replay/idempotency, and rollback rehearsal;
- **Human review:** comprehension/actionability against the deterministic
  template baseline and native-speaker review for each live locale; and
- **TTS review:** critical-number/time/place pronunciation, intelligibility,
  clipping, duration, and segment-boundary artifacts per model/voice version.

### T1.5 — The offline/online artifact handoff remains ambiguous

**References:** AD-1 (lines 41–49), AD-10 (lines 135–143), AD-14
(lines 175–183), and source layout (lines 286–305).

The ownership split is correct, but “`AiTaskBundle` binds ... golden dataset and
release result” could be interpreted as loading evaluation data or logic into
the online database/runtime. Conversely, placing validators only under
`ai/evals` would let offline and production behavior drift.

The boundary should be explicit:

| Owner | Permitted responsibility | Prohibited responsibility |
| --- | --- | --- |
| `be/src/ai` | Domain AI contracts, provider ports/adapters, composition, exact runtime validators, deterministic fallback, released-manifest loader, online observability | Training, dataset preparation, model-assisted release evaluation, automatic promotion |
| `worker` | Invoke `be/src/ai` jobs, external LLM calls, CPU TTS/segment assembly, retries, artifact persistence | Business-rule duplication, policy selection by model, release promotion, API-process inference |
| `ai/` | Dataset manifests, offline eval runners, prompt/model experiments, training/pretraining, comparison reports, release-candidate construction | HTTP endpoints, production queues, runtime state mutation |
| Release pipeline/registry | Verify provenance and eval evidence, human approval, publish immutable manifests, atomic environment activation/rollback | Generating safety policy or silently changing artifact contents |

Offline evals should import or invoke the exact production contracts,
renderers, validators, and fallback code from `be/src/ai`; they must not copy
them. The online release stores only immutable runtime artifacts plus IDs/digests
for offline datasets and reports—not raw golden data or training dependencies.
API and worker images need separate dependency sets so TTS/model runtimes cannot
enter the API image accidentally.

### T1.6 — Provider privacy and cost controls need to be architectural, not merely observed

**References:** AD-5 (lines 86–92), AD-11 (lines 145–154), and AD-12
(lines 156–164).

“Approved locality context” and log minimization are helpful, but the model
payload boundary is not explicit. Personalization by occupation must not turn
into one provider call per identified household or transmit household names,
contact details, vulnerability status, precise household coordinates, or
acknowledgement history.

Compose once per safe audience segment such as assessment × locality ×
occupation × locale, using pseudonymous IDs only where an ID is unavoidable.
Define provider request allowlists, payload-size limits, redaction tests,
retention/training opt-out requirements, processing-region constraints where
applicable, per-release cost budgets, retry ceilings, and circuit breakers.
Record actual usage and cost on the result, but enforce the budget before the
call.

### T1.7 — AI-first value needs an explicit, safety-compatible proof

**References:** design paradigm (lines 20–25), AD-5 (lines 82–92), AD-10
(lines 135–143), and local-language rule (lines 94–102).

The architecture currently proves that the model can be removed without losing
safety. That is a strength, not a defect, but it leaves “AI-first” dependent on
marketing unless model value is measured. Local-language runtime is deliberately
template-based, so it cannot by itself establish online LLM centrality.

The safe proof is a release criterion showing that a bounded model improves the
communication task over the deterministic template baseline—for example first-
read comprehension, correct recall of action/deadline, occupation fit, length,
and clarity—without any safety-validator regression. The model can remain
load-bearing for communication quality while non-authoritative for facts and
decisions. Deterministic source reconciliation should supply an approved
uncertainty label; the model may explain it in plain language but cannot create
a probability or confidence claim.

## Tier 2 — hardening and operability gaps

### T2.1 — Downscaling needs explicit lineage, applicability, and uncertainty

AD-2 prevents double elevation correction, which is good. It should also record
source elevation, target elevation, provider correction mode, local lapse-rate
parameters, applicable variables/horizons, bounds/clamping, transform code and
configuration digests, and any uncertainty penalty. A transform should reject
unsupported extrapolation rather than emit a precise-looking value.

### T2.2 — New model runs need supersession, update, and cancellation semantics

Immutable snapshots and assessments need a deterministic relation to newer
evidence. Define when an assessment is superseded, when an existing released
alert is updated or cancelled, how CAP update/cancel references are generated,
and how recipients learn that prior advice changed. Dedupe alone can suppress a
necessary correction; source failover alone can create duplicate alerts.

### T2.3 — Runtime metrics need thresholds and incident actions

AD-12 lists useful telemetry but no SLOs or response. Add thresholds for stale
source rate, missing-variable rate, source disagreement, assessment suppression,
validator rejection by rule, template fallback rate, provider identity drift,
localization/TTS failure, end-to-end age, cost, and release-specific error rate.
Each threshold should map to continue, degrade, disable model composition,
rollback, or page an operator.

### T2.4 — Audio cache identity and invalidation are underspecified

“One asset per bulletin/language” is insufficient when template, dialect,
voice/model, pronunciation lexicon, or renderer changes. Use a content-derived
key covering localized-text digest, locale profile, TTS/voice or recording-set
version, pronunciation lexicon, audio parameters, and renderer version. Keep
the object checksum and provenance record on `AudioAsset`; never overwrite an
asset under the same key.

### T2.5 — Replayability and retention need a balanced policy

Incident reconstruction requires evidence and artifact hashes, while privacy
requires minimizing model content. Define retention separately for raw weather
payloads, transformed snapshots, model request/response payloads, validation
reports, local-language artifacts, audio, and household events. Public weather
evidence may be retained or archived subject to source terms; any payload that
could reveal household context should be redacted, encrypted, access-audited,
and deleted on a short documented schedule.

### T2.6 — Model “confidence” must not enter the safety plane

If a provider returns a confidence field, the architecture should explicitly
class it as non-authoritative observability metadata. Hosted LLM confidence is
not calibrated forecast confidence and must never affect severity, deadline,
release, source choice, or public certainty wording. Public uncertainty comes
only from deterministic evidence-quality/source policy.

## Minimum contract kernel

The spine does not need implementation-level classes, but it does need these
contract obligations to make its invariants testable:

| Contract | Minimum integrity-bearing content |
| --- | --- |
| `ForecastSnapshotV1` | Immutable ID/schema version; source/provider/product/model run; issue, valid, retrieved, and expiry times; geospatial/elevation provenance; canonical parameter values with completeness/quality flags; raw digest/reference; transform chain; terms/license record; exercise flag. |
| `ForecastEvidenceSetV1` | Frozen eligible snapshot IDs; source roles; aligned locality/window/horizon; freshness verdicts; deterministic disagreement/quality result; source-policy version; missing-source reasons. |
| `RiskAssessmentV1` | Evidence-set ID; threshold-policy ID/version; matched rule and evidence refs; hazard/severity/scope; phenomenon interval; lead time/deadline; dedupe and supersession keys; creation reason; exercise flag. No model-derived field. |
| `ActionProtocolV1` | Stable action/destination IDs; applicability keys; authoritative source and approval; effective/expiry times; protocol version; locale-template-set references; exercise/live scope. |
| `CompositionRequestV1` | AI release ID; exact assessment/protocol IDs; approved fact/action refs; bounded locality/occupation/locale context; privacy classification; no arbitrary instructions or household-sensitive payload. |
| `CompositionDraftV1` | Closed four-part shape; bounded model-authored segments; fact/action/destination references rather than invented values; no unknown fields; raw-output digest. |
| `ValidationReportV1` | Input/draft/final digests; validator-set version; result and stable reason code per validator; fallback reason; renderer version; timestamp and trace ID. |
| `LocalizedBulletinV1` | Base validated bulletin ID; locale/dialect/script profile; approved template/reviewer/version; typed render variables; final text and digest; approval scope. |
| `AudioAssetV1` | Localized-text digest; model/voice or recording-segment identities; pronunciation/renderer versions; license and consent records; object checksum/duration; offline QA version; runtime status/fallback. |
| `AlertEnvelopeV1` | Exact validated/localized artifact IDs; evidence/assessment/protocol/release IDs; approval actor/event where required; source attribution/freshness/uncertainty summary; update/cancel relation; channel-safe projections. |
| `AiTaskReleaseV1` | Immutable manifest digest covering prompt/context builder, schemas, provider/model/parameters, validators/renderers/fallback, provenance, dataset/eval report, thresholds, approvals, source revision, cost/privacy policy, lifecycle state. |

## Evaluation, promotion, and rollback gate

### Promotion

1. Author prompts, schemas, validators, renderers, or model/provider changes as
   immutable candidate artifacts.
2. Run offline evaluation from `ai/` against the exact online code and a
   provenance-complete dataset manifest.
3. Require all deterministic safety gates to pass per case and per slice;
   advisory aggregate scores cannot compensate for one safety failure.
4. Compare communication quality and operations against both the currently
   active release and the deterministic template baseline.
5. Produce a signed/content-addressed report and provenance manifest.
6. Require named human approval, publish the immutable release, then atomically
   move the environment pointer. In-flight jobs retain their starting release
   ID.

### Rollback

- Keep at least one known-good approved release and its required runtime
  dependencies available.
- Rehearse rollback before pilot; changing the active pointer must not require
  rebuilding images or mutating artifacts.
- Automatically alert—but do not automatically select an unapproved
  release—on validator escape, unexpected model identity, excessive fallback,
  latency/cost breach, or privacy-policy failure.
- A model/prompt rollback must retain the currently effective approved
  threshold and action protocols unless an authorized protocol rollback is
  separately approved.
- If no model release is safe or available, disable AI composition and continue
  with the validated deterministic template path.

## Readiness gates

### Before a competition/demo claim

- Strict domain contracts and a final-artifact validation report exist.
- The source mode is described honestly as primary/fallback or has a
  deterministic evidence-set policy.
- Every model, provider, prompt, dataset, evaluation, recording, and TTS
  artifact used in the demo has license, cost, privacy, and provenance records.
- Local-language assets carry `exercise_only` unless genuinely approved by the
  required native-language reviewer.
- One immutable AI release is evaluated, approved, activated, and rollback-tested.
- The fallback path is exercised end to end, including localization/channel
  behavior.

### Before any live pilot

- Thresholds, protocols, destinations, locality data, and source terms have
  authoritative owners, approvals, effective dates, and audit trails.
- Multi-source/failover behavior and uncertainty wording are validated against
  representative historical or expert-reviewed cases.
- Every live locale/template/recording/TTS version has native-speaker approval,
  rights/consent, intelligibility evidence, and a degraded voice-delivery plan.
- Provider privacy/retention/region and cost controls are approved and enforced.
- Human comprehension and actionability outperform or justify the active
  deterministic baseline without safety regression.
- Monitoring thresholds, incident ownership, update/cancel behavior, and
  rollback are exercised operationally.

## Final assessment of AI-first integrity

The architecture should preserve its current authority boundary. A trustworthy
WeatherBridge AI is not one in which the model predicts hazards or decides what
people must do. It is one in which AI is treated as a first-class,
versioned/evaluated/reversible component for converting already authorized
evidence and actions into more understandable communication, while deterministic
software and humans retain authority.

The spine has that philosophy, but not yet the full contract and release
machinery needed to make the claim auditable. Closing Tier 0 and the release,
provenance, and baseline-evaluation items in Tier 1 would make “AI-first,
safety-first” credible without giving the model unsafe control.
