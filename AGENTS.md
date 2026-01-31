# AGENTS

This file is a lightweight, human-readable map of the project so future agents can orient quickly.

## Project structure (high level)

### Root
- `Assets/` Unity assets, code, scenes, prefabs, plugins.
- `Packages/` Unity package manifest + lock data.
- `ProjectSettings/` Unity project configuration.
- `Library/`, `Temp/`, `Logs/`, `UserSettings/` generated Unity output (not source).
- `Documentation/` project docs, plans, and references.
- `Recordings/` image sequences and captures.

### Assets
- `Assets/Scenes/` game scenes (e.g., `Load.unity`, `Game.unity`).
- `Assets/Scripts/` gameplay and UI code.
  - `Assets/Scripts/Systems/` core gameplay systems, stats, facilities, migrations, platform, audio.
  - `Assets/Scripts/Services/` service layer + service locator.
  - `Assets/Scripts/Data/` ScriptableObject definitions, IDs, and condition system.
  - `Assets/Scripts/Buildings/` building logic and presenters.
  - `Assets/Scripts/Expansion/` Oracle, research, Dream1 era logic.
  - `Assets/Scripts/Research/` research UI helpers.
  - `Assets/Scripts/SkillTreeStuff/` skill tree logic and UI.
  - `Assets/Scripts/User Interface/` UI panels, toggles, side-panel logic.
  - `Assets/Scripts/UI/` UI theme and simulation types.
  - `Assets/Scripts/NewsTicker/` news feed handling.
  - `Assets/Scripts/Blindsided/Utilities/` shared utility components.
- `Assets/Prefabs/` prefab variants (notably `Assets/Prefabs/Buildings/`).
- `Assets/Resources/` runtime resources (IAP catalog, audio).
- `Assets/Plugins/` third-party plugins (Easy Save 3, Sirenix, Google Play Games, etc.).
- `Assets/MPUIKit/`, `Assets/TextMesh Pro/`, `Assets/Fonts/`, `Assets/Sprites/`, `Assets/Sounds/` UI + art assets.
- `Assets/Extensions/` platform extensions (Google Play Games, etc.).
- `Assets/Editor/` editor tooling and validation helpers.

### Documentation
- `Documentation/ALLACHIEVEMENTS.md` and `Documentation/AchievementIdeas.md`.
- `Documentation/Archive/` legacy plans, refactors, and notes.

## Notes
- Primary source code lives in `Assets/Scripts/` and `Assets/Editor/`.
- Avoid modifying third-party code under `Assets/Plugins/` unless explicitly requested.
