# Oracle.RecoveryCommands

## Contract / behavior expectations
- `recover` must be non-destructive and return the same indexed output as `recover-list`.
- `recover-list` must print all recoverable candidates with stable 1-based indexes.
- `recover-apply` must accept indexed selection (`recover-apply <index>`) and restore that candidate into live runtime state, run migrations, and write canonical save.
- If canonical save already exists, `recover-apply` must require explicit overwrite (`recover-apply <index> true`) to avoid accidental clobbering.
- Before overwrite, canonical save must be backed up into `SavePaths.GetBackupFolderPath()`.

## Data flow
1. Commands invoke `LegacyEs3Save.GetRecoverableCandidates()` to get best-first candidates.
2. `recover` delegates to `recover-list`.
3. List command returns all candidates with numbered selection lines.
4. Apply command:
   - validates index bounds,
   - validates overwrite flag against canonical presence,
   - backs up existing canonical save if overwrite is requested,
   - applies recovered settings (`ApplyLoadedSettings`),
   - runs migrations and preset sync,
   - writes canonical save via `SaveInternal(force: true, updateQuitTime: false)`.

## Save/load implications
- Recovery command writes canonical save immediately, making recovered data the new source of truth.
- Existing canonical save is only replaced when explicitly requested with overwrite flag.
- Backup files are named `manual_recover_preexisting_*.txt` to aid support workflows.

## Performance pitfalls
- Recovery probing deserializes legacy artifacts; avoid repeated command spam in one frame.
- The command intentionally performs full migration/save work and should be treated as an admin/support action.

## Quick verification steps
1. Run `recover` with archived `.corrupt.*` files present and verify numbered candidates print.
2. Run `recover-apply 2` while canonical save exists and verify command refuses overwrite.
3. Run `recover-apply 2 true` and verify:
   - backup file is created in save backup folder,
   - recovered save becomes active,
   - canonical save is rewritten.
