# Idle Dyson Swarm

## Purpose
Idle Dyson Swarm is the primary Unity project for the game. This repository is the source of truth for gameplay behavior, editor tooling, content integration, and platform build configuration used to ship the title.

## Project Boundaries
- In scope: gameplay systems, save/load behavior, scenes, prefabs, content data assets, editor automation, build/upload tooling, and project documentation.
- Out of scope: direct maintenance of third-party plugin internals under `Assets/Plugins/**` unless explicitly requested.
- Shared utility code imported into this project is adapted and maintained here when used by game systems.

## Tech and Runtime
- Engine: Unity `6000.3.9f1`
- Language: C#
- Runtime targets: desktop + mobile
  - Desktop: Windows, Linux, macOS
  - Mobile: iOS, Android

## Clarifying Questions (Required)
Do not make assumptions.

If a request, requirement, expected behavior, acceptance criteria, asset reference, platform target, build step, or test/verification approach is ambiguous or underspecified, stop and ask clarifying questions before changing code/content.

If multiple interpretations are plausible, enumerate the competing interpretations briefly and ask which one is intended.

## Project Structure

### Root
- `.agents/workflows/` assistant workflow playbooks for common operations.
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
    - `Assets/Scripts/Systems/Balance/` runtime balance accessors, fallback catalogs, and validation helpers.
    - `Assets/Scripts/Systems/Save/` canonical save pipeline, lifecycle/offline-time seams (`IClock`, `ISaveStore`, `ILifecycleEvents`), recovery helpers.
  - `Assets/Scripts/Services/` service layer + service locator.
  - `Assets/Scripts/Data/` ScriptableObject definitions, IDs, and condition system.
    - `Assets/Scripts/Data/Balance/` ScriptableObject balance profiles/databases (`FacilityBalanceProfile`, `SimulationUpgradeDatabase`, `RealitySystemTuning`, registry).
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
  - `Assets/Editor/Balance/` balance data seeding utilities and the `BalanceTuningWindow`.

### Documentation
- `Documentation/ALLACHIEVEMENTS.md` and `Documentation/AchievementIdeas.md`.
- `Documentation/AchievementPackageForEve/` achievement package materials.
- `Documentation/Archive/` legacy plans, refactors, and notes.
- `Documentation/SaveBackups/` save data backups.
- `Documentation/savedebugging/` save debugging notes.
- `Documentation/Console/editor-console.json` Unity Editor log snapshot for assistants.

## Save System and Persistent Data Contract
- Canonical save authority is `Expansion.Oracle` (including persistence lifecycle entry points in `Oracle.Persistence` and seam wiring in `Oracle.RuntimeSeams`).
- Canonical save storage seam is `Systems.Save.SaveSystem`, routed through `Systems.Save.CanonicalSaveStore` (`ISaveStore`) and file storage adapters under `Systems.Save`.
- Save migration ordering/validation is controlled by `Systems.Migrations.MigrationRegistry` and executed by the migration runner pipeline.
- Canonical on-disk save path is `Application.persistentDataPath/idle_dyson_swarm_save.txt`.
- Canonical backup folder is `Application.persistentDataPath/save_backups`.
- Current save schema version is `11` and must remain aligned across migration registry latest version and Oracle save-version constants.
- Save contract rules:
  - Persist only durable game state required across sessions.
  - Do not persist transient scene object references, frame-only caches, or runtime-only handles.
  - New persistent fields must include safe defaults so older saves can load safely.
  - Any save-key/field/type changes require coordinated migration updates plus regression verification with pre-change saves.

## Documentation Maintenance (Required)
When editing any script (C# under `Assets/Scripts/**` or `Assets/Editor/**`, plus any build/tooling scripts in-repo), do a documentation pass as part of the same change.

If the code is unclear, do not guess. Use repo search to find who calls it / what it calls, inspect referenced assets (ScriptableObjects, prefabs, scenes), and then document what you learned in that same edit.

Minimum per-script documentation standard (in the file being edited):
- Add or update a top-of-file header comment with: purpose, where it runs (runtime/editor), primary entry points (Unity event methods, menu items, callbacks), and what it owns vs delegates.
- Add or update an "Interacts with" section listing the key classes/services it calls, and the key callers that invoke it (paths/class names).
- Add or update "Change notes": what breaks if you change public methods, events, serialized fields, save keys, or ScriptableObject IDs; list the other places/assets that must be updated together.

For complex/central scripts, also add/refresh a companion doc under `Documentation/Code/` (create folder as needed) named after the script/class. That doc should capture: contract/behavior expectations, data flow, save/load implications, performance pitfalls, and quick verification steps.

Any time you add a new system/service/subsystem, rename/move script folders, or change how major systems connect, update `AGENTS.md` (and `STRUCTURE.md` when it is a structural change) in the same PR.

Do not do "documentation cleanup" inside `Assets/Plugins/**` unless explicitly requested; instead document integration points and expectations in our code (and optionally `Documentation/Code/`).

## Inline XML Documentation Policy
- All C# scripts should maintain inline XML documentation comments (`///`) as part of normal development.
- Covered symbols:
  - Classes, structs, interfaces, enums, delegates
  - Constructors, methods, properties, indexers
- Access scope:
  - `public`, `protected`, `internal`, and `private` members are in scope.
- Required XML tags:
  - `<summary>` on every covered symbol.
  - `<param>` for each parameter on methods, constructors, delegates, and indexers.
  - `<returns>` for every non-void method and non-void delegate.
  - `<typeparam>` for each generic type or method parameter.
- Per-file strict change gate:
  - Any changed non-excluded `.cs` file should include XML doc (`///`) additions or edits in that same file in the same PR.
- Default exclusions from this policy:
  - `Assets/**/Generated/**`
  - `Assets/**/Plugins/**`
  - `Assets/**/ThirdParty/**`
- Exceptions:
  - Temporary bypasses must use `DOC-EXCEPTION:` and include reason, expiry date, and reviewer handle.
  - `DOC-EXCEPTION: <reason> | expires: YYYY-MM-DD | approved-by: @reviewer`
  - Missing expiry date or missing reviewer approval is invalid.
  - Expired exceptions are invalid.

## Engineering Conventions
- Primary source code lives in `Assets/Scripts/` and `Assets/Editor/`.
- Keep systems modular and testable.
- Avoid hardcoded scene dependencies unless required.
- Keep utility code generic and reusable.
- Preserve behavior unless a behavior change is explicitly requested.
- Validate compilation and targeted tests for the changed surface.
- Console log buffer lives in `Assets/Editor/ConsoleLogBuffer.cs` and writes filtered logs to `Documentation/Console/editor-console.json`. Filters/clear: `Tools/Console Log Buffer/...`.
- Offline progression lifecycle routing flows through `Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs` + `Assets/Scripts/Systems/Save/OfflineLifecycleCoordinator.cs`; update `Documentation/Code/OfflineProgressExecutionMap.md` when this wiring changes.

## Delivery Workflow
- Use feature branches and PR review before merge to mainline.
- Keep commits scoped to coherent logical changes.
- Validate compilation and relevant tests before merge.
- Document release/versioning or migration impacts in docs/changelog as applicable.
- For save/persistence-related changes:
  - Run targeted migration and load/save regression checks.
  - Verify no data loss with representative existing saves.
- For tooling/process updates:
  - Keep `.agents/workflows/` and `AGENTS.md` aligned.

## Steam Build/Upload (Windows + Desktop)
When asked to do a Steam build/upload for Idle Dyson Swarm:
- Steam AppID: `4348570`.
- Depot IDs:
  - Windows: `4348571`
  - Linux: `4348572`
  - macOS: `4348573`

Windows-only upload flow:
- Ensure the Windows build output exists at `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Windows`.
- Upload via SteamCMD using `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/upload_idle_dyson_swarm_windows.sh`.
- SteamCMD VDFs:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/app_build_4348570_windows.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348571_windows.vdf`

Desktop multi-depot upload flow:
- Ensure build outputs exist at:
  - `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Windows`
  - `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Linux`
  - `/Users/matthewrushworth/Builds/Idle Dyson Swarm/MacOS`
- Upload via SteamCMD using `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/upload_idle_dyson_swarm_desktop.sh`.
- SteamCMD VDFs:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/app_build_4348570_desktop.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348571_windows.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348572_linux.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348573_macos.vdf`
