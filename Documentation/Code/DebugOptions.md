# DebugOptions (Dev Unlock + Debug Panel)

## Purpose
`DebugOptions` is the runtime UI controller for the debug/dev options panel. It wires up the various debug buttons and gates access to the debug category behind an in-game currency purchase.

## Contract / Behavior
- Dev options are considered **unlocked** when `oracle.saveSettings.debugOptions == true`.
- Debug entitlement persists across soft wipes via `Systems.Save.PlayerEntitlementsStore.DebugEntitlementPurchased`.
- A save is considered "debug tainted" if `oracle.saveSettings.debugEverEnabled == true`.
- Unlock persistence:
  - On successful purchase, the code sets `PlayerEntitlementsStore.DebugEntitlementPurchased = true`.
- Purchase requirements (hard-coded):
  - `100_000` Quantum Shards: `oracle.saveSettings.prestigePlus.points`
  - `500_000` Strange Matter: `oracle.saveSettings.sdPrestige.strangeMatter`
- UI behavior:
  - The purchase button is only `interactable` when the player is not already unlocked and can afford the costs.
  - If debug entitlement exists but debug is currently disabled, the purchase button acts as "Enable Debug" and is interactable.
  - When unlocked, the debug category is shown and the purchase category is hidden.

## Data Flow
1. Player opens the panel -> `DebugOptions.OnEnable()` subscribes to `Oracle.DebugOptionsChanged` and refreshes UI.
2. Per frame, `DebugOptions.Update()` recomputes the purchase button's `interactable` state from current resources.
3. Player clicks purchase -> `DebugOptions.AttemptPurchaseDevOptionsWithCurrency()`:
   - Validates affordability
   - Deducts Quantum Shards + Strange Matter
   - Sets `saveSettings.debugOptions = true`
   - Sets `PlayerEntitlementsStore.DebugEntitlementPurchased = true`
   - Sets `saveSettings.debugEverEnabled = true`
   - Calls `NotifyDebugOptionsChanged()` and refreshes UI

## Related Scripts
- `Assets/Scripts/User Interface/DebugOptions.cs`
- `Assets/Scripts/Systems/Debugging/DebugPurchaseHandler.cs`
  - Legacy/secondary controller for purchase-store UI. Also enforces the same affordability and cost constants.

## Save/Load Implications
- Changing `PlayerEntitlementsStore` persistence or the semantics of `saveSettings.debugOptions` / `saveSettings.debugEverEnabled` will affect:
  - Debug entitlement behavior across soft/hard wipes
  - Any conditions gated by dev unlock (e.g., data-driven `DevOptionsCondition`)

## Quick Verification Steps
1. With less than `100_000` Quantum Shards or `500_000` Strange Matter:
   - Dev purchase button should be disabled
   - Clicking should not unlock dev options
2. With at least both costs:
   - Dev purchase button should be enabled
   - Clicking should deduct both currencies and unlock dev options
3. After unlocking, quit and relaunch:
   - Debug entitlement should remain purchased (via `PlayerEntitlementsStore`)
   - Dev options should remain enabled if the save has `debugOptions == true`
