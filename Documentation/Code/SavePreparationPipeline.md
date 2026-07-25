# SavePreparationPipeline

## Contract

`Systems.Save.SavePreparationPipeline` is the only boundary that turns untrusted save text or caller-owned settings into publishable/persistable state. A successful result contains an isolated deep copy, schema 11 normalized data, completed validation, and uppercase `IDB1:` canonical text. A failed result contains classification and diagnostics but never exposes settings or canonical output.

The stages are fixed:

1. Decode supported text and classify decode failures.
2. Reject schemas newer than 11 before migration or normalization.
3. Deep-copy decoded/caller-owned state.
4. Run Oracle's production migration and normalization against the copy.
5. Validate required containers, durable identifiers and skill-state values, dense facility arrays, and finite numeric state.
6. Serialize only the validated copy into uppercase canonical output.

## Data flow

Runtime Oracle creates the pipeline with `CreateSavePreparationPipeline()` and supplies `RunPreparedSaveMigration()` as the migration delegate. That delegate temporarily points Oracle at the isolated copy, runs the production registry/ensure action without timestamp updates, and restores the prior Oracle reference before returning.

`SaveSystem.TryLoad` returns `PreparedSaveResult.Settings` only after all stages succeed. `SaveSystem.TrySave` prepares the caller's snapshot first, then passes only `PreparedSaveResult.CanonicalText` to transactional storage.

## Save/load implications

- Decoded source objects, fixture artifacts, and caller-owned runtime snapshots are never mutated.
- Future, corrupt, migration-failing, invalid-shape, null skill-state, and non-finite candidates are non-publishable and non-committable.
- Current-schema-only tools may use `CreateCurrentSchemaOnly(11)`; it deliberately rejects older schemas because it has no Oracle migration context.
- Lowercase `idb1:` input remains accepted, but prepared canonical output is always uppercase.

## Performance pitfalls

- Deep copy, migration, validation traversal, Odin serialization, and gzip operate on the complete save graph.
- Preparation belongs on load/save/recovery boundaries, never in frame loops.
- Temp verification performs a second preparation pass to prove exact on-disk bytes round-trip to the intended canonical snapshot.

## Quick verification

1. Run `SavePreparationPipelineTests`.
2. Confirm all three immutable fixtures prepare to schema 11.
3. Confirm source hashes remain unchanged.
4. Confirm future/migration/null-skill-state/non-finite failures expose no settings or canonical text.
5. Confirm successful output begins with uppercase `IDB1:`.
