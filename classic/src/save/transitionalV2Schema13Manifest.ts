/**
 * Closed dynamic inventories shipped by production V2 schema 13.
 *
 * Authority: commit 69854cf9, `Web/src/save/schema13.ts`, backed by that
 * commit's generated Skill/Research catalogs and `Web/src/game-state/types.ts`.
 * Keep these literals independent of the current catalogs: adding a current
 * gameplay ID must not change which historical payloads this adapter accepts.
 */
export const V2_SCHEMA13_FACILITY_IDS = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const)

export const V2_SCHEMA13_RETAINED_FACILITY_IDS = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
] as const)

export const V2_SCHEMA13_RESEARCH_IDS = Object.freeze([
  'research.ai_manager_upgrade',
  'research.assembly_line_upgrade',
  'research.birch_planets_upgrade',
  'research.data_center_upgrade',
  'research.galactic_brains_upgrade',
  'research.matrioshka_brains_upgrade',
  'research.money_multiplier',
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
  'research.planet_upgrade',
  'research.science_boost',
  'research.server_upgrade',
] as const)

export const V2_SCHEMA13_CAPPED_RESEARCH_IDS = Object.freeze([
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
] as const)

export const V2_SCHEMA13_SKILL_IDS = Object.freeze([
  'addictionToPower',
  'agressiveAlgorithms',
  'aiManagerTree',
  'androids',
  'artificiallyEnhancedPanels',
  'assemblyLineTree',
  'assemblyMegaLines',
  'avocados',
  'banking',
  'burnOut',
  'citadelCouncil',
  'clusterNetworking',
  'coldFusion',
  'dataCenterTree',
  'dimensionalCatCables',
  'doubleScienceTree',
  'dysonSubsidies',
  'economicDominance',
  'economicRevolution',
  'endOfTheLine',
  'fragmentAssembly',
  'fusionReactors',
  'galacticPradigmShift',
  'higgsBoson',
  'hubbleTelescope',
  'hypercubeNetworks',
  'idleElectricSheep',
  'idleSpaceFlight',
  'indulgingInPower',
  'investmentPortfolio',
  'jamesWebbTelescope',
  'manualLabour',
  'megaSwarm',
  'monetaryPolicy',
  'oneMinutePlan',
  'panelLifetime20Tree',
  'panelMaintenance',
  'panelWarranty',
  'paragon',
  'parallelComputation',
  'parallelProcessing',
  'planetAssembly',
  'planetsTree',
  'pocketAndroids',
  'pocketDimensions',
  'pocketMultiverse',
  'pocketProtectors',
  'powerOverwhelming',
  'powerUnderwhelming',
  'producedAsScienceTree',
  'productionScaling',
  'progressiveAssembly',
  'purityOfBody',
  'purityOfMind',
  'purityOfSEssence',
  'quantumComputing',
  'reapers',
  'regulatedAcademia',
  'renegade',
  'renewableEnergy',
  'repeatableResearch',
  'rocketMania',
  'rudimentarySingularity',
  'saren',
  'scientificDominance',
  'scientificPlanets',
  'scientificRevolution',
  'serverTree',
  'shellWorlds',
  'shepherd',
  'shoulderSurgery',
  'shouldersOfGiants',
  'shouldersOfPrecursors',
  'shouldersOfTheEnlightened',
  'shouldersOfTheFallen',
  'shouldersOfTheRevolution',
  'solarBubbles',
  'startHereTree',
  'stayingPower',
  'stellarDominance',
  'stellarImprovements',
  'stellarObliteration',
  'stellarSacrifices',
  'superRadiantScattering',
  'superSwarm',
  'superchargedPower',
  'supernova',
  'tasteOfPower',
  'terraEculeo',
  'terraFirma',
  'terraGloriae',
  'terraInfirma',
  'terraIrradiant',
  'terraNova',
  'terraNullius',
  'terraformingProtocols',
  'ultimateSwarm',
  'unsuspiciousAlgorithms',
  'versatileProductionTactics',
  'whatCouldHaveBeen',
  'whatWillComeToPass',
  'workerBoost',
  'workerEfficiencyTree',
  'worthySacrifice',
] as const)

export const V2_SCHEMA13_FRAGMENT_SKILL_IDS = Object.freeze([
  'fragmentAssembly',
  'monetaryPolicy',
  'panelWarranty',
  'productionScaling',
  'progressiveAssembly',
  'regulatedAcademia',
  'terraformingProtocols',
] as const)

export const V2_SCHEMA13_BUY_MODES = Object.freeze([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
] as const)

export const V2_SCHEMA13_SKILL_PRESET_COLOR_IDS = Object.freeze([
  'cyan',
  'orange',
  'gold',
  'rose',
  'pink',
] as const)

export const V2_SCHEMA13_DREAM_EDUCATION_IDS = Object.freeze([
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const)

export const V2_SCHEMA13_DREAM_TIMER_IDS = Object.freeze([
  'hunterTimerProgress',
  'gathererTimerProgress',
  'communityTimerProgress',
  'housingTimerProgress',
  'villagesTimerProgress',
  'workersTimerProgress',
  'citiesTimerProgress',
  'factoriesTimerProgress',
  'botsTimerProgress',
  'spaceFactoriesTimerProgress',
] as const)

export const V2_SCHEMA13_DREAM_UPGRADE_FLAGS = Object.freeze([
  'counterMeteor',
  'counterAi',
  'counterGw',
  'engineering1',
  'engineering2',
  'engineering3',
  'shipping1',
  'shipping2',
  'worldTrade1',
  'worldTrade2',
  'worldTrade3',
  'worldPeace1',
  'worldPeace2',
  'worldPeace3',
  'worldPeace4',
  'mathematics1',
  'mathematics2',
  'mathematics3',
  'advancedPhysics1',
  'advancedPhysics2',
  'advancedPhysics3',
  'advancedPhysics4',
  'hunter1',
  'hunter2',
  'hunter3',
  'hunter4',
  'gatherer1',
  'gatherer2',
  'gatherer3',
  'gatherer4',
  'workerBoost',
  'workerBoostAcivator',
  'citiesBoost',
  'citiesBoostActivator',
  'factoriesBoost',
  'factoriesBoostActivator',
  'bots1',
  'botsBoost1Activator',
  'bots2',
  'botsBoost2Activator',
  'rockets1',
  'rockets2',
  'rockets3',
  'sfacs1',
  'sfActivator1',
  'sfacs2',
  'sfActivator2',
  'sfacs3',
  'sfActivator3',
  'railguns1',
  'railgunActivator1',
  'railguns2',
  'railgunActivator2',
  'translation1',
  'translation2',
  'translation3',
  'translation4',
  'translation5',
  'translation6',
  'translation7',
  'translation8',
  'speed1',
  'speed2',
  'speed3',
  'speed4',
  'speed5',
  'speed6',
  'speed7',
  'speed8',
] as const)

export type V2Schema13NumericEncoding =
  | 'number'
  | 'bigint'
  | 'integer-decimal'
  | 'decimal'
  | 'research-level'

const TOTAL_ROOTS = [
  '$.statistics.lifetime',
  '$.statistics.currentQuantumRun',
  '$.statistics.recentProcessedSegment',
] as const

const WINDOW_ROOTS = [
  '$.statistics.minuteWindows.*',
  '$.statistics.halfHourWindows.*',
  '$.statistics.dailyWindows.*',
] as const

const NUMBER_PATHS = new Set([
  '$.dyson.manualCreationIntervalSeconds',
  '$.dyson.botDistribution',
  '$.infinity.lastCycleDurationSeconds',
  '$.infinity.storedTimeUsedThisCycleSeconds',
  '$.infinity.storedTimeUsedPreviousCycleSeconds',
  '$.skills.byId.*.timerSeconds',
  '$.skills.byId.*.secondaryTimerSeconds',
  '$.skills.activeAutoAssignment.length',
  '$.skills.selectedPreset',
  '$.skills.presets.*.botDistribution',
  '$.skills.tabPresetAutomation.bots',
  '$.skills.tabPresetAutomation.research',
  '$.reality.workerGenerationProgress',
  '$.timeline.automationTimeUntilNextEvent',
  '$.timeline.dysonAutomationTargetIndex',
  '$.timeline.researchAutomationTargetIndex',
  '$.timeline.infinityBoundaryRemaining',
  '$.timeline.infinityCycleSeconds',
  '$.timeline.storedTimeAvailableSeconds',
  '$.timeline.storedTimeCapacitySeconds',
  '$.timeline.doubleTime.bankSeconds',
  '$.timeline.doubleTime.rate',
  '$.secretProgress.step',
  '$.dream.parameters.communityBoostClock',
  '$.dream.parameters.communityBoostDuration',
  '$.dream.parameters.factoriesBoostClock',
  '$.dream.parameters.factoriesBoostDuration',
  '$.dream.education.*.researchTime',
  '$.dream.timers.*',
  '$.dream.railgun.fireProgress',
  '$.dream.railgun.pendingBaseSeconds',
  '$.dream.railgun.pendingDreamSeconds',
  '$.dream.railgun.shotsRemaining',
  '$.dream.railgun.activeRailguns',
  '$.dream.railgun.lastRoundsFired',
  '$.statistics.trackedSimulatedSeconds',
  '$.statistics.lastCompletedCycle.durationSeconds',
  ...TOTAL_ROOTS.flatMap((root) => [
    `${root}.realityCapacityStallSeconds`,
    `${root}.simulatedSeconds`,
  ]),
  ...WINDOW_ROOTS.map((root) => `${root}.simulatedSeconds`),
])

const BIGINT_PATHS = new Set([
  '$.dyson.goalStage',
  '$.infinity.secretsOfTheUniverse',
  '$.infinity.permanentSkillPoints',
  '$.skills.points',
  '$.skills.fragments',
  '$.skills.byId.*.level',
  '$.reality.workersReady',
  '$.quantum.divisionsPurchased',
  '$.quantum.permanentSecrets',
  '$.dream.resetCount',
  '$.dream.disasterStage',
  ...TOTAL_ROOTS.flatMap((root) => [
    `${root}.ordinaryInfinityCount`,
    `${root}.breakInfinityCount`,
    `${root}.meteorDreamResets`,
    `${root}.aiDreamResets`,
    `${root}.globalWarmingDreamResets`,
    `${root}.blackHoleDreamResets`,
  ]),
  ...WINDOW_ROOTS.flatMap((root) => [
    `${root}.sequence`,
    `${root}.infinityCount`,
    `${root}.dreamResetCount`,
  ]),
])

const INTEGER_DECIMAL_PATHS = new Set([
  '$.dyson.facilities.*.1',
  '$.infinity.availablePoints',
  '$.infinity.allocatedPoints',
  '$.infinity.breakTarget',
  '$.infinity.lastPointsGained',
  '$.research.levelsById.*',
  '$.reality.universeDesignationCount',
  '$.reality.influence',
  '$.quantum.availableShards',
  '$.quantum.lifetimeEarnedShards',
  '$.quantum.influenceSpeedBonus',
  '$.quantum.cashBonusLevels',
  '$.quantum.scienceBonusLevels',
  '$.timeline.infinityCycleStartingPoints',
  '$.dream.resources.hunters',
  '$.dream.resources.gatherers',
  '$.dream.resources.community',
  '$.dream.resources.housing',
  '$.dream.resources.villages',
  '$.dream.resources.workers',
  '$.dream.resources.cities',
  '$.dream.resources.factories',
  '$.dream.resources.bots',
  '$.dream.resources.rockets',
  '$.dream.resources.spaceFactories',
  '$.dream.resources.dysonPanels',
  '$.dream.resources.solarPanels',
  '$.dream.resources.fusion',
  '$.dream.resources.swarmPanels',
  '$.dream.parameters.hunterCost',
  '$.dream.parameters.gathererCost',
  '$.dream.parameters.communityBoostCost',
  '$.dream.parameters.factoriesBoostCost',
  '$.dream.parameters.rocketsPerSpaceFactory',
  '$.dream.parameters.solarCost',
  '$.dream.parameters.fusionCost',
  '$.dream.education.*.cost',
  '$.dream.railgun.reservedPanels',
  '$.dream.railgun.highestStoredPanels',
  '$.dream.railgun.lastPanelsLaunched',
  '$.dream.strangeMatter',
  '$.dream.huntersPerPurchase',
  '$.dream.gatherersPerPurchase',
  '$.statistics.lastCompletedCycle.reward',
  ...TOTAL_ROOTS.flatMap((root) => [
    `${root}.ordinaryInfinityPoints`,
    `${root}.breakInfinityPoints`,
    `${root}.botCapInfinityPoints`,
    `${root}.botCapOverflowRewards`,
    `${root}.strangeMatter`,
    `${root}.realityWorkers`,
    `${root}.automaticInfluence`,
    `${root}.manualInfluence`,
  ]),
  ...WINDOW_ROOTS.flatMap((root) => [
    `${root}.infinityPoints`,
    `${root}.strangeMatter`,
    `${root}.realityWorkers`,
  ]),
])

const DECIMAL_PATHS = new Set([
  '$.runtime.dysonEvaluationSnapshot.panelsPerSecond',
  '$.runtime.dysonEvaluationSnapshot.panelLifetimeSeconds',
  '$.runtime.dysonEvaluationSnapshot.scienceMultiplier',
  '$.runtime.dysonEvaluationSnapshot.rudimentarySingularityProduction',
  '$.runtime.dysonEvaluationSnapshot.pocketDimensionsProduction',
  '$.runtime.dysonEvaluationSnapshot.scientificPlanetsProduction',
  '$.runtime.dysonEvaluationSnapshot.managerAssemblyLineProduction',
  '$.dyson.money',
  '$.dyson.science',
  '$.dyson.bots',
  '$.dyson.workers',
  '$.dyson.researchers',
  '$.dyson.facilities.*.0',
  '$.dyson.totalPanelsDecayed',
  '$.research.progressById.*',
  '$.avocado.infinityPoints',
  '$.avocado.influence',
  '$.avocado.strangeMatter',
  '$.avocado.overflowMultiplier',
  '$.dream.resources.energy',
  '$.dream.resources.railgunCharge',
  '$.dream.parameters.railgunMaxCharge',
  '$.dream.parameters.solarPanelGeneration',
  '$.dream.parameters.fusionGeneration',
  '$.dream.parameters.swarmPanelGeneration',
  '$.dream.education.*.progress',
])

/** Returns the exact encoded numeric carrier selected by shipped schema 13. */
export function v2Schema13NumericEncoding(
  path: string,
): V2Schema13NumericEncoding | null {
  const normalized = normalizeSchema13InventoryPath(path)
  if (normalized === '$.research.levelsById.*') return 'research-level'
  if (NUMBER_PATHS.has(normalized)) return 'number'
  if (BIGINT_PATHS.has(normalized)) return 'bigint'
  if (INTEGER_DECIMAL_PATHS.has(normalized)) return 'integer-decimal'
  if (DECIMAL_PATHS.has(normalized)) return 'decimal'
  return null
}

function normalizeSchema13InventoryPath(path: string): string {
  if (/^\$\.dyson\.facilities\.[^.]+\.[01]$/u.test(path)) {
    return path.replace(
      /^\$\.dyson\.facilities\.[^.]+/u,
      '$.dyson.facilities.*',
    )
  }
  const normalizedIndexes = path.replace(/\.\d+(?=\.|$)/gu, '.*')
  for (const root of [
    '$.research.levelsById',
    '$.research.progressById',
    '$.research.automation.enabledById',
  ]) {
    if (normalizedIndexes.startsWith(`${root}.`)) {
      // Research IDs contain dots, so the entire suffix is the closed record
      // key rather than a nested object path.
      return `${root}.*`
    }
  }
  for (const root of [
    '$.dyson.automation.enabledFacilities',
    '$.dyson.facilities',
    '$.infinity.retainedFacilities',
    '$.skills.byId',
    '$.dream.education',
    '$.dream.timers',
    '$.dream.upgrades',
  ]) {
    if (normalizedIndexes.startsWith(`${root}.`)) {
      const suffix = normalizedIndexes.slice(root.length + 1)
      const separator = suffix.indexOf('.')
      return separator === -1
        ? `${root}.*`
        : `${root}.*${suffix.slice(separator)}`
    }
  }
  return normalizedIndexes
}
