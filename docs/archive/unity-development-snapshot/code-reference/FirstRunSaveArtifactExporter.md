# FirstRunSaveArtifactExporter

## Contract

`Web.FirstRunSaveArtifactExporter` generates the Web backend's checked-in
first-run save artifact from the Unity production model. It must not duplicate
or hand-copy gameplay defaults. `Oracle.SaveDataSettings` field initializers and
nested constructors remain the source of truth.

The exporter sets only two values:

- `saveVersion`, reflected from `Oracle.CurrentSaveVersion`.
- `dateStarted`, fixed to a deterministic UTC instant as lifecycle metadata.

It then executes the production storage route:

1. `Oracle.SaveDictionaries`
2. `Oracle.PackSettingsFlags`
3. `SaveSnapshotBuilder.CreateSaveSnapshotForStorage`, including Oracle's
   runtime owned-skill bitset and auto-assignment delegates
4. `Oracle.CreateSavePreparationPipeline`
5. `SavePreparationPipeline.PrepareSettings`
6. `SaveCodec` Odin binary serialization and uppercase `IDB1` encoding

The private Oracle factory is invoked through an editor-only reflection bridge
so the production method does not need to become public solely for tooling.

## Data flow

The exporter builds the artifact twice in the same Unity process and fails if
the canonical strings differ. It decodes the selected result again before
writing it. The adjacent provenance manifest records the exact project Unity
version and revision, save schema, exporter method and command, artifact and
decoded-binary SHA-256 hashes, generated game-data catalog hashes, and the
classified lifecycle paths permitted in TypeScript parity normalization.
Text-file hashes are computed from UTF-8 after canonicalizing CRLF and lone CR
line endings to LF, so the same committed content verifies on Windows and
Linux checkouts.

The generated files live under
`Web/src/application/firstRun/generated/`, which is owned by the Web backend
first-run factory rather than the frontend or browser runtime.

`first-run-schema-12.parity-deltas.json` is a reviewed Web mapping contract,
not a Unity-generated transformation. Lifecycle metadata is the only data
normalized before parity comparison. Every remaining storage-graph difference
must match an allowlisted path class, direction, value shape, and exact count;
the hydrated Web game state must still round-trip with no differences.

## Save and load implications

The artifact is a schema-current first-run state, not a migration fixture and
not a player save. The Web application decodes it through the shared IDB1
preparation path and creates a defensive `PreparedSave` for each startup.
Production startup must call `createUnityFirstRunPreparedSave({ startedAtUtc })`
with host UTC. That factory replaces only the manifest-classified
`dateStarted` lifecycle value; gameplay defaults remain byte-derived from
Unity. The zero-argument deterministic decoder exists for provenance/parity
tests. Repository startup may then checkpoint the production result using
normal development-save storage. Canonical player-save writes remain governed
by repository policy.

Changing a persisted default, save schema, compaction behavior, migration
normalization, Odin serialization, or any generated game-data catalog requires
regenerating and recommitting the artifact and manifest together.

## Performance pitfalls

Generation intentionally starts Unity and loads the full editor compilation
domain. Do not move this work into Web application startup. Runtime use imports
the checked-in artifact as static text and performs only the existing bounded
IDB1 decode and preparation.

## Verification

Run the exact command recorded in the provenance manifest using Unity
`6000.5.5f1`. Then run:

```powershell
Set-Location Web
npm test -- src/application/firstRun/unityFirstRunSave.test.ts
npm run lint
npm run data:check
npm run build
```

Finally, rerun the Unity export and confirm that Git reports no artifact or
manifest changes.
