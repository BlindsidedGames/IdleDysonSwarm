# ResearchPresenter

## Purpose
`ResearchPresenter` binds one research ID/definition to one UI card and drives:
- purchase button behavior
- card visibility/prerequisites
- owned/boost/cost text
- auto-buy state display

## Contract
- `researchIdOverride` is the canonical runtime binding when set.
- If `buildingReferences` is not serialized, presenter resolves card references by mapped card name.
- Purchase listener binding is idempotent and can bind after delayed reference resolution.
- `CurrentLevel` reads/writes through `IGameStateService` (`Oracle` save-backed state).
- During pre-load frames (before Oracle save state is ready), presenter skips state-dependent visibility/prerequisite/cost logic to avoid startup null faults.

## Data Flow
1. Resolve definition (`definition` or by `researchIdOverride`).
2. Resolve `BuildingReferences` by mapped UI card name.
3. Bind purchase button callback once.
4. Per-frame refresh:
   - visibility
   - cost/amount/interactable
   - production text

## Save/Load Implications
- Research levels persist in `DysonVerseInfinityData.researchLevelsById` and mirrored legacy fields through `ResearchIdMap`.
- No schema changes for this presenter behavior.

## Compatibility Risks
- Breaking `GetBuildingReferenceName()` mappings will orphan cards from presenter logic.
- Duplicating presenters for one ID can cause conflicting card updates.
- Removing preload guards can reintroduce startup `NullReferenceException` when `OnEnable()` fires before `Oracle.Start()` loads save data.

## Quick Verification
1. Open `Game.unity`.
2. Ensure mega presenters exist under `Scripts/Research`:
   - `MatrioshkaBrainsUpgrade`
   - `BirchPlanetsUpgrade`
   - `GalacticBrainsUpgrade`
3. In play mode, click each mega research `+1` button and verify level increments and science decreases.
4. Verify boost line changes from `0.00%` to non-zero on affected saves after normalization.
5. Enter play mode after domain reload and verify no startup null errors from `ResearchPresenter` before load completion.
