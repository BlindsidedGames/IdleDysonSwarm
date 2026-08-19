# Web progression and performance matrix

## Reproducible fixtures

`test/support/progressionMatrixFixtures.ts` builds nine deterministic fixtures. `test/fixtures/progression/fixture-manifest.json` and its referenced `*.idsweb1.txt` files are the immutable profiling inputs. The first fixture is the exact production first-run artifact. Later fixtures use canonical Infinity resets, Infinity shop transactions, Reality/Dream operations, Simulation upgrades, Quantum upgrade transactions, and Skill purchases. The focused certification test freezes the serialized-save SHA-256 values, validates every state, imports every save through the production importer, reconstructs every production runtime session, and requires the builders to reproduce the checked-in artifacts exactly.

The certification compares the complete reconstructed runtime carrier, not only `gameState`. Non-Dyson-stress fixtures intentionally inherit the production first-run evaluation snapshot as the valid prior-recalculation compatibility input. The mature active-economy fixture repeatedly performs canonical goal catch-up and Dyson recalculation until a second goal pass awards nothing, then persists that settled evaluation snapshot so its first measured simulation step does not include deferred progression cleanup.

The maximum-Skills fixture owns 96 of 104 authored Skills. The other eight are unavailable because of authored exclusivity choices; owning all 104 is impossible through gameplay. It has no owned exclusivity pair and no further eligible purchase. Its 200 Skill points and 42 fragments are an explicit artificial stress-funding seed; ownership is then produced only through canonical purchase transactions.

Run:

```text
npm test -- --run test/support/progressionMatrixFixtures.test.ts
```

The fixture report records both a canonical-state fingerprint and serialized-save SHA. A catalog, transaction, mapping, or serializer change that alters a fixture fails the checked-in SHA expectations, forcing an intentional baseline review rather than silently changing the benchmark save.

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

On 2026-08-19 the smoke build completed, but local Chromium closed its DevTools connection before measurement. `output/performance/progression-matrix-smoke.json` therefore records the browser evidence as `blocked`; no route figures were fabricated. The harness and fixture catalog are ready to rerun after the local CDP problem is resolved.

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
