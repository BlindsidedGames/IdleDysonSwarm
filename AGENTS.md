# Idle Dyson Swarm

## Scope and orientation

This Unity repository is the source of truth for Idle Dyson Swarm gameplay, content, tooling, platform configuration, and project documentation. Use the Unity version declared in the tracked `ProjectSettings/ProjectVersion.txt`; it is authoritative as the project is upgraded. Target platforms are Windows, Linux, macOS, iOS, and Android.

Start with [STRUCTURE.md](STRUCTURE.md) for the project map and `.agents/workflows/` for task-specific procedures (including Steam upload). Do not maintain third-party internals under `Assets/Plugins/**` unless explicitly requested; document or change our integration code instead. `Library/`, `Temp/`, and `Logs/` are generated. `UserSettings/` is mostly generated, but includes tracked project files: inspect version control before treating any of it as disposable.

## Work safely

Do not guess. If the requested behaviour, target platform, asset, acceptance criteria, or validation approach is unclear or has multiple reasonable interpretations, stop and ask for direction before changing code or content. Preserve existing behaviour unless a behaviour change is requested, and keep changes within the requested scope.

Player save fixtures owned by the user, or explicitly authorized by the user for repository use, may be committed when needed for regression coverage. Never commit personally identifiable information, including account identifiers, or unrelated personal context. Retain only the payload data necessary for the test, and redact or remove PII and extraneous support or mailbox material before committing.

## Save and offline-progress contract

The canonical save authority is `Expansion.Oracle`; persistence lifecycle and runtime seams live in `Oracle.Persistence` and `Oracle.RuntimeSeams`. Storage flows through `Systems.Save.ISaveStore` / `CanonicalSaveStore` and `SaveSystem`; migration ordering is owned by `Systems.Migrations.MigrationRegistry`. Do not create a parallel save path.

Persist only durable state. Give new persisted fields safe defaults, and coordinate every save key, field, type, or schema change with migrations and representative legacy-save regression coverage. Keep `Oracle`'s current save version aligned with the migration registry. The canonical file and backup locations are defined by `Systems.Save.SavePaths`; do not hard-code alternatives.

Offline progression is routed through `Oracle.RuntimeSeams` and `Systems.Save.OfflineLifecycleCoordinator`. When changing that wiring, update [OfflineProgressExecutionMap.md](Documentation/Code/OfflineProgressExecutionMap.md). See [OfflineProgressSystem.md](Documentation/Code/OfflineProgressSystem.md), [LegacyEs3Save.md](Documentation/Code/LegacyEs3Save.md), and [SaveWipeCoordinator.md](Documentation/Code/SaveWipeCoordinator.md) for detailed contracts.

## Engineering and delivery

Keep gameplay systems modular and avoid hard-coded scene dependencies unless required. For changed public-facing or non-obvious C# symbols, add or refresh concise XML documentation that explains the contract; update nearby documentation when behaviour, persistence, assets, or system wiring changes.

Run the smallest relevant compile/test or editor validation for the changed surface. Save changes require targeted migration, load/save, and offline-progress regression checks using safe fixtures. Keep commits focused; use a feature branch and review before merging. Document migration or release impact when applicable.
