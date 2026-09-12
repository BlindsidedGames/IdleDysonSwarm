# Performance and maintainability campaign — 12 September 2026

Status: active; current batch passed automated integration and independent review.
Baseline: `878f5bffecd59c699712103172e668d12853d16a`.
Branch: `codex/performance-maintainability`, isolated from the primary checkout.

## Scope and protected behavior

Review performance, clean code, duplication, and every individual baseline test.
Preserve gameplay, balance, progression, numerical operation order, save formats,
platform behavior, UI behavior and appearance. Gameplay decisions require user
approval. Keep investigating while actionable improvements remain. Record open
questions in [the decision file](performance-review-decisions-2026-09-12.md).

Every cohesive change receives coordinating review, and each batch receives an
independent non-author review before acceptance. Resolve findings and repeat
relevant verification. Passing tests do not replace code or visual review.

## Current changes and measured scope

| Change | Evidence | Limit of claim |
| --- | --- | --- |
| Stable stat sorting without decorated objects | Exact historical ordering comparison; roughly 23–28% lower median time for 4–64 effects | Local operation benchmark, not whole-game speed |
| Catalog indices by kind/id and authored-first id | All 371 assets and misses preserve object identity; 90%/93% lower median catalog-sweep time | Local lookup workload |
| Reused numeric scratch buffer and direct sorted save serialization | IEEE-754 neighbor boundaries and exact serialized-byte comparisons | See allocation report; save semantics unchanged |
| Fixed-fraction formatter cache | 3,520 exact output comparisons; 59% lower median full formatter call workload | Local Node workload, not browser frame time |
| Stable facility resize observer | Text changes still measure; observer count and shrink/resize behavior covered | Removes observer churn; no layout redesign |
| Owned immutable basic-model effect maps | External and shallow-frozen input detaches; mutable state remains independent; historical events match | Synthetic basic adapter events improve 9–16%; no canonical tick claim |
| Lossless proportional WOFF2 fonts | Raw font bytes 238.19 to 104.80 KiB; decoded tables preserved; Chromium and iOS 17.5 WebKit each pass 6,261 pixel/metric comparisons | Isolated font rendering, not full native game acceptance |
| External skill icons | Approximately 63.5 KiB gzip removed from eager Skills JavaScript; all 133 mounted images load at 390/1440 widths | Images still transfer when required |
| Message metadata stripping | Preserves outer description messages; includes PWA/challenge descriptors | About 719 gzip bytes saved; complete catalog remains |
| Shared defaults/controllers and extracted startup/development stages | Existing regression suites plus asynchronous intent and cloud retry coverage | Maintainability changes retain behavior |
| Test setup reuse and two proven duplicate removals | Every baseline declaration individually reviewed; shuffled fixture tests pass | No unique baseline scenarios removed |

Operation reports: [stat ordering](stat-ordering-2026-09-12.json),
[catalog lookups](catalog-lookup-2026-09-12.json),
[allocation](allocation-optimization-2026-09-12.json),
[number formatting](number-formatting-2026-09-12.json), and
[basic model clones](dyson-clone-2026-09-12.json).
Timings are advisory and machine-dependent; correctness comparisons are gates.

## Verification and provenance

The current source batch passed **1,521/1,521 tests**, lint, TypeScript and the
production Vite build, production Store-boundary inspection, generated-data
validation and whitespace checks. The two shared-fixture suites also passed all
157 cases with shuffled ordering (seed 912), supporting their isolation.

Earlier candidate snapshots passed normal-build probe exclusion and a native-mode
Vite web bundle. Those are packaging checks, not signed native application builds.
The isolated iOS WebKit font probe used a dedicated simulator which was deleted
afterward. No player saves were used or altered.

Browser checks on earlier frozen candidates exercised Bots/Research automation,
including rapid repeated toggles, and inspected Skills image loading at desktop
and mobile widths. These checks do not establish visual acceptance for every
screen or native platform.

The full ten-trial interaction report on candidate v2 failed its strict INP
requirement: two desktop trials had no qualifying Event Timing samples despite
visible feedback. Other interaction budgets passed, with no page/console errors
or long tasks. The new diagnostics name missing trials and record observer and
trusted input counts. Missing entries are not measured zero latency, and the gate
was not relaxed. This remains incomplete acceptance evidence.

A 30-minute retention soak is running against candidate v1, which predates later
catalog/formatter/font and ownership changes. Its result must not be described as
an exact-current-source soak. A focused baseline/candidate lane comparison is also
in progress; repeated profiling is required before claiming broad gameplay gains.

Initial-request budgets still fail: candidate v2 boot bytes were 399.67 KiB gzip
versus a 301 KiB limit, and English locale bytes were 72.95 KiB versus 30 KiB.
These were already over budget at baseline. No budgets were increased. Locale
splitting remains under investigation because loading and fallback behavior must
be preserved.

## Related review records

- [Individual-test audit](test-redundancy-2026-09-12.md)
- [Clean-code audit](clean-code-2026-09-12.md)
- [DRY audit](dry-review-2026-09-12.md)
- [Independent review](independent-review-2026-09-12.md)
- [Decision log](performance-review-decisions-2026-09-12.md)

No release, deployment or merge has been requested or performed.
