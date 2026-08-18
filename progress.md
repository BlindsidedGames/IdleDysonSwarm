Original prompt: Go ahead and do that

Scope: Continue the Break Infinity V2 migration handoff by fixing receiver-local Developer Options presentation, then verify real dev-server IndexedDB/save/reload behavior and interaction performance.

## Progress

- Checked out `break-infinity-migration` at GitHub checkpoint `74e0560`.
- Read `Web/docs/migration-handoff-2026-08-13.md` and `Web/docs/break-infinity-migration-plan.md`.
- Confirmed npm 11.6.2 can clean-install the checkpoint; npm 10.9.3 rejects its optional peer resolution.
- Baseline TypeScript passes. Full suite passes except for sandbox-only localhost failures and two load-sensitive worker timeouts; both categories pass when rerun in isolation.

## TODO

- Trace receiver-local `debugEverEnabled` through production composition and storefront projection.
- Added a production-safe read-only `receiverLocalEntitlements()` runtime port.
- V1 derives it from receiver application state; V2 derives it from schema-13 platform sidecar state.
- Ready runtime hosts now pass this projection to Store presentation even when development controls are absent in production builds.
- Implement and test the presentation fix without adding entitlement to portable save state.
- Focused validation passes: TypeScript and 76 tests across V2 runtime, ready/store presentation, storefront, and portable serialization.
- Real dev-server browser verification on port 5174 found a schema-13 `IDSWEB1` checkpoint in production IndexedDB, persisted a Story shortcut change, and restored it after reload (ready in about 1.18 s).
- Used the development-only receiver action to unlock Developer Options locally; Store immediately displayed `Unlocked in game`, and still displayed it after a second reload (ready in about 1.12 s).
- Browser console reported no warnings or errors during the fixed Store flow. Playwright workflow screenshot was inspected; UI layout and ownership state were visible and correct.
- Run focused and regression validation.
- Exercise the real dev-server IndexedDB/save/reload flow and interaction benchmark.
- Full interaction acceptance report completed. It is acceptance-eligible but fails existing performance budgets: desktop long task 53 ms; throttled-mobile long task 183 ms and synthetic INP P75 8,488 ms. Snapshot-to-React-commit P95 passed at 0.9 ms desktop and 2.8 ms mobile; visible feedback, CLS, and sampled LCP values were within thresholds. Desktop LCP is marked failed because one of five trials recorded no positive LCP sample.
- Final lint passes. The performance build transformed 471 modules successfully.
- A facade-shape regression test initially caught the new read port as an intentional public-surface change; its exact expected method list was updated.

## Remaining follow-up

- Profile the throttled-mobile input backlog/long tasks before attempting optimization.
- Added diagnostic Event Timing fields (event name and processing phases) and a focused 4x-throttled mobile runner to distinguish processing cost from presentation/grouping delay.
- Diagnosed periodic 150-180 ms tasks as schema-13 autosave encode plus two redundant full decode readbacks. Production autosaves now encode in a dedicated module worker, transfer the portable save as a Blob, and verify exact staged/committed bytes without redundant trusted-path decoding; startup and import remain strict full decodes.
- Diagnosed the remaining Tinker-completion task as a full-state clone of an event-time-issued state. Event-time publications now authenticate their already-validated immutable state, and Dyson-only Tinker mutations structurally share unchanged issued sections while cloning and validating the changed Dyson subtree.
- Interaction warm-up now starts one accepted Tinker operation, waits for its canonical commit, then settles its worker checkpoint before clearing measurements. This removed overlapping Event Timing groups and warm-up leakage.
- Full five-trial/30-second acceptance report passes every desktop and 4x-mobile budget: acceptance eligible; zero long tasks; mobile INP P75 120 ms; mobile snapshot-to-React-commit P95 2.7 ms; mobile LCP P75 404 ms.
- Final production preview screenshot was visually correct. The only console entry was the expected local preview 404 for the unavailable Stripe verification endpoint.
- Full automated suite is green. The serialized sandbox run passed 2,226 ordinary tests and failed only the three fixed-port real-browser cases; those three passed with loopback permission, for a combined 2,229/2,229. The Stored Time Fast-plan file also passes 25/25 in original order after its heavy-path drains were aligned with the existing 60-second checkpoint-driver bound.
- Stage 9 audit found one major production-reachable compatibility boundary: `inspection/frontendSnapshotV2.ts` still projects the complete V2 state to `CanonicalGameStateV1`, calls the V1 frontend selector, then replaces V2 resources and previews. Migrate the remaining projection families to V2 incrementally; retain legacy decode/import, fixtures, and recovery.
- Began the Stage 9 projection cutover: V2 gameplay snapshots now identify `modelVersion: 2`, and route/facility visibility is derived directly from V2 `GameDecimal` state. Extreme values no longer collapse to the bridge's zero sentinel for visibility decisions. Progression, derived facts, and runtime facts still use the compatibility selector.
- Refreshed `origin/break-infinity-migration`; it still points to the checked-out checkpoint `74e05605`. Live GitHub Actions inspection is unavailable until the invalid stored `gh` credential is repaired, so remote CI status remains unverified.
- Updated extreme-number presentation above the named `DCe` suffix range. The mantissa and exponent now independently use the same truncated three-significant-digit formatter (`9.8765e1000` -> `9.87e1.00K`; near the supported ceiling -> `9.87e8.99Qa`) without changing canonical values.
- Decide whether the interaction report should distinguish missing LCP samples from an over-budget LCP value in its text output.
- Pin the supported Node/npm toolchain; npm 10.9.3 rejects the current lock while npm 11.6.2 installs it cleanly.
- Updated the migration handoff with the resolved entitlement gap, real IndexedDB/reload evidence, benchmark results, and the revised next task.
- Record final evidence and remaining risks.
