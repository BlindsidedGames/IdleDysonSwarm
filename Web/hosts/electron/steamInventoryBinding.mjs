/**
 * Native binding boundary for Steam Inventory.
 *
 * This deliberately does not import stock steamworks.js: its current public
 * client has no ISteamInventory purchase or ownership API. A future supported
 * binding must implement getAuthenticatedSteamId, requestLocalizedPrices,
 * getAllItems, startPurchase and consumeItem entirely in the Electron main
 * process. Until then, returning null keeps the Store and entitlement
 * authority fail-closed.
 */
export async function loadSteamInventoryBinding(_options) {
  return null
}
