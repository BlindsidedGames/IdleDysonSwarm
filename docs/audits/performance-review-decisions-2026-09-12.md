# Performance and maintainability review decisions

Baseline: `878f5bffecd59c699712103172e668d12853d16a`.
Working branch: `codex/performance-maintainability`.

User direction: continue investigating and improving until no further actionable
fixes are found or the user says stop. Record questions here instead of stopping
independent work. Any gameplay-affecting decision requires user review before
implementation. Optimization alone must not change gameplay semantics.

Additional user requirement: review every cohesive change before acceptance.
The coordinating agent reviews semantics and evidence after each change, and a
non-author agent independently reviews each batch before a checkpoint or further
production changes. Resolve actionable findings and rerun affected checks before
accepting the batch. Tests and builds supplement review; they do not establish
visual, native, or gameplay equivalence by themselves. The latest v6 integration snapshot passed
1,553 tests and the required automated gates, with independent batch review.
Accepted production is checkpointed through `b9b47d65` and provenance tooling
through `7bc88cd7`. Further prototypes follow the same review requirement before
acceptance.

## Pending review / separate design work

- **Initial locale payload:** all destinations currently share one locale
  catalog. English Wiki deduplication reduced the catalog from 72.95 to 45.77 KiB gzip
  against the existing 30 KiB budget. Exact authored defaults remain available
  in the unchanged Wiki chunk; all other locales are retained.
  Route catalog splitting needs explicit loading/fallback/error and locale-switch
  behavior. Investigate safe implementation separately; do not remove messages
  or weaken the budget to claim success.
- **Event Timing sample floor:** the full interaction run recorded no qualifying
  Event Timing entries in two desktop trials (54 visible Tinker activations each).
  The current gate correctly remains failed for missing per-trial evidence, but
  its original text misleadingly showed only the passing aggregate. Diagnostics
  now name missing trials and report observer/trusted input counts. The evidence
  gap remains: do not loosen budgets or manufacture a zero-latency measurement.
- **Gameplay changes:** none implemented or currently proposed. Existing balance,
  progression, timing policy, rewards, reset rules and purchase rules are retained.

## Fixed / being verified

- Replace allocation-heavy stat sorting with stable sorting of a copied array.
- Reuse synchronous numeric scratch memory without changing IEEE-754 results.
- Avoid intermediate object allocation in save serialization, preserving bytes.
- Consolidate legacy save defaults and duplicated automation/settings controllers.
- Separate Cloud startup stages and Developer Options handlers.
- Fix the reproduced Cloud retry-marker race: an older failure no longer clears
  a newer request marker; the newest failed request still retries.
- Index catalog lookups without repeatedly joining keys or scanning asset arrays.
- Cache fixed-fraction number formatters and retain facility resize observers.
- Remove unused localization/formatter extension scaffolding and correct docs.
- Package unchanged proportional fonts in lossless WOFF2; Chromium and iOS 17.5
  WebKit each passed 6,261 pixel/metric comparisons.
- Remove only demonstrably redundant tests; retain unique scenarios and reduce
  repeated expensive progression-fixture generation.
- Repair stale checkpoint instrumentation and isolate profiling ports.
- Reuse manual purchase layers within one canonical derivation, with 306 exact
  historical fixture/boundary comparisons.
- Remove only exact duplicated English Wiki literals at build time; verify
  fallback/error semantics, unchanged other locales and browser rendering.
- Reuse five construction-time facility calculations within the same derivation;
  both historical modules produce the same 306 fixture/boundary outputs.
- Capture report checkout identity before measurement and fingerprint the exact
  served build at both endpoints; do not infer build ancestry from checkout HEAD.
- Keep skill icon bytes in image assets instead of eager JavaScript icon maps.

Detailed review scope, evidence and remaining findings live in the companion
clean-code, DRY, test-redundancy and performance audit reports.
