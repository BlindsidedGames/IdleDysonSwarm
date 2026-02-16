# MultiPlatformBuildMenu

## Contract and behavior expectations
- Script path: `Assets/Editor/MultiPlatformBuildMenu.cs`.
- Runs only in the Unity Editor via `MenuItem` commands under `Tools/Build/Idle Dyson Swarm/`.
- Exposes commands to:
1. Build iOS + Android + Windows + macOS + Linux.
2. Increment build numbers, then build iOS + Android + Windows + macOS + Linux.
3. Increment build numbers, then build iOS + Android.
4. Sync Android/iOS/bundle version numbers to highest + 1.
- Build folder policy:
1. Windows, Android, macOS, and Linux output folders are cleaned before build.
2. iOS output folder is created if missing and retained between builds.
- iOS build mode is append/update by default using `BuildOptions.AcceptExternalModificationsToPlayer`.

## Data flow
1. Collect enabled scenes from `EditorBuildSettings`.
2. Optionally synchronize build numbers through `PlayerSettings`.
3. Capture original build target, standalone scripting backend, and standalone architecture.
4. Force Standalone backend to `Mono2x` and build Windows.
5. Build Android and iOS using existing mobile flow.
6. Switch standalone backend to IL2CPP for desktop Steam targets.
7. Force standalone architecture to universal before macOS build, then build macOS.
8. Before Linux build, switch active target to `StandaloneLinux64`.
9. After target switch, wait (up to 120s) for Package Manager readiness: Linux SDK package present, a host Linux toolchain package present, and `StandaloneLinux64` target support reporting available.
10. Build Linux x64 desktop player when readiness checks pass; otherwise skip Linux with a specific reason.
11. Restore original standalone backend and standalone architecture.
12. Restore original active build target.
13. Show completion dialog with per-platform status (including explicit skip reasons).

## Save/load implications
- No runtime save/load behavior.
- No save keys, migration keys, or ScriptableObject IDs owned by this script.

## Performance and reliability pitfalls
- Switching active build target can trigger expensive reimports; the command builds sequentially and may take substantial editor time.
- If iOS append mode is changed back to `BuildOptions.None`, Unity may regenerate Xcode output behaviorally and overwrite local Xcode-side changes.
- If standalone backend restoration is removed, editor project defaults may remain pinned to IL2CPP after this command.
- If the explicit Windows Mono switch is removed on macOS hosts, Windows IL2CPP builds can fail due to unavailable backend support.
- If build support modules are missing, macOS/Linux targets are skipped with warnings; this is intentional fail-soft behavior.
- Standalone backend/architecture API calls use local compatibility wrappers with scoped deprecation suppression to avoid Unity API-variant warning noise.
- Linux package initialization can lag after module/package install; the script now switches to Linux target first and then polls Package Manager/toolchain readiness before Linux build to avoid immediate hard-fail when starting from a non-Linux active target.
- Build output root paths are hard-coded; external tooling/scripts depend on these paths and can break if changed.

## Steam desktop output expectations
- Windows: `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Windows/*.exe`
- macOS: `/Users/matthewrushworth/Builds/Idle Dyson Swarm/MacOS/*.app`
- Linux: `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Linux/*.x86_64`

## Quick verification steps
1. In Unity, run `Tools/Build/Idle Dyson Swarm/Build iOS + Android + Windows + macOS + Linux` once.
2. Confirm build summary includes Windows, Android, iOS, macOS, and Linux rows.
3. Confirm output artifacts exist in the expected roots for all available modules.
4. Confirm the iOS folder keeps local additions across repeated runs.
5. Confirm standalone backend/architecture values after completion match their pre-run values.
