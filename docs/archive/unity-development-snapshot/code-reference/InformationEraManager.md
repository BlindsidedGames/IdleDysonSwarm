# InformationEraManager

## Purpose
Runtime Simulation Information Era controller. It updates education research progress, Information Era production, and related panel text/visibility.

## Contract And Behavior
- `MathematicsManager()` completion path must use idempotent parity behavior:
  - Mark mathematics complete.
  - Ensure `sdSimulation.solarPanelGeneration >= 200`.
- Mathematics info description must communicate the preserved legacy effective outcome (`x4` total solar output after completion).
- Research and production panel visibility remains gated by completion booleans and era progression values.

## Data Flow
- Input: per-frame `Update`, button callbacks, and current simulation/prestige save state.
- Writes: research progress/completion flags and Information Era production values in `SaveDataDream1`.
- Downstream consumers: `SpaceAgeManager` (uses mathematics completion + solar generation state).

## Save/Load Implications
- No new keys or schema changes.
- This manager can finalize mathematics completion during runtime, and must stay aligned with:
  - `ResearchManager` permanent unlock apply path.
  - `Oracle.Migrations` ensure normalization path.

## Performance Notes
- Runs every frame; keep logic allocation-light.
- Info panel descriptions are debounced to 10Hz; avoid introducing heavy work inside text update paths.

## Quick Verification
1. Start Mathematics research normally and let it complete.
2. Confirm `sdSimulation.mathematicsComplete == true` and `sdSimulation.solarPanelGeneration >= 200`.
3. Open Mathematics info panel and verify effect text states `x4` total output behavior.
4. Confirm Advanced Physics unlock gating still works after mathematics completion.
