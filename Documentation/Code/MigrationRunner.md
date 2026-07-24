# MigrationRunner

## Contract

`Systems.Migrations.MigrationRunner` executes the ordered registry supplied by `Oracle.Migrations`. It must reject a save whose schema is newer than `MigrationRegistry.LatestVersion` before it creates a migration context, applies a step, or invokes the ensure/normalization action.

Callers that require transactional behavior must provide an isolated deep copy. A failed run may leave that working copy partially changed, but the original decoded object and source artifact remain untouched.

## Data flow

1. Capture the selected `Oracle.saveSettings` reference and initial version.
2. Reject null or future-version input.
3. Use the caller-selected original or dry-run copy.
4. Apply registry steps in ascending target-version order.
5. Run the optional ensure action only for supported schemas.
6. Capture snapshots and return a `MigrationRunResult`.
7. Restore the original Oracle reference after a dry run.

## Save/load implications

- `MigrationRegistry.LatestVersion` must remain aligned with `Oracle.CurrentSaveVersion`.
- Future-version rejection prevents downgrade and normalization of unsupported data.
- Production load orchestration remains responsible for publishing only a successful prepared copy.
- `UpdateLastSuccessfulLoadUtc` is disabled in deterministic fixture characterization so migration tests do not introduce clock-driven state.

## Performance pitfalls

- Snapshot capture and Odin deep copies allocate full save graphs.
- Ensure actions can traverse skill/research registries and facility arrays; keep them outside frame loops.

## Quick verification

1. Run `SaveMigrationFixtureCharacterizationTests`.
2. Confirm schema 7 and schema 8 fixtures reach schema 11 on deep copies.
3. Confirm repeated migration is deterministic and idempotent.
4. Confirm future schema input returns failure with zero steps and unchanged unnormalized fields.
5. Confirm injected migration failure leaves the original decoded object and fixture hashes unchanged.
