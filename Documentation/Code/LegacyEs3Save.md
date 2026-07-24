# LegacyEs3Save

## Contract / behavior expectations
- Provides best-effort recovery only for legacy ES3 artifacts; it does not apply migrations or mutate runtime game state directly.
- Must tolerate corrupted files without throwing to callers.
- `GetRecoverableCandidates()` returns all valid candidates sorted best-first.
- `GetExistingArtifactPaths()` returns every existing main/temp/backup/archive path even when decoding fails.
- Recovery candidate ranking must prioritize:
  1. higher `saveVersion`,
  2. newer parsed timestamp (`lastSuccessfulLoadUtc`, then `dateQuitString`, then `dateStarted`),
  3. trust order (`main` > `.bac` > `.tmp.bak` > `.tmp` > archived `.corrupt.*`),
  4. deterministic path comparison as final tie-break.
- Must support both current unencrypted ES3 files and legacy AES-encrypted ES3 files.

## Data flow
1. Build candidate path list for default ES3 file and known backup suffixes.
2. Append archived `.corrupt.*` files if present.
3. For each candidate:
   - try default ES3 settings (`ES3.KeyExists` + `ES3.Load`),
   - then try legacy AES settings with known/default password candidates.
4. Sort candidates by version/timestamp/trust with deterministic path tie-break and return the ordered list.
5. `TryRecoverDefaultSave` picks index `0` from that list.
6. Startup candidate adaptation retains undecodable paths as invalid artifacts so they block instead of appearing to be a first launch.

## Save/load implications
- Changing key name `saveSettings` breaks compatibility with all historical ES3 saves.
- Removing AES fallback causes encrypted legacy files to be treated as unrecoverable.
- Removing `.corrupt.*` scanning prevents restoring saves that were archived before AES-aware recovery existed.
- Dropping undecodable path discovery can silently replace a damaged legacy install with a new canonical save.

## Performance pitfalls
- Directory globbing for `.corrupt.*` is startup-path work; keep it scoped to one directory and one basename.
- Avoid expensive full-file decode attempts when `ES3.KeyExists` succeeds quickly.

## Quick verification steps
1. Plain ES3 file: `TryRecoverDefaultSave` returns that file.
2. AES-encrypted ES3 file (password `password`): recovery succeeds without emitting warning-level probe logs.
3. Archived encrypted file (`SaveFile.es3.corrupt.*`) with missing main file: candidate list includes archived file.
4. Two candidates tied on version/timestamp/trust: returned order stays stable across repeated scans.
5. Random invalid file: decoded methods return no candidate without throwing, while `GetExistingArtifactPaths()` still reports the source path.
