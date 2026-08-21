# StartupSaveRecoveryCoordinator

## Contract

`Systems.Save.StartupSaveRecoveryCoordinator` owns startup candidate ordering and recovery decisions. It does not decode, migrate, validate, access paths directly, publish Oracle state, schedule offline progress, or present UI.

Decision order:

1. Prepare primary canonical save. Success returns `PrimaryReady` without a write.
2. Prepare canonical temp/backups newest-first with source/path tie-breaks.
3. Commit the first valid canonical recovery candidate through the verified transactional writer.
4. If none succeeds, prepare explicit legacy candidates newest-first and transactionally commit the first valid candidate.
5. Stop immediately on any encountered future schema.
6. Return `AllCandidatesInvalid` when artifacts exist but no valid winner exists.
7. Return `NoArtifacts` only when canonical and legacy discovery are both empty.

## Data flow

`CanonicalSaveStore.DiscoverCandidates` → read-only `TryPrepareCandidate` attempts → classified decision → optional `TryCommitCandidate` → `StartupSaveRecoveryResult`.

`StartupRecoveryPublicationGate` is the separate one-shot boundary used by Oracle to couple exactly one settings publication with exactly one offline-replay schedule.

## Save/load implications

- Automatic recovery never publishes before canonical restoration succeeds.
- Transactional restore preserves a failed primary as a rotating backup.
- Invalid and future candidates never write.
- Undecodable legacy paths remain descriptors, preventing damaged installs from being mistaken for first runs.
- Blocking outcomes contain no publishable settings.

## Performance pitfalls

- Each inspected candidate is deserialized/prepared, and the winner is prepared again during exact temp verification.
- Candidate contents are read only until their deterministic turn is reached.
- Support attempts retain diagnostics, not additional serialized object copies.

## Quick verification

1. Run `StartupSaveRecoveryStage3Tests`.
2. Corrupt primary with two valid backups: newest valid backup wins and failed primary remains in backups.
3. Newer corrupt backup plus older valid backup: older valid wins.
4. Future primary/backup: startup blocks without fallback write.
5. Empty install: `NoArtifacts`; undecodable legacy file: `AllCandidatesInvalid`.
