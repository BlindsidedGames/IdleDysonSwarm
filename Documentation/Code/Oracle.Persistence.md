# Oracle.Persistence

## Contract / behavior expectations
- `Load()` prefers canonical save storage first (`idle_dyson_swarm_save.txt`).
- Canonical load/save routes through `IPreparedSaveStore` (default `CanonicalSaveStore`) and publishes canonical settings only after decode, schema gate, deep-copy migration/normalization, and validation succeed.
- Production startup delegates selection to `Oracle.StartupRecovery` and `StartupSaveRecoveryCoordinator`.
- A valid primary publishes without a write. Otherwise canonical temp/backups are prepared newest-first; the first valid candidate is restored with the verified transactional writer, followed by explicit legacy candidates if needed.
- Any encountered future schema stops fallback. All-invalid or recovery-write-failed outcomes preserve artifacts and block startup, canonical writes, offline replay, and new-save creation.
- A true first run is only the no-artifact outcome; undecodable legacy paths count as artifacts.
- Successful automatic recovery is logged but does not interrupt the player.
- Narrow tests that inject a non-production `ISaveStore` retain the prior compatibility load path.
- Cold start now opens a replay gate (`_coldStartReplayPending`) that allows at most one lifecycle save before replay completes, and suppresses quit-timestamp updates during that gated save.
- Startup replay now runs one frame after `Load()` (`yield return null`) instead of a fixed `0.1s` delay.
- After replay applies with a quit timestamp input, `dateQuitString` is consumed in memory (cleared) to reduce duplicate replay windows.

## Data flow
1. `Load()` resets in-memory state with `WipeSaveData()`.
2. Production `CanonicalSaveStore` startup discovers canonical and explicit legacy candidates without mutation.
3. `StartupSaveRecoveryCoordinator` prepares in order:
   - primary,
   - canonical temp/backups newest-first,
   - explicit legacy candidates newest-first.
4. Primary success publishes directly. A recovery winner is transactionally committed before publication.
5. `StartupRecoveryPublicationGate` authorizes exactly one `ApplyLoadedSettings()` call and one replay schedule.
6. Blocking outcomes keep the persistent Load-scene canvas open and pause scaled gameplay.
7. Replay coroutine runs one frame later only after successful publication:
   - computes away span (`AwayForSeconds`)
   - dispatches `AwayFor` subscribers
   - consumes `dateQuitString` in memory when replay used quit timestamp input
8. Cold-start gate releases and autosave readiness is restored.

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
- Canonical file path is managed by `SavePaths`; changing path/name requires coordinated temp/backup discovery, wipe, and recovery updates.
- Verified canonical writes create/read/prepare a temp file before backing up and atomically replacing canonical data.
- A failed primary is preserved as a rotating backup before a verified recovery winner replaces canonical storage.
- Startup clipboard import clears historical `dateQuitString`, records a fresh successful-load timestamp, commits transactionally, then reloads from scene zero.
- Blocking support export copies artifact bytes into a new local folder and never moves or overwrites sources.

## Performance pitfalls
- Artifact recovery can scan multiple files (`main`, `.bac`, `.tmp.bak`, `.tmp`, `.corrupt.*`), so avoid expensive parsing in each probe.
- Keep heavy deserialization off hot loops; startup load path runs on app launch and scene entry.

## Quick verification steps
1. Run EditMode headless tests:
   - `OfflineAwayTimeCalculatorTests`
   - `OfflineLifecycleCoordinatorTests`
   - `OfflinePersistenceRegressionTests`
   - `OracleColdStartOfflineReplayGateTests`
2. Launch with valid canonical save: confirm `Loaded with canonical save file` and no second migration pass.
3. Remove canonical file but keep valid ES3 file: confirm ES3 fallback loads and canonical file is rewritten.
4. Provide AES-encrypted `SaveFile.es3` legacy artifact: confirm recovery succeeds (no `unrecoverable` archive on first run with fix).
5. With an invalid canonical plus valid backup: confirm silent automatic restore and failed-primary backup preservation.
6. With all invalid or future-version artifacts: confirm the blocking Load-scene panel appears, gameplay remains paused, and no offline replay/write occurs.
7. Verify copy/details/export actions are non-destructive and reset requires arm then confirm.
