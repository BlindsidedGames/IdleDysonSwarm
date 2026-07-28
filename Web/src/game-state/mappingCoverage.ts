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
  }
}

const dysonInfinity =
  '$.dysonVerseSaveData.dysonVerseInfinityData'
const dysonPrestige =
  '$.dysonVerseSaveData.dysonVersePrestigeData'
const dysonRoot = '$.dysonVerseSaveData'

export const mappingCoverageManifest = {
  formatVersion: 1,
  unityImportSchema: 12,
  canonicalGameModelVersion: 1,
  coverageComplete: false,
  releaseCanonicalWriteAllowed: false,
  unmatchedWritePolicy: 'preserve-source' as const,
  entries: [
    owned('$.dateStarted', 'meta', '$.meta.createdAtLegacyText'),
    owned('$.tutorial', 'meta', '$.meta.tutorialComplete'),
    owned(
      '$.firstInfinityDone',
      'meta',
      '$.meta.firstInfinityComplete',
    ),
    ...['money', 'science', 'bots', 'workers', 'researchers'].map(
      (field) =>
        owned(
          `${dysonInfinity}.${field}`,
          'dyson',
          `$.dyson.${field}`,
        ),
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
    owned(
      `${dysonInfinity}.goalSetter`,
      'dyson',
      '$.dyson.goalStage',
    ),
    owned(
      `${dysonPrestige}.botDistribution`,
      'dyson',
      '$.dyson.botDistribution',
    ),
    owned('$.buyMode', 'dyson', '$.dyson.automation.buyMode'),
    owned(
      '$.roundedBulkBuy',
      'dyson',
      '$.dyson.automation.roundedBulkBuy',
    ),
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
      owned(
        `${dysonPrestige}.${source}`,
        'infinity',
        `$.infinity.${canonical}`,
      ),
    ),
    ...[
      ['infinityPointsToBreakFor', 'breakTarget'],
      ['infinityInProgress', 'inProgress'],
      ['botCapTransitionPending', 'botCapTransitionPending'],
      ['botCapRewardsGranted', 'botCapRewardsGranted'],
      ['timeLastInfinity', 'lastCycleDurationSeconds'],
      ['lastInfinityPointsGained', 'lastPointsGained'],
      [
        'offlineTimeUsedThisInfinity',
        'storedTimeUsedThisCycleSeconds',
      ],
      [
        'offlineTimeUsedPreviousInfinity',
        'storedTimeUsedPreviousCycleSeconds',
      ],
    ].map(([source, canonical]) =>
      owned(`$.${source}`, 'infinity', `$.infinity.${canonical}`),
    ),
    owned(
      `${dysonRoot}.dysonVerseSkillTreeData.skillPointsTree`,
      'skills',
      '$.skills.points',
    ),
    owned(
      `${dysonRoot}.dysonVerseSkillTreeData.fragments`,
      'skills',
      '$.skills.fragments',
    ),
    owned(
      `${dysonInfinity}.skillStateById.*.owned`,
      'skills',
      '$.skills.byId.*.owned',
    ),
    owned(
      `${dysonInfinity}.skillStateById.*.level`,
      'skills',
      '$.skills.byId.*.level',
    ),
    owned(
      `${dysonInfinity}.skillStateById.*.timerSeconds`,
      'skills',
      '$.skills.byId.*.timerSeconds',
    ),
    owned(
      `${dysonInfinity}.skillStateById.*.secondaryTimerSeconds`,
      'skills',
      '$.skills.byId.*.secondaryTimerSeconds',
    ),
    owned(
      `${dysonRoot}.skillAutoAssignmentIds.*`,
      'skills',
      '$.skills.activeAutoAssignment.*',
    ),
    ...Array.from({ length: 5 }, (_, index) => index + 1).flatMap(
      (preset) => [
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
      ],
    ),
    owned(
      '$.autoAssignNonRefundableSkills',
      'skills',
      '$.skills.autoAssignNonRefundable',
    ),
    owned(
      `${dysonInfinity}.researchLevelsById.*`,
      'research',
      '$.research.levelsById.*',
    ),
    owned(
      `${dysonInfinity}.researchProgressById.*`,
      'research',
      '$.research.progressById.*',
    ),
    owned(
      '$.researchBuyMode',
      'research',
      '$.research.automation.buyMode',
    ),
    owned(
      '$.researchRoundedBulkBuy',
      'research',
      '$.research.automation.roundedBulkBuy',
    ),
    ...[
      ['universesConsumed', 'universeDesignationCount'],
      ['workersReadyToGo', 'workersReady'],
      ['workerGenerationProgress', 'workerGenerationProgress'],
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
      owned(
        `$.prestigePlus.${source}`,
        'quantum',
        `$.quantum.${canonical}`,
      ),
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
    ...[
      'unlocked',
      'infinityPoints',
      'influence',
      'strangeMatter',
      'overflowMultiplier',
    ].map((field) =>
      owned(`$.avocadoData.${field}`, 'avocado', `$.avocado.${field}`),
    ),
    ...[
      ['eventTimeClockInitialized', 'eventClockInitialized'],
      [
        'simulationAutomationTimeUntilNextEvent',
        'automationTimeUntilNextEvent',
      ],
      ['dysonAutomationTargetIndex', 'dysonAutomationTargetIndex'],
      ['researchAutomationTargetIndex', 'researchAutomationTargetIndex'],
      [
        'simulationInfinityBoundaryRemaining',
        'infinityBoundaryRemaining',
      ],
      ['simulationInfinityCycleSeconds', 'infinityCycleSeconds'],
      [
        'simulationInfinityCycleStartingPoints',
        'infinityCycleStartingPoints',
      ],
      [
        'simulationInfinityHasPostResetStart',
        'infinityHasPostResetStart',
      ],
      ['offlineTime', 'storedTimeAvailableSeconds'],
      ['maxOfflineTime', 'storedTimeCapacitySeconds'],
    ].map(([source, canonical]) =>
      owned(`$.${source}`, 'timeline', `$.timeline.${canonical}`),
    ),
    owned(
      '$.avotation',
      'secret-progress',
      '$.secretProgress.completed',
    ),
    owned(
      '$.avotationProgressStep',
      'secret-progress',
      '$.secretProgress.step',
    ),
    owned('$.sdSimulation.*', 'dream', '$.dream.*'),
    owned('$.sdPrestige.*', 'dream', '$.dream.*'),
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
    owned(
      '$.simulationStatistics.trackedSinceUpdate',
      'statistics',
      '$.statistics.trackedSinceUpdate',
    ),
    owned(
      '$.simulationStatistics.trackingStartedUtc',
      'statistics',
      '$.statistics.trackingStartedMarker',
    ),
    owned(
      '$.simulationStatistics.trackedSimulatedSeconds',
      'statistics',
      '$.statistics.trackedSimulatedSeconds',
    ),
    ...[
      'lifetime',
      'currentQuantumRun',
      'recentProcessedSegment',
    ].map((container) =>
      owned(
        `$.simulationStatistics.${container}.*`,
        'statistics',
        `$.statistics.${container}.*`,
      ),
    ),
    owned(
      '$.simulationStatistics.lastCompletedCycle.*',
      'statistics',
      '$.statistics.lastCompletedCycle.*',
    ),
    ...['minuteWindows', 'halfHourWindows', 'dailyWindows'].map(
      (container) =>
        owned(
          `$.simulationStatistics.${container}.*.*`,
          'statistics',
          `$.statistics.${container}.*.*`,
        ),
    ),
  ] satisfies readonly MappingCoverageEntry[],
}
