# SaveRecoveryImportCoordinator

## Contract

`SaveRecoveryImportCoordinator` is the single explicit-import boundary for:

- The in-game clipboard confirmation.
- Blocking startup clipboard recovery.
- Quantum Console legacy ES3 recovery.
- Support-assisted save-file restore.

It accepts untrusted text or an immutable `SaveStorageCandidate`, prepares it through the configured
`CanonicalSaveStore`, establishes a fresh local lifecycle baseline, and performs a verified transactional canonical
write. A caller receives settings for runtime publication only after that write succeeds.

An existing canonical artifact requires an explicit caller-provided overwrite decision. The coordinator never infers
approval from artifact validity. Invalid, future-version, migration-failing, or write-failing imports return no
publishable settings.

## Data flow

1. Decode or prepare the candidate through `SavePreparationPipeline`.
2. Reject unsupported/future/invalid candidates without writes.
3. Reject replacement when canonical data exists and the caller has not recorded explicit approval.
4. Apply any caller-supplied local entitlement merge to the isolated prepared graph.
5. Clear `dateQuitString` and set a fresh local `lastSuccessfulLoadUtc`.
6. Re-prepare and write through `CanonicalSaveStore.TrySave`.
7. Let `OdinStringFileStorage` verify the exact temp bytes, preserve the previous canonical artifact, and atomically
   replace the primary.
8. Return the committed settings to the caller for optional runtime publication or clean startup reload.

The source artifact and any adapter-owned decoded object remain immutable throughout this process.

## Save/load implications

- Canonical output is uppercase `IDB1:` regardless of accepted input casing or legacy format.
- Imported historical quit timestamps cannot produce offline progress after import.
- A normal in-game clipboard import commits first and reloads scene zero; it does not publish decoded state before
  verification.
- Quantum Console recovery publishes only the committed prepared graph and relies on rotating canonical backups rather
  than a second bespoke copy/write path.
- Startup blocking recovery explicitly authorizes replacement because the player selected the import action while the
  current artifact was already blocking startup.
- `Oracle.LoadState(string)` remains available for compatibility but will not overwrite canonical data. Support tools
  that have recorded explicit approval must call `TryLoadState(path, true, out error)`.

## Performance and safety

Import is an explicit, infrequent operation. It may prepare twice: once to classify the untrusted source and once inside
the verified save transaction after lifecycle/local-state adjustments. Do not move this work into a frame loop.

Do not add publication callbacks inside the coordinator. Keeping publication in Oracle callers makes it impossible for a
failed storage transaction to mutate live game state.

## Quick verification

1. Run `SaveRecoveryStage4Tests`.
2. Run `StartupSaveRecoveryStage3Tests` to verify the blocking screen still uses the shared import path.
3. Run the full EditMode suite.
4. In a disposable save-data setup:
   - Import schema 7, schema 8, uppercase `IDB1:`, and lowercase `idb1:` samples.
   - Confirm stored output is uppercase `IDB1:`.
   - Confirm invalid input leaves the current canonical bytes unchanged.
   - Confirm legacy overwrite is rejected without the explicit command flag.
   - Confirm successful import reloads without granting the imported quit timestamp as offline time.
