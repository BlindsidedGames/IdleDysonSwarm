# SaveWipeCoordinator (Single Source Of Truth For Wipes)

## Purpose
`SaveWipeCoordinator` centralizes "wipe save" behavior so UI buttons do not need large UnityEvent OnClick lists (CategoryStateSaver resets + wipe calls).

It also provides a consistent place to enforce:
- soft wipe vs hard wipe semantics
- category UI reset behavior
- post-wipe default tab selection

## Contract / Behavior
### Soft wipe (keep debug)
- Resets CategoryStateSaver UI state (SetState(0)) for all configured savers.
- Sets `PlayerPrefs("initialScreen")` to the configured value (defaults to `1` = Bots tab).
- Calls `Oracle.WipeAllDataKeepDebugEntitlement()`.

### Hard wipe (remove debug)
- Resets CategoryStateSaver UI state (SetState(0)) for all configured savers.
- Sets `PlayerPrefs("initialScreen")` to the configured value (defaults to `1` = Bots tab).
- Calls `Oracle.WipeAllData()` (hard wipe).

## Dependencies / Integration Points
- `Assets/Scripts/Systems/Save/SaveWipeCoordinator.cs`
- `Assets/Scripts/Expansion/Oracle.Persistence.cs`
  - `WipeAllData()` is the hard wipe and clears debug entitlement.
  - `WipeAllDataKeepDebugEntitlement()` is the soft wipe.
- `Assets/Scripts/User Interface/CategoryStateSaver.cs`
  - Coordinator calls `SetState(0)` to match previous button wiring.
- Entitlements:
  - Debug entitlement persistence lives in `Assets/Scripts/Systems/Save/PlayerEntitlementsStore.cs`.

## Quick Setup (Unity Inspector)
1. Add `SaveWipeCoordinator` to an always-enabled root object.
2. Assign:
   - `softWipeKeepDebugButton` (debug tab)
   - `hardWipeRemoveDebugButton` (settings)
   - `wipeUiToDisable` (optional)
   - `categoryStateSaversToReset` (all the savers previously listed in the wipe button OnClick)
3. Remove the old OnClick soup from the wipe button(s) so only the coordinator runs.

## Quick Verification
1. Click soft wipe:
   - Scene reloads
   - UI defaults to Bots tab
   - Debug remains enabled if debug entitlement was purchased
2. Click hard wipe:
   - Scene reloads
   - UI defaults to Bots tab
   - Debug entitlement is removed; debug is disabled

