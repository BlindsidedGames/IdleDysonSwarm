# SaveSystem

## Contract

`Systems.Save.SaveSystem` coordinates the preparation policy boundary with transactional storage. It neither publishes runtime state nor implements recovery UI.

- `TryLoad` reads primary text, prepares it completely, and returns only isolated publishable settings.
- `TrySave` prepares a caller-owned snapshot, writes canonical output to temp, and commits only after exact temp reread verification.
- `DiscoverCandidates` returns read-only canonical and explicit legacy descriptors.
- `TryCommitCandidate` prepares a discovered text or decoded legacy candidate before any canonical write.

## Data flow

Load:

`ISaveStorage.TryReadText` → `SavePreparationPipeline.PrepareText` → successful isolated settings → `CanonicalSaveStore` → Oracle publication.

Save:

caller snapshot → `PrepareSettings` → uppercase canonical text → temp write/read → second `PrepareText` verification → backup → atomic replacement.

Candidate commit:

read-only descriptor → text read or adapter-decoded settings → preparation → same verified transaction as a normal save.

## Save/load implications

- A failed preparation never calls transactional storage.
- Future, corrupt, migration-failing, validation-failing, or serialization-failing candidates cannot be committed.
- `LastLoadPreparation` retains classification for Stage 3 startup recovery policy.
- When Oracle sees an existing canonical artifact that does not prepare, ordinary canonical writes remain blocked so the artifact cannot be silently overwritten before recovery.

## Performance pitfalls

- Verified saves prepare twice: once before temp creation and once from exact reread temp bytes.
- Candidate discovery is metadata-only; candidate contents are read only when explicitly prepared.

## Quick verification

1. Run `SaveSystemTests` and `CanonicalSaveStoreTests`.
2. Run `TransactionalSaveStage2Tests`.
3. Confirm a successful load returns an object distinct from its decoded source.
4. Confirm every rejected candidate leaves canonical bytes unchanged.
5. Confirm `UserSettings/EditorUserSettings.asset` remains excluded.
