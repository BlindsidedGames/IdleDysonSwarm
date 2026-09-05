import { inventoryBinding } from './steam/client.mjs'
/** Only the Electron main process owns the initialized SDK client. */
export async function loadSteamInventoryBinding({ client }) {
  return inventoryBinding(client)
}
