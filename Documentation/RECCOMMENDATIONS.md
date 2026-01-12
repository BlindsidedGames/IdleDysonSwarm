# RECCOMMENDATIONS

## Top impact refactors (start here)
1. Split the monolithic gameplay loop in `Assets/Scripts/Systems/GameManager.cs` into focused systems
   (production, prestige, offline progress, UI presenter). Move pure math into non-MonoBehaviour classes
   so it is testable and not tied to `Update`/`InvokeRepeating`.
2. Decompose `Assets/Scripts/Expansion/Oracle.cs` into SaveSystem, SkillTreeSystem, and external services
   (news/IAP checks). Keep the singleton thin and stop it from owning UI references directly.
3. Consolidate duplicated utilities into single sources with clear namespaces:
   - `SlicedFilledImage` exists in both `Assets/Scripts/Systems` and `Assets/Scripts/Blindsided/Utilities`.
   - `CalcUtils` exists in both `Assets/Scripts/Systems` and `Assets/Scripts/Blindsided/Utilities`.
   - `CategoryStateSaver` exists in `Assets/Scripts/Blindsided/Utilities` and `Assets/Scripts/User Interface`.
4. Replace magic arrays and boolean fields in save data with typed structs/enums or data-driven tables
   (ScriptableObject definitions for buildings, skills, and research). This will simplify balance changes
   and shrink method size in `GameManager` and `ResearchManager`.
5. Introduce save-data versioning and migrations. Move nested save classes out of `Oracle.cs` into their
   own files and add a version field in `SaveDataSettings` to keep backwards compatibility.

## Refactor opportunities by area
- Production + modifiers: Extract shared multiplier logic (planet/server/manager/etc) into reusable
  functions or a `BuildingProductionCalculator`. The methods in `GameManager` repeat the same thresholds
  and scaling patterns.
- Skill tree: Replace the giant `DysonVerseSkillTreeData` boolean list with a map of skill IDs to state;
  keep skill definitions in ScriptableObjects to drive UI, costs, and unlock logic.
- Research: Break `Assets/Scripts/Expansion/ResearchManager.cs` into per-era or per-research modules and
  load research definitions from data instead of hard-coded branches.
- UI updates: Replace frequent polling (`InvokeRepeating` and per-frame checks) with event-driven refreshes
  triggered by state changes to reduce UI churn and improve clarity.

## Cleanup and maintainability
- Standardize namespaces for internal code (many classes are in the global namespace); adopt a
  folder-to-namespace mapping to prevent collisions.
- Separate Editor-only utilities into an `Editor` folder to avoid runtime assembly bloat.
- Add tests for the extracted calculators once they become pure classes (Unity Test Framework is already available).
