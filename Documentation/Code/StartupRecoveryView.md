# StartupRecoveryView

## Contract

`StartupRecoveryView` is the blocking player-facing surface hosted dynamically on the persistent canvas created by `Load.unity`. It receives an already classified `StartupRecoveryInteractionSession`; it does not implement save decoding, migration, candidate ordering, validation, storage replacement, or Oracle publication.

The view appears only for:

- unsupported future schema,
- all discovered candidates invalid,
- valid recovery candidate whose safe canonical restore failed.

## User-visible behavior

- Plain-language status explicitly says artifacts were preserved.
- `Copy Primary Save` copies raw primary text without changing it.
- `Copy Recovery Details` copies classifications, timestamps, and support paths.
- `Export Save Artifacts` creates a new byte-preserving local bundle under `save_recovery_exports`.
- `Import Save from Clipboard` prepares, clears historical replay input, transactionally commits, then reloads scene zero.
- `Reset Save...` only arms the warning; `Confirm Permanent Reset` is a distinct second action.
- Scaled gameplay is paused while blocked and restored before import reload or confirmed reset.

## Save/load implications

- The view is shown before Oracle closes the persistent Load-scene canvas.
- `Loaded` and save readiness remain false, canonical writes remain blocked, and offline replay is not scheduled.
- No button publishes directly into the partially initialized Game scene.
- Import preserves the failed primary through the normal transactional backup step.

## Performance pitfalls

- The UI is constructed once at runtime only for exceptional blocked startup.
- Artifact export can copy several save files and runs only after an explicit click.
- Support reports include local paths and should be shared deliberately by the player.

## Quick verification

1. Start with valid primary: no recovery panel appears.
2. Start with corrupt primary plus valid backup: automatic recovery is silent.
3. Start with all-invalid files: panel appears and game simulation is paused.
4. Exercise copy/details/export and verify source hashes/timestamps remain unchanged.
5. Click reset once, cancel, and verify no data changes; then verify the separate confirmation is required.
