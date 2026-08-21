# OdinStringFileStorage

## Contract

`Systems.Save.OdinStringFileStorage` owns canonical, temporary, and rotating-backup filesystem behavior. It does not decide whether save data is semantically valid; `SaveSystem` supplies a verifier backed by `SavePreparationPipeline`.

A verified transaction:

1. Writes prepared canonical text to the known same-directory `.tmp` path.
2. Reads the exact temp bytes back.
3. Runs the supplied semantic verifier.
4. Copies the prior canonical artifact into the backup folder.
5. Atomically replaces or moves the verified temp into the canonical path.
6. Prunes backups deterministically after successful replacement.

Any verification, backup, or replacement failure preserves the previous canonical file and leaves the temp artifact available for recovery inspection.

## Candidate discovery

Read-only discovery returns:

1. Primary canonical artifact, if present.
2. Known interrupted-write `.tmp` artifact, if present.
3. Rotating backups ordered newest-first by last-write UTC, then descending ordinal path.
4. Explicit legacy candidates supplied by existing adapters, sorted deterministically by source, timestamp, and path.

Discovery never repairs, prunes, renames, deletes, or rewrites artifacts.

## Save/load implications

- At least one rotating backup is retained.
- Backup creation is required before replacing an existing canonical artifact.
- Failed replacement can leave both a preserved backup and verified temp; this is intentional support/recovery evidence.
- Direct `TryWriteTextAtomic` is a compatibility primitive. Canonical production writes use `TryWriteTextVerified`.

## Performance pitfalls

- Backup copies and temp verification perform extra filesystem IO on every overwrite.
- Candidate discovery reads directory metadata but not candidate contents.
- Backup pruning is bounded by the configured maximum (clamped to 1-50).

## Quick verification

1. Run `TransactionalSaveStage2Tests`.
2. Inject replacement failure and confirm canonical bytes are unchanged.
3. Write invalid temp text and confirm it never replaces canonical.
4. Verify backup ordering/pruning and discovery immutability.
5. Confirm lowercase text changes on disk only after a successful prepared transaction.
