# Offline Progress Execution Map

## Scope
- Runtime paths that influence:
  - save persistence correctness,
  - quit timestamp stamping,
  - away-time resolution,
  - offline-time grant/apply flow.
- Verified against current code in:
  - `Assets/Scripts/Expansion/Oracle.cs`
  - `Assets/Scripts/Expansion/Oracle.Persistence.cs`
  - `Assets/Scripts/Expansion/Oracle.RuntimeSeams.cs`
  - `Assets/Scripts/Expansion/Oracle.SaveScheduling.cs`
  - `Assets/Scripts/Systems/OfflineProgressSystem.cs`
  - `Assets/Scripts/Systems/GameManager.cs`
  - `Assets/Scripts/Systems/Save/*.cs` seam/store files

## Trigger -> Service -> Persistence -> Side Effect

### Startup load path
1. Trigger: `Oracle.Start()` (`Assets/Scripts/Expansion/Oracle.cs`)
2. Service chain:
   - `Load()`
   - canonical load via `_saveStore.TryLoad(...)` (`CanonicalSaveStore -> SaveSystem`)
   - legacy fallback selection (`SaveLoadCandidateSelector`, ES3 probes, legacy Odin file probes)
3. Persistence:
   - canonical: `ISaveStore` (`Assets/Scripts/Systems/Save/ISaveStore.cs`)
   - underlying storage: `SaveSystem` + `ISaveStorage` (`OdinStringFileStorage`)
4. Side effects:
   - `ApplyLoadedSettings(...)`
   - `ApplyMigrations()`
   - `AwayForCoroutine()` then `AwayForSeconds()`
   - autosave readiness via `SetSaveReady(true)`
   - canonical rewrite after legacy load

### Quit/background save path
1. Trigger:
   - `OnApplicationQuit()`
   - `OnApplicationPause(true)` (mobile, non-editor)
   - `OnApplicationFocus(false)` (non-editor)
2. Service chain:
   - callbacks raise `ManualLifecycleEvents`
   - `OfflineLifecycleCoordinator` maps event -> `OnLifecycleSaveRequested(phase)`
   - `SaveForQuit()`
   - `SaveInternal(force:false, updateQuitTime:true)`
   - `TrySaveState()`
3. Persistence:
   - `SetDateQuitString(_clock.UtcNow.ToString(...), isQuitTimestamp:true)`
   - snapshot compaction via `SaveSnapshotBuilder`
   - `_saveStore.TrySave(snapshot, ...)`
4. Side effects:
   - offline diagnostic logs (`[OfflineTimeDiag]`)
   - latest save state and quit timestamp persisted atomically

### Focus gain reload path (mobile builds)
1. Trigger: `OnApplicationFocus(true)` (mobile player builds)
2. Service chain:
   - callback raises `ManualLifecycleEvents`
   - `OfflineLifecycleCoordinator` invokes `OnLifecycleReloadRequested()`
   - `Load()`
3. Persistence:
   - `_saveStore.TryLoad(...)` canonical-first fallback flow
4. Side effects:
   - resolves away-time from persisted quit timestamp
   - invokes `AwayFor` event for offline grant path

### Away-time resolution + offline grant path
1. Trigger: `AwayForCoroutine()` -> `AwayForSeconds()` (`Oracle.Persistence`)
2. Service chain:
   - `OfflineAwayTimeCalculator.Compute(saveSettings)` using `IClock.UtcNow`
   - source priority: `dateQuitString` -> `dateStarted` -> runtime UTC fallback
   - clamps negative away-time to `0`
   - raises `AwayFor?.Invoke(clampedSeconds)`
3. Persistence touchpoints:
   - increments `saveSettings.sdPrestige.doubleTime`
4. Side effects:
   - `GameManager.ApplyReturnValues(double awayTime)` subscriber
   - `OfflineProgressSystem.ApplyReturnValues(...)`
   - mutates `saveSettings.offlineTime` capped by `saveSettings.maxOfflineTime`

### Offline time spend/apply path (user spends stored time)
1. Trigger: `OfflineTimeManager` button/slider actions
2. Service chain:
   - `GameManager.RunAwayTime(...)`
   - coroutine `OfflineProgressSystem.CalculateAwayValues(...)`
3. Persistence touchpoints:
   - consumes `saveSettings.offlineTime`
   - mutates runtime resources in `DysonVerseInfinityData`
4. Side effects:
   - return-screen UI text/progress updates

### Autosave path
1. Trigger: `Oracle.SaveScheduling.ScheduleAutoSave()` (`InvokeRepeating(nameof(Save), 60, 60)`)
2. Service chain:
   - `Save()` -> `SaveInternal(force:false, updateQuitTime:false)` -> `TrySaveState()`
3. Persistence:
   - canonical snapshot save through `_saveStore`
4. Side effects:
   - no quit timestamp overwrite on autosave

## Lifecycle permutation coverage in editor tests
- `Assets/Editor/Tests/Systems/OfflineLifecycleCoordinatorTests.cs`
  - `focus lost -> pause -> quit`
  - `pause true -> pause false -> quit`
  - rapid focus toggles
  - focus-gain reload enabled policy
  - unsubscribe/dispose behavior

## Offline/save regression coverage in editor tests
- `Assets/Editor/Tests/Systems/OfflineAwayTimeCalculatorTests.cs`
  - UTC parse + fallback + clamp behavior.
- `Assets/Editor/Tests/Systems/OfflineProgressSystemTests.cs`
  - positive/zero/negative/cap offline grant behavior.
- `Assets/Editor/Tests/Systems/OfflinePersistenceRegressionTests.cs`
  - matrix-driven reopen windows: 2m / 15m / 60m.
  - verifies latest progress persists and offline time is granted across repeated close/open cycles.
- `Assets/Editor/Tests/Save/CanonicalSaveStoreTests.cs`
  - canonical save-store roundtrip and latest-write-wins persistence.

## Headless test commands

### EditMode (primary)
```bash
/Applications/Unity/Hub/Editor/6000.3.7f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics -quit \
  -projectPath "/Users/matthewrushworth/Projects/Idle Dyson Swarm" \
  -runTests -testPlatform EditMode \
  -testResults "/Users/matthewrushworth/Projects/Idle Dyson Swarm/Documentation/TestResults/editmode-results.xml" \
  -logFile "/Users/matthewrushworth/Projects/Idle Dyson Swarm/Documentation/TestResults/editmode.log"
```

### PlayMode (smoke/integration when needed)
```bash
/Applications/Unity/Hub/Editor/6000.3.7f1/Unity.app/Contents/MacOS/Unity \
  -batchmode -nographics -quit \
  -projectPath "/Users/matthewrushworth/Projects/Idle Dyson Swarm" \
  -runTests -testPlatform PlayMode \
  -testResults "/Users/matthewrushworth/Projects/Idle Dyson Swarm/Documentation/TestResults/playmode-results.xml" \
  -logFile "/Users/matthewrushworth/Projects/Idle Dyson Swarm/Documentation/TestResults/playmode.log"
```

## Ranked fix proposal template from failing tests
1. Lifecycle save ordering/timing
   - Confirm: lifecycle test failures show missing save callback on expected transitions.
   - Falsify: callback counts are correct; failure is downstream persistence.
2. Timestamp normalization (UTC source/parsing)
   - Confirm: away-time calculator tests fail around offset/fallback/clamp expectations.
   - Falsify: away-time math is correct; failure is save timestamp not being written.
3. Stale write / latest-write loss
   - Confirm: save-store or regression test loads older snapshot after a newer save.
   - Falsify: latest-write always wins; issue is in grant/application path.
4. Profile/slot/load-source mismatch
   - Confirm: load candidate selection chooses unexpected source/version in diagnostics.
   - Falsify: canonical/expected candidate selected consistently.
