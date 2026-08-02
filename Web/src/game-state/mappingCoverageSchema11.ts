/**
 * Immutable identity of the currently certified public Unity save surface.
 *
 * The repository's development save schema has advanced beyond this release.
 * Do not replace these values with the current checkout's constants: this pin
 * describes the save graph shipped to players in Unity 3.0.328.
 */
export const publicUnitySaveCertification = {
  applicationVersion: '3.0.328',
  saveSchema: 11,
  sourceRevision: '9b840fb2547ad507d4e529a610a031cc13782847',
  unityEditorVersion: '6000.3.9f1',
  saveRootType: 'Expansion.Oracle.SaveDataSettings',
  schemaFieldCatalogSha256:
    '0b0559fc79cda740529fafd6cb075edd3725255147cd8fbd06a568b4e46970b4',
} as const

function fields(root: string, names: string): string[] {
  return names
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => `${root}.${name}`)
}

function collectionFields(root: string, names: string): string[] {
  return fields(root, names).map((path) => `${path}.*`)
}

const rootFields = fields(
  '$',
  `saveVersion lastMigratedFromVersion lastSuccessfulLoadUtc
   hasPackedSettingsFlags packedSettingsFlags buyMode researchBuyMode
   roundedBulkBuy researchRoundedBulkBuy debugOptions debugEverEnabled
   doubleIp unlockAllTabs avotation avotationProgressStep
   infinityPointsToBreakFor infinityInProgress dateStarted dateQuitString
   timeThisInfinity timeLastInfinity lastInfinityPointsGained tutorial
   globalMute screensaverEnabled cheater hidePurchased buyMax numberFormatting
   skillsBuyOnTap offlineTime offlineTimeUsedThisInfinity
   offlineTimeUsedPreviousInfinity maxOfflineTime frameRate botsButtonToggle
   researchbuttonToggle skillsButtonToggle skillsFirstRunDone
   infinityButtonToggle infinityFirstRunDone realityButtonToggle
   realityFirstRun simulationsButtonToggle prestigeButtonToggle
   prestigeFirstRun storyButtonToggle wikiButtonToggle statisticsButtonToggle
   settingsButtonToggle infinityAutoResearchToggleAi
   infinityAutoResearchToggleAssembly infinityAutoResearchToggleMoney
   infinityAutoResearchTogglePlanet infinityAutoResearchToggleServer
   infinityAutoResearchToggleDataCenter infinityAutoResearchToggleScience
   infinityAutoResearchToggleMatrioshkaBrains
   infinityAutoResearchToggleBirchPlanets
   infinityAutoResearchToggleGalacticBrains infinityAutoAssembly
   infinityAutoManagers infinityAutoServers infinityAutoDataCenters
   infinityAutoPlanets infinityAutoMatrioshkaBrains infinityAutoBirchPlanets
   infinityAutoGalacticBrains autoAssignNonRefundableSkills
   botsTabPresetOverride researchTabPresetOverride firstReality
   firstInfinityDone`,
)

const realityFields = fields(
  '$.saveData',
  `universesConsumed workersReadyToGo workerAutoConvert influence
   huntersPerPurchase gatherersPerPurchase`,
)

const dysonRoot = '$.dysonVerseSaveData'
const dysonRootFields = [
  ...fields(
    dysonRoot,
    `lastCollapseDate manualCreationTime botDistPreset1 preset1Name
     botDistPreset2 preset2Name botDistPreset3 preset3Name botDistPreset4
     preset4Name botDistPreset5 preset5Name selectedPreset
     skillAutoAssignmentBits skillAutoAssignmentBits1
     skillAutoAssignmentBits2 skillAutoAssignmentBits3
     skillAutoAssignmentBits4 skillAutoAssignmentBits5
     skillAutoAssignmentBitsBase64 skillAutoAssignmentBitsBase64_1
     skillAutoAssignmentBitsBase64_2 skillAutoAssignmentBitsBase64_3
     skillAutoAssignmentBitsBase64_4 skillAutoAssignmentBitsBase64_5`,
  ),
  ...collectionFields(
    dysonRoot,
    `skillAutoAssignmentList skillAutoAssignmentList1
     skillAutoAssignmentList2 skillAutoAssignmentList3
     skillAutoAssignmentList4 skillAutoAssignmentList5
     skillAutoAssignmentIds skillAutoAssignmentIds1 skillAutoAssignmentIds2
     skillAutoAssignmentIds3 skillAutoAssignmentIds4
     skillAutoAssignmentIds5`,
  ),
]

const prestigeRoot = `${dysonRoot}.dysonVersePrestigeData`
const prestigeFields = fields(
  prestigeRoot,
  `infinityPoints spentInfinityPoints secretsOfTheUniverse
   permanentSkillPoint infinityAssemblyLines infinityAiManagers
   infinityServers infinityDataCenter infinityPlanets infinityAutoResearch
   infinityAutoBots androidsSkillTimer pocketAndroidsTimer botDistribution
   unlockedMatrioshkaBrains unlockedBirchPlanets unlockedGalacticBrains`,
)

const infinityRoot = `${dysonRoot}.dysonVerseInfinityData`
const infinityScalarFields = fields(
  infinityRoot,
  `skillOwnedBits skillOwnedBitsBase64 money moneyMulti science scienceMulti
   bots workers researchers panelsPerSec panelsPerSecMulti panelLifetime
   assemblyLineModifier botProduction assemblyLineBotProduction
   managerModifier assemblyLineProduction managerAssemblyLineProduction
   serverModifier managerProduction serverManagerProduction
   dataCenterModifier serverProduction dataCenterServerProduction
   planetModifier dataCenterProduction planetsDataCenterProduction
   matrioshkaBrainModifier matrioshkaBrainPlanetProduction
   birchPlanetModifier birchPlanetMatrioshkaProduction galacticBrainModifier
   galacticBrainBirchProduction pocketDimensionsProduction
   quantumComputingProduction pocketDimensionsWithoutAnythingElseProduction
   pocketProtectorsProduction pocketMultiverseProduction
   totalPlanetProduction scientificPlanetsProduction
   stellarSacrificesProduction rudimentrySingularityProduction
   planetAssemblyProduction shellWorldsProduction scienceBoostOwned
   scienceBoostPercent moneyMultiUpgradeOwned moneyMultiUpgradePercent
   assemblyLineUpgradeOwned assemblyLineUpgradePercent aiManagerUpgradeOwned
   aiManagerUpgradePercent serverUpgradeOwned serverUpgradePercent
   dataCenterUpgradeOwned dataCenterUpgradePercent planetUpgradeOwned
   planetUpgradePercent matrioshkaUpgradeOwned matrioshkaUpgradePercent
   birchUpgradeOwned birchUpgradePercent galacticUpgradeOwned
   galacticUpgradePercent panelLifetime1 panelLifetime2 panelLifetime3
   panelLifetime4 totalPanelsDecayed goalSetter`,
)
const infinityCollectionFields = collectionFields(
  infinityRoot,
  `SkillTreeSaveData skillOwnedById researchLevelsById assemblyLines
   assemblyLinesSparseIndices assemblyLinesSparseValues managers
   managersSparseIndices managersSparseValues servers serversSparseIndices
   serversSparseValues dataCenters dataCentersSparseIndices
   dataCentersSparseValues planets planetsSparseIndices planetsSparseValues
   matrioshkaBrains matrioshkaBrainsSparseIndices
   matrioshkaBrainsSparseValues birchPlanets birchPlanetsSparseIndices
   birchPlanetsSparseValues galacticBrains galacticBrainsSparseIndices
   galacticBrainsSparseValues`,
)
const skillStateFields = fields(
  `${infinityRoot}.skillStateById.*`,
  'owned level timerSeconds secondaryTimerSeconds',
)

const skillTreeRoot = `${dysonRoot}.dysonVerseSkillTreeData`
const skillTreeFields = fields(
  skillTreeRoot,
  `skillPointsTree startHereTree doubleScienceTree producedAsScienceTree
   panelLifetime20Tree workerEfficiencyTree assemblyLineTree aiManagerTree
   serverTree dataCenterTree planetsTree pocketDimensions scientificPlanets
   banking investmentPortfolio scientificRevolution economicRevolution
   renewableEnergy burnOut artificiallyEnhancedPanels stayingPower
   higgsBoson avocados androids superchargedPower workerBoost
   stellarSacrifices stellarImprovements stellarObliteration supernova
   powerUnderwhelming powerOverwhelming tasteOfPower indulgingInPower
   addictionToPower fragments progressiveAssembly regulatedAcademia
   panelWarranty monetaryPolicy terraformingProtocols productionScaling
   fragmentAssembly assemblyMegaLines idleElectricSheep
   idleElectricSheepTimer superSwarm megaSwarm ultimateSwarm purityOfMind
   purityOfBody purityOfSEssence dysonSubsidies oneMinutePlan
   galacticPradigmShift panelMaintenance worthySacrifice endOfTheLine
   manualLabour superRadiantScattering superRadiantScatteringTimer
   repeatableResearch shouldersOfGiants shouldersOfPrecursors
   shouldersOfTheFallen shouldersOfTheEnlightened
   shouldersOfTheRevolution rocketMania idleSpaceFlight fusionReactors
   coldFusion scientificDominance economicDominance parallelProcessing
   rudimentarySingularity hubbleTelescope jamesWebbTelescope
   dimensionalCatCables pocketProtectors pocketMultiverse whatCouldHaveBeen
   shoulderSurgery terraFirma terraEculeo terraInfirma terraNullius terraNova
   terraGloriae terraIrradiant paragon shepherd citadelCouncil renegade
   saren reapers planetAssembly shellWorlds versatileProductionTactics
   whatWillComeToPass solarBubbles pocketAndroids hypercubeNetworks
   parallelComputation quantumComputing unsuspiciousAlgorithms
   agressiveAlgorithms clusterNetworking stellarDominance`,
)

const quantumFields = fields(
  '$.prestigePlus',
  `points spentPoints botMultitasking doubleIP breakTheLoop
   quantumEntanglement automation divisionsPurchased secrets
   avocatoPurchased avocatoIP avocatoInfluence avocatoStrangeMatter
   avocatoOverflow purity fragments terra power paragade stellar influence
   cash science`,
)

const avocadoFields = fields(
  '$.avocadoData',
  'unlocked infinityPoints influence strangeMatter overflowMultiplier',
)

export const schema11DreamUpgradeFields = `counterMeteor counterAi counterGw
  engineering1 engineering2 engineering3 shipping1 shipping2 worldTrade1
  worldTrade2 worldTrade3 worldPeace1 worldPeace2 worldPeace3 worldPeace4
  mathematics1 mathematics2 mathematics3 advancedPhysics1 advancedPhysics2
  advancedPhysics3 advancedPhysics4 hunter1 hunter2 hunter3 hunter4 gatherer1
  gatherer2 gatherer3 gatherer4 workerBoost workerBoostAcivator citiesBoost
  citiesBoostActivator factoriesBoost factoriesBoostActivator bots1
  botsBoost1Activator bots2 botsBoost2Activator rockets1 rockets2 rockets3
  sfacs1 sfActivator1 sfacs2 sfActivator2 sfacs3 sfActivator3 railguns1
  railgunActivator1 railguns2 railgunActivator2 translation1 translation2
  translation3 translation4 translation5 translation6 translation7
  translation8 speed1 speed2 speed3 speed4 speed5 speed6 speed7 speed8`
  .trim()
  .split(/\s+/)

const dreamProgressionFields = fields(
  '$.sdPrestige',
  `doDoubleTime doubleTimeOwned doubleTime doubleTimeRate simulationCount
   strangeMatter disasterStage ${schema11DreamUpgradeFields.join(' ')}`,
)

export const schema11DreamResourceFields = `hunters gatherers community housing
  villages workers cities factories bots rockets energy spaceFactories
  dysonPanels railgunCharge solarPanels fusion swarmPanels`
  .trim()
  .split(/\s+/)

export const schema11DreamParameterFields = `hunterCost gathererCost
  communityBoostCost communityBoostTime communityBoostDuration
  factoriesBoostCost factoriesBoostTime factoriesBoostDuration
  rocketsPerSpaceFactory railgunMaxCharge solarCost solarPanelGeneration
  fusionCost fusionGeneration swarmPanelGeneration`
  .trim()
  .split(/\s+/)

export const schema11DreamEducationFields = [
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
].flatMap((name) => [
  name,
  `${name}Complete`,
  `${name}Progress`,
  `${name}ResearchTime`,
  `${name}Cost`,
])

export const schema11DreamTimerFields = `hunterTimerProgress
  gathererTimerProgress communityTimerProgress housingTimerProgress
  villagesTimerProgress workersTimerProgress citiesTimerProgress
  factoriesTimerProgress botsTimerProgress spaceFactoriesTimerProgress`
  .trim()
  .split(/\s+/)

const dreamRunFields = fields(
  '$.sdSimulation',
  [
    ...schema11DreamResourceFields,
    ...schema11DreamParameterFields,
    ...schema11DreamEducationFields,
    ...schema11DreamTimerFields,
    'railgunFireProgress',
  ].join(' '),
)

/**
 * Leaf-field patterns transcribed from the pinned schema-11 source types.
 * Wildcards are used only for collection elements or dictionary keys. They
 * are never used in place of a schema field name, so a newly added Unity
 * field cannot be silently claimed by an existing classification.
 */
export const publicUnitySchema11LeafPatterns = Object.freeze([
  ...rootFields,
  ...realityFields,
  ...dysonRootFields,
  ...prestigeFields,
  ...infinityScalarFields,
  ...infinityCollectionFields,
  ...skillStateFields,
  ...skillTreeFields,
  ...quantumFields,
  ...avocadoFields,
  ...dreamProgressionFields,
  ...dreamRunFields,
])
