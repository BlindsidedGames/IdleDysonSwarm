# Oracle.Persistence

## Contract / behavior expectations
- `Load()` must prefer canonical save storage first (`idle_dyson_swarm_save.txt`) and only fall back to legacy sources when canonical load is missing or invalid.
- Legacy fallback selection is version/timestamp/source-priority based through `SaveLoadCandidateSelector`.
- If no candidate can be loaded and ES3 access was broken, legacy ES3 artifacts are archived as `.corrupt.*` for support triage.
- If load succeeds from any legacy source, canonical save is immediately rewritten so subsequent launches avoid legacy paths.

## Data flow
1. `Load()` resets in-memory state with `WipeSaveData()`.
2. Attempts canonical load via `SaveSystem`.
3. If needed, probes:
   - `ES3` default key (`saveSettings`),
   - `LegacyEs3Save.TryRecoverDefaultSave` (main + backup + archived artifacts),
   - legacy Odin JSON (`betaTestTwo.idsOdin`).
4. Best candidate is applied with `ApplyLoadedSettings()`.
5. Migrations run (`ApplyMigrations()`), runtime sync hooks run, autosave readiness restored.

## Save/load implications
- Legacy ES3 key name remains `saveSettings`; changing this breaks import of historic installs.
- Legacy Odin filename remains derived from `fileName` (`betaTestTwo.idsOdin`).
- Canonical file path is managed by `SavePaths`; changing path/name requires coordinated wipe/recovery updates.
- Recovery behavior relies on `LegacyEs3Save` trust ordering; changing it can alter which artifact wins for users with multiple backups.

## Performance pitfalls
- Artifact recovery can scan multiple files (`main`, `.bac`, `.tmp.bak`, `.tmp`, `.corrupt.*`), so avoid expensive parsing in each probe.
- Keep heavy deserialization off hot loops; startup load path runs on app launch and scene entry.

## Quick verification steps
1. Launch with valid canonical save: confirm `Loaded with canonical save file`.
2. Remove canonical file but keep valid ES3 file: confirm ES3 fallback loads and canonical file is rewritten.
3. Provide AES-encrypted `SaveFile.es3` legacy artifact: confirm recovery succeeds (no `unrecoverable` archive on first run with fix).
4. With only invalid artifacts: confirm archive still occurs and a new save is created.
