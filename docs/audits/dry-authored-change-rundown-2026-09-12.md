# Authored DRY and allocation changes — final handoff

This records the changes authored by the DRY lane. Checkpoints also contain
reviewed work from other lanes; the path lists below identify this lane's scope.
All measurements are operation or full-derivation measurements, not equivalent
browser frame-rate or native-device improvements. See `dry-review-2026-09-12.md`
for the detailed experiment record and the parent performance audit for final
integrated and browser acceptance evidence.

## Adopted changes

### 1. Numeric neighbors and save serialization — `bd42ea45`

**Problem:** every float-neighbor calculation allocated an eight-byte buffer and
DataView. Save encoding created an intermediate object and immediately turned
it back into entries to sort its keys.

**Change:** `src/simulation/numeric.ts` reuses a private DataView;
`src/save/serialization.ts` sorts encoded tuples before creating the object.
The JS-realm-local numeric operations take numbers and invoke no callbacks.
Serialization retains getter evaluation order, recursive encoding order,
integer-key behavior, compression and exact resulting bytes.

**Evidence:** 1,015 edge/pseudorandom floats, all nine progression saves' exact
compressed bytes, and special-key/getter/alias cases; 142 focused tests.
Numeric helper median: 85.1% reduction. Full serialization: 15.3%, 17.3% and
19.0% reductions for fresh, maximum-skills and late-quantum saves. Evidence:
`src/simulation/numericNeighbors.test.ts`, `src/save/serializationOrdering.test.ts`,
`scripts/performance/runAllocationOptimizationReport.ts`,
`scripts/support/allocationOptimizationReference.ts`, and
`docs/audits/allocation-optimization-2026-09-12.json`.

### 2. Shared legacy defaults — `f9138eb6`

**Problem:** migration and numeric repair repeated the same 22 Infinity defaults.
**Change:** `src/save/legacyStructuralDefaults.ts` is their shared definition;
`src/save/migrate.ts` and `src/save/numericRepair.ts` keep their existing policies.
Migration still fills only undefined Infinity fields; repair still uses its
field-name lookup and separate root/timer defaults. Values and schema authority
are unchanged. Existing migration/preparation/overflow tests protect behavior.
This is maintenance simplification, with no runtime speed claim.

### 3. Ownership lookup and static derivation tables — `4f91a01e`

**Problem:** one derivation repeatedly constructed the same owned-skill lookup;
fixed Infinity, Terra and legacy-69 mappings were allocated inside calls.
**Change:** reuse one local owned-skill Set in
`src/simulation/canonicalDysonDerivation.ts`; hoist fixed mappings there and in
`effectivePurchaseCounts.ts` and `skillEffectConditions.ts`. Preserve authored
order, all thresholds, and parent-authored catalog indexes.

**Evidence:** 18 exact complete progression/entitlement outputs, 174 focused
Terra/facility/Galvanization/materialization tests. Full-derivation timing was
near noise, so no material speed claim. Reproduction/evidence:
`scripts/performance/runDysonDerivationAllocationReport.ts` and
`docs/audits/dyson-derivation-allocation-2026-09-12.json`.

### 4. Detached immutable effect maps in basic model clones — `4500cddc`

**Problem:** model cloning recopied the same deeply frozen skill-effect graph.
**Change:** `src/simulation/dysonModel.ts` uses a private WeakSet identifying only
graphs detached and frozen by its own helper. External maps—including shallowly
frozen maps—remain copied. Facilities, modifiers, owned skills, rates,
automation and Infinity state retain independent mutable copies.

**Evidence:** `src/simulation/dysonModelClone.test.ts` covers external mutation,
shallow freezing, replacement maps and mutable-state isolation; 39 focused
tests. Historical full event outputs match. Synthetic 10/100-effect maps reduced
clone time 87.7%/99.0% and complete basic-adapter events 8.6%/15.6%. This does not
establish a canonical gameplay gain. See `runDysonCloneReport.ts` and
`docs/audits/dyson-clone-2026-09-12.json`.

### 5. Shared asynchronous UI controllers — `e0ec1cee`

**Problem:** Dyson and Research duplicated automation intent handling and
settings pending/error handling.
**Change:** `src/ui/gameplay/useAutomationToggle.ts` and
`usePlayerSettingsCommands.ts` are used by `DysonControls.tsx` and
`ResearchSurface.tsx`. Per-ID versions still suppress stale completion; new
intent clears failure; canonical fallback stays in each surface. Settings
retain render-state pending behavior, without adding a synchronous lock or
changing same-render submissions. Commands, ordering and unmount semantics
remain unchanged.

**Evidence:** four new hook regression cases cover stale/independent intent,
retry/fallback, unmount completion and settings recovery. Focused runs passed
30 and 47 tests with overlapping cases. This is maintenance simplification,
not a claimed runtime speedup.

### 6. Fixed formatting cache and removed unused scaffolding — `7567fa85`

**Problem:** live number formatting rebuilt/sorted/stringified identical options
while Intl instances were already cached. Locale registry also exposed unused
destination loaders/maps/types and six unused date/relative/plural helpers.
**Change:** private fixed-fraction cache in `src/ui/i18n/formatters.ts`, keeping
public arbitrary options semantics; remove uncalled locale scaffolding in
`localeRegistry.ts` and `catalogs/types.ts`; clarify the future loading design in
`docs/contracts/product-ui-foundation.md`. `gameNumberInput.ts` shares one digit
formatter for 0–9, reducing cold locale setup from eleven Intl instances to two.

**Evidence:** 3,520 exact outputs across ten locales, four notations,
number/bigint boundaries and energy units; 84 focused i18n/currency tests.
50,000 complete format calls fell from 48.63 ms to 21.45 ms (55.9%). Public
mutable option objects still receive value-based lookup. Evidence:
`fixedFractionFormatting.test.ts`, `runNumberFormattingReport.ts`,
`docs/audits/number-formatting-2026-09-12.json`.

### 7. Retained facility ResizeObserver — `50b6c6b8`

**Problem:** every displayed production-text change disconnected/recreated the
observer.
**Change:** `FittedProductionLine.tsx` keeps a stable measurement callback and
observer, with a separate layout effect still measuring each text change.
Same-width shrink, resize growth, minimum scale, markup and display cadence are
unchanged.

**Evidence:** `FittedProductionLine.test.tsx` drives 49 text updates with one
observer, checks resize/shrink/unmount, and covers absence of ResizeObserver.
19 focused facility tests passed. This directly proves lifecycle reduction;
actual visual equivalence belongs to the final browser comparison.

### 8. Message descriptor metadata stripping — `b925bfbb`

**Problem:** startup PWA/challenge descriptors retained authoring metadata that
was already present in all compiled locale catalogs; an outer message could
itself be named `description`.
**Change:** `scripts/stripMessageAuthoringMetadata.ts` includes
`src/pwa/messages.ts` and `src/ui/gameplay/infinity/challengeMessages.ts`, stripping
only literal-ID descriptor objects. It preserves outer message keys, dynamic
IDs and unrelated fallback objects. No broad TSX stripping.

**Evidence:** descriptor-shape checks and all 24 IDs across ten catalogs; nine
focused tests. Intermediate boot graph saved 719 gzip bytes (400.34→399.64 KiB).
Those are intermediate figures, superseded by final parent bundle measurements;
they did not meet or change the existing 301 KiB ceiling. Icon externalization
in this checkpoint was parent-authored, not this lane's change.

### 9. Reuse manual purchase layers within derivation — `656457c8`

**Problem:** five frozen manual-purchase layer objects were computed twice in
the same derivation.
**Change:** `canonicalDysonDerivation.ts` retains them from the original effect
assembly loop and supplies them to facility facts. Creation phase/order stays
unchanged; no cache survives the call.

**Evidence:** 18 full progression/entitlement plus 288 boundary outputs match
checkpoint `5050e544`; 144 focused tests. Boundaries include 49/50, 68/69, 89/90,
99/100/101, scaling, Terra, Supernova/Galvanization, and mutating the same state
between calls. Full-derivation medians improved 3.2–13.4% in the recorded run.
See `runManualPurchaseLayerReuseReport.ts` and
`docs/audits/manual-purchase-layer-reuse-2026-09-12.json`.

### 10. Reuse facility calculations within derivation — `b9b47d65`

**Problem:** five initial calculations were repeated five times for facts and
twice for direct-generation rows.
**Change:** an opt-in constructor in `dysonModel.ts` captures the five results at
their original evaluation sites. `canonicalDysonDerivation.ts` uses that private
per-call table. Existing public signatures and state/save shape remain intact.
Contribution rows still use the original construction code. Stable sorting,
legacy float conversion, arithmetic/clamps and modifier cutoff are unchanged.

**Evidence:** 306 full outputs match both historical production modules from
`e7157119`. Independent review corrected the oracle to load both changed files;
its earlier single-module run is superseded. 71 focused tests include seven
new independently authored cutoff, equal-order overflow and live-recalculation
checks. Final full-derivation medians improved 2.9–7.9%. See
`facilityCalculationConstruction.test.ts`, `runFacilityCalculationReuseReport.ts`
and `docs/audits/facility-calculation-reuse-2026-09-12.json`.

## Review-driven tooling corrections

Historical module imports in derivation/allocation/clone reports now use quoted
file URLs, preserving platform separators and apostrophes. Report comparisons
use complete outputs and raw samples, avoid timing gates, and explicitly limit
claims. Independent review also replaced a mirrored modifier-threshold predicate
in a test with an explicit expected-value table.

## Residual decisions and stopping point

- Copy-on-change Avocados filtering: safe private sharing, but measured mixed
  changes from 2.9% slower to 2.3% faster. Not adopted.
- Finite-order shortcut: exact old fallback retained for NaN/infinite orders;
  20 rotated ordering cases pass. Mixed 2.8% slower to 2.5% faster. Not adopted.
- Lazy contribution rows: preserves first evaluation, and clones filtered
  direct rows/source metadata to avoid new aliasing. 306 standard outputs,
  two active direct-generation cases and four detachment checks pass. Two runs
  show small gains of 0.4–3.5% and 0.2–5.3%. Not adopted after the user closed
  optimization: the lazy map/closure/detachment complexity is marginal.
- Preference services, storage wrappers and numeric clamps encode different
  policies; merging them would hide behavior rather than remove identical work.
- Destination locale loading, parser-free fallback, host composition and
  splitting presentation derivation from simulation require explicit new
  architecture contracts. Cross-tick memoization lacks a validity boundary.

Residual raw samples are in `residual-dry-prototypes-2026-09-12.json`.
No production changes were made for those prototypes. No identified correctness
fix remains open in this lane. This handoff ends optimization work and hands
acceptance to extensive review and comparison against original 4.1.8.
