---
name: steam-upload
description: "Upload a Steam build using SteamCMD. Use when the user asks to upload a Steam build, run SteamCMD, or uses commands like '/steam', '/steam upload', '/steam login', or '/steam publish'."
---

# Steam Upload

Upload Idle Dyson Swarm builds to Steam via SteamCMD.

## Quick Reference

| Item | Value |
|---|---|
| App ID | `4348570` |
| Windows Depot ID | `4348571` |
| SteamCMD root | `/Users/matthewrushworth/Builds/steamcmd` |
| Windows build output | `/Users/matthewrushworth/Builds/Idle Dyson Swarm/Windows` |
| App VDF | `/Users/matthewrushworth/Builds/steamcmd/scripts/idle-dyson-swarm/app_build_4348570_windows.vdf` |
| Depot VDF | `/Users/matthewrushworth/Builds/steamcmd/scripts/idle-dyson-swarm/depot_build_4348571_windows.vdf` |
| Saved username | `/Users/matthewrushworth/Builds/steamcmd/scripts/.steam_user` |

## Commands

### Login (one-time or when session expires)

```bash
/Users/matthewrushworth/Builds/steamcmd/scripts/steam_login_once.sh <steam_username>
```

This caches credentials so subsequent uploads don't require a password. The user may be prompted for a password and Steam Guard code interactively.

### Upload Windows build

```bash
/Users/matthewrushworth/Builds/steamcmd/scripts/idle-dyson-swarm/upload_idle_dyson_swarm_windows.sh
```

## Workflow

### Step 1: Preflight

Run these checks before uploading:

```bash
# Verify SteamCMD exists
test -x /Users/matthewrushworth/Builds/steamcmd/steamcmd.sh && echo "OK" || echo "MISSING"

# Verify build output exists and has an .exe
ls /Users/matthewrushworth/Builds/Idle\ Dyson\ Swarm/Windows/*.exe 2>/dev/null | head -1 || echo "NO EXE FOUND"

# Check if login is cached
cat /Users/matthewrushworth/Builds/steamcmd/scripts/.steam_user 2>/dev/null || echo "NO USER - login needed"
```

If the build directory is missing or has no `.exe`, tell the user to run the Unity build first.

If no cached username exists, run the login step first.

### Step 2: Login (if needed)

Only needed if there's no cached user or if auth has expired (upload fails with auth error).

```bash
/Users/matthewrushworth/Builds/steamcmd/scripts/steam_login_once.sh <username>
```

The user will need to enter their password and possibly a Steam Guard code interactively. Wait for completion.

### Step 3: Upload

```bash
/Users/matthewrushworth/Builds/steamcmd/scripts/idle-dyson-swarm/upload_idle_dyson_swarm_windows.sh
```

Wait for the command to complete (this can take a few minutes depending on build size).

### Step 4: Report

Parse the SteamCMD output and report:
- **Success/failure** status
- **BuildID** from the output (look for `Successfully finished appID 4348570 ... (BuildID ...)`)
- If failed: include the first actionable error message and suggest the next command to run

## Troubleshooting

| Problem | Solution |
|---|---|
| `steamcmd.sh not found` | SteamCMD not installed. Run `/Users/matthewrushworth/Builds/steamcmd/install_steamcmd.sh` |
| `No Steam username configured` | Run login step with username |
| Auth/password errors during upload | Re-run login step to refresh cached credentials |
| `No Windows .exe found` | Build hasn't been done yet. Build in Unity first. |
| `App VDF missing` | VDF config has been moved or deleted — check the scripts directory |

## Notes

- The depot VDF excludes `*_BurstDebugInformation_DoNotShip/*`, `*.DS_Store`, and `Thumbs.db` automatically.
- Build output logs go to `/Users/matthewrushworth/Builds/steamcmd/build_output`.
- This skill only handles Windows builds currently. Add new depot VDFs and update this skill for macOS/Linux.
