# Steam Inventory Electron foundation

Electron now routes its existing Store and entitlement IPC through a dormant
`SteamInventoryStore` in the main process. The checked-in configuration is
intentionally disabled and contains no invented Steam ItemDef IDs. This is a
fail-closed integration seam, not a live Steam commerce implementation.

## Trust and process boundary

- Steam Inventory access belongs only in the Electron main process. The
  sandboxed renderer receives product listings, purchase outcomes and three
  ownership booleans through the existing preload contract.
- A successful purchase result is not entitlement authority. Double Infinity
  Points and Developer Options become owned only after a fresh Steam inventory
  result contains their configured ItemDef IDs.
- Supporter tiers are accepted only after inventory delivery is observed. The
  Cat Gallery entitlement and pending cleanup record are atomically persisted
  before the delivered instance is consumed. Once Steam reports completed and
  the delivered inventory increase is verified, a cache-write failure retains
  the item as provider recovery authority and reports the purchase as accepted
  instead of encouraging a second charge. The item is not consumed until the
  complete outstanding quantity is durable. The entitlement grants no gameplay
  state.
- Only provider-verified durable ownership is written to the atomic offline
  cache. The complete cache record is encrypted/authenticated through
  Electron `safeStorage`, remains opaque on disk, and contains the currently
  authenticated SteamID inside the protected payload. Missing encryption,
  decryption/authentication failure, identity mismatch, or Linux
  `basic_text` or unknown storage rejects the cache. Linux permits only
  `gnome_libsecret`, `kwallet`, `kwallet5`, or `kwallet6`. Shared saves and
  renderer messages never write it.
- Startup resolves the authenticated SteamID, serves its matching cache
  immediately, and queues an authoritative inventory refresh in the
  background. A verified revocation replaces cached ownership; failed atomic
  publication is retained as an explicit retry-pending state and retried.
  Permanent OS-protector unavailability instead marks offline persistence
  disabled and does not schedule an endless retry loop; transient protection
  or filesystem write failures retain the retry path.
- Delivered tips are recorded as pending consumption before cleanup. Failed
  consumption remains durable and is retried against later verified inventory
  snapshots without turning a charged purchase into a reported failure. Any
  orphaned configured tip instance found by a later authoritative snapshot is
  also adopted into the cleanup queue, covering interruption before the first
  pending record could be published. A later inventory refresh preserves the
  cached supporter entitlement after the consumable instance disappears.
- Steam may stack a repeat supporter delivery onto the same inventory instance.
  Purchase and refresh paths therefore derive one pending record per validated
  provider instance at its complete current quantity. A transient cache-write
  failure retries persistence before cleanup; restart and later authoritative
  refresh recover from the still-delivered item. Successful cleanup consumes
  the complete queued quantity once and only then removes the durable pending
  record.
- Every pending cleanup includes the exact configured tip ItemDef ID. Before
  consumption, a fresh validated inventory snapshot must contain that same
  instance, ItemDef and sufficient quantity. Durable ItemDefs are discarded
  from cleanup state and can never be passed to `consumeItem`.
- Missing or malformed configuration, an unavailable binding, provider errors,
  unknown products and unverified delivery all fail closed.

## Checked configuration

`hosts/electron/steam-inventory.json` has an exact five-product schema. To
enable it, Steamworks must first provide five distinct numeric ItemDef IDs in
the supported non-Workshop range. All five IDs must be present before
`enabled` may be set to `true`:

- `ids.tiptier1`
- `ids.tiptier2`
- `ids.tiptier3`
- `ids.devoptions`
- `ids.doubleip`

The string identifiers remain the cross-store game contract. The numeric IDs
are Steam-only configuration and must never enter save data or gameplay.

## Required native binding

Stock `steamworks.js` is deliberately not installed. Its current public API
does not expose the ISteamInventory purchase and ownership calls this adapter
requires. `steamInventoryBinding.mjs` must remain fail-closed until a pinned,
supported native binding implements these main-process operations:

1. `getAuthenticatedSteamId()` returns the currently authenticated SteamID64
   as a decimal string. Missing or changed identity invalidates cached state.
2. `requestLocalizedPrices(itemDefIds)` returns ItemDef IDs paired with opaque,
   already-localized price strings.
3. `getAllItems()` returns verified Steam inventory instances with numeric
   `itemDefId`, opaque `instanceId`, and integer `quantity`.
4. `startPurchase(itemDefId, quantity)` completes with one of `completed`,
   `cancelled`, `pending`, or `failed` after the Steam purchase flow.
5. `consumeItem(instanceId, quantity)` consumes a verified delivered supporter
   item only after entitlement persistence.

Every binding payload is structurally checked before use. Invalid SteamIDs,
duplicate or malformed inventory instances, invalid quantities, unexpected or
duplicate price ItemDefs, empty localized prices, and unknown purchase states
fail closed. Catalog, purchase, restore, cleanup and refresh calls share one
main-process provider queue so a binding never has overlapping result handles.

The eventual binding must pump Steam callbacks, destroy every inventory result
handle, initialize AppID `4348570`, and package the correct official Steam API
redistributables and native module outside ASAR for Windows, macOS and Linux.
Those proprietary/runtime files are intentionally not present here.

The production cache protector is injected by Electron main from
`safeStorage`; no key or plaintext fallback exists in the adapter. Tests use a
deterministic authenticated-encryption protector solely to exercise atomic
storage and tamper rejection without depending on a desktop keychain.

## External Steamworks gates

Before enabling the checked configuration:

1. Enable Steam Inventory Service for AppID `4348570` in Steamworks.
2. Create, localize, price and publish all five ItemDefs, then record their real
   numeric IDs. Durable items must be non-tradable and non-marketable; tip item
   consumption and refund behavior must be approved before release.
3. Select or build the supported inventory-capable native binding and provide
   official Steamworks SDK redistributables for every desktop target.
4. Validate authorized sandbox purchases through the Steam client: localized
   catalog, cancellation, pending/error states, repeat tips, consumption,
   permanent ownership, restore, offline cache, refund/revocation behavior,
   overlay-disabled behavior, and a clean account with no ownership.

Until every gate is complete, packaged Electron builds truthfully show the
Steam Store as unavailable and grant no new Steam entitlement.
