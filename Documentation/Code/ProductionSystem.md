# ProductionSystem

## Purpose
`ProductionSystem` applies per-tick production updates for facilities, currencies, panel decay, and related progression signals. It is the runtime source of truth for production accumulation order and writes rate fields consumed by UI and offline simulation.

## Contract / behavior expectations
- `CalculateProduction(...)` defines facility update ordering for each tick.
- `CalculateDataCenterProduction(...)` writes:
  - `infinityData.dataCenterServerProduction` = data-center production before rudimentary singularity add-on.
  - `infinityData.serverProduction` = final runtime production from the data-center pipeline.
  - `infinityData.servers[0] += infinityData.serverProduction * deltaTime`.
- Parallel Computation is now fully represented inside the data-driven runtime pipeline; there is no separate post-pipeline add/subtract path in `ProductionSystem`.

## Data flow
1. `GameManager.Update()` calls `ProductionSystem.CalculateProduction(..., Time.deltaTime)`.
2. Facility runtime builders/pipelines compute rates from current save state.
3. `ProductionSystem` writes per-second rates and applies `* deltaTime` accumulation.
4. `OfflineProgressSystem` consumes the same rate fields when simulating away-time.

## Save/load implications
- No save-field additions/removals.
- Existing values are recalculated from current state each tick.
- Behavior change affects `serverProduction` magnitude (by design) but does not require migration.

## Performance pitfalls
- Keep production methods allocation-free; they run every frame.
- Avoid duplicate formula paths that drift from pipeline behavior.
- Keep updates deltaTime-scaled to avoid frame-rate dependent gains.

## Quick verification steps
1. Enable Parallel Computation with `serversTotal > 1`; verify `serverProduction` already includes the multiplier.
2. Confirm `CalculateDataCenterProduction` has no standalone additive parallel increment.
3. Confirm offline progression uses `serverProduction * seconds` with no extra parallel term.
4. Compare realtime and offline gains over the same simulated duration for consistency.
5. Use Oracle parity logs to confirm expected/data-driven values remain aligned.
