# DRY review — 2026-09-12

## Scope and method

Reviewed source duplication across `src` with exact and identifier-normalized
sliding-block searches (excluding generated catalogs and tests), then inspected
candidate call sites and their current contracts. Detailed inspection covered
legacy migration/repair defaults, Dyson/Research controls, local preference
services, progress/numeric helpers, browser storage/identity helpers, and the
Dyson derivation entry points. This is a broad candidate review, not a claim
that every line or possible abstraction was evaluated.

Protected boundaries are the current simulation and state/persistence
contracts: canonical state owns gameplay, decoded save DTOs remain compatibility
input, and UI controls must retain command order, pending/error feedback,
optimistic intent and canonical snapshot fallback. Gameplay balances, save
schemas, message IDs, storage keys, DOM markup and CSS are unchanged.

## Implemented

### One legacy Infinity default table

`src/save/legacyStructuralDefaults.ts` owns the 22 identical numeric defaults
previously repeated in `migrate.ts` and `numericRepair.ts`. Migration still
fills only `undefined` fields on the Infinity compatibility record. Repair
still uses its existing field-name lookup while walking numeric values, with
its four additional root/timer defaults intact. The extraction does not move
validation, widen migration scope, or make legacy fields gameplay authority.
A comparison against HEAD confirmed all 22 field/value pairs are identical.

### One optimistic automation state machine

`src/ui/gameplay/useAutomationToggle.ts` replaces the repeated asynchronous
controller in Dyson and Research. Each ID retains its own increasing version;
only the newest intent can clear its override or publish a failure. Success and
failure share the same settlement operation. A new intent clears the previous
failure, while canonical-value fallback stays in each surface (including
Research's explicit `false` default).

Callbacks remain per-render and dispatch the same domain-specific commands.
Unmount behavior is unchanged: old completions only reference the old hook
instance. There is no new cancellation or command scheduling policy.

### One settings feedback controller

`src/ui/gameplay/usePlayerSettingsCommands.ts` replaces identical pending,
rejection and thrown-promise handling in both surfaces. It retains the existing
batch completion and render-state pending guard internally; the public API
exposes only the single-command action used by the surfaces. It does not add a
synchronous lock or alter same-render submission behavior.

These changes reduce duplicated maintenance points. They are not claimed as
measured runtime speedups.

## Deliberately retained

- **Preference services:** number notation, Research visibility and bottom-nav
  text share storage/listener structure, but adoption policy differs. In
  particular, explicit unchanged Research selections establish intent while
  number notation's unchanged selection exits immediately. Bottom-nav text has
  a different old-key migration. A generic preference framework would hide
  these behaviors; keep explicit services until a concrete change needs a
  narrower shared helper.
- **Numeric clamps:** raw unit clamps preserve `NaN`; visual progress clamps
  reject non-finite input. Similar arithmetic is not interchangeable policy.
  Avoid global search-and-replace consolidation.
- **Browser storage:** departure markers, owner tokens and save persistence
  have distinct durability, fallback and error-handling rules. Superficially
  similar try/catch blocks do not justify one storage abstraction.
- **Generated/localized catalogs:** repeated structural mappings are authored
  IDs and message descriptors. Generating generic lookups could obscure
  localization extraction and exhaustiveness for little benefit.
- **Simulation derivation:** repeated per-facility mappings encode distinct
  contributions and numerical order. Runtime changes require profiling and
  parity evidence; this review leaves that work to the performance lane.

## Validation

- Focused migration/preparation/overflow and Dyson controller checks: 5 files,
  30 tests passed.
- Focused import/serialization/Research preference and shared hook checks:
  5 files, 47 tests passed (three automation cases overlap the first run).
- Four new regression cases specifically protect shared asynchronous behavior:
  stale completion and independent IDs; failed-intent retry and canonical
  snapshot fallback; completion after unmount; settings pending/rejection/error
  recovery. They do not assert hook implementation details or markup strings.
- TypeScript project compilation and targeted Oxlint passed.
- `git diff --check` passed.

Full integrated gates and any actual browser/native acceptance are recorded by
the parent review. The checks above are automated evidence, not a claim of
visual or native-device acceptance.

## Follow-up: measured allocation improvements

A second pass inspected `gameStep`, canonical event contexts, frontend
projection, formatter caches, numeric settlement and save encoding. Existing
context/definition caches and owned-state transfers already avoid obvious
repeat work; no changes were made to those mechanisms. Repeated full Dyson
derivations occur across state and evaluation-snapshot recurrence boundaries,
so speculative caching there was rejected without a validity proof.

Two allocation-only optimizations were measured and implemented:

1. `numeric.ts` reuses one 8-byte DataView for synchronous float-neighbor
   operations. The exact bit operations, edge checks and results are unchanged.
   Numeric inputs invoke no callbacks, and each JS realm has its own module
   instance. Conservative settlement and purchase-debit policies are intact.
2. `serialization.ts` sorts the already encoded key/value pairs before creating
   the result object. This removes an intermediate `Object.fromEntries` and
   `Object.entries` at every object node. Source getters are still read in the
   original `Object.entries` order; recursive value encoding still precedes
   sorting. Integer-key enumeration, reserved codec validation, compression
   level, timestamps and resulting compressed bytes remain unchanged.

Reproduce with:

```sh
npx tsx scripts/performance/runAllocationOptimizationReport.ts
```

The report alternates reference/optimized order across five warmed rounds and
uses frozen pre-change algorithms under `scripts/support`. It asserts result
parity but imposes no timing threshold. On Node v22.20.0, the captured medians
were:

| Operation | Reference | Optimized | Reduction |
| --- | ---: | ---: | ---: |
| Float increment/decrement pair | 0.319 microseconds | 0.047 microseconds | 85.1% |
| Fresh save, including gzip/base64 | 1.268 ms | 1.074 ms | 15.3% |
| Maximum-skills save | 1.320 ms | 1.091 ms | 17.3% |
| Late-quantum save | 1.226 ms | 0.993 ms | 19.0% |

Raw samples are in
[`allocation-optimization-2026-09-12.json`](allocation-optimization-2026-09-12.json).
These are operation timings, not a claim about frame rate, total game speed or
native-device performance.

Focused validation: 142 tests across 7 files passed, including numeric bounds,
conservative settlements, transactions, serialization and repository behavior.
Three new differential cases cover 1,015 edge/pseudorandom floats with
interleaved calls; exact compressed bytes for every progression fixture; and
integer/special keys, getter order, aliases and nested byte/bigint values.
TypeScript, targeted Oxlint and `git diff --check` passed after these changes.

## Follow-up: boot bundle composition

Used a fresh production Vite build with `write: false` to inspect rendered
modules without overwriting the browser acceptance build. The old checked-out
`reports/bundle-composition` artifact was stale: its mapping coverage modules
are already absent from the current production graph. Current large modules
are React DOM, runtime/application orchestration, gameplay simulation, and
supported save migration/recovery paths, rather than an obvious accidentally
imported test or audit subsystem.

Implemented one additional low-risk correction in the existing metadata-strip
build plugin: explicitly include `src/pwa/messages.ts` and
`src/ui/gameplay/infinity/challengeMessages.ts`. Their compiled catalog IDs
already load during startup in all ten supported catalogs. The plugin now
recognizes only descriptor objects with a literal string `id`; it cannot
remove an outer message named `description` or `defaultMessage`. This matters
for `challengeMessages.description`. An AST scan found no such outer object
keys in previously matched `messages.ts` files. Dynamic IDs and unrelated
objects retain their fallback data. No `.tsx` transform expansion was made.

Measured boot graph, including awaited English catalog:

- Before this metadata correction: 409,951 bytes gzip (400.34 KiB).
- After: 409,232 bytes gzip (399.64 KiB), a 719-byte reduction.
- English remains 74,702 bytes gzip (72.95 KiB).

This small reduction does not bring boot beneath the pre-existing 301 KiB
ceiling. No budget was raised or disabled. Nine focused tests passed, including
new descriptor-shape and all-locale catalog coverage tests; TypeScript,
targeted Oxlint, `git diff --check` and the in-memory production build passed.

Larger opportunities remain deferred because they would change loading or
compatibility architecture:

- **Destination catalogs:** English includes 249 Wiki entries (roughly 38 KiB
  gzip when measured independently) and 467 Skill entries (roughly 14 KiB).
  Startup currently loads one complete catalog, with no destination loader
  consumers. Splitting those messages requires defined route loading, fallback,
  locale-switch and offline behavior. Independent compression estimates do not
  add exactly to the complete catalog size.
- **ICU parser:** React Intl's parser and skeleton modules are still included
  despite compiled catalog ASTs. Dynamic `defaultMessage` paths remain in
  skill-presentation and Wiki content code, so substituting a parser-free
  runtime needs explicit fallback certification; it is not a safe blind alias.
- **Native adapters:** Capacitor code remains reachable because the shared
  production host graph detects its host at runtime. Removing it from browser
  output requires separate build-time host composition, beyond this review's
  no-new-loading-policy constraint.
- **Development command handlers:** these are also the purchased developer
  controls, enabled by production entitlement checks. They are not dead code
  merely because their names contain “development.”
- **Save recovery:** V2 checkpoint/sidecar/schema adapters are required startup
  compatibility paths. Removing or asynchronously loading them changes save
  recovery behavior and is not justified solely by their rendered size.

## Follow-up: UI formatting and observer churn

### Fixed-fraction number formatting

Live number/energy display repeatedly built identical Intl option objects,
then sorted their entries and serialized their cache keys even though the
Intl formatter itself was cached. A private locale/fraction-digit cache now
serves those five fixed-format paths. Public arbitrary-option formatting keeps
its original value-based keying, including mutable caller option objects.
Rounding, bigint significant digits, notation thresholds, localization and
non-finite labels are unchanged. The new cache is cleared alongside the other
formatter caches by the existing test reset function.

Reproduce with:

```sh
npx tsx scripts/performance/runNumberFormattingReport.ts
```

The script loads the pre-cache formatter from a pinned Git commit into a
temporary module, verifies 3,520 exact-output cases across all ten locales,
four notations, number/bigint boundaries, whole-number display and both energy
units, then measures five alternating warmed rounds. This avoids maintaining a
second copied formatting implementation. It requires the recorded commit to
remain available in the repository. No timing threshold gates the build.

The captured median for 50,000 full `formatGameNumber` calls fell from 48.63 ms
to 21.45 ms (55.9% reduction). See
[`number-formatting-2026-09-12.json`](number-formatting-2026-09-12.json).
This is an operation benchmark, not a claimed equivalent frame-rate gain.
Thirty-six focused currency, notation and formatting tests passed, including
two new cases protecting localized precision and arbitrary-option semantics.

### Facility text resizing

`FittedProductionLine` previously constructed/disconnected a ResizeObserver on
every `display.text` change. Its measurement uses only current DOM refs and
stable setters, so a stable callback now allows one observer per mounted line.
A separate layout effect still measures every text change; container resize
still permits growth, while same-width text changes only shrink, with the same
0.62 minimum. No render cadence, text, DOM markup or visual policy changed.

A lifecycle test drives 49 consecutive live text updates and proves a single
observer registration, responsive resizing, retained shrink behavior and one
unmount disconnect. A second covers environments without ResizeObserver.
Nineteen focused facility tests passed. TypeScript, targeted Oxlint and
`git diff --check` passed after both UI batches.

Further source inspection found stable memoized runtime subscriptions, stable
preference provider values, correctly disconnected media-query listeners and
cancelled skill drag animation frames. Reduced-motion listeners are shared at
surface level rather than per individual bar. No leak is inferred merely from
browser DOM-listener totals before garbage collection. Mutation-observer and
other live-render work remain profiling candidates; no speculative cadence or
subscription-policy change was introduced.

## Follow-up: remove unused localization scaffolding

A whole-repository reference search, including namespace imports and native
hosts, confirmed no callers of the destination-catalog loader, its three
associated types or its ten empty registry maps. Removed those extension
points. The sole current catalog loader, locale fallback and all route messages
are unchanged. Corrected the localization architecture document, which had
presented future destination splitting as implemented behavior; the measured
route-splitting opportunity remains explicitly future work with required
loading/fallback/offline design.

Likewise removed six unused date/relative-time/plural formatter exports and
their three private caches. They only called each other; no application, host,
test or script consumed them. The one namespace import of the formatting module
is the performance report, which explicitly calls only number/energy methods.
These were speculative helpers, not an external package API or native bridge.
The `i18n` barrel automatically stops re-exporting the removed declarations.

The number-input culture builder now reuses one digit formatter for digits
0–9 instead of constructing ten identical Intl instances. Together with its
separate grouping formatter, each new locale initializes two instances rather
than eleven. The existing per-locale cache and parsing results remain the same;
this is cold-input setup efficiency rather than a per-tick speed claim.

Validation: 84 i18n/currency tests passed, the 3,520-case formatter differential
report still passed, and TypeScript, targeted lint and whitespace checks passed.
No new tests were necessary for removing uncalled code or reusing an identical
formatter inside an already tested parser.

## Follow-up: reuse derivation ownership lookup and fixed tables

`deriveBasicDysonState` now constructs its owned-skill Set once and passes that
same read-only lookup to materialization and Stellar Sacrifice calculations.
The ordered owned-skill array remains available to the existing model output.
Hoisted three fixed authored lookup tables out of repeated calls: Infinity
facility thresholds, Terra-to-facility skill IDs and legacy manual-69 condition
IDs. State-dependent secret multipliers remain local. All threshold values,
lookup behavior, effect ordering and formulas are unchanged; the ID-only
catalog index introduced by the main performance lane is preserved.

Reproduce the differential check and advisory full-derivation timing with:

```sh
npx tsx scripts/performance/runDysonDerivationAllocationReport.ts
```

The pre-change canonical derivation is loaded from a pinned Git commit while
using current dependencies. All nine checked-in progression fixtures produce
exactly equal complete outputs under both entitlement values (18 cases). Seven
alternating warmed rounds exercise 500 derivations per fixture. Small timing
differences fluctuate near measurement noise; **no material full-derivation
speedup is claimed for this batch**. The retained value is reduced redundant
allocation and one obvious authority for each fixed lookup table.

Raw timings:
[`dyson-derivation-allocation-2026-09-12.json`](dyson-derivation-allocation-2026-09-12.json).
The first exploratory run put maximum-skills derivation at approximately
0.1784 versus 0.1769 ms; reruns are expected to vary at this scale. The raw report
records the final rerun rather than selecting the most favorable sample.

Focused Terra, unified-facility, Galvanization and skill-effect certification
coverage passed: 174 tests in four files. TypeScript, targeted lint and
whitespace checks passed. No new implementation-mirroring tests were added.

## Basic model immutable effect ownership

`dysonModel.ts` now retains maps already detached and deeply frozen by its own
clone helper, identified by a private WeakSet. External maps are always copied,
including maps whose outer object is frozen. All mutable state, facility pairs,
modifiers, owned skills, rates, automation arrays and infinity state remain
independently cloned. New mutation-isolation tests cover caller edits, shallow
freezing and map replacement on an existing model.

`runDysonCloneReport.ts` compares the historical model implementation with current
dependencies, using the checked-in basic Dyson fixture plus 0, 10 and 100
synthetic unused effect targets to isolate map clone cost. All three complete
one-second event results match exactly after excluding wall-clock measurement.
Seven alternating warmed batches record raw measurements in
[`dyson-clone-2026-09-12.json`](dyson-clone-2026-09-12.json).
The 10/100-effect cases reduced full model clone time by 87.7%/99.0% and full
basic-adapter event time by 8.6%/15.6% in this run. These are synthetic adapter
measurements: canonical derivation constructs this state once, so this report
**does not establish a canonical gameplay speedup**. No timing gate was added.
TypeScript, targeted lint, whitespace and focused mutation/bot-cap/conservation
checks passed.
