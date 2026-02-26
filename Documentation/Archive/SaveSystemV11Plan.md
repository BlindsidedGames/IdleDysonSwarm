# Save System V11 Plan (Odin-Only, Single Canonical Save String)

Status: In progress (implementation underway; see `Documentation/SaveSystemV11ImplementationLog.md`)
Last updated: 2026-02-09

## Goals
- Make **one canonical save format** used for:
  - On-disk persistence
  - Clipboard import/export
- Move **save/load/codec/migration** logic out of `Assets/Scripts/Expansion/Oracle.cs`.
- Keep `Oracle` as the **source of truth for the in-memory data structure** (`saveSettings` + nested data types), not as the monolithic orchestrator.
- Add a **single consolidated migration step (V11)** that can upgrade any prior save version directly to V11 in one pass.
- Reduce save breakage risk:
  - Transactional migration
  - Backups and recoverability
  - Explicit validation/invariants (prevent silent partial loads becoming silent data loss)
- Keep clipboard strings copy/paste friendly:
  - Target: <= 10,000 chars
  - Hard ceiling: <= 20,000 chars

## Non-Goals (Initial V11 Cut)
- Full removal of all `using static Expansion.Oracle;` usage across the project.
- Rewriting gameplay logic currently embedded in `Oracle` (Prestige, Infinity loops, etc.).
- Perfect human-readable save content. The canonical format is optimized for stability and size, not manual editing.

## Current Save System Inventory (As Implemented Today)

### Primary on-disk save (current)
- **Easy Save 3 (ES3)**: `ES3.Save("saveSettings", snapshot)` and `ES3.Load<SaveDataSettings>("saveSettings")`.
- ES3 recovery attempts are based on exceptions from `ES3.KeyExists` / `ES3.Load` and can miss "partial" loads that do not throw.

### Clipboard import/export (current)
- Odin serializer (Sirenix) used to serialize `SaveDataSettings` snapshots.
- Canonical clipboard prefix today: `IDB1:` (binary + gzip + base64).
- Other supported inputs exist (`IDSZ1:` legacy prefix, raw JSON, debug DTO JSON).

### Secondary/legacy on-disk format (current)
- `.idsOdin` file stored under `Application.persistentDataPath` using `DataFormat.JSON`.
- Filename constant in Oracle: `fileName = "betaTestTwo"` -> `betaTestTwo.idsOdin`.

### Save data compaction mechanisms in play
- Skill ownership bitset (`skillOwnedBits` + `skillOwnedBitsBase64`).
- Auto-assignment bitset (`skillAutoAssignmentBits` + base64).
- "Packed settings flags" bitfield (`packedSettingsFlags`), but the original booleans are still serialized (currently additive, not size-reducing).
- Facility "sparse arrays" for clipboard compaction (stores indices/values; nulls dense arrays when `compactFacilityArrays=true`).

### Known pain points to address in V11
- **ES3 "loads with defaults"** can silently wipe important fields without triggering recovery.
- Facility sparse logic can result in both dense and sparse empty if dense is null at snapshot time.
- Warning noise: `EnsureInfinitySparseArrays()` can warn on a legitimately fresh/empty save (sparse empty + zeros).
- Multiple overlapping representations for the same concept (skills owned, auto-assign list, facility counts) complicate migrations and increases risk of losing "canonical" state.

## Oracle.cs: Decomposition Map (What Must Be Preserved vs Extracted)

`Assets/Scripts/Expansion/Oracle.cs` is ~5574 lines and currently mixes:
- UI buttons/debug tooling
- Save/load codecs
- ES3 persistence + recovery
- Migrations + ensure logic
- Skill ownership/auto-assign logic
- Facility sparse logic
- Gameplay logic (prestige/infinity loops)
- Static globals used across the entire project

### Region anchors in Oracle.cs
- `#region SaveAndLoadFromClipboard` (~line 94)
- `#region NewsTicker` (~line 1727)
- `#region StaticReferences` (~line 1772)
- `#region Oracle` / `#region SaveMethods` (~line 1796 / ~line 1802)
- `#region DysonVerseInfinity` (~line 4602)
- `#region Singleton class: Oracle` (~line 5556)

### Oracle public API surface used by other code (must remain stable initially)
- Singleton: `public static Oracle oracle;`
- Instance state: `public SaveDataSettings saveSettings;`
- Static events:
  - `public static event Action UpdateSkills;`
  - `public static event Action DebugOptionsChanged;`
  - `public static event Action<double> AwayFor;`
- Static convenience accessors heavily used:
  - `StaticSaveSettings`, `StaticInfinityData`, `StaticPrestigeData`, `StaticSkillTreeData`
  - `Money`, `Science`, `Bots`
  - `textColourOrange`, `textColourBlue`, `textColourGreen` (still referenced by UI/presenters)
- Public methods referenced externally (must remain as wrappers):
  - `Save()` (called from DeviceRotationManager, AvocadoMeditation)
  - `WipeAllData()` (called from ButtonThings)
  - `WipeDream1Save()` (called from multiple scripts)
  - Clipboard helpers are invoked via Odin Inspector buttons (should remain callable even if moved)

### Oracle save-related entry points (current line anchors)
- Clipboard:
  - `LoadFromClipboard()` (~line 113)
  - `SaveToClipboard()` (~line 326)
  - `ExportSaveDebugJson()` (~line 354)
- Persistence:
  - `Save()` (~line 3756) -> `SaveInternal()` (~line 1635) -> `SaveState()` (~line 3773)
  - `Load()` (~line 4078)
  - Legacy: `LoadState(string filePath)` for `.idsOdin` (~line 4163)
  - Recovery: `AttemptSaveRecovery()` (~line 3761), ES3 artifact helpers (~lines 1800-1940)
- Snapshot/compaction:
  - `CreateSaveSnapshotForStorage(...)` (~line 3782)
  - `CompactSkillTreeDataForSave(...)` (~line 3789)
  - Facility sparse conversion:
    - `PopulateSparseArrays(...)` (~line 3949)
    - `EnsureInfinitySparseArrays()` (~line 3974)
- Migrations:
  - `ApplyMigrations()` (~line 680)
  - `BuildMigrationRegistry()` (~line 750)
  - `BuildMigrationOptions()` (~line 730)
  - Ensure steps:
    - `EnsureSkillOwnershipData()` (~line 835)
    - `EnsureSkillAutoAssignmentIds()` (~line 1049)
    - `EnsureResearchLevelData()` (~line 1333)
    - `EnsurePackedSettingsFlags()` (~line 1456)

### External dependencies that directly touch Oracle/saveSettings today (high-risk for breakage)
- Direct singleton access: `Expansion.Oracle.oracle.saveSettings`:
  - `Assets/Scripts/Expansion/LoadScreenMethods.cs` reads debug flags.
- Direct calls into instance methods:
  - `Assets/Scripts/Systems/Platform/DeviceRotationManager.cs` calls `oracle.Save()`.
  - `Assets/Scripts/Systems/Avocado/AvocadoMeditation.cs` calls `oracle.Save()`.
  - `Assets/Scripts/User Interface/ButtonThings.cs` calls `oracle.WipeAllData()`.
  - `Assets/Scripts/Expansion/Dream1/SpaceAgeManager.cs`, `Assets/Scripts/Expansion/SimulationPrestigeManager.cs`, `Assets/Scripts/Expansion/DevCommands.cs` call `oracle.WipeDream1Save()`.
- Static convenience accessors used across services/systems:
  - `StaticSaveSettings` (26 occurrences), `StaticInfinityData` (10), `Oracle.oracle` (3 direct)
- Many files import `using static Expansion.Oracle;` and rely on the static API surface.

### Project-wide coupling snapshot (for scope sizing)
- `oracle.saveSettings` direct usage: ~324 references across `Assets/Scripts/`.
- `using static Expansion.Oracle;` imports: ~93 files.
- This strongly suggests a compatibility-first approach:
  - Preserve `Oracle.oracle`, `Oracle.saveSettings`, and the static API surface during V11.
  - Refactor internals behind wrappers first; reduce coupling later as a separate phase.

### Refactor constraint: Serialized type identity
- Many persisted types are nested under `Expansion.Oracle` (e.g., `Expansion.Oracle+SaveDataSettings`).
- Odin binary formats often embed type metadata; moving/renaming these types can break deserialization.
- **Rule:** In V11, do not move/rename nested save-data types out of the `Oracle` class identity.
- Allowed: split `Oracle` into multiple `.cs` files using `partial class Oracle` and keep nested types nested.

### Unity lifecycle / execution order constraints
- `Oracle` is a `MonoBehaviour` singleton (`Oracle.oracle`) assigned in `Awake()` (~line 5560+).
- `Oracle` currently performs `Load()` from `Start()` (not `Awake()`).
- `IdleDysonSwarm.Services.ServiceProvider` runs very early (`[DefaultExecutionOrder(-2000)]`) and registers services that currently wrap `Oracle` static access.
- Plan must ensure:
  - Save load happens before systems/presenters that require `saveSettings` read it.
  - We do not create cyclic initialization where services require save load but save load requires services.

## Target Architecture (V11)

### Overview: three-layer design
1. **Oracle** (data + minimal wrappers)
2. **Save domain** (pure logic on data)
3. **Storage** (file IO + backups)

### New modules (proposed files and responsibilities)

`Assets/Scripts/Systems/Save/SaveCodec.cs`
- Encodes/decodes the canonical save string.
- Canonical output: `IDB1:` + base64(gzip(OdinBinaryBytes)).
- Provides:
  - `string EncodeToString(Oracle.SaveDataSettings data, SaveCodecOptions options)`
  - `bool TryDecodeFromString(string text, out Oracle.SaveDataSettings data, out SaveDecodeReport report)`
  - Optional: accept legacy inputs (IDSZ1, raw JSON, debug DTO) but re-emit canonical format.

`Assets/Scripts/Systems/Save/SaveStorage.cs`
- Interface/abstraction for persistence.
- `TryRead(out string saveText, out SaveReadReport report)`
- `WriteAtomic(string saveText, out SaveWriteReport report)`
- Backup policy:
  - Keep N rotating backups (timestamped or numbered).
  - Always keep "pre-migration" snapshot before writing migrated result.

`Assets/Scripts/Systems/Save/OdinStringFileStorage.cs`
- Implements `SaveStorage` using a single text file containing the canonical save string.
- Atomic write: write temp file -> fsync if possible -> rename.
- Crash safety: never write partial data in-place.

`Assets/Scripts/Systems/Save/SaveValidator.cs`
- Runs invariants checks and returns actionable diagnostics.
- Examples:
  - Facility arrays are non-null and length == 2
  - Skill ownership representations reconcile to a single truth
  - SaveVersion sanity (>=0, <=Current)
  - No NaN/Infinity for key currencies that cause later runtime failures

`Assets/Scripts/Systems/Save/SaveSystem.cs`
- Orchestrates load/save/migrate using `SaveStorage`, `SaveCodec`, `SaveValidator`.
- Responsibilities:
  - Load: read string -> decode -> migrate -> validate -> commit to Oracle
  - Save: snapshot -> encode -> validate -> write -> report size stats
  - Ensure we never overwrite disk with invalid data (transactionality).

`Assets/Scripts/Systems/Migrations/SaveMigrationV11.cs`
- Consolidated migration step (targetVersion=11).
- Reads legacy representations and produces the V11 canonical state.
- Must be safe for any incoming saveVersion <= 10 (including "live" versions).

### Oracle changes (design-level, not implementation yet)
- Keep `Oracle` public API stable, but convert most methods to thin wrappers calling `SaveSystem`.
- Preferred mechanical refactor tactic:
  - Create partial files: `Oracle.SaveWrappers.cs`, `Oracle.StaticApi.cs`, `Oracle.SaveTypes.cs` to shrink the monolithic file.
  - Keep nested types nested (do not change names/namespaces).

## Canonical Save Format (V11)

### Canonical on-disk representation
- A single text file containing the same string users can copy/paste.
- Example: `IDB1:...`

### Clipboard import/export
- Clipboard export uses the same `SaveCodec.EncodeToString(...)`.
- Clipboard import uses `SaveCodec.TryDecodeFromString(...)` and then runs V11 migration + validation.

### Legacy formats
- Short-term: accept old clipboard strings and old on-disk ES3 saves for conversion.
- Long-term: "Odin-only without legacy" means:
  - Only canonical string file is used for persistence.
  - Legacy importers can be removed after confidence period.

## Migration V11 (Consolidated) Design

### Migration ordering
- Add V11 step first in registry. When it runs, it advances `saveVersion` to 11 and older steps won't execute.
- Older v2-v10 steps can remain for dev tooling, but must be effectively bypassed when V11 applies.

### Migration strategy: union, normalize, validate
- For each data domain, derive the canonical value by considering all known legacy representations and selecting the safest/most complete result.
- Do not delete legacy fields until after canonical values are produced and validated.

### Domains to normalize in V11

Facilities (assembly lines, managers, servers, data centers, planets, mega-structures)
- Inputs:
  - Dense arrays (`double[] { auto, manual }`)
  - Sparse indices/values lists (if present)
- Outputs:
  - Dense arrays always present and length 2 for runtime
  - Decide whether sparse lists remain in persisted V11 schema:
    - Recommended: stop relying on sparse lists for length-2 facilities; persist dense arrays only.
- Validation:
  - Any facility array null/wrong length must be corrected.

Skills owned (including "hubbleTelescope" critical preservation)
- Inputs (existing):
  - `skillOwnedBits` (byte[])
  - `skillOwnedBitsBase64` (string)
  - `skillStateById` (dictionary)
  - `skillOwnedById` (dictionary)
  - `SkillTreeSaveData` (legacy key->bool)
  - SkillTree bool flags (`DysonVerseSkillTreeData` fields via SkillFlagAccessor)
- Output (V11 canonical recommendation):
  - Replace persisted bitsets with a canonical list:
    - Preferred compact + stable: `List<int> ownedSkillKeys` (legacy keys)
    - Or human-readable: `List<string> ownedSkillIds`
  - Runtime bitsets can be rebuilt on demand if still required by performance/UI.
- Size impact note (gzip+base64 order-of-magnitude for 104 skills):
  - Bitset: ~tens of chars
  - Int keys list: ~hundreds of chars
  - String ids list: ~1k+ chars

Skill auto-assign (current + presets)
- Inputs:
  - ids list, legacy int list, bitset/base64, preset slots
- Outputs:
  - Canonical V11: store only one representation per list (recommend ids or keys)
  - Ensure dependency-safe ordering (existing logic can be reused but moved out of Oracle)

Research levels
- Inputs:
  - `researchLevelsById` plus legacy research fields
- Outputs:
  - Canonical dictionary with zero values pruned (clipboard size)

Settings flags / booleans
- Decision:
  - If we keep `packedSettingsFlags`, we must actually strip redundant booleans from the persisted snapshot for size win.
  - If not, keep booleans and drop the packed field to reduce "two sources of truth".

### Transactionality and safety
- Migrate on a deep copy of loaded data.
- Validate invariants before committing.
- Only after success:
  - Write migrated canonical save string to disk
  - Keep pre-migration backup
- If any step fails:
  - Do not overwrite the canonical file
  - Keep diagnostics for support

## Implementation Plan (Phased, With Checkpoints)

### Phase 0: Baseline + documentation (no behavior changes)
- Add this plan file.
- Add a "save telemetry" checklist:
  - log current clipboard export length
  - log compressed byte size
  - log saveVersion + key invariants summary

### Phase 1: Extract codec (no format change)
- Create `SaveCodec` and make Oracle clipboard code call it.
- Acceptance:
  - Output strings are byte-for-byte identical to current clipboard exports for the same snapshot.

### Phase 2: Add canonical string file storage (read-only first)
- Implement `OdinStringFileStorage` and `SaveSystem.TryLoadFromCanonicalFile`.
- Keep existing ES3 load path as fallback during validation period.
- Acceptance:
  - If canonical file exists and is valid, load uses it.
  - If canonical file missing/invalid, existing ES3 load continues.

### Phase 3: Consolidated Migration V11 + validators
- Add V11 migration logic and `SaveValidator`.
- Wire migration to run on load before game systems consume state.
- Acceptance:
  - Can upgrade representative saves from v6/v7/v8/v9/v10 to v11 directly.
  - Invariants pass.
  - "hubbleTelescope" (and other owned skills) preserved.

### Phase 4: Switch write path to canonical string file
- Saving writes the canonical file (atomic + backups).
- Optionally stop writing ES3 entirely after confidence period.
- Acceptance:
  - No regression in autosave/quick-save behavior.
  - Backups exist and are usable.

### Phase 5: Legacy removal (end state "Odin-only")
- Remove ES3 persistence code path after a deliberate grace period and validation.
- Keep legacy import only if explicitly required (config/flag), otherwise delete.

### Phase 6: Oracle.cs reduction (safe mechanical refactors)
- Convert `Oracle.cs` into multiple partial files:
  - Keep serialized fields and nested types stable.
  - Move save/migration logic out to `SaveSystem` and keep only wrappers.
- Acceptance:
  - Unity inspector references remain intact (same MonoBehaviour, same serialized field names).
  - Public API surface used by other scripts remains available.

## Oracle Refactor Checklist (How We Shrink the Monolith Without Breaking Callers)

### What Moves Out of Oracle in V11 (save system scope)
- All codec logic:
  - base64/gzip helpers
  - DTO debug export helpers
  - "looks like json/gzip" sniffing
- All persistence logic:
  - on-disk read/write
  - autosave write path
  - recovery/backups policy
- All migration orchestration:
  - registry construction (or at least step bodies) and V11 consolidated step implementation
  - "ensure" normalization logic should live alongside migration/validation, not in the MonoBehaviour
- All save compaction logic:
  - snapshot creation and pruning (skills, research, facility representation)

### What Can Stay in Oracle for V11 (to reduce blast radius)
- The singleton (`Oracle.oracle`) and `saveSettings` field.
- Nested save-data types (must remain for type identity stability).
- Static convenience accessors and events (as thin wrappers).
- Non-save game logic (Prestige/Infinity loops, NewsTicker, etc.) can remain temporarily and be refactored later.

### Step 1: Split Oracle into partial files (mechanical move, no behavior change)
- Create:
  - `Assets/Scripts/Expansion/Oracle.SaveApi.cs`
  - `Assets/Scripts/Expansion/Oracle.SaveTypes.cs`
  - `Assets/Scripts/Expansion/Oracle.StaticApi.cs`
  - `Assets/Scripts/Expansion/Oracle.MigrationApi.cs`
  - `Assets/Scripts/Expansion/Oracle.SkillApi.cs`
- Move code blocks from `Oracle.cs` by responsibility, keeping method signatures identical.
- Do not rename:
  - Serialized fields
  - Public methods used by UI/Inspector buttons
  - Nested types
  - `Oracle.oracle` singleton field

### Step 2: Introduce external classes, then convert Oracle methods into wrappers
- Add new external modules under `Assets/Scripts/Systems/Save/`.
- For each Oracle entry point:
  - Keep the Oracle method (for existing callers).
  - Replace body with a call into `SaveSystem` (or equivalent) and keep side effects the same (scene reloads, UI text, etc.).

### Step 3: Replace internal Oracle-to-Oracle calls with external calls (reduce tangling)
- Example: `SaveInternal()` and `SaveState()` should become internal wrappers around `SaveSystem.Save(...)`.
- Keep `ScheduleAutoSave()`/`ScheduleQuickSave()` behavior stable (timing changes can create subtle regressions).

## Test Plan (Must-Haves Before Shipping)

### Testing philosophy
- Prefer **EditMode NUnit tests** for speed and determinism.
- Add **small, targeted PlayMode smoke tests** only where Unity lifecycle ordering matters.
- Add "characterization tests" first to lock baseline behavior before refactoring.
- Treat save/migration as a high-stakes subsystem:
  - Tests must verify "no overwrite on failure" and "backup/rollback always possible".
  - Tests must cover both typical and adversarial inputs (missing fields, corrupt strings).

### Where tests live
- Existing tests already live under `Assets/Editor/Tests/`.
- Add a new folder for save-system tests:
  - `Assets/Editor/Tests/Save/`
- Fixture files (canonical strings, debug JSON) should live under:
  - `Assets/Editor/Tests/Save/Fixtures/` (small text fixtures, committed)
  - `Documentation/savedebugging/` (large or ad-hoc fixtures, not necessarily committed)

### Phase gates (tests that must pass before proceeding)

Phase 0 (baseline characterization)
- Tests:
  - `OracleSaveCodecCharacterizationTests`
  - `OracleSparseFacilityCharacterizationTests`
- Purpose:
  - Capture "what the current system actually does" without changing it.
  - Provide a safety net when refactoring code out of Oracle.

Phase 1 (SaveCodec extraction)
- Tests:
  - `SaveCodecTests` (roundtrip, invalid input handling)
  - Compatibility test: SaveCodec output matches legacy Oracle clipboard output (via reflection invoking Oracle private helpers).
- Purpose:
  - Ensure we didn't change clipboard format/behavior while extracting.

Phase 2 (canonical string file storage read path)
- Tests:
  - `OdinStringFileStorageTests` (read/write, backup rotation)
  - `SaveSystemLoadTests` using in-memory storage and file storage.
- Purpose:
  - Verify file IO is atomic and resilient before it becomes the primary save source.

Phase 3 (V11 migration + validator)
- Tests:
  - `SaveValidatorTests` (facility arrays length, NaN/Infinity detection, required graph non-null)
  - `SaveMigrationV11Tests` (legacy variants -> canonical invariants preserved)
  - "hubble preservation" tests across multiple legacy representations.
- Purpose:
  - Validate the migration can safely upgrade old saves without requiring intermediate steps.

Phase 4 (switch write path)
- Tests:
  - `SaveSystemRoundTripFileTests` (save -> load -> save stability)
  - `SaveSystemDoesNotOverwriteOnFailureTests` (simulate corrupt input and verify backups preserved)
  - Export string size budget tests (see below).

Phase 5 (legacy removal)
- Tests:
  - Ensure no references to ES3 persistence remain in runtime path (code search / compile gate).
  - Regression suite from Phase 0-4 still passes.

Phase 6 (Oracle split into partials)
- Tests:
  - All save tests + existing service/system tests must still pass (this phase should be "no behavior change").

### Unit tests (recommended set)

Codec roundtrip (SaveCodec)
- Encode -> decode -> encode stability for representative saves.
- Determinism: encoding the same snapshot twice yields identical string.
- Prefix detection:
  - Accept `IDB1:` (canonical)
  - Optionally accept legacy formats (IDSZ1, raw JSON, debug DTO) and re-emit canonical.
- Corrupt input behavior:
  - Invalid prefix
  - Invalid base64 payload
  - Valid base64 but invalid gzip
  - Valid gzip but invalid Odin payload
- Backward-compatibility characterization:
  - Compare SaveCodec output to Oracle's current private `EncodeBinaryClipboardBytes(...)` using reflection.

Storage (OdinStringFileStorage)
- Atomic write:
  - Write creates/updates the file without leaving partial content.
  - If a temp file exists from a prior failed write, next write succeeds and temp is cleaned up.
- Backup rotation:
  - After N writes, N backups exist and are readable.
  - Backups are never overwritten by invalid data.
- Read behavior:
  - Missing file returns "not found" (no exceptions).
  - Corrupt file returns "invalid" with diagnostics, and does not modify disk.

Validator (SaveValidator)
- Facility invariants:
  - All facility arrays are non-null and exactly length 2.
  - Detect (and optionally correct) `null` arrays caused by partial loads.
- Numeric invariants:
  - Detect NaN/Infinity in currencies and key rates.
- Graph invariants:
  - Ensure `SaveDataSettings.dysonVerseSaveData` and nested objects exist.
  - Ensure `saveVersion` sane (>=0).

Migration (SaveMigrationV11)
- Synthetic fixtures for each legacy "shape":
  - v6-like (no bitsets, older skill ownership sources).
  - v7-like (bitsets introduced).
  - v8-like (packed flags present).
  - v9-like (preset auto-assign ordering legacy).
  - v10-like (avotation progress).
- Adversarial fixtures:
  - Facility arrays `null` + sparse empty.
  - Bitset missing but legacy dict/flags present.
  - Conflicting ownership sources (bitset says owned, dict says not) -> union policy is applied.
- Required preservation tests:
  - "hubbleTelescope" remains owned if it was owned in any legacy representation.
  - Facility counts preserved when present (and do not get zeroed by compaction logic).

SaveSystem orchestration
- Transactionality:
  - Migration failure does not overwrite the canonical save file.
  - Validator failure prevents writing (and returns diagnostic report).
- Idempotence:
  - Load -> Save -> Load yields equivalent state.
- Size budgets:
  - Encode representative "typical" saves and assert:
    - <= 20,000 chars (hard)
    - Track (log) <= 10,000 chars as a target

### PlayMode smoke tests (minimal, high-value only)
- Initialization order:
  - Spawn Oracle + ServiceProvider in an empty test scene and ensure save load completes before services are used.
- Regression: `Oracle.Save()` wrapper still performs persistence (via SaveSystem) without exceptions.

### Fixture strategy (to avoid back-and-forth)
- Add a `SaveFixtureBuilder` helper for tests that constructs `Oracle.SaveDataSettings` snapshots for scenarios:
  - empty/new save
  - mid-progression save
  - "worst-case size" save (max skills, research entries, etc.)
- Add a small number of committed golden fixture strings in `Assets/Editor/Tests/Save/Fixtures/`:
  - One canonical string from a real device/export
  - One intentionally-corrupt string (truncated mid-base64)
  - One legacy-format string (if we keep accepting legacy clipboard inputs)
- Each fixture should have an expected summary:
  - saveVersion
  - key facility totals
  - hubble owned (yes/no)
  - encoded length

### Automation (optional but recommended)
- Add a Unity Test Runner invocation to CI (or local script) so refactors don't ship untested.
- Make "save string length" visible in test output to prevent gradual bloat.

## Open Items / Decisions To Confirm Before Implementation
- Canonical prefix: keep `IDB1:` or introduce `IDB2:` for V11+ while still accepting `IDB1:` on import.
- Persisted schema choice for skills/auto-assign:
  - Keep bitsets with redundancy, or replace with key/id lists in V11.
- Facility sparse lists:
  - Recommended removal for length-2 facilities (persist dense arrays only).
