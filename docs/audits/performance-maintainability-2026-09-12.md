# Performance and maintainability campaign — 12 September 2026

Status: completed at the user-requested stopping point; accepted production through
`b9b47d65` and provenance tooling through `7bc88cd7` passed review. Further
optimization has stopped; rejected prototypes are separate from these checkpoints.
Baseline: `878f5bffecd59c699712103172e668d12853d16a`.
Branch: `codex/performance-maintainability`, isolated from the primary checkout.

## Scope and protected behavior

Review performance, clean code, duplication, and every individual baseline test.
Preserve gameplay, balance, progression, numerical operation order, save formats,
platform behavior, UI behavior and appearance. Gameplay decisions require user
approval. The final round is complete; record remaining open
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
| Fixed-fraction formatter cache | 3,520 exact output comparisons; 56% lower median full formatter call workload in the linked report | Local Node workload, not browser frame time |
| Stable facility resize observer | Text changes still measure; observer count and shrink/resize behavior covered | Removes observer churn; no layout redesign |
| Owned immutable basic-model effect maps | External and shallow-frozen input detaches; mutable state remains independent; historical events match | Synthetic basic adapter events with 10/100 effect targets improve 9–16%; no canonical tick claim |
| Lossless proportional WOFF2 fonts | Raw font bytes 238.19 to 104.80 KiB; decoded tables preserved; Chromium and iOS 17.5 WebKit each pass 6,261 pixel/metric comparisons | Isolated font rendering, not full native game acceptance |
| External skill icons | Approximately 63.5 KiB gzip removed from eager Skills JavaScript; all 133 mounted images load at 390/1440 widths | Images still transfer when required |
| Message metadata stripping | Preserves outer description messages; includes PWA/challenge descriptors | About 719 gzip bytes saved |
| English Wiki deduplication | Exact literal defaults remain in the unchanged lazy Wiki chunk; 43 compiled English duplicates omitted | 27.18 KiB gzip saved; all other locales unchanged; 12 browser observations match |
| Within-call manual purchase layers | 18 fixture and 288 boundary outputs match; 144 focused tests pass | 3–13% lower local full-derivation medians; no cross-call cache |
| Within-call facility calculations | 18 fixture and 288 boundary outputs match against both historical modules; seven construction regressions pass | 2.9–7.9% lower local full-derivation medians; no browser or whole-game claim |
| Report provenance | Complete served-file tree fingerprinted before/after; mismatches invalidate acceptance | Checkout identity is not build ancestry; endpoint equality is not continuous monitoring |
| Shared defaults/controllers and extracted startup/development stages | Existing regression suites plus asynchronous intent and cloud retry coverage | Maintainability changes retain behavior |
| Test setup reuse and two proven duplicate removals | Every baseline declaration individually reviewed; shuffled fixture tests pass | No unique baseline scenarios removed |

Operation reports: [stat ordering](stat-ordering-2026-09-12.json),
[catalog lookups](catalog-lookup-2026-09-12.json),
[allocation](allocation-optimization-2026-09-12.json),
[number formatting](number-formatting-2026-09-12.json), and
[basic model clones](dyson-clone-2026-09-12.json),
[manual layers](manual-purchase-layer-reuse-2026-09-12.json), and
[facility calculations](facility-calculation-reuse-2026-09-12.json).
Timings are advisory and machine-dependent; correctness comparisons are gates.

## Verification and provenance

The v6 integration snapshot passed **1,553/1,553 tests**, lint, TypeScript, the
production Vite build and Store-boundary inspection, generated-data validation,
first-Dyson parity, Wiki extraction freshness, normal-build probe exclusion and
whitespace checks. Production facility reuse is checkpointed at `b9b47d65`;
provenance tooling is checkpointed at `7bc88cd7`. The subsequent test-only Git
signing/hook isolation change passed an independent three-case rerun. The two
shared-fixture suites previously passed all 157 cases with shuffled ordering
(seed 912), supporting their isolation.

The v6 snapshot also passed normal-build probe exclusion and a native-mode Vite
web bundle build (`/tmp/ids-performance-candidate-v6-native.log`). Those are
packaging checks, not signed native application builds.
The isolated iOS WebKit font probe used a dedicated simulator which was deleted
afterward. No player saves were used or altered.

Browser checks on earlier frozen candidates exercised Bots/Research automation,
including rapid repeated toggles, and inspected Skills image loading at desktop
and mobile widths. These checks do not establish visual acceptance for every
screen or native platform.

The final [4.1.8 visual comparison](visual-comparison-4.1.8-2026-09-12.md) inspected
30 screenshots across five affected surfaces at phone, tablet and desktop widths.
All selected landmark/button comparisons matched, with no new visual regression,
overflow or broken images. Bots/Research single and rapid toggle sequences passed
in both builds at every width. The [native WebKit comparison](ios-webkit-comparison-2026-09-12.md) also completed
ten paired observations with matching selected text, rectangles and controls.

The full ten-trial interaction report on candidate v2 failed its strict INP
requirement: two desktop trials had no qualifying Event Timing samples despite
visible feedback. Other interaction budgets passed, with no page/console errors
or long tasks. The new diagnostics name missing trials and record observer and
trusted input counts. Missing entries are not measured zero latency, and the gate
was not relaxed. This remains incomplete acceptance evidence.

The [30-minute retention soak](retention-soak-2026-09-12.json) passed against frozen
candidate v1: retained heap grew 5,205,804 bytes within the existing 10 MiB
allowance, and application-owned DOM/listener/timer/subscription counts remained
stable. There were no page/console errors. That snapshot predates later changes
and is not an exact-current-source soak. The old runner captured checkout identity
at completion; the evidence explicitly separates that from the served build.

The new provenance runner also passed a ten-second smoke measurement after the
normal 30-second warm-up against frozen candidate v4: all 237 served-file
fingerprints matched and observed resource budgets passed. It explicitly remains
`acceptanceEligible: false`; it does not replace a current-build 30-minute soak.
The [v6 retention smoke](current-build-retention-smoke-2026-09-12.json) subsequently
passed a three-minute measurement after the normal 30-second warm-up. Retained
heap grew 601,932 bytes, all observed resource budgets passed, no page/console
errors occurred, and all 237 served-file fingerprints matched at completion.
Its `acceptanceEligible: false` remains explicit: this is current-candidate smoke
evidence, not a current-build 30-minute acceptance soak. The recorded checkout
at run start is distinct from the served build fingerprint.

The [sequential baseline/candidate/baseline lane comparison](browser-lane-comparison-2026-09-12.json)
supports lower desktop game-step/projection times for the sampled routes. Mobile
results remain small or mixed. These short, throttled local samples are not a
statistical proof or a universal gameplay speedup.

After English Wiki deduplication, boot JavaScript is 372.60 KiB gzip against the
301 KiB limit; English locale is 45.77 KiB against 30 KiB. Both remain over budget,
as at baseline. No budgets were increased. Further locale splitting requires
review of loading/fallback semantics.

The Wiki batch passed 1,543 integration tests, lint/build/data, Wiki authoring
freshness and normal-build probe exclusion. A subsequent dependency-free guard
refinement repeated focused checks and Web/native output comparisons with
identical emitted bytes. All 19 lore chapters and archived patch notes matched
before/after at 390/1440 widths through English/French/English switching, with no
formatting errors or overflow. See [Wiki evidence](english-wiki-catalog-2026-09-12.md).

## Related review records

- [Individual-test audit](test-redundancy-2026-09-12.md)
- [Clean-code audit](clean-code-2026-09-12.md)
- [DRY audit](dry-review-2026-09-12.md)
- [Independent review](independent-review-2026-09-12.md)
- [Decision log](performance-review-decisions-2026-09-12.md)

No release, deployment or merge has been requested or performed.

## Additional player regression review

The subsequent [player perspective and save review](player-perspective-review-2026-09-12.md) found no introduced regression in its finite comparisons, but reproduced two pre-existing save defects: reset Skills can revive the cleared live assignment queue, and legacy IDB1 imports omit CRC validation. See that report for the actual pointer, gameplay differential and durable-storage coverage and its limits.
