# Oracle.Persistence

## Contract / behavior expectations
- `Load()` must prefer canonical save storage first (`idle_dyson_swarm_save.txt`) and only fall back to legacy sources when canonical load is missing or invalid.
- Canonical load/save now routes through `ISaveStore` (default `CanonicalSaveStore`) rather than directly constructing `SaveSystem` at each call site.
- Legacy fallback selection is version/timestamp/source-priority based through `SaveLoadCandidateSelector`.
- If no candidate can be loaded and ES3 access was broken, legacy ES3 artifacts are archived as `.corrupt.*` for support triage.
- If load succeeds from any legacy source, canonical save is immediately rewritten so subsequent launches avoid legacy paths.
- Cold start now opens a replay gate (`_coldStartReplayPending`) that allows at most one lifecycle save before replay completes, and suppresses quit-timestamp updates during that gated save.
- Startup replay now runs one frame after `Load()` (`yield return null`) instead of a fixed `0.1s` delay.
- After replay applies with a quit timestamp input, `dateQuitString` is consumed in memory (cleared) to reduce duplicate replay windows.

## Data flow
1. `Load()` resets in-memory state with `WipeSaveData()`.
2. Attempts canonical load via `_saveStore` (`CanonicalSaveStore -> SaveSystem`).
3. If needed, probes:
   - `ES3` default key (`saveSettings`),
   - `LegacyEs3Save.TryRecoverDefaultSave` (main + backup + archived artifacts),
   - legacy Odin JSON (`betaTestTwo.idsOdin`).
4. Best candidate is applied with `ApplyLoadedSettings()`.
5. Migrations run (`ApplyMigrations()`), runtime sync hooks run.
6. Replay coroutine runs one frame later:
   - computes away span (`AwayForSeconds`)
   - dispatches `AwayFor` subscribers
   - consumes `dateQuitString` in memory when replay used quit timestamp input
7. Cold-start gate releases and autosave readiness is restored.

## Offline timing diagnostics
- Runtime emits `[OfflineTimeDiag]` warnings from:
  - `Oracle.RuntimeSeams` lifecycle router (`OnApplicationQuit`, `OnApplicationFocus`, `OnApplicationPause`) via `OfflineLifecycleCoordinator` -> `SaveForQuit`
  - `Oracle.SaveInternal` (save lifecycle snapshots when quit timestamp is updated or save fails)
  - `Oracle.AwayForSeconds` via `OfflineAwayTimeCalculator` (chosen source, parsed timestamps, and resolved away span)
  - `Systems.OfflineProgressSystem.ApplyReturnValues` (pre/post `offlineTime` grant)
  - cold-start gate transitions and lifecycle save debounce reasons:
    - `cold_start_gate_pending`
    - `cold_start_gate_debounced`
    - `cold_start_gate_released`
    - `quit_timestamp_consumed_in_memory`

## Save lifecycle semantics
- `Oracle.Save()` is a regular autosave path and **does not** update `dateQuitString`.
- `Oracle.SaveForQuit()` writes the quit timestamp only when the runtime is ready + loaded (`_isSaveReady && Loaded && saveSettings != null`).
- Exception: during cold-start replay gate, one lifecycle save is allowed with `force:true` and `updateQuitTime:false` even when `_isSaveReady` is false.
- Additional lifecycle saves during the same cold-start gate are debounced (skipped).
- Quit timestamp writes now use `IClock.UtcNow` seam to support deterministic tests.
- `Oracle.SaveForQuit()` is called from:
  - `OfflineLifecycleCoordinator` callbacks from `Oracle` lifecycle events:
    - `OnApplicationQuit`
    - `OnApplicationFocus` when focus is lost (non-editor builds)
    - `OnApplicationPause` while paused (iOS/Android)
- `Oracle.SaveInternal` now uses `SetDateQuitString(string value, bool isQuitTimestamp = false)` to update `dateQuitString` only when `isQuitTimestamp` is explicitly true.
- `Oracle.SaveForQuit()` now emits `[OfflineTimeDiag] SaveForQuitBlocked` when lifecycle persistence is attempted before readiness/loading and skips writing.
- Replay consumption is memory-only by design choice: `dateQuitString` is cleared after replay but not immediately persisted unless another save occurs.

## Save/load implications
- Legacy ES3 key name remains `saveSettings`; changing this breaks import of historic installs.
- Legacy Odin filename remains derived from `fileName` (`betaTestTwo.idsOdin`).
- Canonical file path is managed by `SavePaths`; changing path/name requires coordinated wipe/recovery updates.
- Recovery behavior relies on `LegacyEs3Save` trust ordering; changing it can alter which artifact wins for users with multiple backups.

## Performance pitfalls
- Artifact recovery can scan multiple files (`main`, `.bac`, `.tmp.bak`, `.tmp`, `.corrupt.*`), so avoid expensive parsing in each probe.
- Keep heavy deserialization off hot loops; startup load path runs on app launch and scene entry.

## Quick verification steps
1. Run EditMode headless tests:
   - `OfflineAwayTimeCalculatorTests`
   - `OfflineLifecycleCoordinatorTests`
   - `OfflinePersistenceRegressionTests`
   - `OracleColdStartOfflineReplayGateTests`
2. Launch with valid canonical save: confirm `Loaded with canonical save file`.
3. Remove canonical file but keep valid ES3 file: confirm ES3 fallback loads and canonical file is rewritten.
4. Provide AES-encrypted `SaveFile.es3` legacy artifact: confirm recovery succeeds (no `unrecoverable` archive on first run with fix).
5. With only invalid artifacts: confirm archive still occurs and a new save is created.
