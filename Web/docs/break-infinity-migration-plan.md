# Break Infinity migration plan

## Status and decision

This document is the implementation contract for the full-game numeric
migration. Product decisions are closed. Implementation may refine private
helper names, but it must not change the numeric, transaction, persistence or
rollout contracts below without updating and re-approving this plan.

The supported runtime is Web: browser, PWA and the Web application hosted by
Capacitor or Electron. The historical Unity runtime will not receive a parallel
numeric migration and will not read Web saves. Unity/Odin `IDB1` saves are
one-way legacy import sources only.

### Deployment and certification boundary

This migration plan authorizes implementation, local testing, GitHub Actions
verification and unsigned test-build generation only. It does not authorize
deployment, publication, signing, notarization, store submission or
distribution. No migration stage may upload an application to Google Play,
App Store Connect, TestFlight or any other distribution service, invoke store
APIs or credentials, or use protected signing or release-deployment
environments.

Website deployment, native release preparation, signing, store upload and
public rollout are separate future operations that require explicit user
authorization. Completion of Stage 8 or Stage 9 does not authorize any of
those operations. GitHub Actions may retain unsigned test artifacts and logs,
but those artifacts must not be sent to an application store or public release
channel.

The executable platform-certification matrix is:

| Environment | Required verification |
| --- | --- |
| Local Web | Focused and full tests, TypeScript, lint, production Web build, real Chrome/PWA flows, IndexedDB/save migration, offline/reload, Stored Time worker, accessibility and performance |
| GitHub Ubuntu | Clean dependency installation, full Web suite, Web/PWA builds, schema/data checks and generated-artifact checks |
| GitHub Android API 26 | Unsigned debug build, unit tests and emulator-based WebView/instrumentation tests |
| GitHub Android API 36 | Unsigned debug build, unit tests and emulator-based WebView/instrumentation tests |
| GitHub macOS | Unsigned iOS simulator build with `CODE_SIGNING_ALLOWED=NO`, static native-bridge checks and simulator tests supported by the checked-in harness |
| Electron | Existing unsigned build and automated host checks while Electron remains a supported host |

Physical Android and iOS testing is not a completion gate because no
physical-device test operator is available. Hardware-specific background
termination, vendor WebView differences, Keychain/Keystore behaviour and
update-in-place continuity remain documented residual risks. Emulator and
simulator success must not be represented as physical-device certification.

Public Unity compatibility is certified through save schema 11. Schema 12 is
accepted and retained as a development-characterized import fixture; that is
not a claim that schema 12 shipped publicly. Supported `IDB1` schemas 0-12 use
the bounded legacy decoder, migration, repair and validation pipeline. An
`IDB1` claiming schema 13 or later is rejected. The Web `IDSWEB1` envelope owns
schema 13 and later.

The Web runtime will use
[`break_infinity.js`](https://github.com/Patashu/break_infinity.js) behind a
project-owned `GameDecimal` adapter. Break Infinity is an approximate
incremental-game number, not arbitrary-precision accounting. Its useful range
extends far beyond JavaScript `number`, while retaining roughly ordinary double
precision. Tetration or layered-exponential support remains a separate future
design decision and is not part of this migration.

## Scope and non-goals

The migration covers every authoritative gameplay domain, transaction,
simulation path, persistence boundary and player-facing formatter before it is
activated. It includes Dyson, Infinity, Skills, Research, Reality, Dream,
Quantum, Avocato, statistics, active time, returned time, stored time,
accelerated simulation, browser/PWA storage, save transfer and Capacitor device
storage.

The following are explicit non-goals:

- no Unity gameplay, package, scene, save-writer or Unity-test changes;
- no Unity-readable schema-13 export or two-way Unity synchronization;
- no new gameplay content, balance tuning or notation system beyond what huge
  values require;
- no `break_eternity.js`, arbitrary-precision decimal or exact residual-debt
  account;
- no generic tagged-object serialization such as `$decimal`;
- no generated Unity catalog rewrite solely to change runtime numeric types;
- no per-unit, per-purchase or per-cycle replay for bulk work; and
- no partial production rollout in which only some gameplay domains use
  `CanonicalGameStateV2`.

## Numeric contract

Every canonical numeric leaf must be listed in the field-classification
manifest before schema 13 is activated. Classification follows game semantics,
not the historical Unity or JavaScript storage type.

### Ordinary `GameDecimal`

Use non-negative `GameDecimal` values for scalable continuous quantities:

- Money, Science and other continuous balances;
- continuous Dream resources such as Energy and railgun charge;
- production, consumption and generation rates;
- scalable costs, effects, multipliers and accumulated production;
- bot, worker, researcher and producer quantities where huge or fractional
  simulation values are valid;
- the automatic slot of each Dyson facility pair, because rate-times-seconds
  production may add fractional facilities;
- Avocato feed accumulators and overflow multiplier; and
- active, offline and accelerated resource-valued results.

### Integer-valued `GameDecimal`

Integer-valued `GameDecimal` is approximate at extreme magnitude but is always
normalized with `floor(value) == value`. Use it where fractions are invalid but
the quantity can grow beyond a practical exact `bigint` representation:

- available Infinity Points and allocated Infinity-shop Points;
- available Quantum Shards and lifetime-earned Quantum Shards;
- available Reality Influence and Strange Matter;
- Infinity break targets and rewards;
- unbounded Research levels and unbounded Quantum booster levels;
- scalable producer inventories, including Hunters and Gatherers;
- Dyson Panels, reserved/in-flight panels and Swarm Panels;
- the manual-purchase slot of each Dyson facility pair, Space-Age whole-unit
  producer counts and purchase quantities;
- Reality universe-designation and scalable worker-production totals; and
- resource-valued statistics for all of the above.

Rounding is never implicit. Approximate purchase quantities and rewards round
down. Integer currency costs round up. A conversion from `GameDecimal` to
`bigint` is allowed only through an explicit checked adapter function and never
through JavaScript `number`.

### Exact `bigint`

Keep `bigint` where losing one unit changes bounded or genuinely exact game
state:

- ordinary Skill Points and Skill Fragments;
- bounded Secrets of the Universe, permanent Secret ranks, permanent Skill
  ranks and Quantum Divisions;
- bounded Reality worker inventory and configured exact worker batches;
- reset, event, purchase, window-sequence and other one-at-a-time counts;
- bounded exact upgrade ranks and authored exact Skill costs; and
- exact counters whose value is not produced by a scalable resource formula.

`skills.fragments` is the count of owned fragment-tagged skills, not a
currency. `infinity.secretsOfTheUniverse`, `quantum.permanentSecrets` and
`infinity.permanentSkillPoints` are bounded progression ranks, not spendable
balances. Skill Points remain the exact spendable Skill currency.

### Bounded `number`

Keep finite JavaScript `number` values only for bounded control and presentation
data:

- elapsed seconds, durations, cooldowns and scheduler slice durations;
- progress fractions, probabilities and bot-distribution ratios;
- bounded authored coefficients;
- small indexes, enum-like settings and railgun round counts; and
- UI geometry and animation state.

An economy rate is not a `number` merely because its time denominator is in
seconds. Scalable rates use `GameDecimal`; only the bounded duration remains a
`number`.

## `GameDecimal` architecture

### Runtime representation and dependency boundary

Add `src/math/gameDecimal.ts` and its tests. It is the only module permitted to
import `break_infinity.js`.

Canonical state stores a branded immutable structural value equivalent to:

```ts
declare const gameDecimalBrand: unique symbol

type GameDecimal = Readonly<{
  readonly mantissa: number
  readonly exponent: number
  readonly [gameDecimalBrand]: true
}>
```

The exact branding technique may use a non-enumerable or type-only brand, but
the enumerable runtime value is the normalized `{ mantissa, exponent }`
structure. A `break_infinity.js` Decimal class instance is private and
temporary inside adapter operations. It never enters canonical state,
snapshots, messages or persistence.

The adapter provides:

- strict construction from a safe number, canonical decimal string and
  bounded `bigint`;
- zero, one and ten constants;
- add, subtract, multiply, divide, power, logarithm and root;
- compare, minimum, maximum, absolute value, floor and ceiling;
- finite, non-negative, zero and integer predicates;
- canonical string and mantissa/exponent decomposition;
- checked conversion to bounded `number` and practical `bigint`; and
- scheduler-specific upward conversion to seconds.

Every operation returns a normalized structural value. Callers never mutate
mantissa or exponent and never use JavaScript arithmetic or comparison
operators on `GameDecimal`. A repository check rejects direct dependency
imports and direct structural mutation outside the adapter.

### Parsing and validation

The adapter parser accepts one canonical ASCII grammar selected by the adapter,
with a normalized mantissa and base-10 exponent. It rejects whitespace,
locale-formatted text, leading plus signs, alternate spellings, NaN, Infinity,
negative economy values, non-normalized zero, unsafe exponents and trailing
text. It must not delegate trust to the dependency's permissive `parseFloat`
path.

The chosen encoded decimal budget is 64 ASCII characters per field. The
supported exponent must be a safe integer within the documented Break Infinity
range. Exact integer strings are limited to 4,096 digits per field at import.
The total save budgets remain the stricter outer bound.

### Cloning, freezing and publication

Because canonical Decimal values are plain immutable structures,
`structuredClone` preserves their data without a class prototype. Implement
and use `cloneGameDecimal` and `cloneCanonicalGameStateV2` at authoritative
boundaries so validation and branding are restored deliberately rather than
inferred from arbitrary lookalike objects.

Update `src/save/graph.ts`, runtime staging, snapshot publication and tests so:

- clones do not share mutable nested state;
- recursive freezing treats Decimal structures as immutable values;
- published frontend snapshots cannot mutate authoritative state;
- cross-context messages use encoded DTO values, not branded runtime objects;
  and
- a structural `{ mantissa, exponent }` object from an untrusted source is
  accepted only through the path-typed decoder and validator.

### Equality contract

Production code uses exact normalized equality and exact Decimal comparison.
This applies to save round trips, clone assertions, affordability, transaction
quotes, commits, production results and state-change detection. There is no
runtime epsilon for money or currency.

Approximate equality is test-only. It may compare schema-12 `number` behaviour
with schema-13 Decimal behaviour or independently arranged simulation paths,
but it cannot decide affordability, unlocks, reset readiness, quote validity or
whether a production transaction changed state.

## Canonical state and field manifest

Increment `CANONICAL_GAME_MODEL_VERSION` independently from the save schema and
introduce `CanonicalGameStateV2`. V1 remains the schema-12/legacy migration
input; V2 is the only runtime model that may be written as schema 13.

Add `src/game-state/numericFieldManifest.ts` as an executable manifest. Each
numeric canonical leaf records:

- canonical path or closed record-key family;
- semantic class: ordinary Decimal, integer Decimal, exact bigint or bounded
  number;
- persistence encoding and parser;
- non-negative, integer and range invariants;
- reset, feed or preservation behaviour;
- whether it is a balance, rate, cost, level, inventory, timer or statistic;
  and
- the transaction or simulation owner allowed to change it.

A coverage test walks `CanonicalGameStateV2`, frontend resource projections and
the schema-13 DTO. Activation fails if a numeric leaf is unclassified, appears
in more than one incompatible class or narrows through `number` without a
manifested bounded conversion.

The settled important classifications are:

| Domain | Decimal or integer-Decimal state | Exact or bounded state |
| --- | --- | --- |
| Dyson | Money, Science, bots, workers, researchers, facility pairs, production and costs | goal/event counts only where genuinely bounded/exact; settings remain bounded |
| Infinity | available and allocated Points, break target/reward, resource statistics | Secrets, permanent Skill ranks, reset counts |
| Skills | scalable effects and rates | Skill Points, Fragments, bounded Skill ownership/ranks |
| Research | costs, effects, rates, progress amounts and unbounded levels | capped one-level flags may be booleans/bounded integers |
| Reality | available Influence, universe/production totals, scalable rates | bounded ready-worker inventory and event counts |
| Dream | scalable resources, Hunters/Gatherers, panels, Strange Matter, costs, production and effects | reset/disaster counts and bounded railgun round state |
| Quantum | available/lifetime-earned Shards, unbounded booster levels and scalable effects | permanent Secrets, Divisions, one-time unlock flags |
| Avocato | three feed accumulators and overflow multiplier | unlock/secret sequence flags and bounded steps |

## Transactions and currency accounting

### Authoritative balances

Schema 13 does not derive available currency by subtracting two close huge
Decimal ledgers. Use direct authoritative balances:

- Infinity stores `availablePoints` and `allocatedPoints`. Imported
  `points - spentPoints` becomes `availablePoints`; shop ownership and bounded
  ranks remain the authority for purchased effects.
- Quantum stores `availableShards` and `lifetimeEarnedShards`. Lifetime earned
  owns reveal thresholds; available owns affordability.
- Reality stores direct available Influence.
- Dream stores direct available Strange Matter.

Optional lifetime-spent statistics are telemetry only. They never determine
affordability. The Developer Options in-game transaction debits available
Shards and Strange Matter atomically and never decreases lifetime-earned
Shards. This replaces the current `pointsEarned` decrement behaviour.

### Quote and commit

Every purchase is a backend-owned immutable quote followed by a commit against
the same state revision. A quote contains at least currency path, requested
mode, selected quantity or batches, units granted, quoted cost, expected
post-state and source revision. Commit rejects a stale revision and never
recomputes from presentation inputs.

Rules are fixed:

- approximate quantities floor down;
- integer costs ceil up;
- affordability is strict `quotedCost <= available`, with no epsilon;
- fixed quantities are all-or-nothing;
- Buy Max uses an analytic estimate, recomputes its cost and applies at most 16
  bounded downward corrections before failing closed;
- no transaction loops over quantity; and
- results expose `quotedCost`, `debitedAmount`, `unitsGranted`, `accepted` and
  represented `changed` separately.

### Negligible purchase debits

If subtracting an affordable purchase cost cannot change the represented
balance, `debitedAmount` is zero and the purchase may still succeed. This rule
also applies to fixed-price Influence purchases and flat Quantum boosters. It
is an intentional approximate-economy decision, not an accounting accident.

If adding the purchased output cannot change its represented count, the command
may still report `accepted: true`, `changed: false` and the represented count
remains unchanged. There is no residual debt or hidden output ledger in scope.

Fixed-price repeatable Buy Max is capped at exactly 1,000 purchase batches per
tap or command, never Infinity and never an unbounded Decimal quantity. A batch
is the authored button purchase:

- Hunter/Gatherer `unitsGranted = batches * current unitsPerPurchase`, so batch
  upgrades retain their effect;
- Solar, Fusion and a flat Quantum booster grant their authored units per
  batch; and
- affordability may lower the batch count below 1,000.

The 1,000-batch cap belongs in the transaction engine, not the UI. Space-Age
Buy Max moves from `ui/gameplay/simulations/SimulationsSurface.tsx` into the
canonical transaction path in `application/canonicalGameCommands.ts` and
`simulation/dreamSpaceAge.ts`.

### Transfers and conversions

The negligible-purchase rule does not apply to transfers, recipes, fuel,
escrow, prestige conversions or feed-all actions. They are atomic and cannot
create destination value from an unchanged source.

- Housing to Villages, Villages to Cities and Rockets plus Factories to Space
  Factories aggregate the whole operation and commit every source and
  destination together.
- Energy transfer, factory overdrive, railgun charge, panel reservation and
  panel launch require the represented source debit before destination credit.
- Feed-all first proves the Avocato accumulator can increase, then commits the
  destination credit and source zero together. If the destination cannot
  increase, neither side changes.
- Quantum Entanglement computes
  `shards = floor(availablePoints / 42)`, computes the represented remainder,
  proves available Shards can increase, then replaces available Infinity Points
  with the remainder and credits Shards atomically. It never performs an
  invisible subtract-and-credit sequence.
- Resets calculate all rewards and wipes from the pre-reset snapshot and commit
  once. A represented reward that cannot increase its destination reports the
  effective credited amount without inventing low-order value.

### Production

Active and exact explicit stored-time economy advancement use the same Decimal
formulas and operation order. Suspension/return performs deterministic capped
Stored Time and Double Time bank credit only; it does not run economy
production. Bulk production and timer completion use quotient/remainder or
analytic formulas and never replay each represented unit, production cycle,
purchase or reset. Stage 4D's Balanced and Exact stored-time policies may
deliberately replay raw automation decision ticks in a worker; Fast replaces
that decision stream with a disclosed bounded normalization. Production
summaries distinguish quoted/generated amount from effective represented
credit when a negligible addition cannot change state.

## Event-time and scheduler policy

Elapsed time and slice duration remain finite `number`; economy state and
economy rates are Decimal. A horizon such as `(required - current) / rate` is
calculated as `GameDecimal` and resolved in this order:

1. reject invalid/negative inputs and handle an exact zero horizon as due now;
2. compare the Decimal horizon with the current finite slice before converting
   it to `number`;
3. if it is beyond the slice, return the slice duration with `reached: false`;
4. clamp a positive horizon smaller than `1e-12` seconds to exactly `1e-12`;
5. convert an in-slice horizon to `number` rounded upward so an event never
   fires early; and
6. preserve the existing bounded zero-time pass guard and fail closed if no
   represented state change resolves a due event.

This prevents tiny positive Decimal horizons from underflowing to zero and huge
horizons from overflowing to Infinity before the slice comparison.

## Schema-13 persistence

### Closed Web-native DTO

Schema 13 is a closed Web-native DTO, not the Unity-shaped `SaveRecord` graph.
It contains only declared fields. Unknown gameplay fields, duplicate fields,
wrong primitive types and missing required fields are rejected.

Decimal and bigint encodings are path-typed:

- declared Decimal paths contain canonical Decimal strings;
- declared exact-bigint paths contain canonical base-10 integer strings;
- bounded numbers are JSON numbers;
- booleans and strings remain their JSON primitives; and
- no generic object tag is interpreted as a number.

An outline, not a second schema definition, is:

```ts
interface WebSaveDtoV13 {
  readonly schemaVersion: 13
  readonly modelVersion: 2
  readonly savedAtUtc: string
  readonly runtime: {
    readonly dysonEvaluationSnapshot: WebDysonEvaluationSnapshotDtoV13
    readonly dysonTuningProfile: WebDysonTuningProfileV13
  }
  readonly state: {
    readonly meta: WebMetaDtoV13
    readonly dyson: WebDysonDtoV13
    readonly infinity: {
      readonly availablePoints: string
      readonly allocatedPoints: string
      // bounded ranks, flags and exact counters
    }
    readonly skills: WebSkillsDtoV13
    readonly research: WebResearchDtoV13
    readonly reality: {
      readonly influence: string
      // worker inventory, progress and flags
    }
    readonly dream: {
      readonly strangeMatter: string
      // resources, parameters, timers, upgrades and railgun state
    }
    readonly quantum: {
      readonly availableShards: string
      readonly lifetimeEarnedShards: string
      // upgrade levels and unlocks
    }
    readonly avocado: WebAvocadoDtoV13
    readonly timeline: WebTimelineDtoV13
    readonly secretProgress: WebSecretProgressDtoV13
    readonly statistics: WebStatisticsDtoV13
  }
}
```

The schema implementation and the numeric field manifest are authoritative;
this outline documents ownership and encoding only.

The closed seven-field Dyson evaluation snapshot is durable recurrence state,
not a disposable cache. Schema 13 stores it in the path-typed `runtime`
sidecar so save/reload and transfer continue from the same dynamic-effect
inputs. The sidecar is portable gameplay data; it is distinct from temporary
legacy migration evidence, device preferences, platform entitlements and raw
import provenance.

Dyson base compatibility coefficients use a closed versioned tuning-profile ID
in the same sidecar. The Web owns the immutable coefficient table for each
accepted base profile. Legacy saves may contain float-cast coefficient
overrides produced by Secrets of the Universe; migration validates the entire
legacy vector against the base profile plus the canonical Secrets rank, then
stores only the base profile. V2 derivation reapplies the Secrets effect from
canonical state exactly once. Unknown vectors or vector/rank mismatches fail
closed instead of becoming arbitrary durable tuning.

The portable gameplay DTO intentionally excludes presentation preferences and
platform or debug entitlements. The V1-to-V2 migration returns those as
separate, closed local-store values alongside the gameplay state. Same-device
migration may carry forward trusted local values; manual and shared imports
retain the receiving installation's preference and platform authority. A
portable schema-13 export can therefore never grant a device entitlement.

### Provenance, recovery and import

Import source provenance and the untouched original import text are not fields
inside the gameplay DTO. `SaveRepository` stores them as a separate recovery
artifact under the existing import policy, including source class, observed
time and content identity. A plain object from a legacy save can therefore
never collide with schema-13 numeric encoding.

While schema 12 remains current, the live reader performs only a bounded
schema-envelope probe for schema-13 text. It reports a valid schema-13 save as
an unsupported future version and preserves the current and recovery
checkpoints; it does not invoke the dormant schema-13 decoder or writer.

Import flow is one-way:

1. enforce byte and structure budgets before expensive work;
2. identify `IDB1` versus `IDSWEB1` from the envelope;
3. reject `IDB1` schema 13 or later;
4. decode supported Unity schemas through the existing Odin path, numeric
   repair and public-schema validation;
5. decode schema-12 Web saves through the existing Web path;
6. map the closed legacy shape into `CanonicalGameStateV2` using the field
   manifest;
7. validate every Decimal, exact integer and bounded number; and
8. write schema 13 only after activation and only through the schema-13 DTO.

Legacy finite doubles are lifted without changing the represented double.
Legacy exact integers use canonical integer strings and never pass through
`number`. Unity claims outside the public schema-11 surface are not silently
promoted merely because a development schema-12 fixture contains them.

### Import and security budgets

Retain the current outer limits from `save/decodeIdb1.ts`:

- supplied text: 2 MiB;
- decoded payload: 1 MiB;
- inflated binary/JSON: 8 MiB;
- canonical decode depth: 128;
- containers: 100,000; and
- entries: 250,000.

Add the per-value 64-character Decimal and 4,096-digit exact-integer limits.
Parsing must be iterative or bounded, reject prototype-polluting keys, avoid
dependency construction before grammar/range checks and never include raw save
contents in errors or telemetry.

## Module and file-level work map

| Area | Primary files | Required work |
| --- | --- | --- |
| Dependency | `package.json`, `package-lock.json`, `THIRD_PARTY_NOTICES.md` | Pin `break_infinity.js`, record license, forbid other imports |
| Decimal adapter | new `src/math/gameDecimal.ts` and tests | Structural value, strict parser, arithmetic, conversions, canonical encoding |
| State contract | `src/game-state/types.ts`, `validate.ts`, new `numericFieldManifest.ts` | Add V2, classify every numeric leaf, enforce invariants |
| Legacy mapping | `src/game-state/mapping.ts`, `mappingCoverage.ts`, `mappingCoverageSchema11.ts` | One-way V1/Unity to V2 mapping; preserve public schema-11 distinction |
| Save graph and codec | `src/save/graph.ts`, `serialization.ts`, `migrate.ts`, `prepare.ts`, `import.ts`, `repository.ts`, `numericRepair.ts`, `importContext.ts` | Closed DTO, dormant schema 13, provenance separation, atomic migration/recovery |
| Legacy decoder | `src/save/decodeIdb1.ts`, `odinBinary.ts`, `validate.ts` | Preserve bounded IDB1 0-12 import; reject IDB1 13+ |
| Runtime ownership | `src/application/canonicalRuntimeSession.ts`, `canonicalGameApplication.ts`, `canonicalGameCommands.ts`, `frontendSnapshot.ts` | V2 staging/publication, direct balances, revisioned quotes, Developer Options fix |
| Numeric transactions | `src/simulation/numeric.ts`, `transactions.ts`, `dysonAutomation.ts`, `megaStructurePurchases.ts`, `researchAutomation.ts` | Decimal affordability, costs, quantities, 1,000 fixed-batch cap |
| Dyson production | `canonicalDysonDerivation.ts`, `dysonDerivedIntermediates.ts`, `dysonProductionArrivals.ts`, `dysonModel.ts`, `canonicalBotAllocation.ts` | End-to-end Decimal resources and rates |
| Infinity/Skills/Research | `canonicalInfinityShop.ts`, `canonicalInfinityReset.ts`, `infinityCycle.ts`, `canonicalSkillTransactions.ts`, `skillEffects.ts`, `researchAutomation.ts` | Integer Decimals for scalable values; retain exact Skill economy |
| Reality/Dream | `realityWorkers.ts`, `realityUpgrades.ts`, `dreamFoundationalInformation.ts`, `dreamEducationUpgrades.ts`, `dreamSpaceAge.ts`, `canonicalDreamReset.ts` | Influence/Strange Matter balances, scalable inventories, atomic recipes and resets |
| Quantum/Avocato | `quantumUpgrades.ts`, `quantumTransitions.ts`, `avocadoDomain.ts`, `canonicalBotCapCheckpoint.ts` | Direct Shard account, Entanglement replacement, scalable boosters/feed accumulators |
| Event time | `eventTime.ts`, `canonicalEventTimeModel.ts`, `lifecycleAwayTime.ts`, `timeResources.ts`, `storedTimeAccounting.ts` | Decimal horizons, upward seconds conversion, active/offline parity |
| Statistics | `canonicalStatistics.ts`, `simulation/types.ts`, state statistics types | Decimal resource totals; exact event/window counters |
| Catalog boundary | `src/game-data/runtimeCatalogContract.ts`, `catalog.ts`, generated JSON consumers | Lift authored numbers at use sites; do not rewrite generated data just for types |
| Presentation | `src/ui/i18n/formatters.ts`, `ResourceValue.tsx`, gameplay surfaces and accessibility labels | Mantissa/exponent formatting without wholesale `number` conversion |
| Platforms | `src/platform/browserSaveDatabase.ts`, `browserSaveTransfer.ts`, `indexedDbSaveStorage.ts`, native host/storage adapters | Schema-13 persistence, transfer, PWA and Capacitor validation |
| Enforcement/docs | `.oxlintrc.json`, repository checks, `docs/architecture.md`, `docs/game-state-contract.md`, `README.md` | Import/type checks and final architecture/save documentation |

## Coordinated implementation stages and dependencies

These are reviewable internal stages or commits, not independently releasable
mixed numeric slices. Production continues to use schema 12 and V1 until the
activation stage.

### Stage 0: baseline and manifest

- Freeze schema-11 public and schema-12 development fixtures.
- Record current active/offline/accelerated parity, save corpus and performance
  reports.
- Add the complete numeric field-classification manifest design and coverage
  inventory.

Gate: every existing numeric field and generated-data ingress has an intended
V2 classification; current tests and data checks are green.

### Stage 1: dependency and adapter

Depends on Stage 0.

- Pin the dependency and license.
- Implement structural `GameDecimal`, parser, operations and static import
  boundary.
- Add unit/property tests across zero, normalization, `1e308`, the supported
  exponent range and hostile strings.

Gate: no dependency object escapes the adapter; no production field has changed
type.

### Stage 2: V2 state, clone and dormant schema-13 codec

Depends on Stage 1.

- Add `CanonicalGameStateV2`, V2 validators, clone/freeze/publication support.
- Implement the closed path-typed schema-13 DTO and deterministic codec.
- Implement V1/schema-12 and supported IDB1-to-V2 migrations.
- Add bounded future-schema recognition to the live schema-12 reader without
  importing the dormant schema-13 codec into production roots.
- Return preferences, platform state and temporary legacy runtime evidence as
  separate migration outputs; keep them outside the portable gameplay DTO.
- Keep `CURRENT_SAVE_SCHEMA` at 12 and prevent production schema-13 writes.

Gate: V2 and schema 13 round-trip in isolated tests; production still reads and
writes the existing schema.

### Stage 3: transactions and Dyson

Depends on Stage 2.

- Port transaction primitives, Money, Science, facilities, bots and Dyson
  production to V2.
- Implement immutable quotes, strict affordability, rounding and fixed-batch
  semantics.
- Remove `Number.MAX_VALUE` saturation and forced one-ULP purchase debit from
  the V2 path.

Gate: all Dyson commands, automation and production operate end to end on V2 in
the isolated harness; no presentation-owned affordability remains.

### Stage 4: production, event time and lifecycle

Depends on Stage 3.

- Port event horizons, active time, suspension/return, stored time and
  accelerated simulation.
- Atomically carry and persist the Decimal Dyson evaluation snapshot with the
  V2 runtime publication; reload must not reseed dynamic effects implicitly.
- Replace the eleven migration-only compatibility coefficients with an
  immutable Web-native authored/generated tuning source.
- Replace represented-quantity and production-cycle work with analytic
  quotient/remainder processing. Exact raw automation decision replay is the
  explicit, worker-owned exception described in Stage 4D.
- Prove exact normalized Decimal results where a policy preserves identical
  operation order, and document both test-only old-number tolerances and the
  intentional Fast-policy difference.

Gate: active and explicit stored-time V2 economy paths are deterministic across
slice boundaries and cannot enter a zero-time loop; suspension/return resource
accounting is deterministic, capped and performs no economy production.

#### Stage 4D: selectable stored-time processing in a Web Worker

Stage 4D is planning-only. It does not activate V2, change the current save
schema or add a worker to a production root, and it does not replace or defer
Stages 5 through 8 (or the Stage 9 cleanup). Implementation begins only after
the dormant V2 scheduler, lifecycle publication and schema-13 runtime sidecar
gates are stable.

Stored-time processing is an explicit command over an already-banked duration.
Return from suspension continues to perform bank accounting only. The command
has three user policies, with closed versioned policy IDs:

| Policy | Required semantics |
| --- | --- |
| `stored-time-fast-v1` | Default. Deterministically normalize the requested raw automation stream into no more than 4,096 representative groups and process those groups analytically. Results may differ from exact tick replay. |
| `stored-time-balanced-v1` | Replay every raw automation tick exactly for at most 60 seconds of wall-clock work in one run. At that limit, durably checkpoint and pause; already checkpointed time remains applied and all remaining time remains banked. |
| `stored-time-exact-v1` | Replay every raw automation tick exactly, with progress and ETA, cooperative CPU throttling, periodic durable checkpoints and cancellation of the remaining work. |

If a command contains at most 4,096 raw automation ticks, the backend always
uses exact tick replay regardless of the selected preference. This automatic
exact path does not consume or overwrite the preference. Fast is the default
when no valid local preference exists. Stage 7 owns a closed local-preference
field containing only the three policy IDs, defaulting unknown/missing values
to Fast, and owns the accessible selector, progress and warning UI. The choice
is not portable gameplay state, so manual/shared imports retain the receiver's
local selection.

##### Exact and Fast execution semantics

Balanced and Exact submit the same finite scheduler requests in the same order
as foreground exact simulation. Scheduler continuations remain opaque and
worker-local. A five-second checkpoint request does not truncate a request at an
invented elapsed-time endpoint, because doing so would perform endpoint
rederivation and could change exact operation order.

Instead the worker scheduler exposes an internal material-boundary sealing
operation. After an authentic yielded boundary has completed every canonical
boundary handler and published its Decimal recurrence snapshot, `seal` consumes
the local continuation and returns a complete canonical carrier plus exact
remaining duration, rebased queued inputs and cumulative accounting. It cannot
seal mid-event, before a handler/snapshot, or at a wall-clock-selected simulation
instant. The opaque token never crosses the worker boundary. The sealed result
is a complete deterministic subrequest and the only checkpointable carrier.
After an authoritative acknowledgement, the worker starts the remainder from
the acknowledged sealed carrier/accounting/queue, not from the consumed token or
its pre-ack proposal.

Periodic checkpoint, Balanced-pause and lifecycle-pause requests are checked
between bounded internal yields and set `sealRequested`; the next authentic
material-boundary yield is sealed. User cancel does not request a new seal.
Cancellation/authority revocation can discard an unsealed continuation
immediately. Exact results must remain identical to uninterrupted execution for
every legal material-event budget and checkpoint cadence, including no
checkpoints.

Worker summaries remain O(1): fixed counters, fixed phase totals and a rolling
deterministic diagnostic digest only. Per-event `handlerOrder`, per-tick result
arrays and retained continuation/chunk graphs are forbidden. Checkpoint and
completion summaries report cumulative values from job origin, so retry or
resume does not concatenate an unbounded history.

Fast normalization is versioned gameplay behaviour, not a performance accident.
An initial due-now automation boundary first runs through the canonical bounded
zero-time handler; grouping never turns it into a negative/zero interval. Let
`h` then be the source publication's positive time to the next automation
boundary, `i` the positive authored automation interval, `d` the requested
stored duration and `n` the exact number of automation boundaries in `d` after
honouring `h`. The prefix before the first boundary and the remainder after the
last boundary are advanced exactly. If `n <= 4,096`, the entire request takes
the automatic exact path. Otherwise Fast sets `g = 4,096`, `q = floor(n / g)`
and `r = n mod g`; chronological groups `0..r-1` represent `q + 1` ticks and
groups `r..g-1` represent `q` ticks. The extra ticks are therefore assigned to
the earliest groups, independent of worker chunking or host speed.

For the first Fast group, continuous time is `h + (groupTicks - 1) * i`; for
later groups it is `groupTicks * i`. At each group start the worker derives the
Decimal recurrence snapshot and captures rates from the current state. It
advances continuous production through that group's duration with the canonical
captured-rate and arrival order, then runs exactly one stored-time
force-Buy-Max automation sweep at the terminal boundary. That sweep uses the
canonical eight-target order, re-evaluates unlocks after every debit and
advances the target index exactly once even when every target is skipped. The
omitted raw ticks neither purchase nor rotate the target index. After the final
representative sweep, the exact final remainder is advanced without another
automation tick.

All non-automation hard events, including Double Time exhaustion, Infinity
boundaries and other ported timer/goal boundaries, split a group's continuous
segment in canonical phase order without creating another representative
automation group. Rates and the seven-field Decimal recurrence snapshot are
recaptured after each hard event. A goal reached by a representative purchase
is localized to that group-end boundary, applies every canonical goal transition
there in order, and affects only subsequent captures; it is never backdated to
an omitted tick. The current goal stage, automation phase, final remainder and
next evaluation snapshot are part of the deterministic result. This fully
defines Fast while deliberately not reconstructing affordability, unlock or
target-index decisions that exact replay would have made on omitted ticks.

Given the same origin publication, requested duration, policy version, catalog
and tuning identity, Fast group boundaries and output bytes must be identical
across worker chunks, checkpoint boundaries, reload and host speed. The warning
is mandatory before a user confirms a request longer than 4,096 raw ticks and
remains available with the result:

> Fast processing groups automation ticks. Results may differ from Exact, and
> splitting the same Stored Time into multiple commands may produce different
> results.

The backend returns a stable disclosure code and policy ID. One long Fast
command and several shorter Fast commands are separately deterministic but are
not promised equal because each command computes its own groups. Balanced and
Exact do promise equality with uninterrupted raw-tick replay across any number
of acknowledged checkpoint/resume boundaries.

##### Authority, identities and job lease

The dedicated same-release worker is a trusted gameplay engine: it owns
production, automation and recurrence semantics for its admitted input. The
main thread does not re-simulate the result or attempt to prove the worker's
semantic honesty. The main thread remains the sole authority for job admission,
the current application publication, stored/Double Time and Infinity timeline
accounting, safe-number revisions, writer fencing, persistence and publication.
It validates structure, identity, invariants and authoritative accounting before
accepting an otherwise trusted same-release result.

Every job has an opaque high-entropy `jobId`, immutable safe-number
`originRevision`, closed `policyId`/`policyVersion`, immutable requested
duration and origin-bank snapshot, generated `buildId`/`catalogHash`, and tuning
profile. It also has a mutable safe-number `acknowledgedBaseRevision` and
monotonic safe-integer `checkpointSequence`. The base revision starts at the
origin revision and may change only after read-back-confirmed persistence. The
origin revision never changes and remains on every message and checkpoint
record.

Admission enters the authoritative router lane, captures the current writer
owner/generation fence and allocates the job identity, but does not grant the
worker lease yet. It first canonical-encodes and persists the unchanged origin
publication with a sequence-zero stored-time origin record, then reads it back
and verifies its origin revision, job ID and canonical hash. This durability
barrier does not debit the bank, change gameplay state or increment the
application revision. Only a confirmed read-back grants the single-job lease
and permits `start`.

A definite origin-persistence failure leaves the publication/bank unchanged,
grants no lease, starts no worker job and returns a retryable admission failure.
An ambiguous result is reconciled by read-back before admission: a matching
origin record permits start, the previously acknowledged repository record
means admission did not commit, and any other record fences admission and
requires recovery/reload. If the process crashes after the origin commit but
before the first worker checkpoint, reload therefore recovers the exact
admitted origin; no uncheckpointed worker computation or debit is inferred and
a later retry receives a new job ID.

Worker computation does not hold the router lane. Each candidate re-enters it
and must match the job ID, immutable origin revision, current acknowledged base
revision, next sequence and writer fence. A successful checkpoint atomically
renews the same job lease onto the newly published base revision. Any foreground
command first enters the lane, revokes the job at its last acknowledged
checkpoint, then applies to that durable publication. Uncommitted worker
computation is discarded and no late message can overwrite the foreground
result.

##### Neutral worker wire format and handshake

The worker wire format is a neutral closed path-typed DTO, not branded
`CanonicalGameStateV2`, not the IDSWEB1/schema-13 save envelope and not a generic
structured clone of runtime objects. Decimal paths carry canonical Decimal
strings, exact-bigint paths carry canonical integer strings and bounded
primitives retain their declared types. The neutral encoder/decoder has
compile-time manifest parity and the schema-13 numeric, depth, entry and byte
budgets, but neither worker nor application code imports the schema-13 codec.

Before `postMessage`, the sender descriptor-captures and validates the entire
closed input, rejecting accessors, unexpected prototypes, symbols, aliases and
cycles. This must happen before structured clone because clone may execute an
enumerable getter and strips the `GameDecimal` symbol brand/frozen state.
Receiving code validates encoded data again, restores every Decimal through the
project adapter and freezes the result. Functions, callbacks, catalog lookup
objects and opaque scheduler continuations are never sent.

The worker is created only with Vite's statically analyzable module pattern:

```ts
new Worker(new URL('./storedTimeWorkerV2.ts', import.meta.url), {
  type: 'module',
})
```

Blob/data workers and SharedArrayBuffer/Atomics are not used. The worker must
load under the existing `worker-src 'self'`/`script-src 'self'` CSP, `/play/`
PWA base and relative native base. During dormant Stage 4D it is built from a
dedicated programmatic Vite harness entry and remains outside the production
main graph. Stage 7 later owns lazy production reachability, PWA precache and
Capacitor integration; importing the worker factory from `main.tsx` merely to
force emission is forbidden.

On creation the worker deep-validates and freezes its worker-local generated
catalog and tuning table, computes/loads their build-time content hashes, then
emits a pre-start `ready` handshake. That message contains only protocol version,
build ID, catalog/tuning identities, supported policy versions, a fresh worker
instance nonce and a closed capability object for module-worker and transferable
buffer support. It contains no job, origin, base, policy selection or checkpoint
sequence. The main pins the nonce to that worker instance and sends `start` only
after every expected identity/capability matches. The worker does not fetch
mutable gameplay inputs. Duplicate asset IDs, unexpected counts/keys or any
catalog/hash disagreement fails before job admission.

The protocol is a closed discriminated union. `ready` is the sole pre-start,
handshake-scoped variant. Only post-`start` job-bound variants repeat
`protocolVersion`, worker instance nonce, `jobId`, `originRevision`,
`acknowledgedBaseRevision`, `policyId`, `policyVersion` and
`checkpointSequence`. Main-to-worker variants are `start`, `cancel`,
`lifecycle-pause`, `authority-revoked`, `checkpoint-committed` and
`authority-granted`. Worker-to-main variants are `ready`, `progress`,
`checkpoint-candidate`, `authority-request`, `completed`, `cancelled`, `paused`
and `failed`. `authority-request`/`authority-granted` form the one-outstanding,
one-use transient Infinity authority handshake. They do not publish a revision,
debit Stored Time or persist a checkpoint; only a later cadence/final candidate
may persist the exact authenticated transient head.

`start` alone adds the admitted bank/request, raw-tick count, maximum
material-event budget 8, catalog/tuning identities and encoded input. The
worker dynamically uses budget 1 while a Fast representative group is in Dream
disaster stages 1 through 3, so an authentic Dream reset boundary cannot be
hidden behind a larger indivisible request; all other eligible work retains the
maximum budget 8. Control messages add a monotonic `controlSequence` and closed
reason. `checkpoint-committed` adds the published revision, final candidate
hash, cumulative authoritative accounting and the final main-authoritative
encoded publication, exact sealed remaining duration and rebased queued inputs.
`authority-granted` echoes the admitted proposal hash and, for PRE, binds the
main-derived expected POST hash; POST grants carry no expected successor hash.

`progress` contains cumulative computed and cumulative durable durations/ticks
as separate fields, representative-group count, elapsed wall time, finite
throughput, nullable finite/non-negative ETA and warming-up state. A candidate
adds exactly one encoded publication, an O(1) summary and canonical proposal
hash. `completed` is a terminal candidate with `exact-small`, `fast` or `exact`;
`cancelled` contains only last-durable counters; `paused` identifies Balanced or
lifecycle pause; `failed` carries a closed diagnostic code and retryability,
never a stack/exception. The implementation owns exact DTO declarations and
compile-time/runtime exact-key tests; this plan fixes their required content
without creating a second save schema.

Unknown/missing/duplicate keys, accessors, unexpected prototypes, symbols,
oversized strings/containers, non-finite or unsafe numbers, non-canonical
numeric strings, stale identities or out-of-order sequences are rejected
without partial publication. Progress is advisory. `computed` may run ahead and
may roll back; only `durable` represents retained progress. ETA may increase as
throughput falls and never affects scheduling.

##### Authoritative accounting and checkpoint commit

At admission, the main captures `admittedBank`, a positive requested duration
no greater than `admittedBank`, and
`unrequestedReserve = admittedBank - requestedDuration`.
For every candidate it requires cumulative processed duration to be finite,
monotonic and no greater than the request, then sets the only authoritative
stored balance to:

```text
admittedBank - cumulativeProcessed
```

This formula preserves both the unrequested reserve and the requested but
unprocessed remainder. It is always evaluated from job origin, never by
subtracting again from an already-debited worker checkpoint.

The main also derives the authoritative cumulative Double Time consumption,
Infinity cycle/boundary accounting and automation phase from the captured
origin timeline plus the candidate's closed cumulative accounting proof using
the canonical time-resource functions. It validates those values against the
worker summary, overwrites the corresponding worker state fields with the
main-derived values exactly once, and then fully validates the resulting
state/runtime. The worker cannot debit Stored Time twice, preserve excess Double
Time, advance Infinity twice or select a different remainder/phase. Main-owned
accounting is deliberately narrow; all economy balances, purchases, production,
goals and Decimal snapshot semantics remain outputs of the trusted worker.

This plan chooses authoritative-ack replacement rather than treating equality
of the worker's replaceable accounting fields as the continuation guarantee.
After a successful checkpoint, `checkpoint-committed` returns the exact final
encoded publication and cumulative accounting that were persisted. The worker
must discard its proposal/working base, decode and validate the acknowledged
publication, and replace its state/runtime/accounting/base revision with that
authoritative version before doing any more work. It cannot continue from the
raw proposal or locally patch the acknowledgement.

Only sealed complete deterministic subrequests can become checkpoint carriers.
The worker stops after the next authentic material-boundary seal,
canonical-encodes one proposal,
computes its deterministic SHA-256 proposal hash and waits. The main recomputes
that hash to prove transport integrity, validates job/sequence/accounting and
overwrites the main-owned fields. It then canonical-encodes the final
authoritative publication and the complete local checkpoint record fields:
record kind, job ID, worker nonce, origin revision, acknowledged and proposed
base revisions, policy/version, sequence, cumulative accounting and publication
hash, exact sealed remaining duration and closed rebased queued inputs. The final
`candidateHash` is SHA-256 over that encoded publication plus those record
fields, excluding only the record's candidate-hash slot to avoid a circular
input. The persisted record stores that candidate hash. At most one
candidate/write is outstanding; the worker applies backpressure and retains no
later candidate graph. A candidate becomes authoritatively admitted only when
the main thread has re-entered the router lane, validated its job/base/sequence
and begun the fenced persistence operation. Merely emitting or receiving a
worker candidate does not admit it.

After persistence reports success, the main reads the final publication and
checkpoint record back, canonical-encodes both again, recomputes the candidate
hash and requires every record identity/accounting field and hash to match.
Only then does it atomically publish state/runtime with one safe-number revision
increment, renew the lease's acknowledged base revision and send the
authoritative replacement acknowledgement to the worker. A definite failure
publishes/debits nothing and retries only the same candidate/sequence from the
last base.

Timeout, abort or process loss can make a commit result ambiguous. Reconciliation
must read back before retry: the final candidate hash plus matching record means
committed and can be published/acknowledged; the prior acknowledged record/hash
means not committed and the same proposal may be retried. Any other record
fences the job as indeterminate, revokes its writer lease, ignores all worker
messages and requires repository recovery/reload. It never compares the raw
worker proposal hash to durable state, guesses, creates a second debit or
publishes over an unknown durable state.

Worker chunks and progress never increment the application revision. Each
read-back-confirmed durable checkpoint is one outer atomic publication and one
revision increment, so a long Exact job may span several revisions under one
immutable origin/job identity. The computation checkpoint cadence is five
seconds of worker wall time, plus completion, Balanced's 60-second pause and
accepted lifecycle pause. There is no
tick-count persistence cadence. If a write is pending, computation waits;
checkpoint candidates never queue. The wall-time cadence only sets
`sealRequested`; the next authentic material-boundary yield determines the
checkpoint's simulation position.

Balanced measures 60 seconds with an injected monotonic clock. At expiry it
requests a seal at the next authentic material-boundary yield, checkpoints and
returns paused without approximating the remainder. Exact continues until
completed or a terminal control is accepted. Backend cancellation is available
immediately; Stage 7 shows UI after approximately five seconds. If user cancel
linearizes in the router before any candidate is authoritatively admitted, it
revokes the lease, discards every computed-but-not-durable carrier/continuation
and returns the last durable counters and bank without sealing or committing a
new prefix. Lifecycle and Balanced pause may still request a terminal seal and
checkpoint.

If a checkpoint candidate was already authoritatively admitted when cancel
linearizes, that single fenced persistence/read-back operation is allowed to
resolve exactly once. On confirmed success its prefix publishes and becomes the
new last durable checkpoint; on failure the prior checkpoint remains. Cancel
then revokes the lease and discards all later computation. It never admits a
second candidate or starts a cancellation checkpoint.

Cancel and lifecycle-pause carry ordered control sequences and linearize in the
authoritative router lane. Cancel before candidate admission wins without a new
checkpoint; lifecycle pause admitted first may finish its one checkpoint before
cancel revokes the job. A later lifecycle signal cannot revive work ended by
cancel. `authority-revoked` always wins for any not-yet-admitted work; an already
admitted fenced write still follows read-back reconciliation before the lease is
closed. A background checkpoint remains best effort: an operating system may
freeze or terminate the process before the message runs, so correctness relies
on the last durable checkpoint and the origin-based bank formula, not on
guaranteed background execution.

If worker/tab/process failure occurs before commit, only computed/uncommitted
work is lost. Reload uses the repository checkpoint as authority and a retry
gets a new job ID from the remaining bank. If persistence completed before
acknowledgement, hash reconciliation recognizes it without reapplying. Duplicate
completion, pause, cancel and checkpoint messages are idempotent under the
job/sequence/hash fence.

##### CPU, memory, bundle and host budgets

Worker computation measures elapsed wall time after each indivisible canonical
material event and yields when either 8 events have completed or measured chunk
time has reached/exceeded 40 ms, whichever occurs first. It cannot preempt an
atomic event. Acceptance separately requires every individual atomic material
event to complete in under 40 ms. CPU throttling changes only delay between
chunks, never tick order, Fast grouping or arithmetic. Progress messages are
capped at four per second. A main-thread checkpoint
validation/persistence/publication slice must stay below 50 ms, and visible
admission/cancel feedback stays below 100 ms. Fast completes in under 3 seconds
on the desktop acceptance profile and under 10 seconds on the throttled mobile
profile.

All job-owned live data across main and worker, including decoded working state,
queued message data and ArrayBuffers, has an absolute 32 MiB cap. Any single
encoded wire buffer is capped at the schema-13 inflated limit of 8 MiB. At most
one input buffer and one candidate buffer may be live across both contexts;
ownership is transferred with transferable `ArrayBuffer`s instead of copied,
and detached buffers are never reused. Summaries, hashes and progress stay O(1).
Budget exhaustion pauses/fails at the last durable checkpoint; it never widens
Fast groups or skips an Exact tick.

The dedicated worker asset is capped at 750 KiB compressed, the total PWA
precache increase at 1 MiB compressed and the lazy launcher/main-graph increase
at 4 KiB compressed. Stage 4D measures these in its isolated Vite build without
changing the production graph. Stage 7 repeats them after real lazy integration
and verifies the hashed worker is precached for `/play/` while native relative
assets resolve from `dist-native`. No Blob fallback or synchronous main-thread
long-job fallback is allowed; worker load failure leaves the bank unchanged and
returns a resumable failure.

Visibility changes may reduce worker duty cycle but cannot change results. On a
browser/mobile lifecycle warning the main requests a best-effort checkpoint and
pause. Return performs bank-only accounting before any explicit stored-time job
is readmitted. PWA and native hosts resume only from the last read-back-confirmed
checkpoint; real WKWebView/Android WebView module-worker support remains a
device gate rather than an assumption.

##### Staged verification gates

Deterministic tests use injected clocks/schedulers, fixed catalogs and fixture
publications. They cover exact-small selection, material-boundary sealing and
rebased remaining queues, the bound Fast partition
formula including initial horizon/final remainder/extra-tick order, hard-event
splits, goal localization, target rotation, recurrence snapshot rollover and
the disclosed split-command difference. Balanced/Exact tests prove equality
with uninterrupted replay across every legal scheduler material-event budget,
worker chunks, checkpoint cadence including none, five-second checkpoint
requests, pause/resume, CPU throttling and values beyond `1e308`.

Protocol tests cover descriptor capture before `postMessage`, canonical wire
restoration, pre-start ready/nonce/hash/catalog closure, durable origin admission
and crash before the first worker checkpoint. They also cover authoritative-ack
base replacement, O(1) summaries, computed-versus-durable progress, increasing
ETA, one-write backpressure, active-command invalidation, cancel/lifecycle
races on both sides of candidate admission, cancel-without-seal, ambiguous
commit read-back and fenced indeterminate state. Hostile DTOs, stale
job/base/origin/sequence values, duplicate messages, getter-backed inputs and
Decimal lookalikes fail without partial publication. Memory, transfer,
per-atomic-event/chunk, checkpoint, Fast-latency and bundle budgets are objective
gates.

The gates remain deliberately split:

1. Stage 4D builds and tests a dedicated dormant Vite worker harness, including
   hashed module-worker emission and `/play/`/relative-base URL rewriting. It
   does not import the worker from a production root.
2. Stages 5 and 6 rerun exact and Fast determinism after each remaining gameplay
   domain/effect is ported; a Dyson-only result cannot certify the full game.
3. Stage 7 implements the closed local preference and accessible selector,
   warning, progress, ETA and cancel UI; integrates lazy worker/PWA caching and
   schema-13 browser/native persistence; and tests real browser/PWA plus the
   defined GitHub Android-emulator and unsigned iOS-simulator matrix.
4. Stage 8 alone activates schema 13, V2 and the worker-backed production path
   in the source release candidate. Activation is not deployment.

Until all four gates pass, Stage 4D is an isolated plan/harness and the current
schema/model/application roots remain unchanged.

### Stage 5: Infinity, Skills, Research and Reality

Depends on Stage 4.

- Port direct Infinity and Influence accounts, break rewards, shop and resets.
- Keep Skill Points/Fragments exact and port all Skill effects without narrowing.
- Port unbounded Research levels/costs/effects and Reality production/upgrades.
- Add exact-to-Decimal boundary tests for every retained bigint.

Gate: resets and purchases are atomic; the exact Skill economy survives every
prestige path; Research and Reality exceed `1e308` without saturation.

### Stage 6: Dream, Quantum and Avocato

Depends on Stage 5.

- Port all Dream resources, panels, Strange Matter, recipes, railgun escrow and
  resets.
- Port available/lifetime Quantum Shards, booster levels, upgrades and
  Entanglement.
- Port Avocato accumulators and feed-all.
- Move Space-Age Buy Max into the transaction engine.
- Correct Developer Options to debit available currencies without changing
  lifetime-earned Shards.

Gate: every prestige layer consumes and produces above `1e308`; all transfers,
feeds and resets satisfy conservation/atomicity tests.

### Stage 7: presentation and platform integration

Depends on Stage 6.

- Port frontend snapshots, formatters, accessibility labels, diagnostics and
  every gameplay surface.
- Port browser database, save transfer, PWA update/reload and Capacitor storage
  to the dormant schema-13 path.
- Exercise dormant schema-13 save, reload, transfer, background/return and long
  offline paths using local Chrome/PWA tests, GitHub Android emulators and an
  unsigned GitHub iOS simulator build without changing the production
  current-schema constant.
- Run normal and performance builds without shipping the codec as current.
- Keep the Stage 7 certification workflow read-only with respect to release
  systems: `permissions: contents: read`, unsigned Android debug/emulator
  outputs, iOS `CODE_SIGNING_ALLOWED=NO`, no protected signing or store
  environments, and no deployment or store-upload tooling.
- Add a static workflow guard that fails if migration certification gains
  signing, notarization, deployment or store-upload commands. Migration work
  must not invoke `.github/workflows/prepare-native-release-candidate.yml`,
  `.github/workflows/promote-web-pwa.yml`, `wrangler`, Play Console tooling,
  `iTMSTransporter`, Fastlane store actions, TestFlight or App Store Connect
  APIs.

Gate: no UI performs affordability or wholesale Decimal-to-number conversion;
local Web/PWA tests, GitHub Android API 26/36 emulator gates and the unsigned
GitHub iOS simulator build gates pass. Physical-device behaviours remain
documented residual risks and are not represented as certified.

### Stage 8: source activation in the release candidate

Depends on every prior gate.

Before the coordinated production switch, expose a local-only inspection entry
that uses an isolated schema-13 namespace. It must exercise real V2 arithmetic,
an authoritative transaction, active simulation, checkpoint readback and reload
without reading or overwriting the normal schema-12 slot. Pause here for the
owner's hands-on review; this inspection checkpoint is not production
activation and is not included in a release bundle.

Activation in this stage means switching the checked-in application code to
V2/schema 13 and validating the resulting candidate locally and in GitHub
Actions. It does not mean deploying that candidate to a website, Google Play,
App Store Connect, TestFlight or any end user.

- Capture a separate recovery artifact before first migration.
- Switch the production application to `CanonicalGameStateV2`.
- Set `CURRENT_SAVE_SCHEMA` to 13 and enable schema-13 writes in the same
  coordinated change.
- Migrate schema-12 Web saves and supported IDB1 imports on first load.
- Run full browser/PWA save, reload, import and offline gates plus the amended
  GitHub Android-emulator and unsigned iOS-simulator matrix.

Gate: there is no production path that writes V2 into schema 12, writes V1 into
schema 13 or publishes a mixed V1/V2 runtime.

### Stage 9: cleanup and enforcement

Depends on successful activation validation.

- Remove Unity-write mapping and obsolete V1 runtime compatibility used only by
  Web production.
- Retain the one-way legacy import decoder, public fixtures and recovery reader.
- Remove obsolete numeric saturation helpers and presentation calculations.
- Enable permanent static checks and update architecture/state/save docs.

Gate: repository searches find no unchecked economy `number`, direct dependency
import, supported Unity write path or unclassified numeric canonical leaf.

## Verification matrix

### Adapter and classification

- normalization, zero, signs, integer predicate and canonical strings;
- arithmetic and comparisons around ordinary values, `Number.MAX_VALUE`,
  `1e308` and near the supported exponent boundary;
- strict malformed/locale/NaN/Infinity/negative parser rejection;
- integer floor, cost ceiling and checked bigint/number conversions;
- clone, freeze, branding and hostile structural lookalikes; and
- manifest coverage for canonical state, DTO and frontend resource projections.

### Transactions

- insufficient funds and exact affordability with no epsilon;
- buy 1, fixed bulk, rounded bulk, geometric Buy Max and 1,000-batch fixed Buy
  Max;
- Hunter/Gatherer batches after units-per-purchase upgrades;
- negligible free debit with changed and unchanged represented output;
- immutable quote/commit equality and stale-revision rejection;
- bounded correction failure without state change;
- Developer Options dual-currency atomicity; and
- Space-Age Buy Max owned by the backend.

### Transfers, resets and simulation

- Entanglement quotient/remainder and destination-saturation rejection;
- Avocato feed-all success and no-op when the destination cannot increase;
- Housing/Village and Rocket/Factory recipes conserve every source;
- energy, railgun charge and panel escrow cannot mint value;
- Dream, Infinity and Quantum reset atomicity;
- active and exact-policy stored-time/accelerated normalized outputs, Balanced
  exact-prefix/resume equality, and deterministic disclosed Fast outputs;
- huge and tiny positive scheduler horizons, upward conversion and beyond-slice
  handling; and
- no O(quantity), O(production cycles) or unbounded retry loops; deliberate
  Balanced/Exact raw automation-tick replay stays worker-bound and checkpointed.

### Persistence and imports

- every retained authentic public schema-11 Unity fixture;
- development-characterized schema-12 IDB1 fixture without calling it public;
- explicit IDB1 schema-13 rejection;
- schema-12 Web to schema-13 migration;
- deterministic schema-13 encode/decode/encode bytes;
- canonical Decimal and bigint string grammar at every declared path;
- unknown, duplicate, missing, oversized and wrong-type field rejection;
- depth/container/entry, gzip and numeric-string budgets;
- forward-schema rejection without changing the current save;
- provenance/recovery artifact separation; and
- interrupted-commit recovery.

### Presentation, product and devices

- zero, sub-unit values, suffix boundaries, `1e308` and values beyond the suffix
  table;
- no Infinity, NaN or locale-dependent persistence text;
- accessibility labels and transaction previews use the same quoted values;
- browser, PWA, IndexedDB transfer and update/reload;
- Android API 26/36 emulator save/reload, background/return and long-offline
  scenarios supported by the GitHub harness;
- an unsigned iOS simulator build plus the simulator tests supported by the
  checked-in harness; and
- a schema-13 candidate save advanced beyond `1e308`, checkpointed,
  interrupted and reloaded in real Chrome/PWA and the available GitHub emulator
  harnesses.

Physical Android/iOS execution, operating-system process death and signed
update-in-place observations are residual risks, not completion gates. They
must remain labelled unverified unless future explicit authorization supplies
a physical-device operator. Store upload is not an alternative certification
path and remains prohibited by this plan.

Unity tests remain untouched and are not a release gate for the Web-only
runtime. Legacy import fixtures and Web tests that characterize Unity output
remain required.

## Performance budgets

The migration must pass the existing acceptance profiles and budgets in
`scripts/performance/performanceReport.ts`:

- maximum presentation long task: 50 ms;
- P95 visible command feedback: 100 ms;
- P95 snapshot selection through React commit: 8 ms desktop, 16 ms mobile;
- synthetic INP P75: 200 ms;
- synthetic CLS P75: 0.1;
- synthetic LCP P75: 2,500 ms; and
- retained-heap allowance: 10 MiB minimum or 20% of baseline, as currently
  defined.

Additionally:

- fixed-price commands process at most 1,000 batches;
- Buy Max performs at most 16 correction steps;
- the event scheduler retains its bounded zero-time pass limit;
- no simulation work scales linearly with represented quantity or completed
  production cycles; worker-owned Balanced/Exact automation replay may scale
  with raw decision ticks only under the Stage 4D CPU, checkpoint and cancel
  budgets; and
- schema-13 decoding stays within the existing save byte and structure budgets.

Performance reports must cover ordinary saves and extreme Decimal saves on the
existing desktop and mobile profiles. A smoke report is diagnostic only; the
acceptance report is the completion gate.

## Rollback and recovery

Before first schema-13 activation, preserve the exact pre-migration schema-12
Web save or imported IDB1 text as a separate immutable recovery artifact. The
schema-13 commit remains atomic under the existing repository/checkpoint model.
Do not dual-write a lossy Unity/schema-12 projection from V2.

Before activation, rollback is simply removal of dormant V2 code because
production continues to write schema 12. After activation:

- forward-schema or corrupt schema-13 input must leave the current checkpoint
  and recovery artifact untouched;
- the current release can restore the pre-migration artifact through an
  explicit recovery path, with the documented loss of post-migration progress;
- an older application build is not expected to read schema 13; and
- the original legacy import artifact is never overwritten by later saves.

Keep recovery artifacts until at least two successful schema-13 checkpoints
have been verified on the installation. User export remains available as an
additional recovery path.

## Completion gates

The migration is implementation-complete only when all of the following are
true:

- `CanonicalGameStateV2` is the sole production gameplay model;
- every canonical numeric leaf and DTO numeric field is classified;
- every unbounded economy operation uses `GameDecimal` end to end;
- Skill Points and all retained exact counters never narrow through `number`;
- direct IP, Shard, Influence and Strange Matter balances own affordability;
- schema 13 is closed, deterministic, path-typed and Web-native;
- schema-12 Web and supported IDB1 imports migrate safely, while IDB1 13+
  rejects safely;
- every transfer, recipe, feed, conversion and reset is atomic;
- active and exact-policy stored-time/accelerated simulation satisfy the exact
  equality contract, while Fast satisfies its deterministic normalized and
  disclosure contract;
- all presentation paths format huge values without wholesale conversion;
- no economy value saturates at `Number.MAX_VALUE`;
- the full automated Web suite, data checks, lint and builds pass;
- performance acceptance budgets pass; and
- browser/PWA local gates, GitHub Android API 26/36 emulator gates and unsigned
  GitHub iOS simulator build gates pass.

Only after all gates pass may obsolete V1 runtime and Unity-write compatibility
be removed. The one-way legacy importer, public fixtures and recovery path stay.

## Chosen implementation defaults and assumptions

The stored-time policy choice and the other product defaults below are resolved
and binding. Stage 4D remains planning-only until its engineering gates are
implemented and verified; that implementation status is not an unresolved
product decision.

- schema 13 activates only with the full V2 runtime;
- Quantum Shards migrate to integer-valued `GameDecimal` with Infinity Points;
- direct available balances replace close earned/spent subtraction;
- negligible purchase debit may be free, including fixed Influence purchases;
- fixed-price Buy Max is 1,000 purchase batches per command;
- no residual debt/output ledger is introduced;
- transfers and conversions never use the negligible-purchase exception;
- exact production equality means normalized Decimal equality for active,
  automatic-small, Balanced-prefix and Exact paths; approximation is test-only;
- Fast is the default stored-time policy, is deterministically limited to 4,096
  representative groups and carries the mandatory result/split-command
  disclosure;
- generated Unity data is lifted at runtime boundaries, not rewritten solely
  for numeric types; and
- existing performance and import budgets remain hard release gates.

The plan assumes authored bounded caps currently characterized by tests remain
game-design caps. If implementation discovers a field whose actual authored
behaviour contradicts the manifest classification, work stops at that stage's
gate and the manifest and this plan are corrected before proceeding; code does
not guess a new product rule.
