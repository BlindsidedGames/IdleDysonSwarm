# Canonical player gameplay differential review — 2026-09-12

## Result and scope

No introduced gameplay difference was found in **20,778 player-command attempts
and 200 deterministic active advances**, organized into **518 independent
sequences**. Baseline and candidate matched the complete transition result,
complete published runtime snapshot and complete Dyson derivation after every
step: **20,978 exact state comparisons and 20,978 exact derivation comparisons**,
plus the transition comparisons and initial-state checks.

The inventory exercised **all 55 canonical player-command kinds**, covering
807 distinct command/duration parameterizations. Across those attempts,
9,530 were accepted (including 3,052 unchanged/no-op outcomes), and 11,248 were
rejected identically. Rejected cases are recorded separately; they are not
counted as successful purchases or as proof of a later unlocked state.

This is broad, bounded differential gameplay coverage. It does not prove every
possible combination of an unbounded game's numerical state, input order,
concurrency and platform state. It is separate from the parent's rendered-button,
layout, keyboard/pointer and native acceptance checks.

## Independent baseline and deterministic execution

- Baseline: `878f5bffecd59c699712103172e668d12853d16a`, original 4.1.8, loaded from
  the clean primary checkout.
- Candidate source: `7bc88cd7c8045e48675e343ed2374a0cfd8706d7`, loaded from the
  optimization checkout.
- The runner imports each checkout's own application, engine, session,
  preparation, context and derivation module graph. It does not substitute the
  candidate's changed simulation helpers into the historical oracle.
- A source-diff guard checks both trees against those exact revisions before
  imports; the report records actual checkout revisions and the runner SHA-256.
- Both sides hydrate the same checked-in save bytes with a fixed UTC instant
  (`2026-09-12T00:00:00.000Z`) and a fixed session clock. Active durations are
  explicitly 0, 1, 16, 33, 100 and 1,000 milliseconds, including Tinker sequences.
  This is correctness testing, not a timing benchmark.
- Every sequence constructs a fresh transactional engine from its scenario
  state. Steps within a sequence retain prior accepted mutations, publication
  revisions and rejected/no-op behavior. Complete snapshots are compared with
  `isDeepStrictEqual`, including bigints and arrays.

## State coverage

All nine checked-in progression states were tested with permanent Double IP both
off and on: fresh, mid-swarm, first-infinity, mature-infinity, reality-unlock,
mature-simulations, quantum-unlock, late-quantum and maximum-skills.

Seven additional explicit synthetic seed categories expose success paths that
those nine snapshots cannot all reach within a short replay: funded resources,
manual Infinity eligibility, Overflow eligibility, Dream-reset eligibility,
individual skill dependency/preset construction, sequential Quantum item
purchases, and sequential Research panel-lifetime purchases. The transactional engine validates each seed before use. These are
clearly labeled constructed states, not a claim that the replay naturally
progressed from a new game to those balances.

The individual-skill seed retains explicit unowned runtime records for every
catalog skill. This preserves sibling lookups needed by dynamic effects and
allows the isolated Galvanization branches to be exercised accurately.

## Concrete control and catalog coverage

- All eight facility IDs: all five buy modes and rounded/unrounded settings;
  facility automation on/off; automation execution; bot allocation 0/25/50/100%.
- All 14 authored Research IDs: all buy modes, rounding, per-ID automation and
  automation execution. All 14 IDs have accepted, changed purchase outcomes.
  A dedicated eligible sequence purchases panel-lifetime levels 1–4 in order
  under both entitlement states. Unknown-ID rejection also matches.
- All 104 authored skill IDs have **accepted, changed purchase and
  Galvanization coverage** across the combined sequences. Refund requests cover
  all 104 IDs: 97 have changed outcomes; seven only have accepted no-op outcomes
  in these sequences. Normal ownership,
  preset dependency assembly, refund/rebuy and permanent ownership are tested.
- Five preset slots: names, all five colors, bot distribution, assignment,
  selection, add/remove, valid import, invalid JSON, Bots/Research automation
  slots 0–5, non-refundable assignment policy and queue execution.
- All 20 Quantum upgrade IDs have accepted purchases, including mega unlocks;
  quantity 1, quantity 10 and max are attempted where supported. Rejected bulk
  requests on non-bulk items remain identical to baseline.
- All 18 Reality upgrade IDs and all 43 defined Dream purchase IDs have accepted,
  changed purchases. All six education IDs, foundational purchases and both
  Space Age purchases are exercised. The 26 remaining Dream flags have no entry
  in `SIMULATION_UPGRADE_DEFINITIONS`: ten activator flags and `translation1`–`8`
  and `speed1`–`8`. They are internal effects, not missing eligible purchase
  buttons. Their identical rejection is recorded separately. An exact set
  comparison confirms that changed Dream purchase IDs equal the entire
  43-definition purchase catalog.
- Infinity shop items, manual Infinity, automatic-reset setting, break target,
  Quantum Leap, Dream/Black Hole/Overflow reset requests, Blank Slate entry and
  abandonment, and Tinker start/repeat/advance paths.
- Avocato feeds from Infinity Points, Influence and Strange Matter, plus
  meditation step requests 0–7. Both locked/empty and funded feed outcomes match.
- Stored Time capacity/presets, processing intervals, all navigation visibility
  toggles and route-discovery transitions, plus malformed/negative/non-finite
  input rejection checks.

## Important execution boundary

`time.request-stored-time-spend` is intentionally not executed through this
engine harness. With an empty balance both sides return `time-stored-spend:empty`;
with funded time they return `CANONICAL-STORED-TIME-INTENT-REQUIRES-FACADE`.
`dispatchPlayer` intercepts that command for the commit-first application/worker
workflow. This review certifies the engine boundary and preserves the rejection;
it does **not** replace the separate Stored Time facade, cancellation, save,
worker and browser checks.

Likewise, engine-level Galvanization, challenge and Overflow outcomes do not
replace the facade's durable commit-first validation. Save/Cloud failure and
recovery behavior belongs to the separate save review. Store purchases,
achievements, platform dialogs, real device suspension/resume and browser focus
behavior are outside this headless test.

## Semantic source review

The production gameplay diff contains numeric allocation reuse, catalog/static
lookup reuse, stat ordering, local immutable effect-map reuse, local manual
purchase-layer reuse and local facility-calculation reuse. No price, reward,
threshold, reset rule, command admission rule, authored game data or save schema
was changed. Review traced the preserved legacy float conversion, stable tie
order, modifier cutoff, clamps, source pair ordering, snapshot publication and
per-call lifetimes. The earlier numeric/serialization and 306-case derivation
characterization remain complementary evidence; they are not substituted for
this command replay.

All nine extracted developer-command helper bodies were separately compared
with baseline and remain identical apart from export placement. The only
intentional behavior correction elsewhere is Cloud retry ownership: an older
failed publication no longer clears a newer checkpoint's retry marker. That is
recorded as a reliability change, not hidden behind a universal unchanged claim.

No actionable introduced gameplay defect was found. Remaining uncertainty is
finite coverage of combinations and external/UI execution, not a known untested
command kind in the canonical inventory.

## Evidence and reproduction

- Runner: `output/player-review/run-gameplay-differential.mts`
- Complete parameter-level outcome inventory and final-state hashes:
  `output/player-review/gameplay-differential.json`
- Dream purchase-definition and Research changed-success coverage assertion:
  `output/player-review/dream-definition-coverage.mts` and its JSON result
- Completion log: `output/player-review/gameplay-differential.log`

Run `npx tsx output/player-review/run-gameplay-differential.mts` from the candidate
checkout while the baseline checkout still contains the recorded original
source. The guard intentionally fails if either production source graph drifts.
The runner and raw evidence remain ignored local review artifacts; this document
is the tracked audit. No production code was edited during this review.

## Command-kind outcome ledger

Accepted includes unchanged/no-op results; changed is accepted minus no-op.

| Command kind | Attempts | Changed | No-op | Rejected |
| --- | ---: | ---: | ---: | ---: |
| `dyson.set-buy-mode` | 200 | 84 | 116 | 0 |
| `dyson.set-rounded-bulk-buy` | 200 | 184 | 16 | 0 |
| `dyson.purchase-facility` | 1600 | 350 | 0 | 1250 |
| `dyson.set-facility-automation` | 320 | 52 | 52 | 216 |
| `dyson.run-automation` | 320 | 320 | 0 | 0 |
| `dyson.set-bot-distribution` | 120 | 80 | 0 | 40 |
| `research.set-buy-mode` | 200 | 84 | 116 | 0 |
| `research.set-rounded-bulk-buy` | 200 | 180 | 20 | 0 |
| `research.purchase` | 2828 | 424 | 178 | 2226 |
| `research.set-automation` | 560 | 68 | 68 | 424 |
| `research.run-automation` | 20 | 8 | 12 | 0 |
| `skill.purchase` | 2516 | 538 | 440 | 1538 |
| `skill.refund` | 2288 | 696 | 1518 | 74 |
| `skill.galvanize` | 2288 | 350 | 0 | 1938 |
| `skill.set-auto-assignment` | 20 | 20 | 0 | 0 |
| `skill.run-auto-assignment` | 20 | 12 | 8 | 0 |
| `skill.reset` | 20 | 20 | 0 | 0 |
| `skill.rename-preset` | 100 | 100 | 0 | 0 |
| `skill.set-preset-color` | 100 | 0 | 100 | 0 |
| `skill.set-preset-bot-distribution` | 100 | 80 | 20 | 0 |
| `skill.set-preset-assignment` | 308 | 100 | 208 | 0 |
| `skill.select-preset` | 516 | 516 | 0 | 0 |
| `skill.add-to-current-preset` | 308 | 308 | 0 | 0 |
| `skill.remove-from-current-preset` | 100 | 100 | 0 | 0 |
| `skill.import-preset` | 120 | 100 | 0 | 20 |
| `skill.set-tab-preset-automation` | 240 | 200 | 40 | 0 |
| `skill.apply-tab-preset-automation` | 240 | 200 | 40 | 0 |
| `skill.set-auto-assign-non-refundable` | 40 | 20 | 20 | 0 |
| `infinity.purchase-shop-item` | 180 | 44 | 0 | 136 |
| `quantum.purchase-upgrade` | 1240 | 86 | 0 | 1154 |
| `reality.purchase-upgrade` | 360 | 46 | 0 | 314 |
| `dream.purchase-upgrade` | 1380 | 94 | 0 | 1286 |
| `dream.start-education` | 120 | 12 | 0 | 108 |
| `dream.purchase-foundational` | 160 | 16 | 0 | 144 |
| `dream.purchase-space-age` | 80 | 10 | 0 | 70 |
| `reality.gather-influence` | 20 | 2 | 0 | 18 |
| `time.set-stored-time-preset` | 60 | 60 | 0 | 0 |
| `settings.set-processing-interval` | 120 | 20 | 20 | 80 |
| `settings.set-navigation-item-visible` | 600 | 560 | 40 | 0 |
| `navigation.set-route-discovery` | 40 | 40 | 0 | 0 |
| `time.upgrade-stored-capacity` | 20 | 2 | 0 | 18 |
| `time.request-stored-time-spend` | 20 | 0 | 0 | 20 |
| `infinity.set-automatic-reset` | 40 | 20 | 20 | 0 |
| `infinity.set-break-target` | 20 | 4 | 0 | 16 |
| `tinker.start` | 20 | 20 | 0 | 0 |
| `@advance` | 200 | 160 | 20 | 20 |
| `tinker.set-repeat` | 40 | 40 | 0 | 0 |
| `avocado.feed` | 60 | 6 | 0 | 54 |
| `avocado.complete-meditation-step` | 160 | 140 | 0 | 20 |
| `infinity.request-reset` | 22 | 2 | 0 | 20 |
| `quantum.request-leap` | 20 | 4 | 0 | 16 |
| `dream.request-reset` | 22 | 2 | 0 | 20 |
| `dream.request-black-hole-reset` | 20 | 20 | 0 | 0 |
| `avocado.request-overflow-reset` | 22 | 2 | 0 | 20 |
| `challenge.enter-blank-slate` | 20 | 16 | 0 | 4 |
| `challenge.abandon` | 20 | 16 | 0 | 4 |
