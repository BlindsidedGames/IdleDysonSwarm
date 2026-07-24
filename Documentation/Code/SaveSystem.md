# SaveSystem

## Contract

`Systems.Save.SaveSystem` coordinates the preparation policy boundary with transactional storage. It neither publishes runtime state nor implements recovery UI.

- `TryLoad` reads primary text, prepares it completely, and returns only isolated publishable settings.
- `TrySave` prepares a caller-owned snapshot, writes canonical output to temp, and commits only after exact temp reread verification.
- `DiscoverCandidates` returns read-only canonical and explicit legacy descriptors.
- `TryPrepareCandidate` classifies a discovered candidate without writing it.
- `TryCommitCandidate` prepares a discovered text or decoded legacy candidate before any canonical write.
- `PrepareText` and `TryReadCandidateText` support explicit startup clipboard/copy actions without bypassing preparation or storage ownership.

## Data flow

Load:

`ISaveStorage.TryReadText` → `SavePreparationPipeline.PrepareText` → successful isolated settings → `CanonicalSaveStore` → Oracle publication.

Save:

caller snapshot → `PrepareSettings` → uppercase canonical text → temp write/read → second `PrepareText` verification → backup → atomic replacement.

Candidate commit:

read-only descriptor → text read or adapter-decoded settings → preparation → same verified transaction as a normal save.

Startup selection:

discovery → read-only `TryPrepareCandidate` attempts → `StartupSaveRecoveryCoordinator` decision → optional verified winner commit → one-shot Oracle publication.

## Save/load implications

- A failed preparation never calls transactional storage.
- Future, corrupt, migration-failing, validation-failing, or serialization-failing candidates cannot be committed.
- `LastLoadPreparation` retains primary-load classification for diagnostics.
- Future/all-invalid startup outcomes never call transactional storage.
- When startup cannot produce a prepared winner, ordinary canonical writes remain blocked so artifacts cannot be silently overwritten before explicit recovery/reset.

## Performance pitfalls

- Verified saves prepare twice: once before temp creation and once from exact reread temp bytes.
- Candidate discovery is metadata-only; candidate contents are read only when explicitly prepared.

## Quick verification

1. Run `SaveSystemTests` and `CanonicalSaveStoreTests`.
2. Run `TransactionalSaveStage2Tests`.
3. Confirm a successful load returns an object distinct from its decoded source.
4. Confirm every rejected candidate leaves canonical bytes unchanged.
5. Confirm `UserSettings/EditorUserSettings.asset` remains excluded.
6. Run `StartupSaveRecoveryStage3Tests`.
