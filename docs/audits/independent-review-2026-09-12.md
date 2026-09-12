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

## Follow-up review

The overall campaign report review identified two evidence mismatches: the linked formatter report supports approximately 56% median reduction, rather than 59%; the basic-adapter event reduction of 9–16% applies to the 10/100-effect workloads, while the zero-effect result is approximately 3%. These were corrected in `e4ddd649`, which also ties the 1,521-test result to accepted checkpoint `5050e544` rather than later working changes.

The subsequent within-call manual-purchase layer reuse was reviewed against `5050e544`. It preserves the original facility creation loop and numerical evaluation order, reuses frozen primitive-only layer objects later in the same synchronous call, and adds no cross-call cache or input mutation. A fresh independent historical comparison matched all 18 progression-fixture/entitlement outputs, and the targeted Terra, Galvanization and unified-facility suite passed 144/144 (`/tmp/ids-independent-manual-layer-tests.json`). No production regression was found. The expanded historical comparison then independently passed all 18 fixture outputs and 288 boundary outputs, including changed counts/ownership on the same state between calls. The integration owner reported v4 lint, build and data checks passing; the reviewer inspected `/tmp/ids-performance-candidate-v4-tests.json` and confirmed 1,521/1,521 passed. Boundary comparisons are external differential evidence, not additional suite cases. Timings remain advisory and scoped to full derivation of the measured fixtures.

The English Wiki build deduplication was independently reviewed against its runtime call sites and the installed FormatJS fallback implementation. All 43 omitted IDs are supplied with defaults by the same runtime descriptors; `defaultLocale="en"` retains error-free English fallback. Exact source descriptor and literal AST comparisons fail the build on drift. The plugin targets only the exact compiled English module during builds; extraction order and other locale catalogs are unchanged. The independent focused suite passed **22/22** (`/tmp/ids-independent-wiki-packaging-tests.json`), including all locale formatting/error paths and selected-locale startup failure with effective English fallback. No actionable issue was found. The subsequent acceptance and guard-delta checks are recorded below.

The browser lane comparison JSON correctly identifies checkpoint `5050e544`, sequential baseline/candidate/baseline runs, five-second windows, 4x CPU throttling, and concurrent-soak/machine-noise limitations. Mobile rows are mixed; they do not support a broad mobile improvement claim. The artifact makes no statistical-significance or universal-speed claim.


The parent review caught a newly introduced import of a transitive parser dependency. The final Wiki guard removes that import and requires exactly one literal AST node whose text equals the raw runtime default. This is stricter for escaped/structured ICU text, which now fails closed. The reviewer inspected the updated structured-AST rejection assertion and independently reran **22/22** tests (`/tmp/ids-independent-wiki-final-tests.json`). English emitted modules were independently byte-compared across both guard versions for baseline Web, candidate Web and candidate native; all were identical. No remaining actionable issue was found in this delta.

The reviewer inspected v5 integration JSON and confirmed **1,543/1,543** passed (`/tmp/ids-performance-candidate-v5-tests.json`). That full suite preceded the final guard simplification. The parent reported lint, build, data, Wiki extraction and normal-build probe exclusion passing before that delta; the author repeated 32 focused tests, TypeScript, lint and Web/native output comparisons afterward. The test ledger appends the 22 new expanded cases and records this provenance distinction.

The parent completed before/after Wiki browser checks at 390 and 1440 widths through English → French → English: 12 screens retained exact text and structure for all 43 authored messages and 19 chapters, with no errors or overflow. Nine screenshots were pixel-identical; differences in the remaining three were outside the Wiki article, in footer/navigation content. The parent visually inspected mobile English lore and desktop French patch-note screenshots. These checks cover the stated Wiki flows; they do not establish every-screen or native application acceptance.

The facility-calculation reuse source was reviewed for original evaluation order, complete five-facility collection, immutable result ownership, unchanged public state shape, and recalculation after state changes. No production regression was found. The independent focused construction/clone/unified-facility run passed **31/31** (`/tmp/ids-independent-facility-reuse-tests.json`). Review identified an evidence limitation in the first differential report: historical canonical derivation imported the changed current model module. The author was asked to include the historical model too, so the oracle covers both changed production files. The revised oracle then loaded both historical production modules; the independent rerun passed all 18 fixture and 288 boundary outputs. The superseding timing report uses that complete historical baseline and records 2.9–7.9% lower local full-derivation medians; this is not browser or whole-game evidence. The parent requested explicit modifier-boundary expected values in the new tests; the final test table was independently reviewed and rerun. Final integration remains separate follow-up evidence.

The revised campaign and retention reports accurately scope the completed soak to frozen candidate v1 and distinguish checkout identity captured at completion from served build identity. Application-owned DOM, listener, timer and subscription counts are stable; raw CDP node/listener totals are not claimed stable. The lane report supports the stated lower desktop times for these sampled routes, while mixed mobile measurements retain their explicit limitation.


The provenance and warning follow-up was independently reviewed. The runners capture checkout identity before preview startup, resolve the build directory once, fingerprint its complete regular-file tree, serve that same absolute directory and invalidate pass/acceptance eligibility when the final tree differs or is unavailable. Checkout identity is explicitly not represented as build ancestry. Existing preview startup rejects occupied ports. The additive metadata leaves old reports readable, and the bundle warning no longer falsely claims success when enforced budgets fail. No actionable issue was found. Independent provenance/report/final-facility checks passed **12/12** (`/tmp/ids-independent-provenance-final-tests.json`), including three temporary-repository/build scenarios, two report-gate cases and seven facility-construction cases. Endpoint fingerprints establish equality at capture and completion; they do not prove there was no transient rewrite and restoration between those points. The earlier full soak remains a separate older-build artifact.


The reviewer inspected v6 integration JSON and confirmed **1,553/1,553** passed (`/tmp/ids-performance-candidate-v6-tests.json`). The parent reported lint, build, generated-data validation, first-Dyson parity, Wiki extraction and normal-build probe exclusion passing. Production facility reuse is checkpointed at `b9b47d65`. The later test-only Git isolation delta supplies `commit.gpgsign=false` and a temporary unused hooks path per command, without modifying user Git configuration. Its independent three-case rerun passed (`/tmp/ids-independent-git-isolation-tests.json`). The ledger appends all seven facility and three provenance cases with individual rationales.

Final documentation review refreshed the overview and decision log to the accepted production/provenance checkpoints (`b9b47d65`, `7bc88cd7`) and the 1,553-test v6 integration snapshot. The candidate-v1 soak's older artifact and checkout-at-completion caveats remain explicit. The reviewer inspected the new candidate-v4 provenance smoke JSON: ten seconds after a 30-second warm-up, 237 matching file fingerprints, observed budgets passed, and `acceptanceEligible: false`. It is correctly separate from 30-minute acceptance. The subsequently completed v6 smoke/native packaging evidence is recorded below; unaccepted prototypes are not counted as production changes. No new overclaim was found in the reviewed historical soak or lane comparison.

Residual prototype documentation review corrected the rotated-order case count from 19 to 20 to match both completed raw reports. The per-fixture timing ranges match the stated mixed near-zero results; rejecting these prototypes is supported without claiming a general performance result or introducing production changes.

## Final non-author cross-change review — DRY lane

Compared parent/clean-code production and tooling changes from `878f5bff` to
`7bc88cd7`, focusing on Cloud/save/native boundaries, command extraction,
scheduler injection, build transforms/font packaging and performance evidence.
No actionable introduced defect was found in this scope.

- All nine extracted developer-command helper bodies are byte-for-byte equal
  to the baseline bodies, apart from export placement. Admission, persistence
  and publication remain in the application; type-only runtime imports do not
  add an application initialization cycle.
- Cloud startup retains preparation through the portable serialization
  boundary, future-version blocking, ordered backup recovery, local conflict
  selection, commit-before-acknowledgment and acknowledgement of the downloaded
  primary when a backup supplied recovery. Cloud publication retains clean,
  durable revision gating. An older failed request no longer clears a newer
  checkpoint's retry marker; the latest failed request still permits retry.
- Scheduler adjustment makes the optional delay setter part of its injected
  interface without changing validation, frame scheduling or timer policy.
- English Wiki omission targets only exact known literal messages and fails
  closed on source or AST drift. Runtime defaults remain in the lazy Wiki
  module; the provider uses defaultLocale en and startup fallback changes the
  effective locale to en. Other catalogs and metadata-strip module boundaries
  remain intact. Native builds use the same defaults and relative asset mode.
- Proportional WOFF2 packaging preserves font tables/metrics, with only
  container checksum/compression flag differences allowed. The three CSS source
  substitutions leave weights, display strategy and tabular faces unchanged.
- Performance provenance fingerprints the explicitly served directory at run
  start and rechecks it before finalization; changed files invalidate acceptance.
  Checkout identity is labeled separately from served-build identity. Reports
  without positive interaction observations remain ineligible for that budget.

Independent focused rerun passed **76 tests in 8 files**: portable Cloud,
production factory, canonical application, production host composition, English
Wiki omission, metadata stripping, report artifacts and performance reports.
This is source/automated review evidence. The parent's original-4.1.8 browser
comparison and any actual device testing remain separate acceptance evidence.


## Final non-author cross-change review — clean-code lane

Reviewed baseline `878f5bff` through `7bc88cd7` for numeric/stat helpers, save
ordering and shared defaults, catalog indexes, immutable effect ownership and
within-call derivation caches, formatter reuse, automation hooks and production
text observer lifetime. No actionable introduced regression was found. Numeric
edge behavior, serialization traversal before key sorting, last-match kind/id
versus first-match ID-only lookup, external graph detachment, per-call cache
scope, stale asynchronous intent handling and existing text resizing rules were
preserved in the inspected changes.

A fresh focused run passed **90 tests in 14 files**. A separate old/new Stat
ordering comparison matched **437,376 inputs**, including NaN and infinities.
These results supplement the other independent review scopes; they are not a
review of this lane's own authored production/tooling changes or visual acceptance.

The final documentation check inspected the repository evidence file
[v6 retention smoke](current-build-retention-smoke-2026-09-12.json) and matching
local log. Its three-minute measurement followed a 30-second warm-up, retained
heap grew 601,932 bytes, all observed budgets passed, and no page/console errors
occurred. All 237 served-file fingerprints matched at completion. The report
correctly remains `acceptanceEligible: false`; it does not supersede the older
30-minute soak with current-build acceptance. The v6 native-mode Vite log ends
with a successful build, establishing web packaging only. The overview's stale
pending statements were updated. The completed [baseline/current visual matrix](visual-comparison-4.1.8-2026-09-12.md)
and [iOS WebKit comparison](ios-webkit-comparison-2026-09-12.md) provide separate
visual evidence, with their scope and limits stated explicitly.

The final independent iOS WebKit comparison against untouched 4.1.8 completed on a disposable iPhone 15 Pro/iOS 17.5 simulator. Ten paired observations at 393 × 852 CSS pixels matched selected-surface text, rectangles, controls and image inventories exactly; both builds completed fixture import and Bots/Research single/rapid automation toggles without captured errors or overflow. All six Wiki screenshot pairs were pixel-identical. The probe's native-mode web-output, DOM activation and nonpersistent storage scope is documented in `ios-webkit-comparison-2026-09-12.md`; this is not signed-app or physical-device acceptance. The simulator was deleted and both local servers stopped. The audit author's own test changes and evidence are summarized in `test-authored-change-rundown-2026-09-12.md`.
