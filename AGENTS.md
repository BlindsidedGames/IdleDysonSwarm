# AGENTS

This file is a lightweight, human-readable map of the project so future agents can orient quickly.

## Clarifying questions (required)
Do not make assumptions.

If a request, requirement, expected behavior, acceptance criteria, asset reference, platform target, build step, or test/verification approach is ambiguous or underspecified, stop and ask the user clarifying questions before changing code/content.

If multiple interpretations are plausible, enumerate the competing interpretations briefly and ask which one is intended.

## Project structure (high level)

### Root
- `Assets/` Unity assets, code, scenes, prefabs, plugins.
- `Packages/` Unity package manifest + lock data.
- `ProjectSettings/` Unity project configuration.
- `Library/`, `Temp/`, `Logs/`, `UserSettings/` generated Unity output (not source).
- `Documentation/` project docs, plans, and references.
- `Documentation/Code/` (create as needed) design/contract notes for complex or central scripts.
- `Recordings/` image sequences and captures.
- `STRUCTURE.md` additional high-level project map.
- `UIElementsSchema/` UIElements schema assets.
- `steam_appid.txt` Steam AppID for local runs.

### Assets
- `Assets/Scenes/` game scenes (e.g., `Load.unity`, `Game.unity`).
- `Assets/Scripts/` gameplay and UI code.
  - `Assets/Scripts/Systems/` core gameplay systems, stats, facilities, migrations, platform, audio.
  - `Assets/Scripts/Services/` service layer + service locator.
  - `Assets/Scripts/Data/` ScriptableObject definitions, IDs, and condition system.
  - `Assets/Scripts/Buildings/` building logic and presenters.
  - `Assets/Scripts/Classes/` shared classes and helpers.
  - `Assets/Scripts/Expansion/` Oracle, research, Dream1 era logic.
  - `Assets/Scripts/Incremental/` incremental game loop logic.
  - `Assets/Scripts/Research/` research UI helpers.
  - `Assets/Scripts/SkillTreeStuff/` skill tree logic and UI.
  - `Assets/Scripts/User Interface/` UI panels, toggles, side-panel logic.
  - `Assets/Scripts/UI/` UI theme and simulation types.
  - `Assets/Scripts/UnityPurchasing/` in-app purchase integration.
  - `Assets/Scripts/Editor/` editor-side code in the Scripts tree.
  - `Assets/Scripts/NewsTicker/` news feed handling.
  - `Assets/Scripts/Blindsided/Utilities/` shared utility components.
- `Assets/Data/` top-level ScriptableObjects and config assets.
- `Assets/Prefabs/` prefab variants (notably `Assets/Prefabs/Buildings/`).
- `Assets/Presets/` Unity presets.
- `Assets/Resources/` runtime resources (IAP catalog, audio).
- `Assets/Editor Default Resources/` editor-only assets.
- `Assets/Plugins/` third-party plugins (Easy Save 3, Sirenix, Google Play Games, etc.).
- `Assets/ExternalDependencyManager/` EDM4U Google dependency manager.
- `Assets/KeyStore/` Android keystore material.
- `Assets/MPUIKit/`, `Assets/TextMesh Pro/`, `Assets/Fonts/`, `Assets/Sprites/`, `Assets/Sounds/` UI + art assets.
- `Assets/Extensions/` platform extensions (Google Play Games, etc.).
- `Assets/Editor/` editor tooling and validation helpers.

### Documentation
- `Documentation/ALLACHIEVEMENTS.md` and `Documentation/AchievementIdeas.md`.
- `Documentation/AchievementPackageForEve/` achievement package materials.
- `Documentation/Archive/` legacy plans, refactors, and notes.
- `Documentation/SaveBackups/` save data backups.
- `Documentation/savedebugging/` save debugging notes.
- `Documentation/Console/editor-console.json` Unity Editor log snapshot for agents.

## Notes
- Primary source code lives in `Assets/Scripts/` and `Assets/Editor/`.
- Avoid modifying third-party code under `Assets/Plugins/` unless explicitly requested.
- Console log buffer lives in `Assets/Editor/ConsoleLogBuffer.cs` and writes filtered logs to `Documentation/Console/editor-console.json`. Filters/clear: `Tools/Console Log Buffer/...`.

## Documentation maintenance (required)
When editing any script (C# under `Assets/Scripts/**` or `Assets/Editor/**`, plus any build/tooling scripts in-repo), do a documentation pass as part of the same change.

If the code is unclear, do not guess. Use repo search to find who calls it / what it calls, inspect referenced assets (ScriptableObjects, prefabs, scenes), and then document what you learned in that same edit.

Minimum per-script documentation standard (in the file being edited):
- Add or update a top-of-file header comment with: purpose, where it runs (runtime/editor), primary entry points (Unity event methods, menu items, callbacks), and what it owns vs delegates.
- Add or update an "Interacts with" section listing the key classes/services it calls, and the key callers that invoke it (paths/class names).
- Add or update "Change notes": what breaks if you change public methods, events, serialized fields, save keys, or ScriptableObject IDs; list the other places/assets that must be updated together.

For complex/central scripts, also add/refresh a companion doc under `Documentation/Code/` (create folder as needed) named after the script/class. That doc should capture: contract/behavior expectations, data flow, save/load implications, performance pitfalls, and quick verification steps.

Any time you add a new system/service/subsystem, rename/move script folders, or change how major systems connect, update `AGENTS.md` (and `STRUCTURE.md` when it's a structural change) in the same PR.

Do not do "documentation cleanup" inside `Assets/Plugins/**` unless explicitly requested; instead document integration points and expectations in our code (and optionally `Documentation/Code/`).

## Steam build/upload (Windows)
When asked to do a Windows Steam build/upload for Idle Dyson Swarm:
- Ensure the Windows build output exists at `C:\Users\mattr\Documents\Unity\Builds\IdleDysonSwarm`.
- Upload via SteamCMD using `C:\Users\mattr\Documents\steamcmd\Scripts\upload_idle_dyson_swarm_windows.bat`.
- Steam AppID: `4348570`, Windows depot: `4348571`.
- SteamCMD VDFs live at:
  - `C:\Users\mattr\Documents\steamcmd\Scripts\app_build_4348570_windows.vdf`
  - `C:\Users\mattr\Documents\steamcmd\Scripts\depot_build_4348571_windows.vdf`
