# Web progression and performance matrix

## Reproducible fixtures

`test/support/progressionMatrixFixtures.ts` builds nine deterministic fixtures. `test/fixtures/progression/fixture-manifest.json` and its referenced `*.idsweb1.txt` files are the immutable profiling inputs. The first fixture is the exact production first-run artifact. Later fixtures use canonical Infinity resets, Infinity shop transactions, Reality/Dream operations, Simulation upgrades, Quantum upgrade transactions, and Skill purchases. The focused certification test freezes the serialized-save SHA-256 values, validates every state, imports every save through the production importer, opens it through the complete production application and simulation engine, advances it successfully, and requires the builders to reproduce the checked-in artifacts exactly.

The certification compares the complete reconstructed runtime carrier, not only `gameState`. Non-Dyson-stress fixtures intentionally inherit the production first-run evaluation snapshot as the valid prior-recalculation compatibility input. The mature active-economy fixture repeatedly performs canonical goal catch-up and Dyson recalculation until a second goal pass awards nothing, then persists that settled evaluation snapshot so its first measured simulation step does not include deferred progression cleanup.

The maximum-Skills fixture owns 96 of 104 authored Skills. The other eight are unavailable because of authored exclusivity choices; owning all 104 is impossible through gameplay. It has no owned exclusivity pair and no further eligible purchase. Its 200 Skill points and 42 fragments are an explicit artificial stress-funding seed; ownership is then produced only through canonical purchase transactions.

Run:

```text
npm test -- --run test/support/progressionMatrixFixtures.test.ts
```

The fixture report records both a canonical-state fingerprint and serialized-save SHA. A catalog, transaction, mapping, or serializer change that alters a fixture fails the checked-in SHA expectations, forcing an intentional baseline review rather than silently changing the benchmark save.

The mature-Infinity fixture uses the production 0.1-second automation interval. Imports are preflighted through the production engine before the current save is displaced or replaced. The regression suite proves that the former out-of-range phase is rejected with `CANONICAL_EVENT_AUTOMATION_PHASE_INVALID`, leaves the current save untouched, and performs no commit.

## Browser route matrix

Run the short harness check with:

```text
npm run report:performance:matrix:smoke
```

Run the full desktop/mobile matrix with:

```text
npm run report:performance:matrix
```

The full matrix uses desktop 1440x900 and mobile Web 390x844 viewports at four-times CPU throttling. Every route gets a newly launched page and a fresh import of the same immutable fixture, so one destination cannot warm another destination's route chunks before first activation. Each reachable route records first activation-through-resource-settle separately from three steady-state trials. It captures runtime lane samples, Chrome main-thread metrics, long tasks, React selection-to-commit samples, DOM/listener/subscription counts, newly loaded route resources, console/page errors, and horizontal overflow. Import completion is accepted only when the performance build publishes the exact SHA-256 of the successfully committed fixture; ordinary gameplay revisions cannot satisfy that wait.

Bots is explicitly labelled warm because it is the startup route. Settings is explicitly labelled warm because production import uses Settings. Other entries are independent first activations after fixture import; they are not misrepresented as independent cold-browser startup measurements.

The final 2026-08-20 run measured all 18 profile/fixture combinations and all
186 reachable routes with zero blocked fixtures, console errors, page errors,
or document-level horizontal overflow. Its report is
`output/performance/progression-matrix.json`. The Avocato check follows the
production design: Avocato has no side-navigation entry and is opened through
the enabled Avocado upgrade on Quantum. The earlier generic check that expected
a side-navigation button was a harness error and its blocked output is not used
as acceptance evidence.

This matrix certifies performance and successful activation for routes that
the shared production visibility selector declares reachable. It deliberately
does not open Quantum during unrelated-route preflight, because doing so would
warm route chunks and invalidate independent first-activation measurements.
Locked/unlocked Avocato boundary correctness is supplied by the focused fixture,
Quantum-surface, and shell-routing tests; the measured Avocato rows verify the
enabled subordinate entry end to end.

At four-times CPU throttling, Skills was the dominant first-activation cost.
The maximum-Skills fixture took 608.2 ms on desktop and 569.9 ms on mobile to
reach the route-ready marker; late Quantum took 397.4 ms and 374.1 ms. Skills
also produced the largest first-activation long tasks, up to 203 ms. This is a
route-entry/loading cost rather than ongoing graph churn. In steady state, the
maximum-Skills stress fixture produced four isolated long-task observations
across Research, Settings, and Offline Time, with a maximum browser long task
of 52 ms and a maximum throttled canonical-active sample of 56.4 ms. All other
steady route trials recorded no long task. The separately budgeted normal interaction trace remains the Web
release responsiveness acceptance gate; the matrix retains these stress
outliers as the next optimization baseline rather than hiding them.

## Stored Time matrix

Run:

```text
npm run report:performance:stored-time-matrix
```

This uses one checked-in mature-Infinity active-economy save for every request and a bounded 12 ms step loop. It does not use the Debug credit path or create separately funded variants. The 2026-08-19 in-process worker-core results were:

| Request | Setup + simulation + reconstruction | Turns | Max chunk | Result |
| --- | ---: | ---: | ---: | --- |
| 1 hour | 1,194.0 ms | 4,096 | 8.35 ms | completed |
| 24 hours | 1,145.0 ms | 4,096 | 1.28 ms | completed |
| 1 week | 1,689.1 ms | 4,096 | 1.49 ms | completed |
| Maximum persisted 5,529,600 seconds (64 days) | 2,021.9 ms | 4,096 | 2.96 ms | completed |

Every run consumed exactly the requested amount from the same 5,529,600-second source bank, kept bank at or below the matching capacity, preserved Dream, Reality, Double Time, and their excluded statistics bit-for-bit, and reconstructed identically after production serialization. The 64-day limit is the largest reachable capacity that survives the authored Unity save rollover at 100 days: one-day capacity doubles through 64 days, while the next doubling crosses the rollover threshold. The report fails instead of merely recording evidence if bank math, capacity, preservation, reconstruction, cancellation, failure, or source-immutability invariants fail. It also records policy-group completion and event counters; excluded Dream/Reality counters remain zero. These timings include worker setup, the step loop, validation/serialization, and runtime reconstruction. They do not include browser message transfer, persistence, or React terminal publication; those browser lanes remain pending with the CDP matrix.

## Scope boundaries

This matrix is Web-only. Android, iOS, TalkBack, VoiceOver, native lifecycle, heat, and battery checks are intentionally outside this release phase. Store and Debug reachability is environment/entitlement-dependent and remains covered by their dedicated tests rather than being falsely inferred from player progression.
