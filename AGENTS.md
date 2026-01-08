# AGENTS

## Project overview
- Unity project: Idle Dyson Swarm (Unity 6000.3.0f1).
- Main scenes: `Assets/Scenes/Load.unity` (boot/load UI) and `Assets/Scenes/Game.unity` (gameplay).

## Core runtime
- `Assets/Scripts/Expansion/Oracle.cs` is the singleton for save/load, global state, skill tree data, and other services.
- `Assets/Scripts/Systems/GameManager.cs` owns production, progression, prestige, and much of the gameplay UI update loop.
- `Assets/Scripts/Expansion/ResearchManager.cs` and `Assets/Scripts/Expansion/Dream1/*` drive research and expansion content.

## Data + persistence
- Save data lives in `Oracle.SaveDataSettings` with nested DysonVerse and Prestige classes.
- Persistence uses Easy Save 3 (`ES3.Save/Load`) with an Odin-serialized fallback.
- When adding new fields, update defaults in `Oracle.WipeSaveData()` and consider migration logic in `Oracle.Load()`.

## UI + tooling
- UI uses TextMeshPro (`TMP_Text`) and custom UI components (for example, `SlicedFilledImage`).
- UI scripts are mostly under `Assets/Scripts/User Interface` and `Assets/Scripts/Systems`.

## Third-party packages
- Odin Inspector/Serialization (`Assets/Plugins/Sirenix`), Easy Save 3 (`Assets/Plugins/Easy Save 3`),
  CloudOnce (`Assets/Extensions/CloudOnce`), StansAssets, MPUIKit, ExternalDependencyManager.

## Safe change habits
- Many systems reference `Oracle.oracle.saveSettings` directly; avoid breaking serialization or renaming fields without migration.
- Large methods depend on call order (especially production calculations in `GameManager`); refactor incrementally and verify in Editor.
