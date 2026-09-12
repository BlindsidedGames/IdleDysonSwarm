# Test redundancy and execution-cost audit — 12 September 2026

Baseline: `878f5bff`. All **941 source test declarations**, including their bodies, relevant setup/helpers and input tables, were manually reviewed for redundancy. They account for **1,502 expanded Vitest cases in 143 files**. The baseline passed all 1,502 cases. The [per-case ledger](test-redundancy-2026-09-12.json) records every identity, keep/remove decision, manual rationale, replacement for a removed case, baseline timing, and original assertion/parameter-expression evidence. Its line numbers refer to the baseline, before removals.

## Decisions

**Remove 2 cases; retain 1,500 baseline cases.** Similar-looking tests are usually separate failure boundaries here. Deleting many parameterized cases would remove numerical boundaries, authored skill IDs, legacy save variants, or asynchronous event histories while saving little setup cost.

| Removed case | Surviving replacement | Why coverage remains |
| --- | --- | --- |
| `firstDysonSliceFixture.test.ts`: “the checked-in frozen artifact matches the generator output” | “is generated deterministically by the canonical facade and lifecycle coordinator” | Both regenerate the same fixture and deep-compare the same checked-in JSON. The loader only clones/freezes that JSON. A separate retained test checks loader detachment and recursive freezing. |
| `releaseFoundation.test.ts`: “keeps individual no-op adapters testable without a host SDK” | “keeps the browser release foundation provider-free and inert” | The browser factory instantiates the same four adapters; the retained case already exercises the same methods, arguments, and expected results, plus additional metadata/store behavior. |

## Runtime improvement without removing coverage

`progressionMatrixFixtures.test.ts` previously generated all nine progression fixtures six times, each including 420 canonical Quantum cycles. It now generates once in `beforeAll`, clones the result before each test for isolation, and generates independently a second time for the determinism assertion. All six cases and their assertions remain.

The focused three-file run passed **17/17 before** and **15/15 after**. Measured time from Vitest JSON run start to last case completion was **1.836 s before / 1.354 s after** (about 26% lower in this single comparison, including setup/import time). Test-body timings alone exclude the new `beforeAll`, so they must not be presented as the full improvement. These are local, single-run observations, not a stable CI benchmark; concurrent machine activity and caching affect them.

`productionHostComposition.test.ts` only imports a pure store selector and reads source text through Node filesystem APIs. Removing its unnecessary jsdom annotation preserves all four assertions while avoiding DOM environment setup. Its focused run passed **4/4 in 95 ms**, with **0 ms environment setup**; no before/after speed claim is made for that file.

`transitionalV2Checkpoint.test.ts` now decodes its deterministic first-run artifact once. The shared `PreparedSave` exposes defensive copies; tests still hydrate and encode their own mutable inputs, and replacement saves are new objects. All **151 expanded cases** remain. A focused comparison measured **3.651 s before / 3.302 s after** from run start to last completion, including import/setup (about 10% lower in this single observation). Decoder behavior itself retains dedicated first-run tests. A separate lower-compression experiment did not improve runtime and was reverted.

## How each decision was evaluated

1. Expanded runtime identities came from Vitest collection and the passing baseline JSON report, including `test.each`, generated data rows, and `describe.each` expansions. Every one maps to a baseline source declaration; the ledger generation failed on missing or ambiguous matches until all were resolved.
2. TypeScript AST inspection extracted actual assertion expressions, parameter tables, source locations and callback hashes. Exact callback duplication and substantial assertion overlap identified candidates for comparison; this screen did not substitute for manual review.
3. Every source test body, relevant setup/helper and parameter table was manually read. The review covered 633 declarations in one pass and the remaining 308 in a disjoint parallel pass. The ledger requires exactly one manual decision for each of the 941 declarations and maps all expanded cases to those decisions.
4. Candidate removals and overlapping groups were compared against setup, inputs, production delegation and surviving assertions. Identical callbacks in the schema-13 suite were retained because one table mutates closed-schema keys and the other enforces resource budgets. Maximum Skill Point Purity unit checks were retained because the integrated frontend snapshot omits the internal `nextEvaluationSnapshot` that those unit checks validate. The schema-08 five-preset round-trip remains distinct from a native first-run persistence case.
5. The conservative default after review is “keep: no equivalent replacement established.” The audit does **not** claim a mutation-testing proof that all retained tests are indispensable. Runtime, storage, UI and numeric boundary tests can intentionally overlap while exposing different failures.

The decision ledger describes baseline cases. The first candidate full-suite run passed **1,510/1,510**: 1,502 baseline cases minus two removals plus ten new regressions. The JSON lists those additions separately: metadata stripping (two), serialization ordering (two), neighboring float arithmetic (one), stable stat ordering (one), automation intent handling (three), and settings command settlement (one). Later performance work may add further cases; those additions do not change the completed baseline audit.

Five subsequent regressions were also manually reviewed and passed in an independent focused run: catalog lookup identity (one), localized formatter precision/cache semantics (two), and fitted production text observer/measurement behavior (two). They are listed under `postCandidateRegressions`.

Six final regressions were independently reviewed and passed: out-of-order Cloud checkpoint failures and retry ownership (one), external effect-map detachment and clone ownership (three expanded cases), and interaction-report missing-data and budget semantics (two). The ledger appends each identity and rationale. The pre-Wiki integration run passed **1,521/1,521**: 1,502 baseline cases minus two removals plus 21 regressions. Its JSON report is `/tmp/ids-performance-candidate-v3-tests.json`.

A separate reviewer inspected the two removals against surviving assertions and checked shared fixture cloning and `PreparedSave` defensive-copy usage. A shuffled fixture-isolation run passed **157/157**, seed **912** (`/tmp/ids-performance-fixture-isolation-tests.json`). See the [independent review record](independent-review-2026-09-12.md) for production-review scope and limits.

## Expensive suites and retained obligations

These baseline case-duration sums help locate investigation targets. They exclude collection and file setup and are not additive wall-clock costs because files run concurrently.

| File | Cases | Baseline case duration sum (ms) |
| --- | ---: | ---: |
| src/ui/gameplay/offline-time/OfflineTimeSurface.test.tsx | 11 | 10738 |
| src/save/transitionalV2Checkpoint.test.ts | 151 | 7113 |
| scripts/support/progressionMatrixFixtures.test.ts | 6 | 1742 |
| src/ui/gameplay/skills/SkillsSurface.augments.test.tsx | 4 | 1582 |
| src/platform/browserSaveDatabase.test.ts | 15 | 1557 |
| src/platform/steamOfflineProfile.test.ts | 12 | 1370 |
| src/simulation/galvanization.test.ts | 119 | 1358 |
| src/platform/steamCloudRecovery.test.ts | 8 | 1228 |
| src/browser/productionPackaging.test.ts | 1 | 1211 |
| src/application/storedTimeJobIntegration.test.ts | 18 | 1030 |
| src/application/canonicalGameCommands.test.ts | 27 | 917 |
| src/ui/gameplay/settings/SettingsSurface.test.tsx | 9 | 701 |

- **Schema-13 recovery:** retain supported historical files, exact decoded limits, retirement proofs, negative-zero handling and commit failures. These protect player saves; invalid-input rows with the same error assertion are not duplicates.
- **Offline Time UI:** retain each cancellation origin, backdrop versus explicit-button dismissal, focus restoration and committed-disaster sequencing. The 59-second bank case checks that Max Storage displays capacity rather than available time; the upgrade case starts with a full bank and does not replace that distinction.
- **Galvanization:** the large authored-ID matrix exercises data-dependent reset behavior. Fewer IDs would be weaker coverage, not merely faster execution.
- **Production packaging:** retain the actual Vite build inspection. Source-text checks do not prove the emitted bundle, CSP, icons, fonts or worker contents.
- **Skill-effect certification:** materialization, prepared resolver and direct resolver are distinct entry points. Sharing a reference oracle is deliberate differential testing.
- **Core numeric guards:** NaN, infinity, zero, fractional values, bigint/string inputs and integer ceilings cover distinct accepted/rejected partitions and cost almost nothing individually.

For future local iteration, use targeted Vitest file selection while keeping the full suite as the integration gate. Further speed work should profile shared fixture construction, import/transform cost and UI setup, then preserve assertions as this fixture change does. No global isolation disable, relaxed timeouts, skipped tests or weaker numerical assertions were introduced.

## Wiki packaging follow-up

The 22 expanded Wiki packaging regression cases were individually reviewed and appended to the ledger: exact omission and neighboring-message preservation (one), formatting and missing-ID errors across ten locales (ten), selected-language startup failure and effective English fallback (nine), stale/structured-data rejection (one), and build/module targeting (one). The v5 integration snapshot passed **1,543/1,543**: 1,502 baseline cases minus two removals plus 43 new regressions. That full run preceded the final equivalent literal-guard simplification; the reviewer independently reran all **22/22** new cases afterward and byte-compared emitted English modules across both guard versions for Web and native builds.

## Facility calculation and report provenance follow-up

Ten further expanded cases were independently reviewed and appended: five explicit modifier-cutoff boundaries, equal-order/clamped effects, recalculation without stale construction snapshots, starting-checkout/selected-build identity, dependency mutation without manifest changes, and public-asset deletion/unavailable builds. The v6 full suite passed **1,553/1,553**: 1,502 baseline cases minus two removals plus 53 regressions (`/tmp/ids-performance-candidate-v6-tests.json`). The production facility batch is checkpointed at `b9b47d65`. A subsequent test-only Git isolation change disables signing and hooks per command; independent rerun passed **3/3**, with production unchanged.
