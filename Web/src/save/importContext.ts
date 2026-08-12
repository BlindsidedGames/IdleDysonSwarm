import { deepCloneSave, type SaveRecord } from './graph'

export type ImportContext =
  | {
      readonly kind: 'automatic-unity-migration'
      readonly observedAtUtc: string
    }
  | {
      readonly kind: 'manual-shared-import'
      readonly importedAtUtc: string
    }
  | {
      readonly kind: 'transitional-web-upgrade'
      readonly upgradedAtUtc: string
    }

/**
 * Settings in this list describe the receiving installation, not portable
 * gameplay progress. Language and audio volume are stored by their platform
 * adapters and therefore never enter the save graph at all.
 */
export const RECEIVING_DEVICE_PREFERENCE_FIELDS = Object.freeze([
  'globalMute',
  'screensaverEnabled',
  'hidePurchased',
  'buyMax',
  'numberFormatting',
  'skillsBuyOnTap',
  'frameRate',
  'botsButtonToggle',
  'researchbuttonToggle',
  'skillsButtonToggle',
  'skillsFirstRunDone',
  'infinityButtonToggle',
  'infinityFirstRunDone',
  'realityButtonToggle',
  'realityFirstRun',
  'simulationsButtonToggle',
  'prestigeButtonToggle',
  'prestigeFirstRun',
  'storyButtonToggle',
  'wikiButtonToggle',
  'statisticsButtonToggle',
  'settingsButtonToggle',
  'firstReality',
] as const)

export function retainReceivingDevicePreferences(
  imported: SaveRecord,
  receiving: SaveRecord | undefined,
): SaveRecord {
  const result = deepCloneSave(imported)
  if (receiving === undefined) return result
  for (const field of RECEIVING_DEVICE_PREFERENCE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(receiving, field)) {
      result[field] = receiving[field]
    }
  }
  return result
}

/**
 * A shared save cannot carry platform or Developer Options state. The
 * receiving installation's local state must survive replacement instead.
 * Store ownership remains outside the save graph and is reapplied by the host.
 */
export function retainReceivingLocalPlatformState(
  imported: SaveRecord,
  receiving: SaveRecord | undefined,
): SaveRecord {
  const result = deepCloneSave(imported)
  const locallyUnlocked = receiving?.debugEverEnabled === true
  result.debugEverEnabled = locallyUnlocked
  result.debugOptions =
    locallyUnlocked && receiving?.debugOptions === true
  result.cheater = receiving?.cheater === true
  result.unlockAllTabs = receiving?.unlockAllTabs === true
  return result
}
