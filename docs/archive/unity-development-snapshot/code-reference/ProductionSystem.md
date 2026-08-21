# ProductionSystem

## Purpose
`ProductionSystem` applies per-tick production updates for facilities, currencies, panel decay, and related progression signals. It is the runtime source of truth for production accumulation order and writes rate fields consumed by UI and offline simulation.

## Contract / behavior expectations
- `CalculateProduction(...)` defines facility update ordering for each tick.
- `CalculateDataCenterProduction(...)` writes:
  - `infinityData.dataCenterServerProduction` = total runtime data-center production (matches applied server gain per second).
  - `infinityData.serverProduction` = final runtime production from the data-center pipeline.
  - `infinityData.servers[0] += infinityData.serverProduction * deltaTime`.
- `CalculatePlanetProduction(...)` writes:
  - `infinityData.planetsDataCenterProduction` = total runtime planet production (matches applied data-center gain per second).
  - `infinityData.dataCenterProduction` = final runtime production from the planet pipeline.
  - `infinityData.dataCenters[0] += infinityData.dataCenterProduction * deltaTime`.
- Parallel Computation is now fully represented inside the data-driven runtime pipeline; there is no separate post-pipeline add/subtract path in `ProductionSystem`.

## Data flow
1. `GameManager.Update()` calls `ProductionSystem.CalculateProduction(..., Time.deltaTime)`.
2. Facility runtime builders/pipelines compute rates from current save state.
3. `ProductionSystem` writes per-second rates and applies `* deltaTime` accumulation.
4. `OfflineProgressSystem` consumes the same rate fields when simulating away-time.

## Save/load implications
- No save-field additions/removals.
- Existing values are recalculated from current state each tick.
- `dataCenterServerProduction` and `planetsDataCenterProduction` now represent total applied gain rates (not base-only values).
- No migration required because these are derived runtime fields.

## Performance pitfalls
- Keep production methods allocation-free; they run every frame.
- Avoid duplicate formula paths that drift from pipeline behavior.
- Keep updates deltaTime-scaled to avoid frame-rate dependent gains.

## Quick verification steps
1. Enable Rudimentary Singularity and verify `dataCenterServerProduction == serverProduction` and both match `servers` delta over 1 second.
2. Enable Pocket Dimensions and verify `planetsDataCenterProduction == dataCenterProduction` and both match `dataCenters` delta over 1 second.
3. Confirm facility card production text, bot-panel progress bar rates, and facility breakdown popup all show the same total rate.
4. Confirm offline progression uses `serverProduction * seconds` and `dataCenterProduction * seconds` with no extra duplicate add.
5. Compare realtime and offline gains over the same simulated duration for consistency.
