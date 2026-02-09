# Save System V11 Implementation Log

Status: Active
Owner: Codex agent

This file exists to "compact context" and keep a durable reference as the save system refactor proceeds.
Primary design doc: `Documentation/SaveSystemV11Plan.md`.

## Compacted Context (Snapshot Before Implementation)
- Current monolith: `Assets/Scripts/Expansion/Oracle.cs` (~5574 lines).
- Current persistence:
  - ES3 primary: `ES3.Save("saveSettings", snapshot)` / `ES3.Load<SaveDataSettings>("saveSettings")`.
  - Legacy `.idsOdin` JSON file: `betaTestTwo.idsOdin` (read on load fallback).
  - Clipboard canonical today: `IDB1:` (Odin binary + gzip + base64).
- High coupling:
  - Direct `oracle.saveSettings` usage: ~324 references in `Assets/Scripts/`.
  - `using static Expansion.Oracle;` imports: ~93 files.
- V11 goals:
  - One canonical save string for disk + clipboard.
  - Move save/load/codec/migration out of Oracle; keep Oracle as data source-of-truth + thin wrappers.
  - Add a consolidated migration step V11 to jump from any prior version to v11 safely.
  - Bake in tests and transactionality to prevent data loss and "silent partial loads".
- Refactor constraint:
  - Keep nested save-data types under `Expansion.Oracle` stable (type identity).
  - Allowed later: split Oracle into partials; do not rename/move nested types.

## Progress Log

### 2026-02-09
- Created/updated plan doc: `Documentation/SaveSystemV11Plan.md`.
- Added expanded test strategy to plan (phase gates, fixtures, adversarial cases).
- Phase 0 (characterization) started:
  - Added codec characterization tests (now `Assets/Editor/Tests/Save/SaveCodecCharacterizationTests.cs`).
  - Added facility sparse characterization tests (now `Assets/Editor/Tests/Save/FacilityArrayNormalizerTests.cs`).
  - Added fixtures folder `Assets/Editor/Tests/Save/Fixtures/` (empty for now).
- Phase 1 (codec extraction) started:
  - Added `Assets/Scripts/Systems/Save/SaveCodec.cs` (codec extracted from Oracle logic).
  - Added `Assets/Editor/Tests/Save/SaveCodecTests.cs` (roundtrip + supported input formats).
- Phase 2/4 (canonical file storage + switch write path) implemented:
  - Added `Assets/Scripts/Systems/Save/ISaveStorage.cs`.
  - Added `Assets/Scripts/Systems/Save/SavePaths.cs` (canonical file name + backup folder).
  - Added `Assets/Scripts/Systems/Save/OdinStringFileStorage.cs` (atomic write + rotating backups).
  - Added `Assets/Scripts/Systems/Save/SaveSystem.cs` (load/save orchestration for canonical string file).
  - Updated `Assets/Scripts/Expansion/Oracle.cs`:
    - Load priority: canonical file -> ES3 -> legacy `.idsOdin` -> new save.
    - After loading from legacy sources, write the canonical file immediately.
    - Save path now writes canonical file; ES3 is no longer written (ES3 remains read-only legacy fallback).
    - Recovery button now copies canonical file contents to clipboard (legacy `.idsOdin` fallback).
  - Extracted ES3 legacy IO helpers into `Assets/Scripts/Systems/Save/LegacyEs3Save.cs` and kept Oracle wrappers.
- Phase 3 (V11 migration + sparse facility stabilization) implemented:
  - Bumped `CurrentSaveVersion` to 11.
  - Migration registry now contains a single consolidated step (v11) that runs all prior migration logic in one pass.
  - `ApplyMigrations()` now runs transactionally (deep copy, commit only on success).
  - Facility sparse arrays are treated as legacy-only:
    - Ensure step merges sparse lists into dense arrays (max-per-slot), then clears sparse lists.
    - Save snapshot keeps dense arrays and clears sparse lists (avoids dual representations and warning noise).
    - Removed the noisy "Sparse facility data missing..." warning for empty/fresh saves.
- Added additional save-system tests:
  - `Assets/Editor/Tests/Save/OdinStringFileStorageTests.cs`
  - `Assets/Editor/Tests/Save/SaveSystemTests.cs`
  - Ensured `SaveSystem` output matches `SaveCodec.EncodeBinary(...)` exactly (disk string == clipboard string).
- Made `SaveCodec.TryDecodeBinary` accept both gzip-compressed and raw binary payloads for robustness.
- Hardened legacy load selection to reduce silent ES3-default data loss:
  - `Oracle.Load()` now compares candidates from ES3, ES3 artifacts, and legacy `.idsOdin` (when canonical missing) and picks the best by saveVersion + timestamp.
  - `LegacyEs3Save.TryRecoverDefaultSave(...)` now evaluates all ES3 artifact candidates and picks the best instead of first-success.
- Prevented forced canonical write from corrupting offline-time math:
  - `SaveInternal(force, updateQuitTime)` can write the canonical file without overwriting `dateQuitString`.
  - Conversion saves (legacy -> canonical) and clipboard imports use `updateQuitTime:false` so `AwayForSeconds()` still measures the real away time.
- Oracle extraction progress:
  - Added `Assets/Scripts/Systems/Save/FacilityArrayNormalizer.cs` and switched Oracle to call it for facility array normalization.
  - Removed legacy facility sparse array helpers from `Assets/Scripts/Expansion/Oracle.cs` (kept only the Ensure step that calls the normalizer).
  - Removed duplicated clipboard codec helpers from `Assets/Scripts/Expansion/Oracle.cs` (canonical codec is now `Assets/Scripts/Systems/Save/SaveCodec.cs`).
  - Extracted legacy-load candidate selection and legacy `.idsOdin` JSON parsing into `Assets/Scripts/Systems/Save/SaveLoadCandidateSelector.cs`.
  - Extracted snapshot compaction (skill bits, auto-assign bits, facility normalization, dictionary filtering) into `Assets/Scripts/Systems/Save/SaveSnapshotBuilder.cs`.
  - Updated tests:
    - Replaced sparse-characterization tests with `Assets/Editor/Tests/Save/FacilityArrayNormalizerTests.cs`.
    - Updated codec characterization to target `SaveCodec` (`Assets/Editor/Tests/Save/SaveCodecCharacterizationTests.cs`).
  - Updated Unity-generated csproj compile includes for the new/renamed files:
    - `Assembly-CSharp.csproj`
    - `Assembly-CSharp-Editor.csproj`

## Checkpoint Summary (2026-02-09)
This checkpoint switches the project to an Odin-only canonical save pipeline while keeping ES3 as a legacy import fallback.

### What Changed
- Canonical persistence is now a text file containing the exact canonical clipboard string (`IDB1:...`):
  - File name: `idle_dyson_swarm_save.txt` under `Application.persistentDataPath`
  - Rotating backups are kept under `save_backups/`
  - Implemented in `Assets/Scripts/Systems/Save/*`
- Clipboard import/export and disk saves share the same encoding:
  - Odin binary -> gzip -> base64 with `IDB1:` prefix
- ES3 is now read-only legacy:
  - Load fallback remains (including artifact recovery)
  - No ES3 writes on save anymore (canonical file write only)
- Legacy `.idsOdin` JSON file is treated as legacy fallback only.
- SaveVersion bumped to `11` with a single consolidated migration step:
  - Runs prior migration logic idempotently in one pass
  - Ensures run after migration normalizes skills/research/packed flags/facility arrays
- Facility “sparse arrays” are now legacy-only:
  - On ensure/load, sparse lists are merged into dense arrays then cleared
  - On save snapshot, dense arrays are kept and sparse lists cleared (avoid dual representations)
  - Removes the noisy empty-save warning that triggered on fresh saves
- Legacy-load selection hardened:
  - When canonical file is missing, `Oracle.Load()` compares ES3, ES3 artifacts, and legacy `.idsOdin` and picks the best candidate by saveVersion then timestamp (best-effort).

### Quick Smoke Tests (Manual)
1. Fresh launch (no saves present):
   - No facility sparse warnings
   - Canonical file gets created after first save/autosave
2. Clipboard export:
   - `SaveToClipboard` produces a short `IDB1:` string (example seen: ~6-7k chars)
3. Clipboard import (any older save string you have):
   - Imports, migrates to v11, then writes canonical file
   - Offline-time should still calculate correctly on next launch (conversion write does not overwrite `dateQuitString`)
4. Legacy ES3 load:
   - Rename/delete canonical file and verify ES3 load still works
   - If ES3 main file is broken, artifact recovery should prefer the best candidate

### Follow-Ups / Risks
- Migration transactionality currently deep-copies and swaps the `saveSettings` instance during migration.
  - If any system caches a `SaveDataSettings` reference early, this could be a problem; needs validation or “commit in place” approach.
- Add fixture-based migration tests for older real-world saves (v6-v10) focused on “hub”/hubble + facilities + skills.

Next:
- Add V11 migration fixtures (real-world save strings) + hubble/skill preservation tests.
- Move remaining ES3 legacy helpers out of `Oracle.cs` into a dedicated legacy import module.
