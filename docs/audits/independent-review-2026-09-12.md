# Independent review — 12 September 2026

A reviewer who did not author the production changes inspected the candidate against baseline `878f5bff`. No actionable introduced regression was found in the reviewed changes. This records review and test evidence, not a proof of correctness or of universal performance improvement.

## Covered changes

- Numeric neighbor scratch storage, stable stat ordering, and save serialization ordering; retained equal-order behavior, special numeric values, key ordering and compressed output compatibility were considered.
- Catalog indexes, first-authored ID lookup, static condition/purchase maps and canonical derivation allocation changes; object identity, exact lookup semantics and ownership were checked.
- Basic Dyson clone effects: only privately recognized, detached and frozen effect structures are shared. External shallow-frozen maps and externally replaced maps are copied; mutable model fields remain separate.
- Development-command extraction, Cloud adapter factoring and checkpoint retry ownership, automation intent settlement and player-settings submission handling; extraction boundaries and asynchronous completion order were inspected.
- Localized number formatter caching, numeric input formatter reuse and removed locale/formatter APIs; remaining callers, mutable option values and localized output were checked.
- Fitted production text observer lifetime, source font packaging, Vite icon emission, message-authoring metadata stripping and scheduler typing; production packaging and relevant regression assertions were inspected.
- Interaction harness diagnostics, child-process cleanup, alternate output-directory plumbing, strict per-trial INP evidence requirements, and benchmark helpers; diagnostic additions do not convert missing measurements into passing samples. Basic adapter benchmark claims are explicitly limited to that adapter.

## Evidence

The latest independent focused run passed **95/95** tests, recorded in `/tmp/ids-independent-review-batch2.json`. It covered catalog lookup, Cloud checkpoint retry ownership, clone ownership, skill-effect certification, Terra purchase effects, numeric input and locale registry behavior, startup catalog behavior, fixed-fraction formatting, and interaction report gates. Earlier focused review also exercised the UI and serialization regressions. An adversarial comparison found unchanged V8 stat-ordering results for 279,936 arrays drawn from negative infinity, -1, 0, 1, positive infinity and NaN.

The integration owner reported lint, build and data checks passing. The reviewer inspected the final full-suite JSON: **1,521/1,521** passed, zero failed (`/tmp/ids-performance-candidate-v3-tests.json`). These temporary local reports identify the evidence available during review; they are not committed reproducibility artifacts.

Because this reviewer authored the test-removal and fixture-cost edits, the integration owner separately reviewed those edits against surviving assertions, fixture cloning and `PreparedSave` defensive-copy behavior. Their shuffled fixture-isolation run passed **157/157**, seed **912** (`/tmp/ids-performance-fixture-isolation-tests.json`). The [test ledger](test-redundancy-2026-09-12.json) retains all baseline decisions and the 21 added regression cases separately.

Font equivalence had a separate isolated WKWebView check on iOS 17.5: all nine source/candidate faces loaded and all 6,261 glyph/string pixel and metric comparisons matched. That font probe does not constitute a full game interaction check.

## Limits

Manual review and passing tests cannot establish that every behavior is covered or that every retained test is indispensable. No mutation-testing proof was performed. Build and unit evidence do not substitute for native game, browser interaction or accessibility acceptance. Missing Event Timing entries remain missing evidence, even when the displayed aggregate is below budget. Advisory allocation and adapter timings are scoped to their measured workloads and do not establish an end-to-end gameplay speedup.
