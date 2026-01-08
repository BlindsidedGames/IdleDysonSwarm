# STRUCTURE

## Root
- `Assets/` game content, scripts, scenes, plugins.
- `Packages/` Unity package manifest and lock data.
- `ProjectSettings/` Unity project configuration.
- `Library/`, `Temp/`, `Logs/`, `UserSettings/` generated Unity output (not source).

## Assets
- `Assets/Scenes/` game scenes (`Load.unity`, `Game.unity`).
- `Assets/Scripts/` gameplay code.
  - `Assets/Scripts/Systems/` core gameplay loop, production, UI helpers.
  - `Assets/Scripts/Expansion/` Oracle, research, and Dream1 era systems.
  - `Assets/Scripts/Buildings/` building logic and UI managers.
  - `Assets/Scripts/SkillTresStuff/` skill tree logic and UI.
  - `Assets/Scripts/Research/` research UI gating and helpers.
  - `Assets/Scripts/User Interface/` menus, panels, toggles, and debug UI.
  - `Assets/Scripts/NewsTicker/` news feed handling.
  - `Assets/Scripts/Blindsided/Utilities/` shared utility components.
- `Assets/Prefabs/` prefab variants (notably `Assets/Prefabs/Buildings/`).
- `Assets/Resources/` runtime resources (IAP catalog, audio).
- `Assets/Extensions/CloudOnce/` achievements/cloud save integration.
- `Assets/Plugins/` third-party plugins (Easy Save 3, Sirenix, StansAssets, platform plugins).
- `Assets/ExternalDependencyManager/` external dependency tooling.
- `Assets/MPUIKit/`, `Assets/TextMesh Pro/`, `Assets/Fonts/`, `Assets/Sprites/`, `Assets/Sounds/` assets and UI resources.
