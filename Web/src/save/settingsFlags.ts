import { type SaveRecord } from './graph'

const fields = [
  'roundedBulkBuy',
  'researchRoundedBulkBuy',
  'debugOptions',
  'doubleIp',
  'unlockAllTabs',
  'avotation',
  'infinityInProgress',
  'tutorial',
  'globalMute',
  'cheater',
  'hidePurchased',
  'buyMax',
  'skillsBuyOnTap',
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
  'infinityAutoResearchToggleAi',
  'infinityAutoResearchToggleAssembly',
  'infinityAutoResearchToggleMoney',
  'infinityAutoResearchTogglePlanet',
  'infinityAutoResearchToggleServer',
  'infinityAutoResearchToggleDataCenter',
  'infinityAutoResearchToggleScience',
  'infinityAutoAssembly',
  'infinityAutoManagers',
  'infinityAutoServers',
  'infinityAutoDataCenters',
  'infinityAutoPlanets',
  'firstReality',
  'firstInfinityDone',
  'screensaverEnabled',
  'infinityAutoMatrioshkaBrains',
  'infinityAutoBirchPlanets',
  'infinityAutoGalacticBrains',
  'infinityAutoResearchToggleMatrioshkaBrains',
  'infinityAutoResearchToggleBirchPlanets',
  'infinityAutoResearchToggleGalacticBrains',
  'autoAssignNonRefundableSkills',
] as const

export function packSettingsFlags(settings: SaveRecord): bigint {
  let flags = 0n
  fields.forEach((field, bit) => {
    if (settings[field] === true) flags |= 1n << BigInt(bit)
  })
  settings.packedSettingsFlags = flags
  settings.hasPackedSettingsFlags = true
  return flags
}

export function applyPackedSettingsFlags(settings: SaveRecord): void {
  if (settings.hasPackedSettingsFlags !== true) return
  const raw = settings.packedSettingsFlags
  const flags =
    typeof raw === 'bigint'
      ? raw
      : typeof raw === 'number' && Number.isSafeInteger(raw)
        ? BigInt(raw)
        : 0n
  fields.forEach((field, bit) => {
    const enabled = (flags & (1n << BigInt(bit))) !== 0n
    if (bit <= 41 || enabled) settings[field] = enabled
  })
}
