# Good-Spine Rubric Review: WeatherBridge AI

- Target: `../ARCHITECTURE-SPINE.md`
- Review date: 2026-07-17
- Intent: Validate only; the spine was not edited
- Altitude: Initiative
- Criticality: High-stakes, safety-oriented warning and evacuation support
- Inputs reconciled: PRD, PRD addendum, repository architecture/ADRs, dependency locks, runtime manifests, and current upstream release information

## Gate Verdict

**FAIL - not safe to hand off as the binding architecture for a real-world pilot:** the spine is mechanically clean and has a strong safety-first direction, but it leaves alert correction, external delivery guarantees, deterministic policy semantics, accountability races, recipient targeting, and degraded operations open enough for independently built features to behave incompatibly or unsafely.

It is a credible competition/exercise substrate if all life-critical paths remain exercises, but its stated scope includes pilot evolution and therefore the safety gaps are gate-blocking.

## Gate Execution

### Deterministic lint

Command:

```text
uv run .opencode/skills/bmad-architecture/scripts/lint_spine.py \
  --workspace _bmad-output/planning-artifacts/architecture/architecture-weatherbridge_ai-2026-07-17
```

Result: **PASS, 0 findings**. There are no placeholders, duplicate AD IDs, missing `Binds`/`Prevents`/`Rule` fields, or unpinned stack rows detectable by the linter.

### Semantic lenses applied

- BMad good-spine checklist from `reviewer-gate.md`
- Configured current-technology/reality-check lens
- Configured adversarial two-units-build-incompatibly lens
- Safety lifecycle and human-authority lens
- Data integrity, event ordering, and external side-effect lens
- Privacy, auditability, and operational-resilience lens

## Finding Summary

| Tier | Count | Gate effect |
| --- | ---: | --- |
| Critical | 2 | Blocks any real warning or evacuation pilot |
| High | 7 | Blocks safe parallel implementation at initiative altitude |
| Medium | 6 | Must be resolved or explicitly accepted before pilot planning |
| Low | 2 | Clarity and traceability corrections |

## Critical Findings

### C-1 - A released or pending warning has no safe correction, expiry, supersession, retraction, or all-clear lifecycle

- **Evidence:** AD-2 stops *new* automatic assessment when evidence is stale (`ARCHITECTURE-SPINE.md:55-61`); AD-3 permits an authorized official to release a pending evacuation assessment (`:67-71`); AD-9 makes the released `AlertEnvelope` immutable (`:128-133`); the release state diagram ends at `Released` or `Rejected` and contains no stale, expired, superseded, corrected, retracted, or all-clear transition (`:250-265`).
- **Unsafe path:** evidence can become stale or be corrected while an item waits in `PendingApproval`, yet the diagram still permits release. After release, a false evacuation warning or changed destination has no canonical corrective artifact or propagation rule. One team can mutate the alert, another can emit a new alert, and a third can refuse correction because the envelope is immutable; all three can claim compliance.
- **Checklist failure:** misses a real divergence point; AD-2/AD-3/AD-9 do not collectively prevent the stated unsafe divergence; a safety lifecycle dimension is silent.
- **Required decision:** bind immutable *revisions* rather than an uncorrectable truth. Define release-time freshness revalidation, approval expiry, `valid_from`/`valid_until`, supersession links, correction/retraction/all-clear event types, who may issue them, and mandatory propagation to every channel and accountability view. A stale pending item must not transition directly to `Released`.
- **Disposition:** **Discuss** before any life-critical implementation. Gate-blocking.

### C-2 - AD-7 promises external exactly-once effects that the architecture cannot enforce

- **Evidence:** AD-7 says delivery is at least once, handlers are idempotent, and a duplicate delivery cannot create a second send (`ARCHITECTURE-SPINE.md:104-112`). Channel contracts and receipt/retry behavior are deferred (`:346-348`).
- **Unsafe path:** an SMS, push, Zalo, or loudspeaker provider can accept a send and then lose the response. If the worker crashes before recording success, Redis reclaims the event and the handler sends again. A PostgreSQL idempotency row cannot atomically commit with an external provider effect. Providers without idempotency keys make the stated guarantee impossible.
- **Checklist failure:** the Rule is not enforceable and therefore does not prevent its stated divergence. Two channel adapters can both obey the local event-ID rule while producing different duplicate behavior.
- **Required decision:** separate guarantees by boundary: transactional exactly-once state transitions inside PostgreSQL; at-least-once event delivery; provider-idempotent send only where a verified provider contract supports it; otherwise durable attempt intent, ambiguous-outcome state, reconciliation, bounded retry, and duplicate-tolerant recipient UX. Define whether a possible duplicate or a possible omission wins for each severity/channel.
- **Disposition:** **Discuss** and then tighten AD-7 before channel stories begin. Gate-blocking.

## High Findings

### H-1 - "Deterministic" risk decisions still permit incompatible and unsafe policy engines

- **Evidence:** AD-3 names a deterministic Risk Engine and a matched policy (`ARCHITECTURE-SPINE.md:67-71`), but no invariant fixes threshold operators, equality behavior, aggregation windows, missing values, numerical precision, forecast horizon selection, deadline arithmetic, or the rule that classifies an assessment as evacuation-class. Configuration is only described as versioned database records (`:197`).
- **Divergence example:** frost and heavy-rain teams can both implement deterministic rules while one uses `>` and the other `>=`, one averages an hourly window and the other takes a maximum, and each assigns a different automatic/human release class.
- **Safety impact:** false negatives, false positives, inconsistent deadlines, or unauthorized automatic release remain possible without any LLM involvement.
- **Required decision:** define one owned `ThresholdPolicy` contract and evaluator semantics, including units, operator, boundary behavior, window/aggregation, valid horizon, required fields, missing-data behavior, action lead time, release class, and deterministic test vectors. Make policy revisions immutable, effective-dated, approved, auditable, and rollback-capable; pin the exact policy revision into every assessment.
- **Checklist failure:** real divergence points are missing; AD-3 does not fully prevent its stated divergence; FR-3/FR-4 coverage is nominal rather than complete.
- **Disposition:** **Discuss** before risk-engine implementation.

### H-2 - Forecast freshness and multi-source arbitration are fields, not a decision

- **Evidence:** AD-2 records provider, run, fetch time, and freshness and says only a fresh valid snapshot can drive a new assessment (`ARCHITECTURE-SPINE.md:55-61`). The runtime seed names Open-Meteo, OWM, and station adapters (`:224`). No Rule defines "fresh," source priority, failover eligibility, disagreement handling, quality validation, or whether cached primary data beats newer fallback data.
- **Divergence example:** the ingest feature can choose the newest provider result while the risk feature can prefer the primary provider until its TTL expires. Both consume valid `ForecastSnapshot` objects and produce different warnings for the same village and time.
- **Safety impact:** source switching and stale data can alter severity without an explicit, reviewable policy.
- **Required decision:** bind an owned source-selection/validity policy with per-hazard and per-horizon maximum age, provider priority, required variables, range/quality checks, fallback transition rules, source-disagreement behavior, and an explicit unknown/degraded result. Record the selected policy revision and all candidate provenance.
- **Checklist failure:** AD-2 is under-specified and does not prevent provider-selection divergence.
- **Disposition:** **Discuss** before source adapters are built in parallel.

### H-3 - Offline acknowledgement timestamps can suppress or falsify escalation because clock and race authority are undefined

- **Evidence:** AD-9 accepts offline actions with device timestamps and idempotency keys (`ARCHITECTURE-SPINE.md:131-133`); acknowledgements and escalations are append-only (`:131`); the conventions define UTC storage but not clock authority (`:192`). There is no accountability state machine or rule for an acknowledgement racing an escalation deadline.
- **Unsafe path:** a device with a wrong or manipulated clock uploads a backdated acknowledgement after the deadline. One implementation can cancel an escalation based on `device_timestamp`; another can retain it based on `received_at`. Concurrent scheduler and sync transactions can both win.
- **Required decision:** make server time and a transactional compare-and-set the authority for workflow state; preserve device time as separately labelled evidence with clock-quality metadata. Define late-ack behavior, deadline race ordering, "Not found" immediacy, idempotent transition keys, and whether an emitted escalation is ever reversible. Offline sync must not rewrite historical state.
- **Checklist failure:** the Rule does not prevent conflicting state mutation or audit interpretations.
- **Disposition:** **Discuss** before FR-18 through FR-22 implementation.

### H-4 - The released envelope does not freeze recipients, personalized variants, or the fan-out owner

- **Evidence:** AD-4 selects actions by hazard, severity, occupation, and locality (`ARCHITECTURE-SPINE.md:77-80`); AD-5 creates a bulletin (`:86-92`); AD-9 makes one released envelope the sole input to channels (`:128-133`); the ER seed allows one alert to have multiple bulletins but does not connect a bulletin variant to a recipient cohort (`:275-281`).
- **Divergence example:** a delivery adapter can look up a household's current occupation/language at send time while another can use release-time data. If a profile changes during fan-out, households can receive different actions for the same immutable alert, and acknowledgement/escalation membership can drift.
- **Safety impact:** a household can receive the wrong occupation action, language, destination, or follow-up obligation while all components claim to use the same alert.
- **Required decision:** name the fan-out owner and freeze the release-time affected villages, recipient/cohort membership, bulletin variant key, language, protocol revision, destination, and channel intent. Channel adapters must consume frozen delivery commands rather than re-derive safety content or audience from mutable profiles.
- **Checklist failure:** shared-data shape and ownership remain open at a core cross-team seam.
- **Disposition:** **Discuss** before alert, delivery, and accountability units split work.

### H-5 - Event versioning lacks compatibility, causal ordering, and poison-event rules

- **Evidence:** the event convention defines a name and five common fields (`ARCHITECTURE-SPINE.md:190`), and AD-7 defines outbox/Streams transport (`:104-112`). It does not name the schema owner/location, compatibility policy, aggregate identity/version, per-aggregate ordering, stale-event rejection, retry ceiling, poison-event quarantine, or replay semantics.
- **Divergence example:** the risk producer can add or reinterpret a field without coordinating the delivery consumer; two workers can process assessment revisions out of order after reclaim; an unrecoverable event can block or churn a safety stream forever.
- **Required decision:** bind canonical contract ownership and generation, backward/forward compatibility rules, `aggregate_id` plus monotonic aggregate revision, expected ordering and stale-event behavior, retry/backoff limits, dead-letter/quarantine ownership, replay authorization, and operational alarms. Event IDs alone solve duplicate identity, not causality.
- **Checklist failure:** independently built producer and consumer units can comply with the naming convention and still be incompatible.
- **Disposition:** **Discuss** before introducing domain streams.

### H-6 - Time-critical and degraded-operation behavior is deferred past the point where it shapes the architecture

- **Evidence:** the PRD requires assessment at most every 60 minutes, channel release within 5 minutes, push within 1 minute, and a demo pipeline under 2 minutes; the spine records latency telemetry but binds no end-to-end budgets (`ARCHITECTURE-SPINE.md:160-164`). Pilot RTOs, SLOs, backup policy, and hosting are deferred until production deployment (`:349-350`). Offline officers can act only after assigned visits have reached the device (`:131-133`).
- **Unsafe path:** normal composition/audio jobs can starve evacuation work; a Redis outage can exceed the action deadline without a defined failover; an officer disconnected before release never receives the visit list; a recovered queue can deliver an obsolete warning.
- **Required decision:** bind severity-aware queue priority, end-to-end latency budgets, scheduler ownership/lease behavior, queue-age cutoffs, overload/load-shedding policy, degraded modes for database/Redis/provider/channel failures, and who receives and acknowledges operational alarms. Set pilot RPO/RTO and minimum availability before selecting topology; the cloud vendor can remain deferred.
- **Checklist failure:** the operational envelope is named but not decided enough for initiative-level convergence; material items under Deferred can force incompatible designs.
- **Disposition:** **Discuss** before pilot epics; keep vendor selection deferred, not safety service objectives.

### H-7 - Evacuation approval and accountability evidence lack an assurance level

- **Evidence:** AD-3 requires an authorized commune official (`ARCHITECTURE-SPINE.md:70-71`); AD-11 checks role and locality (`:149-154`); AD-9 calls acknowledgements/escalations append-only (`:131`), but no invariant addresses fresh authentication, step-up for evacuation release, delegated authority, compromised-session revocation latency, approval reason/evidence, database enforcement of append-only audit, or tamper evidence.
- **Unsafe path:** a stolen but still valid official token can release an evacuation warning; a broadly privileged application/database account can alter the accountability history while the UI remains append-only.
- **Required decision:** define the required authentication assurance and authorization policy for release/retraction, session age or step-up behavior, delegation and emergency access, actor/evidence captured with every decision, audit-store write permissions, immutability/tamper-evidence mechanism, retention, and verification/export semantics. Dual control is a policy choice, but the spine must decide whether it is required rather than leave every feature to guess.
- **Checklist failure:** the security/compliance dimension is incomplete for the highest-consequence command, and "append-only" is not currently enforceable.
- **Disposition:** **Discuss** with the operational authority before real-world pilot design.

## Medium Findings

### M-1 - Brownfield facts and target-state migrations are conflated

- **Evidence:** AD-1 is marked `[ADOPTED]` and says the worker must not duplicate table definitions (`ARCHITECTURE-SPINE.md:41-49`), but `worker/src/job_store.py:7-22` deliberately mirrors the API table, and `be/src/services/ai_job_service.py:30-38` currently commits before enqueueing rather than using an outbox. The structural seed moves product areas under `be/src/modules` (`ARCHITECTURE-SPINE.md:286-300`), while existing ADR 0003 says product use cases live in `be/src/services` (`docs/adr/0003-online-offline-ai-split.md:5-7`).
- **Impact:** builders cannot tell which rules are ratified current reality and which require migration before WeatherBridge work. `[ADOPTED]` overstates conformance.
- **Required correction:** explicitly label the current violations and the migration/cutover invariant, or remove `[ADOPTED]` from the parts that are target state. Preserve stable deployment boundaries while naming how shared contracts replace mirrored table metadata.
- **Checklist failure:** partial brownfield contradiction.
- **Disposition:** **Autofix** in a future spine update; do not change code merely to make the label true without a migration plan.

### M-2 - Stack versions are repository-current but not demonstrated as an intentionally supported baseline

- **Evidence:** all table values match current locks/images, but several are behind upstream releases available on 2026-07-17: FastAPI `0.128.8` vs `0.139.2`, redis-py `6.4.0` vs `8.0.1`, TypeScript `5.9.3` vs `7.0.2`, Vite `8.1.4` vs `8.1.5`, Keycloak `26.5.2` vs `26.7.0`, and LiteLLM `1.81.13-stable` vs official stable `1.92.0`. React `19.2.7` and SQLAlchemy `2.0.51` match current stable releases. PostgreSQL 16 remains supported through 2028, although PostgreSQL recommends current minor patches.
- **Security relevance:** Keycloak 26.7.0 contains security fixes; the review did not establish whether each fix affects or is backported to 26.5.2. An upgrade is not automatically correct, but an unrecorded patch posture is not sufficient for a safety initiative.
- **Required correction:** distinguish "brownfield locked baseline" from "latest verified release," record support/security review and compatibility rationale, and bind a patch/CVE response policy. Verify upgrades through tests rather than blindly changing major versions.
- **Checklist failure:** only partial compliance with verified-current technology and fit.
- **Disposition:** **Discuss** the supported baseline; update only after compatibility and security assessment.

### M-3 - Local-language/audio readiness and failure behavior are not closed end to end

- **Evidence:** AD-6 defines reviewed templates and server-side audio caching (`ARCHITECTURE-SPINE.md:96-102`), but does not say whether every localized rendering passes the AD-5 safety validators, what happens when a required template/recording/variable pronunciation is missing, whether audio can lag release, or how FR-15's resident offline playback is achieved. The only explicit client offline rule concerns officer actions (`:131-133`).
- **Impact:** teams can choose to block release, silently fall back to Vietnamese, omit audio, or send an unvalidated localized variant. Those choices have materially different safety outcomes for low-literacy recipients.
- **Required decision:** define validation after localization, required fallback language/audio behavior, release-vs-audio readiness ordering, prefetch/cache ownership and integrity, and a deterministic no-content/manual-relay path when no approved local-language artifact exists.
- **Checklist failure:** FR-15/FR-16 coverage is incomplete despite the capability map.
- **Disposition:** **Discuss** before localized content is used outside an exercise.

### M-4 - "One owner" is asserted without a complete ownership and dependency map

- **Evidence:** AD-8 states that each state has one owner (`ARCHITECTURE-SPINE.md:114-122`), but the source and capability maps do not unambiguously assign `ActionProtocol`, `ThresholdPolicy`, `ActionBulletin`, release policy, outbox dispatch, and recipient fan-out ownership. The Rule forbids cross-module writes but says nothing about direct cross-module reads or allowed dependency direction.
- **Impact:** modules can share ORM reads, duplicate protocol types, or each own a piece of the same aggregate while still avoiding direct writes.
- **Required correction:** assign each shared contract/aggregate and its mutation service to one module; bind permitted module dependency direction and whether cross-module reads use application queries, projections, or owned repositories.
- **Checklist failure:** shared-data ownership divergence remains possible.
- **Disposition:** **Discuss** and then make a small ownership table or diagram correction.

### M-5 - Sensitive-data and AI provenance rules are too permissive for implementation

- **Evidence:** AD-11 defers legal basis, retention/deletion, and access audit until real deployment (`ARCHITECTURE-SPINE.md:151-154`); AD-12 says logs and traces exclude sensitive content "by default" (`:164`), which permits exceptions without an approval rule. AD-10 versions an AI task bundle but does not bind dataset/model license and provenance. The repository compliance register does not yet list the planned weather sources or local-language model/recordings.
- **Impact:** a feature can send household context to AI/telemetry, retain vulnerability data indefinitely, or use unverified model/data rights while remaining within the current wording.
- **Required decision:** before any real data, bind a data classification and field allowlist, encryption and key ownership, purpose/retention/deletion rules, access-audit events, AI-provider data-use restrictions, and model/dataset/recording provenance gates. Replace "by default" with a deny-by-default rule plus explicit approved exceptions.
- **Checklist failure:** privacy/compliance is deferred beyond safe data-model design.
- **Disposition:** **Defer to an explicit pre-real-data gate**, not merely pre-production deployment.

### M-6 - Enforcement is strong for AI bundles but not for the rest of the safety chain

- **Evidence:** AD-10 defines a release gate for AI task bundles (`ARCHITECTURE-SPINE.md:135-143`), while no comparable invariant binds threshold-policy tests, alert-state transition tests, outbox crash-window tests, authorization tests, channel ambiguity drills, restore tests, or exercise-isolation tests. A separate roadmap mentions several tests, but the spine is the binding build substrate.
- **Impact:** teams can implement otherwise sound Rules without a shared proof that the Rules hold under failures and boundaries.
- **Required correction:** bind a minimal set of architecture fitness functions for every safety-critical AD, including deterministic boundary vectors, stale evidence, approval expiry, duplicate/reordered events, external ambiguous send, offline clock skew, exercise escape, authorization scope, and backup restore. Keep detailed test cases outside the spine.
- **Checklist failure:** several Rules are conceptually testable but lack a shared enforcement gate at this criticality.
- **Disposition:** **Autofix** by adding one concise verification invariant in a future update.

## Low Findings

### L-1 - The capability map overstates or misattributes some coverage

- **Evidence:** AD-4 explicitly binds FR-8 evacuation destinations (`ARCHITECTURE-SPINE.md:74-80`), but the FR-8/FR-9 map row cites only AD-8 and AD-11 (`:331`). FR-16 is mapped to AD-6/AD-10 (`:334`), yet neither Rule fixes the invariant that the red sound belongs only to `Go now` severity. FR-13 and FR-18 through FR-22 are mapped to broad event/storage rules without the missing workflow semantics described above.
- **Impact:** traceability appears complete while material behavior is not actually bound.
- **Required correction:** fix references only after the missing decisions are added; do not treat map membership as capability coverage.
- **Checklist failure:** source capability reconciliation is partially inaccurate.
- **Disposition:** **Autofix** in the next spine update.

### L-2 - The executable frontend/runtime toolchain is not fully pinned by the stack table

- **Evidence:** the table omits Node.js and pnpm even though Vite 8 requires a compatible Node runtime and the repository uses pnpm. Database/server rows pin only PostgreSQL `16` and Redis `7`, while Compose uses mutable major tags such as `postgres:16-alpine` and `redis:7-alpine`.
- **Impact:** two builders or release environments can resolve different executable runtimes and image patch levels.
- **Required correction:** identify the repository's canonical lock/toolchain files and bind supported runtime major/minor policy; record immutable image digests at release as the existing deployment runbook already requires.
- **Checklist failure:** minor technology reproducibility gap.
- **Disposition:** **Autofix** or explicitly defer exact image digests to release metadata.

## Checklist Walk

| Good-spine criterion | Result | Basis |
| --- | --- | --- |
| Fixes the real divergence points for the level below and misses none | **Fail** | C-1, H-1 through H-6, M-4 leave safety-critical cross-feature seams open. |
| Every AD Rule is enforceable and prevents its stated divergence | **Fail** | AD-7's universal exactly-once send is impossible; AD-2 freshness, AD-3 release class, AD-9 clock/race behavior, and append-only audit are under-specified. |
| Nothing under Deferred could let two units diverge | **Fail** | Provider retry/receipt semantics and RTO/SLO/backup choices are postponed even though they shape channel and workflow design. Vendor choice, optional geospatial stores, CAP profile, and future ML are safely deferred. |
| Named technology is verified-current | **Partial** | Values match repository locks, and several are valid supported choices, but multiple releases are behind upstream and no support/security baseline policy is bound. |
| Ratifies rather than contradicts the brownfield codebase | **Partial fail** | Deployment boundaries are correctly ratified; `[ADOPTED]` worker/table behavior and target module layout do not match current implementation/ADR without an explicit migration marker. |
| Covers the driving specification's capabilities | **Partial fail** | All FR numbers appear in the map, but FR-3/4, FR-15/16, FR-18 through FR-22, and quantitative time requirements are not architecturally closed. |
| Does not weaken an inherited parent spine | **N/A** | No parent spine is declared. |
| Every initiative-owned dimension is decided, deferred, or open | **Fail** | An environment envelope exists, but safety lifecycle, approval assurance, event causality, policy activation, degraded operation, and operational objectives are materially silent or deferred too late. |

## Deferred Review

| Deferred item | Assessment |
| --- | --- |
| Station/history contracts, rights, cadence, and quality before pilot | Appropriate blocker, but no real alert may depend on them before resolution. |
| Legal threshold owner and evacuation approver before pilot | Necessary but too coarse: technical policy activation/approval semantics are needed before risk-engine stories. |
| Native-speaker validation and recording/model rights before pilot | Appropriate for exercises only; must become a pre-real-language-content gate. |
| Channel contracts, receipts, and retries before channel implementation | Trigger is appropriate, but the cross-channel guarantee and ambiguous-outcome policy belong in the spine before adapters split. |
| Cloud/on-prem, RTO, SLO, backup, secret manager before production | Vendor and product selection may remain deferred; RPO/RTO, safety latency, and degraded-mode objectives may not. |
| CAP local profile when required | Appropriate; the canonical envelope still needs correction/retraction semantics now. |
| TimescaleDB, PostGIS, dedicated broker on demonstrated need | Appropriate. |
| Learned ensembles, threshold adjustment, sensors, local TTS after evidence | Appropriate and safely bounded. |
| Flash-flood/landslide as exercises until authoritative evidence exists | Strong, necessary constraint; preserve it as an enforceable outbound-channel gate. |

## Technology Reality Check

Latest is not automatically best for a brownfield system. The finding is the absence of an explicit supported/security baseline, not a demand to upgrade every package.

| Technology | Spine/repository | Upstream check on 2026-07-17 | Assessment |
| --- | --- | --- | --- |
| Python | 3.12 | Supported security line | Acceptable baseline; record patch policy. |
| FastAPI | 0.128.8 | 0.139.2 released 2026-07-16 | Repository-consistent, not current upstream. Verify compatibility/security posture. |
| SQLAlchemy | 2.0.51 | 2.0.51 current stable; 2.1 only beta | Current and appropriate. |
| PostgreSQL | 16 | Supported through 2028; current 16 minor is 16.14 | Supported major; mutable image tag does not ensure current minor. |
| Redis Server | 7 | Newer server families exist | Functional for Streams, but major-only tag and support horizon need policy. |
| redis-py | 6.4.0 | 8.0.1 current | Compatible family but not current; assess migration rather than assume. |
| React | 19.2.7 | 19.2.7 current | Current. |
| TypeScript | 5.9.3 | 7.0.2 current | Brownfield pin, two majors behind; compatibility choice must be explicit. |
| Vite | 8.1.4 | 8.1.5 current | One patch behind; low-risk review candidate. |
| Keycloak | 26.5.2 | 26.7.0 released 2026-07-09 with security fixes | Security impact/backport status must be assessed before pilot. |
| LiteLLM | 1.81.13-stable | 1.92.0 official stable | Significantly behind; verify provider compatibility and security fixes. |
| CAP | 1.2 | CAP 1.2 remains the published OASIS standard | Appropriate; local profile can remain deferred. |

Primary live sources:

- FastAPI release notes: <https://fastapi.tiangolo.com/release-notes/>
- SQLAlchemy PyPI release history: <https://pypi.org/project/SQLAlchemy/>
- redis-py PyPI release history: <https://pypi.org/project/redis/>
- npm registry metadata: <https://registry.npmjs.org/react/latest>, <https://registry.npmjs.org/typescript/latest>, <https://registry.npmjs.org/vite/latest>
- Keycloak 26.7.0 release: <https://www.keycloak.org/2026/07/keycloak-2670-released>
- LiteLLM release notes: <https://docs.litellm.ai/release_notes/>
- PostgreSQL support policy: <https://www.postgresql.org/support/versioning/>

## What Already Works

- The named paradigm is specific and useful: deterministic control, bounded AI, ports/adapters, and human authority form a coherent model.
- AI is correctly prevented from choosing severity, deadline, or unapproved actions.
- Protocol retrieval, typed composition, deterministic validation, fallback, task-bundle versioning, and exercise isolation are strong initiative-level invariants.
- PostgreSQL ownership, outbox intent, recoverable Redis transport, trace propagation, source provenance, and deployment boundaries are directionally correct.
- The capability map and environment envelope make omissions visible, even though several mapped capabilities need stronger Rules.

## Gate Exit Conditions

The spine can pass a high-stakes handoff after, at minimum:

1. C-1 and C-2 are resolved with enforceable lifecycle and external-effect semantics.
2. H-1 through H-4 fix the deterministic safety contract, clock/race authority, and frozen release audience/content.
3. H-5/H-6 bind event compatibility, timeliness, degraded modes, and pilot service objectives.
4. H-7 defines approval assurance and enforceable accountability evidence.
5. The capability map, brownfield migration markers, and technology support posture are reconciled.

No change was made to `ARCHITECTURE-SPINE.md` during this validation.
