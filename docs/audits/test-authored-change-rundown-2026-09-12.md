# Test audit and authored changes — 12 September 2026

The audit reviewed all 941 baseline source declarations and their setup, helpers, parameter tables and assertions, mapping them to 1,502 expanded cases across 143 files. The complete ledger retains individual decisions and evidence. This is manual redundancy review, not a mutation-testing proof that every retained assertion is indispensable.

Only two baseline cases were removed:

- The frozen first-Dyson artifact/generator comparison duplicated the retained deterministic generation comparison. Separate loader detachment/freezing coverage remains.
- The standalone no-op adapter case repeated the same adapter methods already exercised through the retained browser release foundation factory test.

Three setup changes retain their assertions:

- `progressionMatrixFixtures.test.ts` generates the nine-fixture matrix once for shared setup, then clones it before each case. Its determinism case still performs a second independent generation. Generation count fell from six to two.
- `productionHostComposition.test.ts` drops an unnecessary jsdom environment; its four cases use a pure selector and Node source reads.
- `transitionalV2Checkpoint.test.ts` decodes the deterministic first-run artifact once. PreparedSave defensive copies and per-test hydration/encoding preserve mutable-input isolation; all 151 cases remain.

Indicative local setup-inclusive comparisons were 1.836 s → 1.354 s for the three-file removal/fixture group and 3.651 s → 3.302 s for transitional checkpoints. These are single-run observations, not stable CI speed claims. The parent independently reviewed these authored changes and verified 157 shared-fixture cases under shuffled ordering, seed 912.

The final v6 integration suite passed 1,553/1,553: 1,502 baseline cases − two proven duplicates + 53 added regression cases. The added cases cover actual changed contracts, including serialization/numeric ordering, asynchronous UI intents, formatter options, catalog identity, cloud retry ownership, clone detachment, text measurement, report integrity and Wiki fallback semantics. Every addition is listed separately from baseline decisions in the ledger. No global isolation disabling, skip/timeout relaxation or weaker numeric assertion was introduced.

The reviewer also independently reviewed production batches, requested a complete two-module historical oracle for facility reuse, verified the revised 306 comparisons, and recorded resolved documentation/dependency findings in `independent-review-2026-09-12.md`. Font equivalence was checked separately in Chromium and iOS WebKit, and the final iOS WebKit UI comparison is documented in `ios-webkit-comparison-2026-09-12.md`.
