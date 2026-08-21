---
description: Upload Idle Dyson Swarm builds to Steam via SteamCMD for Windows-only or desktop multi-depot targets.
---

# Steam Upload

Upload Idle Dyson Swarm builds to Steam via SteamCMD.

## IDs
- AppID: `4348570`
- Depots:
  - Windows: `4348571`
  - Linux: `4348572`
  - macOS: `4348573`

## Build source
Build the Electron packages from `Web/` with the matching
`native:electron:package:*` npm script, then copy the reviewed package into the
SteamCMD content root configured by the upload script. Never source a depot
from the archived Unity branch.

## Upload Scripts
- Windows only:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/upload_idle_dyson_swarm_windows.sh`
- Desktop multi-depot:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/upload_idle_dyson_swarm_desktop.sh`

## VDF Files
- Windows only:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/app_build_4348570_windows.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348571_windows.vdf`
- Desktop multi-depot:
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/app_build_4348570_desktop.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348571_windows.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348572_linux.vdf`
  - `/Users/matthewrushworth/Builds/steamcmd/Scripts/idle-dyson-swarm/depot_build_4348573_macos.vdf`

## Workflow
1. Preflight checks:
   - Verify target build output folder(s) exist.
   - Verify expected script + VDF paths exist.
2. Choose upload mode:
   - Windows-only upload when only Windows build is being shipped.
   - Desktop multi-depot when Windows/Linux/macOS builds are all ready.
3. Execute upload script.
4. Parse SteamCMD output and report:
   - Success/failure.
   - BuildID.
   - First actionable error if failed.

## Troubleshooting
- Missing build folder/output: build and review the matching Electron package.
- Missing SteamCMD script or VDF: restore script set before upload.
- Auth failures: re-auth in SteamCMD environment and retry.
- Partial depot upload failure: rerun after fixing the failed platform payload.
