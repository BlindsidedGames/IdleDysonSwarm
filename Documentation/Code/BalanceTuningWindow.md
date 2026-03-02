# BalanceTuningWindow

## Purpose
Editor window for balancing facilities and reality/simulation systems from ScriptableObject assets.

Menu path: `Tools/Idle Dyson/Balance/Tuning`

## Workflow
1. Run `Tools/Idle Dyson/Data/Create/Balance Tool Assets` if registry/assets do not exist.
2. Open `Balance Tuning`.
3. Use `Load/Refresh` to bind current assets.
4. Edit values in `Facilities` or `Reality` tabs.
5. Click `Save Assets`.
6. Run `Validate` and optionally `Run Parity`.

## Facilities Tab
- Edits `FacilityBalanceProfile.entries`.
- Supports progression order, prerequisites, quantum gate binding, and runtime field binding metadata.
- Shows a chain preview to catch invalid prerequisites/gates quickly.

## Reality Tab
- Edits `SimulationUpgradeDatabase.upgrades` and `RealitySystemTuning`.
- Includes side-effect preview for selected upgrade definitions.
- Supports worker batch/speed, avocado threshold, artifact speed rules, and artifact translation substitution rules.

## Validation
- Uses `BalanceDataValidator`.
- Checks:
  - facility ID/order integrity
  - prerequisite references
  - field bindings against `DysonVerseInfinityData`
  - upgrade key uniqueness
  - prerequisite resolution/cycles
  - effect target mapping to existing save fields
  - Game scene mega research wiring (`ResearchPresenter` presence for matrioshka/birch/galactic research IDs and card `BuildingReferences` presence)

## Runtime Integration Points
- `BalanceRuntime` (registry/tuning access)
- `ResearchManager` (upgrade cost/prereq/effect reads)
- `MegaStructureService` + facility systems (profile metadata)
- `WorkerService`, `ArtifactController`, avocado multiplier paths (reality tuning values)

## Notes
- Skills tab is not implemented yet; design is to reuse the same validation/report pattern for a future third tab.
- Save schema remains unchanged; upgrade keys map to existing save fields via `SimulationUpgradeStateAccessor`.
