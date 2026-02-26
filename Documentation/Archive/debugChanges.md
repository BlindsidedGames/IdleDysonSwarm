# Debug Changes Plan (Draft)

Date: 2026-02-10

## Goals

### Debug Options UI: add 4 buttons (you will place the buttons; code will add references + handlers)
1. **Recalculate Skill Points**
   - Calls existing Oracle recompute-from-source-of-truth method.
   - Current candidate: `Expansion.Oracle.ApplySkillPointRecalc()` (`Assets/Scripts/Expansion/Oracle.SkillPoints.cs`).
2. **Disable Debug**
   - Temporarily turns off debug options for the current save.
   - Entitlement remains, so debug can be turned back on without re-purchasing.
3. **Wipe Save (Keep Debug)**
   - Wipes save data and meta progress identically to current `Oracle.WipeAllData()` behavior, but preserves the debug entitlement.
   - After wipe, debug should auto-enable because entitlement exists.
4. **(Dropped) Toggle Double IP**
   - Not implementing. Double IP remains legacy-only for prior purchasers and persists via PlayerPrefs as before.

### Settings UI: Hard wipe already exists
- The existing settings "wipe" button stays where it is.
- It should perform a **hard wipe** that also removes debug entitlement (and disables debug).
- No new settings UI wiring required; we will only update the backend method(s) it calls if needed.

### “Debug Ever Enabled” marker (per-save)
- Add `SaveDataSettings.debugEverEnabled` and set it any time debug is enabled on that save.
- UI will show an icon at the top of the screen based on this value (you’ll add the icon; code will toggle it).

## Why This Is Needed (Current Problems)
- Debug unlock currently uses a global PlayerPrefs key (`"debug"`) in multiple places. That makes:
  - debug behavior effectively device-global, not save-scoped
  - wipe behavior inconsistent (some wipes preserve debug by reading PlayerPrefs)
  - future cleanup harder
- Wipe buttons are wired to many UnityEvent OnClick entries (CategoryStateSaver spam + `Oracle.WipeAllData()`), which is brittle and hard to keep correct.

## Proposed Architecture

### 1) Centralize wipes in a single runtime script
Create a central "single source of truth" runtime script that owns wipe behavior and can be invoked by UI with a single call.

Working name: `SaveWipeCoordinator` (exact class/file TBD)

Responsibilities:
- Soft wipe: wipe save/meta but keep debug entitlement, then auto-enable debug
- Hard wipe: wipe save/meta and remove debug entitlement
- Optionally: reset CategoryStateSaver states that are currently manually wired in the button OnClick list
- Ensure save is persisted and scene reload happens exactly once

UI buttons should call ONLY coordinator methods (no more 10+ UnityEvent entries per button).

### 2) Replace debug entitlement storage: move off PlayerPrefs
Introduce an entitlement store persisted separately from the run save.

Working name: `EntitlementsStore` / `PlayerEntitlements`.

Data:
- `bool debugEntitlementPurchased`
- (possibly later) `bool doubleIpEntitlementPurchased` if Double IP is intended to be a global entitlement

Persistence:
- File under `Application.persistentDataPath` (format TBD: JSON or Sirenix binary).

Migration:
- On first load after this change:
  - If `PlayerPrefs("debug")==1`, set `debugEntitlementPurchased = true`.
  - Remove/ignore PlayerPrefs going forward (debug gating no longer ORs PlayerPrefs).

### 3) Save-scoped flags in `SaveDataSettings`
Add fields to `Expansion.Oracle.SaveDataSettings` (`Assets/Scripts/Expansion/Oracle.cs`):
- `bool debugEverEnabled` (default false)

Rules:
- Any time debug is enabled (purchase or entitlement-based auto-enable), set `debugEverEnabled = true`.
- Disabling debug does not clear `debugEverEnabled`.

### 4) Debug enable/disable model after this change
- Entitlement (global): `EntitlementsStore.debugEntitlementPurchased`
- Per-save "currently enabled": `SaveDataSettings.debugOptions`
- Per-save history: `SaveDataSettings.debugEverEnabled`

Enable debug:
- Allowed if `EntitlementsStore.debugEntitlementPurchased == true`.
- Sets `saveSettings.debugOptions = true` and `saveSettings.debugEverEnabled = true`.

Disable debug:
- Sets `saveSettings.debugOptions = false`.

Purchase debug (in-game currency):
- Deduct cost
- Sets entitlement true
- Enables debug + sets debugEverEnabled

### 5) Top-of-screen icon toggle
Add a serialized reference in some always-present UI/controller script:
- `GameObject debugEverEnabledIcon`
- Toggle active based on `oracle.saveSettings.debugEverEnabled`

You mentioned you will add the objects manually and provide a reference.

## Implementation Steps (Concrete)
1. Add `debugEverEnabled` to `SaveDataSettings`.
2. Implement `EntitlementsStore` with load/save + migration from PlayerPrefs("debug").
3. Update all debug gating to rely on entitlement store, not PlayerPrefs.
   - Search + update:
     - `Assets/Scripts/Expansion/Oracle.Persistence.cs`
     - `Assets/Scripts/Expansion/Oracle.cs`
     - `Assets/Scripts/Expansion/Oracle.Clipboard.cs`
     - any other `PlayerPrefs("debug")` usage
4. Create `SaveWipeCoordinator`:
   - `SoftWipeKeepDebug()` (wipe + preserve entitlement + auto-enable debug)
   - `HardWipeRemoveDebug()` (wipe + clear entitlement + disable debug)
   - optionally `ResetUiCategoryStates()` (if we want to replace the CategoryStateSaver OnClick spam)
5. Update Debug Options UI wiring:
   - Add new button references and handlers in `Assets/Scripts/User Interface/DebugOptions.cs`.
   - Ensure DebugOptions can safely live on a root object (no reliance on being enabled/disabled by tab visibility).
6. Hook existing settings wipe button to coordinator hard wipe (only if it’s not already calling something suitable).
7. Add the Double IP toggle button behavior (exact semantics TBD; see questions).
8. Add icon toggle hook.
9. Verification checklist (see below).

## Verification Checklist
- Purchase debug with currency:
  - entitlement persists across relaunch
  - debug auto-enabled after soft wipe
  - `debugEverEnabled` becomes true and stays true
- Disable debug:
  - hides debug features
  - can re-enable without re-purchase if entitlement exists
- Soft wipe:
  - save reset occurs
  - debug remains enabled afterwards (because entitlement exists)
- Hard wipe (settings wipe):
  - save reset occurs
  - debug entitlement cleared
  - debug disabled afterwards and cannot be enabled without purchasing again
- CategoryStateSaver / UI state:
  - if coordinator takes over, the wipe button OnClick should shrink to 1 call and still behaves correctly

## Open Questions (must answer before implementation)
1. Where should this “plan file” live?
   - I assumed repo `Documentation/` (this file).
   - If you meant OS-level Documents folder, confirm and I’ll move it.
2. Double IP toggle semantics:
   - Dropped: Double IP stays as legacy PlayerPrefs-backed unlock; no toggle button.
3. Category reset:
   - Do you want the coordinator to reset the CategoryStateSaver states (the long list in the wipe button OnClick)?
   - If yes, what are the authoritative categories and default states we should enforce?
