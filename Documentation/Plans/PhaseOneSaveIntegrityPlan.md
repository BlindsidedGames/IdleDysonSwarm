# Phase One Save-Integrity Implementation Plan

Status: finalized design; implementation blocked by the PR 0 acceptance gate
Last updated: 2026-07-24
Primary validation target: Windows Editor and Windows player
Deferred validation targets: macOS, iOS, and other device-specific coverage

## Decision summary

Phase One hardens the existing save system without broadly rewriting `Oracle` or changing gameplay. It establishes verified serializer compatibility, prepares and validates saves before publishing them to runtime state, makes canonical backups usable during startup recovery, provides a blocking recovery experience when automatic recovery is impossible, and unifies clipboard/manual recovery with the same safe pipeline.

**No Phase One save-system implementation may begin until the separate Unity 6.5 migration described as PR 0 has been reviewed and accepted.**

The first unit after that gate is a tests-only fixture and decoder characterization change. It must not modify production save behavior.

## Current baseline and evidence

The project is currently imported with Unity `6000.5.5f1`.

The upgrade also changed dependencies that sit on the save compatibility boundary:

- Easy Save moved from 3.5.25 to 3.5.27.
- Odin/Sirenix Serialization moved from 4.0.1.2 to 4.0.2.3.
- Unity UI Extensions is pinned to Git revision `e4c9fc6a5c3ab08dc47628c8109f86a22931c61f`.
- Unity MCP and Custom Hierarchy were removed because their obsolete APIs did not compile under Unity 6.5.
- Unity packages and generated project settings were re-resolved for Unity 6.5.

Unity completed a final script compilation without subsequent C# compiler errors. The user also manually loaded and played the game with an existing save intact. That is encouraging smoke evidence, but it is not a substitute for repeatable fixture-based serializer compatibility tests.

The post-upgrade audit also found:

- Canonical saves create rotating backups, but normal startup loading does not enumerate or consume them.
- Loaded save data can be used to populate runtime dictionaries before migration and normalization.
- A future schema version is not explicitly rejected before runtime normalization.
- Clipboard import publishes decoded state before the complete migration and validation result is known.
- The existing Game-scene recovery controls occur after the initial Load scene and do not provide a blocking startup recovery flow.
- Existing historical Unity test result files are stale and include failures.
- The final Editor log contains Google Version Handler failures to write `ProjectSettings/GvhProjectSettings.xml` with Win32 IO error 1224.

## Scope

Phase One includes:

- Compatibility fixtures and characterization tests.
- Decode, version gate, migration, normalization, and validation on an isolated copy.
- Backup-aware transactional storage and startup candidate selection.
- Safe handling of corrupt, unsupported, and future-version saves.
- A blocking Load-scene recovery UI when no automatic recovery candidate succeeds.
- Clipboard and manual recovery routed through the same preparation pipeline.
- Save-scoped legacy cleanup and documentation after behavior is covered.

Phase One excludes:

- Broad `Oracle` cleanup or unrelated gameplay refactoring.
- Gameplay, balance, skill-tree, or offline-progression redesign.
- A promise to load every historical save format since the repository began.
- New compatibility guarantees for 2024-era saves.
- macOS or iOS certification. Those targets are deferred until the Windows implementation is stable.
- Removal or modification of third-party plugin internals beyond the already imported compatibility upgrade.

## Compatibility contract

### Guaranteed formats

The current schema remains version `11`.

New canonical output continues to use uppercase `IDB1:`. Input accepts both uppercase `IDB1:` and lowercase `idb1:`.

Phase One guarantees the three existing representative artifacts:

1. `Documentation/savedebugging/save-debug-20260202-045325.json` — schema 7 raw JSON.
2. `Documentation/savedebugging/save-debug-20260202-060115.json` — schema 8 debug DTO.
3. `Documentation/SaveBackups/MainSave.txt` — current canonical `IDB1` save.

These artifacts must be copied into the test fixture area and treated as immutable inputs. Tests must never rewrite or silently refresh them.

### Legacy ES3 boundary

No authentic `.es3`, `.bac`, `.bak`, or `.idsOdin` artifact is currently tracked in the checkout or repository history. The existing ES3 import/recovery adapter therefore remains supported on a best-effort basis but is not part of the guaranteed compatibility matrix until a real artifact is obtained.

The absence of an ES3 artifact does not block Phase One. It does block deleting the legacy ES3 adapter or claiming verified ES3 compatibility.

### Future-version saves

A save whose schema is newer than the running build supports must:

- Stop before migration, normalization, runtime publication, offline replay, or any save write.
- Leave the original artifact byte-for-byte untouched.
- Present a clear unsupported-newer-version outcome.
- Never be downgraded or replaced by a newly generated schema 11 save.

## Core architecture

All load entry points converge on one prepared-save pipeline:

1. Read candidate bytes or text without modifying the source.
2. Decode a supported envelope.
3. Inspect and enforce the schema-version gate.
4. Deep-copy decoded data.
5. Migrate and normalize the copy.
6. Validate required shape, durable identifiers, and finite numeric state.
7. Produce a prepared result containing the candidate, source metadata, warnings, and failure reason.
8. Publish the prepared state to `Oracle` only after every required step succeeds.

No decoder, migration, backup probe, clipboard import, or recovery command may partially publish state.

Storage and preparation remain separate:

- Storage owns paths, candidate enumeration, reads, verified atomic writes, backup rotation, and artifact preservation.
- Preparation owns decoding, version policy, migration, normalization, and validation.
- Startup orchestration owns candidate ordering and recovery decisions.
- UI presents an already classified outcome and does not implement save rules.

## PR 0 — Unity 6.5 migration acceptance gate

PR 0 is an isolated engine, package, vendor, and generated-project-settings upgrade. It contains no Phase One production save implementation.

Before PR 0 is accepted:

1. Review the complete migration diff and confirm every retained file is an intentional Unity, package, or vendor upgrade.
2. Confirm the removal of Unity MCP and Custom Hierarchy is deliberate.
3. Keep the pinned Unity UI Extensions revision and matching lockfile hash.
4. Confirm the Easy Save and Odin upgrades are complete and internally consistent.
5. Exclude incidental per-user `UserSettings` changes.
6. Resolve the Google Version Handler write error or demonstrate on a clean reopen that it does not recur.
7. Close the active Unity Editor before automated validation.
8. Run the targeted save EditMode tests and record the result.
9. Run the full EditMode suite and record existing failures separately from upgrade regressions.
10. Complete a Windows Editor smoke and Windows player build/smoke.

The successful manual old-save play session is recorded as supporting evidence for PR 0, not as completion of steps 8–10.

If PR 0 changes the serializer versions again, its compatibility gate must be repeated before Stage 1 begins.

## Stage 1 — Compatibility fixtures and characterization

### Stage 1A — First post-gate implementation unit

Stage 1A is tests-only.

Add:

- Schema-labelled copies of the three guaranteed artifacts under `Assets/Editor/Tests/Save/Fixtures/`.
- A small fixture manifest recording source path, source schema, immutable hash, format, provenance date, and selected durable sentinel values.
- A test-only fixture loader.
- Fixture-backed decoder characterization tests using the production `SaveCodec` and the upgraded Odin serializer.

Stage 1A assertions:

- Every fixture is readable without modification.
- Every fixture decodes through its supported public entry point.
- The decoded source schema is correct.
- Selected durable state such as dates, resource values, unlock state, or stable IDs matches the manifest.
- The fixture hash is unchanged after the test run.
- Unsupported or malformed envelopes fail without publishing state or writing files.
- Uppercase `IDB1:` remains valid.
- Lowercase `idb1:` is captured as a required compatibility case. If it does not yet pass, the failing characterization becomes the explicit production change for Stage 1B rather than being hidden.

Stage 1A contains no production save changes, migrations, UI changes, cleanup, or fixture regeneration.

Stop condition: if any guaranteed artifact cannot decode under Odin 4.0.2.3, stop before production changes and decide whether to pin the prior serializer or introduce a narrowly scoped compatibility decoder.

### Stage 1B — Migration and policy characterization

Extend the fixture tests to run migration and normalization on a deep copy.

Required assertions:

- Schema 7 and schema 8 reach schema 11.
- The original fixture and original decoded object are not mutated.
- Durable sentinel state survives migration.
- Required collections, arrays, dictionaries, and ID-based state are normalized.
- Migration is deterministic and idempotent.
- Migration failure preserves the original object and artifact.
- A future schema is rejected before normalization.
- Corrupt, truncated, empty, wrong-prefix, and invalid-base64 inputs return classified failures.
- No load characterization grants offline time or performs lifecycle side effects.

Stage 1 is complete only when all guaranteed fixtures pass under the versions accepted in PR 0.

## Stage 2 — Prepared saves and transactional storage

Introduce the prepared-save result and route canonical decode/version/migration/validation through it before runtime publication.

Add storage support for deterministic candidate discovery:

- Primary canonical save.
- Any interrupted-write temporary artifact that is safe to inspect.
- Rotating canonical backups.
- Explicit legacy candidates through existing adapters.

Candidate sources must be read-only until a winner is fully prepared.

Transactional save behavior:

1. Serialize a snapshot to a temporary file.
2. Read and decode the temporary file.
3. Validate its schema and required state.
4. Preserve the previous canonical artifact as a backup.
5. Atomically replace or move the verified temporary file into the canonical path.
6. Report a failure without damaging the previous canonical file if any step fails.

Required Stage 2 tests:

- Verified save and load round-trip.
- Write/replace failure preserves the previous canonical save.
- Invalid temporary output never replaces the canonical save.
- Backup ordering and pruning are deterministic.
- Candidate enumeration does not alter artifacts.
- Future, corrupt, and migration-failing candidates cannot be committed.
- Lowercase input normalizes to uppercase output only after a successful prepared save.

Stage 2 does not yet change the startup UI.

## Stage 3 — Startup recovery and blocking recovery UI

Startup evaluates candidates through the prepared-save pipeline before gameplay begins.

Decision order:

1. If the primary canonical save prepares successfully, load it.
2. If the primary fails, inspect canonical temporary and backup candidates.
3. Select the newest fully valid supported candidate deterministically.
4. Restore that candidate to canonical storage using the verified transactional writer.
5. Log the recovery source and reason. Do not interrupt the user when automatic recovery succeeds.
6. If no canonical candidate succeeds, inspect existing legacy candidates through the same preparation rules.
7. If a future-version artifact is encountered, preserve it and stop with the unsupported-version outcome.
8. If every candidate is invalid, remain on a blocking recovery state. Do not create or overwrite a save automatically.

The blocking recovery experience belongs in the initial Load-scene flow, before normal gameplay startup and offline replay. It provides:

- A plain-language status.
- Copy/export actions for the primary save and discovered artifacts.
- A clipboard import action.
- Support-oriented artifact location/details.
- A two-step destructive reset requiring explicit confirmation.
- No automatic reset, deletion, or silent new-save creation.

Required Stage 3 tests:

- Corrupt primary plus valid backup automatically restores the newest valid backup.
- A newer corrupt backup does not outrank an older valid backup.
- All-invalid candidates produce the blocking outcome without writes.
- Future schema produces the unsupported outcome without fallback overwrite.
- Recovery writes preserve the failed primary for support.
- Startup publishes exactly one prepared candidate.
- Offline replay runs once and only after a successful startup load.

## Stage 4 — Clipboard/manual recovery unification and scoped cleanup

Route all remaining entry points through the prepared-save pipeline:

- Clipboard import.
- Existing manual recovery controls.
- Quantum Console recovery commands.
- Legacy Odin and ES3 adapters.
- Support-assisted restore.

Clipboard imports must not grant additional offline time from the imported artifact's historical quit timestamp. Import completion establishes a new local lifecycle baseline before reloading or starting gameplay.

Stage 4 also performs save-scoped cleanup:

- Remove only duplicate or unreachable save code proven dead by search and coverage.
- Keep public callbacks, serialized scene bindings, save keys, and support command names unless their callers/assets are updated in the same change.
- Retain legacy adapters until a deliberate compatibility decision and matching regression evidence allow removal.
- Do not use Phase One as a broad `Oracle`, gameplay, UI-theme, or skill-tree refactor.

Update the relevant save documentation and central script headers/XML documentation as required by repository policy.

Required Stage 4 tests:

- Clipboard schema 7, schema 8, current `IDB1`, and lowercase `idb1` use the same preparation rules.
- Invalid clipboard data does not replace live or on-disk state.
- Clipboard import does not award offline progress.
- Manual recovery and startup recovery produce the same validation result for the same candidate.
- Legacy recovery cannot overwrite a valid canonical save without explicit approval.
- Reset requires two distinct confirmations and preserves support artifacts until the final confirmation.

## Delivery sequence

Use separate, reviewable changes:

1. PR 0: Unity 6.5 engine/package/vendor upgrade and its validation evidence.
2. Stage 1A: tests-only fixture intake and decoder characterization.
3. Stage 1B: migration and failure-policy characterization.
4. Stage 2: prepared-save and storage foundations.
5. Stage 3: startup recovery and blocking Load-scene UI.
6. Stage 4: clipboard/manual unification, save-scoped cleanup, and documentation.

Do not combine gameplay cleanup or unrelated audit findings with these changes.

## Validation target and deferred work

Phase One acceptance is based on:

- Windows Unity Editor compilation.
- Targeted save EditMode tests.
- Full EditMode baseline with known unrelated failures identified.
- Windows player build.
- Windows manual smoke using copies of representative saves and recovery scenarios.

macOS and iOS compatibility testing is deferred. After Phase One is stable on Windows, repeat the fixture suite and platform lifecycle/recovery smoke on macOS before shipping from the MacBook. iOS device lifecycle and storage behavior require a later device-specific validation pass.

## Phase One definition of done

Phase One is complete when:

- Every guaranteed fixture decodes and migrates deterministically to schema 11.
- A save is never published before preparation succeeds.
- Verified atomic writes cannot destroy the previous good canonical save.
- Startup consumes canonical backups and silently restores the newest valid candidate.
- Future-version artifacts are preserved without downgrade or overwrite.
- All-invalid startup remains blocked and offers support actions plus explicit reset.
- Clipboard/manual/legacy paths share the same preparation and validation rules.
- Clipboard import grants no extra offline time.
- Save-scoped obsolete duplication is removed only where coverage proves it safe.
- Required code and integration documentation is current.
- Windows validation passes for the save-integrity surface, with unrelated baseline failures explicitly recorded.
