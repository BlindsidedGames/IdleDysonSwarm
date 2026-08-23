import {
  publicUnitySaveCertification,
  publicUnitySchema11LeafPatterns,
  schema11DreamEducationFields,
  schema11DreamParameterFields,
  schema11DreamResourceFields,
  schema11DreamTimerFields,
  schema11DreamUpgradeFields,
} from './mappingCoverageSchema11'

export type MappingClassification =
  | 'canonically-owned'
  | 'derived-recomputed'
  | 'legacy-duplicate-omitted'
  | 'presentation-preference'
  | 'platform-entitlement'
  | 'still-unowned'

export interface MappingCoverageEntry {
  readonly sourcePath: string
  readonly classification: MappingClassification
  readonly owner: string | null
  readonly canonicalPath?: string
  readonly writePolicy:
    | 'write-canonical'
    | 'recompute'
    | 'omit'
    | 'preserve-source'
  readonly testId: string
  readonly rationale: string
}

function classified(
  sourcePath: string,
  classification: Exclude<MappingClassification, 'canonically-owned'>,
  writePolicy: MappingCoverageEntry['writePolicy'],
  rationale: string,
  owner: string | null = null,
): MappingCoverageEntry {
  return {
    sourcePath,
    classification,
    owner,
    writePolicy,
    testId: 'public-unity-schema-11-leaf-classification',
    rationale,
  }
}

function owned(
  sourcePath: string,
  owner: string,
  canonicalPath: string,
): MappingCoverageEntry {
  return {
    sourcePath,
    classification: 'canonically-owned',
    owner,
    canonicalPath,
    writePolicy: 'write-canonical',
    testId: 'game-state-round-trip',
    rationale: 'Hydrated and dehydrated by the typed canonical mapper.',
  }
}

function ownedFields(
  sourceRoot: string,
  owner: string,
  canonicalRoot: string,
  names: readonly string[],
): MappingCoverageEntry[] {
  return names.map((name) =>
    owned(`${sourceRoot}.${name}`, owner, `${canonicalRoot}.${name}`),
  )
}

const dysonRoot = '$.dysonVerseSaveData'
const dysonInfinity = `${dysonRoot}.dysonVerseInfinityData`
const dysonPrestige = `${dysonRoot}.dysonVersePrestigeData`
const skillTree = `${dysonRoot}.dysonVerseSkillTreeData`

const explicitEntries: MappingCoverageEntry[] = [
  owned('$.dateStarted', 'meta', '$.meta.createdAtLegacyText'),
  owned('$.tutorial', 'meta', '$.meta.tutorialComplete'),
  owned('$.firstInfinityDone', 'meta', '$.meta.firstInfinityComplete'),
  owned(
    '$.storyButtonToggle',
    'meta',
    '$.meta.navigationVisibility.story',
  ),
  owned(
    '$.wikiButtonToggle',
    'meta',
    '$.meta.navigationVisibility.wiki',
  ),
  owned(
    '$.statisticsButtonToggle',
    'meta',
    '$.meta.navigationVisibility.statistics',
  ),
  ...['money', 'science', 'bots', 'workers', 'researchers'].map(
    (field) => owned(`${dysonInfinity}.${field}`, 'dyson', `$.dyson.${field}`),
  ),
  ...[
    ['assemblyLines', 'assembly_lines'],
    ['managers', 'ai_managers'],
    ['servers', 'servers'],
    ['dataCenters', 'data_centers'],
    ['planets', 'planets'],
    ['matrioshkaBrains', 'matrioshka_brains'],
    ['birchPlanets', 'birch_planets'],
    ['galacticBrains', 'galactic_brains'],
  ].map(([source, canonical]) =>
    owned(
      `${dysonInfinity}.${source}.*`,
      'dyson',
      `$.dyson.facilities.${canonical}.*`,
    ),
  ),
  owned(
    `${dysonRoot}.manualCreationTime`,
    'dyson',
    '$.dyson.manualCreationIntervalSeconds',
  ),
  owned(
    `${dysonInfinity}.totalPanelsDecayed`,
    'dyson',
    '$.dyson.totalPanelsDecayed',
  ),
  owned(`${dysonInfinity}.goalSetter`, 'dyson', '$.dyson.goalStage'),
  owned(
    `${dysonPrestige}.botDistribution`,
    'dyson',
    '$.dyson.botDistribution',
  ),
  owned('$.buyMode', 'dyson', '$.dyson.automation.buyMode'),
  owned('$.roundedBulkBuy', 'dyson', '$.dyson.automation.roundedBulkBuy'),
  ...[
    ['infinityAutoAssembly', 'assembly_lines'],
    ['infinityAutoManagers', 'ai_managers'],
    ['infinityAutoServers', 'servers'],
    ['infinityAutoDataCenters', 'data_centers'],
    ['infinityAutoPlanets', 'planets'],
    ['infinityAutoMatrioshkaBrains', 'matrioshka_brains'],
    ['infinityAutoBirchPlanets', 'birch_planets'],
    ['infinityAutoGalacticBrains', 'galactic_brains'],
  ].map(([source, canonical]) =>
    owned(
      `$.${source}`,
      'dyson',
      `$.dyson.automation.enabledFacilities.${canonical}`,
    ),
  ),
  ...[
    ['infinityPoints', 'points'],
    ['spentInfinityPoints', 'spentPoints'],
    ['secretsOfTheUniverse', 'secretsOfTheUniverse'],
    ['permanentSkillPoint', 'permanentSkillPoints'],
    ['infinityAssemblyLines', 'retainedFacilities.assembly_lines'],
    ['infinityAiManagers', 'retainedFacilities.ai_managers'],
    ['infinityServers', 'retainedFacilities.servers'],
    ['infinityDataCenter', 'retainedFacilities.data_centers'],
    ['infinityPlanets', 'retainedFacilities.planets'],
    ['infinityAutoResearch', 'automationUnlocked.research'],
    ['infinityAutoBots', 'automationUnlocked.bots'],
  ].map(([source, canonical]) =>
    owned(`${dysonPrestige}.${source}`, 'infinity', `$.infinity.${canonical}`),
  ),
  ...[
    ['infinityPointsToBreakFor', 'breakTarget'],
    ['infinityInProgress', 'inProgress'],
    ['timeLastInfinity', 'lastCycleDurationSeconds'],
    ['lastInfinityPointsGained', 'lastPointsGained'],
    ['offlineTimeUsedThisInfinity', 'storedTimeUsedThisCycleSeconds'],
    [
      'offlineTimeUsedPreviousInfinity',
      'storedTimeUsedPreviousCycleSeconds',
    ],
  ].map(([source, canonical]) =>
    owned(`$.${source}`, 'infinity', `$.infinity.${canonical}`),
  ),
  owned(`${skillTree}.skillPointsTree`, 'skills', '$.skills.points'),
  owned(`${skillTree}.fragments`, 'skills', '$.skills.fragments'),
  ...['owned', 'level', 'timerSeconds', 'secondaryTimerSeconds'].map((field) =>
    owned(
      `${dysonInfinity}.skillStateById.*.${field}`,
      'skills',
      `$.skills.byId.*.${field}`,
    ),
  ),
  owned(
    `${dysonRoot}.skillAutoAssignmentIds.*`,
    'skills',
    '$.skills.activeAutoAssignment.*',
  ),
  ...Array.from({ length: 5 }, (_, index) => index + 1).flatMap((preset) => [
    owned(
      `${dysonRoot}.preset${preset}Name`,
      'skills',
      `$.skills.presets.${preset - 1}.name`,
    ),
    owned(
      `${dysonRoot}.botDistPreset${preset}`,
      'skills',
      `$.skills.presets.${preset - 1}.botDistribution`,
    ),
    owned(
      `${dysonRoot}.skillAutoAssignmentIds${preset}.*`,
      'skills',
      `$.skills.presets.${preset - 1}.skillIds.*`,
    ),
  ]),
  owned(
    '$.autoAssignNonRefundableSkills',
    'skills',
    '$.skills.autoAssignNonRefundable',
  ),
  owned(
    '$.botsTabPresetOverride',
    'skills',
    '$.skills.tabPresetAutomation.bots',
  ),
  owned(
    '$.researchTabPresetOverride',
    'skills',
    '$.skills.tabPresetAutomation.research',
  ),
  owned(
    `${dysonInfinity}.researchLevelsById.*`,
    'research',
    '$.research.levelsById.*',
  ),
  owned('$.researchBuyMode', 'research', '$.research.automation.buyMode'),
  owned(
    '$.researchRoundedBulkBuy',
    'research',
    '$.research.automation.roundedBulkBuy',
  ),
  ...[
    ['infinityAutoResearchToggleAi', 'research.ai_manager_upgrade'],
    ['infinityAutoResearchToggleAssembly', 'research.assembly_line_upgrade'],
    ['infinityAutoResearchToggleMoney', 'research.money_multiplier'],
    ['infinityAutoResearchTogglePlanet', 'research.planet_upgrade'],
    ['infinityAutoResearchToggleServer', 'research.server_upgrade'],
    ['infinityAutoResearchToggleDataCenter', 'research.data_center_upgrade'],
    ['infinityAutoResearchToggleScience', 'research.science_boost'],
    [
      'infinityAutoResearchToggleMatrioshkaBrains',
      'research.matrioshka_brains_upgrade',
    ],
    ['infinityAutoResearchToggleBirchPlanets', 'research.birch_planets_upgrade'],
    [
      'infinityAutoResearchToggleGalacticBrains',
      'research.galactic_brains_upgrade',
    ],
  ].map(([source, canonical]) =>
    owned(
      `$.${source}`,
      'research',
      `$.research.automation.enabledById.${canonical}`,
    ),
  ),
  ...[
    ['universesConsumed', 'universeDesignationCount'],
    ['workersReadyToGo', 'workersReady'],
    ['influence', 'influence'],
    ['workerAutoConvert', 'autoGather'],
  ].map(([source, canonical]) =>
    owned(`$.saveData.${source}`, 'reality', `$.reality.${canonical}`),
  ),
  ...[
    ['points', 'pointsEarned'],
    ['spentPoints', 'pointsSpent'],
    ['divisionsPurchased', 'divisionsPurchased'],
    ['secrets', 'permanentSecrets'],
    ['influence', 'influenceSpeedBonus'],
    ['cash', 'cashBonusLevels'],
    ['science', 'scienceBonusLevels'],
    ['botMultitasking', 'unlocks.botMultitasking'],
    ['doubleIP', 'unlocks.doubleInfinityPoints'],
    ['breakTheLoop', 'unlocks.breakTheLoop'],
    ['quantumEntanglement', 'unlocks.quantumEntanglement'],
    ['automation', 'unlocks.automation'],
    ['fragments', 'unlocks.fragments'],
    ['purity', 'unlocks.purity'],
    ['terra', 'unlocks.terra'],
    ['power', 'unlocks.power'],
    ['paragade', 'unlocks.paragade'],
    ['stellar', 'unlocks.stellar'],
  ].map(([source, canonical]) =>
    owned(`$.prestigePlus.${source}`, 'quantum', `$.quantum.${canonical}`),
  ),
  ...[
    ['unlockedMatrioshkaBrains', 'matrioshkaBrains'],
    ['unlockedBirchPlanets', 'birchPlanets'],
    ['unlockedGalacticBrains', 'galacticBrains'],
  ].map(([source, canonical]) =>
    owned(
      `${dysonPrestige}.${source}`,
      'quantum',
      `$.quantum.unlocks.${canonical}`,
    ),
  ),
  ...['unlocked', 'infinityPoints', 'influence', 'strangeMatter', 'overflowMultiplier'].map(
    (field) => owned(`$.avocadoData.${field}`, 'avocado', `$.avocado.${field}`),
  ),
  owned('$.offlineTime', 'timeline', '$.timeline.storedTimeAvailableSeconds'),
  owned('$.maxOfflineTime', 'timeline', '$.timeline.storedTimeCapacitySeconds'),
  owned('$.dateQuitString', 'timeline', '$.timeline.lastSuspendedAtLegacyText'),
  ...[
    ['doDoubleTime', 'enabled'],
    ['doubleTimeOwned', 'unlocked'],
    ['doubleTime', 'bankSeconds'],
    ['doubleTimeRate', 'rate'],
  ].map(([source, canonical]) =>
    owned(`$.sdPrestige.${source}`, 'timeline', `$.timeline.doubleTime.${canonical}`),
  ),
  owned('$.avotation', 'secret-progress', '$.secretProgress.completed'),
  owned('$.avotationProgressStep', 'secret-progress', '$.secretProgress.step'),
  ...ownedFields(
    '$.sdSimulation',
    'dream',
    '$.dream.resources',
    schema11DreamResourceFields,
  ),
  ...schema11DreamParameterFields.map((field) => {
    const canonical =
      field === 'communityBoostTime'
        ? 'communityBoostClock'
        : field === 'factoriesBoostTime'
          ? 'factoriesBoostClock'
          : field
    return owned(
      `$.sdSimulation.${field}`,
      'dream',
      `$.dream.parameters.${canonical}`,
    )
  }),
  ...schema11DreamEducationFields.map((field) => {
    const education = [
      'engineering',
      'shipping',
      'worldTrade',
      'worldPeace',
      'mathematics',
      'advancedPhysics',
    ].find((name) => field.startsWith(name))!
    const suffix = field.slice(education.length)
    const property =
      suffix === ''
        ? 'active'
        : suffix === 'Complete'
          ? 'complete'
          : suffix === 'Progress'
            ? 'progress'
            : suffix === 'ResearchTime'
              ? 'researchTime'
              : 'cost'
    return owned(
      `$.sdSimulation.${field}`,
      'dream',
      `$.dream.education.${education}.${property}`,
    )
  }),
  ...ownedFields(
    '$.sdSimulation',
    'dream',
    '$.dream.timers',
    schema11DreamTimerFields,
  ),
  owned(
    '$.sdSimulation.railgunFireProgress',
    'dream',
    '$.dream.railgun.fireProgress',
  ),
  owned('$.sdPrestige.simulationCount', 'dream', '$.dream.resetCount'),
  owned('$.sdPrestige.strangeMatter', 'dream', '$.dream.strangeMatter'),
  owned('$.sdPrestige.disasterStage', 'dream', '$.dream.disasterStage'),
  ...schema11DreamUpgradeFields.map((field) =>
    owned(`$.sdPrestige.${field}`, 'dream', `$.dream.upgrades.${field}`),
  ),
  owned(
    '$.saveData.huntersPerPurchase',
    'dream',
    '$.dream.huntersPerPurchase',
  ),
  owned(
    '$.saveData.gatherersPerPurchase',
    'dream',
    '$.dream.gatherersPerPurchase',
  ),

  ...['saveVersion', 'lastMigratedFromVersion', 'hasPackedSettingsFlags', 'packedSettingsFlags'].map(
    (field) =>
      classified(
        `$.${field}`,
        'derived-recomputed',
        'recompute',
        'Owned by the compatibility envelope and save preparation pipeline.',
        'compatibility',
      ),
  ),
  ...[
    `${dysonInfinity}.SkillTreeSaveData.*`,
    `${dysonInfinity}.skillOwnedById.*`,
    `${dysonInfinity}.skillOwnedBits`,
    `${dysonInfinity}.skillOwnedBitsBase64`,
    ...['skillAutoAssignmentBits', 'skillAutoAssignmentBitsBase64'].flatMap(
      (name) => [
        `${dysonRoot}.${name}`,
        ...Array.from({ length: 5 }, (_, index) =>
          `${dysonRoot}.${name}${name.endsWith('Base64') ? '_' : ''}${index + 1}`,
        ),
      ],
    ),
    ...skillTreeFields()
      .filter((path) => !path.endsWith('.skillPointsTree') && !path.endsWith('.fragments')),
  ].map((path) =>
    classified(
      path,
      'derived-recomputed',
      'recompute',
      'Legacy skill mirrors are regenerated from stable skill identifiers.',
      'skills',
    ),
  ),
  ...[
    ...['assemblyLines', 'managers', 'servers', 'dataCenters', 'planets', 'matrioshkaBrains', 'birchPlanets', 'galacticBrains'].flatMap(
      (facility) => [
        `${dysonInfinity}.${facility}SparseIndices.*`,
        `${dysonInfinity}.${facility}SparseValues.*`,
      ],
    ),
    ...Array.from({ length: 6 }, (_, index) =>
      `${dysonRoot}.skillAutoAssignmentList${index || ''}.*`,
    ),
    `${dysonInfinity}.scienceBoostOwned`,
    `${dysonInfinity}.moneyMultiUpgradeOwned`,
    `${dysonInfinity}.assemblyLineUpgradeOwned`,
    `${dysonInfinity}.aiManagerUpgradeOwned`,
    `${dysonInfinity}.serverUpgradeOwned`,
    `${dysonInfinity}.dataCenterUpgradeOwned`,
    `${dysonInfinity}.planetUpgradeOwned`,
    `${dysonInfinity}.matrioshkaUpgradeOwned`,
    `${dysonInfinity}.birchUpgradeOwned`,
    `${dysonInfinity}.galacticUpgradeOwned`,
    ...Array.from({ length: 4 }, (_, index) =>
      `${dysonInfinity}.panelLifetime${index + 1}`,
    ),
    '$.doubleIp',
    '$.prestigePlus.avocatoIP',
    '$.prestigePlus.avocatoInfluence',
    '$.prestigePlus.avocatoStrangeMatter',
    '$.prestigePlus.avocatoOverflow',
  ].map((path) =>
    classified(
      path,
      'legacy-duplicate-omitted',
      'omit',
      'Superseded representation retained only for Unity compatibility.',
    ),
  ),
  classified(
    '$.prestigePlus.avocatoPurchased',
    'derived-recomputed',
    'recompute',
    'Legacy unlock mirror is regenerated from AvocadoData.unlocked.',
    'avocado',
  ),
  ...[
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
    'settingsButtonToggle',
    'firstReality',
  ].map((field) =>
    classified(
      `$.${field}`,
      'presentation-preference',
      'preserve-source',
      'Player-facing presentation state is outside canonical gameplay ownership.',
      'preferences',
    ),
  ),
  ...['debugOptions', 'debugEverEnabled', 'cheater', 'unlockAllTabs'].map(
    (field) =>
      classified(
        `$.${field}`,
        'platform-entitlement',
        'preserve-source',
        'Debug or entitlement state is not owned by the portable gameplay model.',
        'platform',
      ),
  ),
]

function skillTreeFields(): string[] {
  return publicUnitySchema11LeafPatterns.filter((path) =>
    path.startsWith(`${skillTree}.`),
  )
}

function buildEntries(): readonly MappingCoverageEntry[] {
  const catalog = new Set(publicUnitySchema11LeafPatterns)
  if (catalog.size !== publicUnitySchema11LeafPatterns.length) {
    throw new Error('Public Unity schema-11 leaf catalog contains duplicate paths.')
  }

  const explicitByPath = new Map<string, MappingCoverageEntry>()
  for (const entry of explicitEntries) {
    if (!catalog.has(entry.sourcePath)) {
      throw new Error(
        `Mapping classification is not a schema-11 leaf: ${entry.sourcePath}`,
      )
    }
    if (explicitByPath.has(entry.sourcePath)) {
      throw new Error(`Duplicate mapping classification: ${entry.sourcePath}`)
    }
    explicitByPath.set(entry.sourcePath, entry)
  }

  return Object.freeze(
    publicUnitySchema11LeafPatterns.map(
      (sourcePath) =>
        explicitByPath.get(sourcePath) ??
        classified(
          sourcePath,
          'still-unowned',
          'preserve-source',
          'Explicit schema-11 leaf awaiting an ownership decision and parity proof.',
        ),
    ),
  )
}

const entries = buildEntries()
const developmentExtensions = Object.freeze([
  owned(
    '$.infinityAutomaticReset',
    'infinity',
    '$.infinity.automaticResetEnabled',
  ),
])
const unresolvedLeafCount = entries.filter(
  (entry) => entry.classification === 'still-unowned',
).length

export const mappingCoverageManifest = {
  formatVersion: 2,
  certification: publicUnitySaveCertification,
  unityImportSchema: publicUnitySaveCertification.saveSchema,
  canonicalGameModelVersion: 1,
  coverageComplete: unresolvedLeafCount === 0,
  releaseCanonicalWriteAllowed: false,
  unmatchedWritePolicy: 'preserve-source' as const,
  unclassifiedLeafPolicy: 'fail-certification' as const,
  unresolvedLeafCount,
  entries,
  developmentExtensions,
}

/**
 * Matches a concrete JSON path against a certified schema pattern. A wildcard
 * represents exactly one collection element or dictionary key. Concrete path
 * segments containing a dot must escape it as `\\.` so dictionary keys cannot
 * be confused with additional object nesting.
 */
export function mappingPathMatches(pattern: string, path: string): boolean {
  const expected = splitMappingPath(pattern)
  const actual = splitMappingPath(path)

  return (
    expected.every((segment) => segment.length > 0) &&
    actual.every((segment) => segment.length > 0) &&
    expected.length === actual.length &&
    expected.every(
      (segment, index) => segment === '*' || segment === actual[index],
    )
  )
}

function splitMappingPath(path: string): string[] {
  const segments: string[] = []
  let segment = ''
  let escaped = false

  for (const character of path) {
    if (escaped) {
      segment += character
      escaped = false
    } else if (character === '\\') {
      escaped = true
    } else if (character === '.') {
      segments.push(segment)
      segment = ''
    } else {
      segment += character
    }
  }

  if (escaped) segment += '\\'
  segments.push(segment)
  return segments
}

export function classifyPublicUnitySchema11Leaf(
  sourcePath: string,
): MappingCoverageEntry | null {
  const matches = entries.filter(
    (entry) =>
      mappingPathMatches(entry.sourcePath, sourcePath) ||
      // Odin may encode an otherwise typed collection as null. In that case
      // the concrete leaf is the collection property itself rather than an
      // element beneath its certified terminal wildcard.
      (entry.sourcePath.endsWith('.*') &&
        entry.sourcePath.slice(0, -2) === sourcePath),
  )
  if (matches.length > 1) {
    throw new Error(`Overlapping schema-11 classifications for ${sourcePath}.`)
  }
  return matches[0] ?? null
}
