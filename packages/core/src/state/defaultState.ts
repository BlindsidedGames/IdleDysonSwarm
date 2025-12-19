import type {
  DysonVerseInfinityData,
  DysonVersePrestigeData,
  DysonVerseSaveData,
  DysonVerseSkillTreeData,
  GameMeta,
  GameRuntime,
  GameSettings,
  GameState,
  PrestigePlus,
  SaveData,
  SaveDataDream1,
  SaveDataPrestige,
} from "./types";

export function createDefaultDysonVersePrestigeData(): DysonVersePrestigeData {
  return {
    infinityPoints: 0,
    spentInfinityPoints: 0,
    secretsOfTheUniverse: 0,
    permanentSkillPoint: 0,

    infinityAssemblyLines: false,
    infinityAiManagers: false,
    infinityServers: false,
    infinityDataCenter: false,
    infinityPlanets: false,

    infinityAutoResearch: false,
    infinityAutoBots: false,

    androidsSkillTimer: 0,
    pocketAndroidsTimer: 0,

    botDistribution: 0.5,
  };
}

export function createDefaultDysonVerseInfinityData(): DysonVerseInfinityData {
  return {
    money: 0,
    moneyMulti: 1,

    science: 0,
    scienceMulti: 1,

    bots: 0,
    workers: 0,
    researchers: 0,

    panelsPerSec: 0,
    panelsPerSecMulti: 1,
    panelLifetime: 10,

    assemblyLines: [0, 0],
    assemblyLineModifier: 1,
    botProduction: 0,
    assemblyLineBotProduction: 0,

    managers: [0, 0],
    managerModifier: 1,
    assemblyLineProduction: 0,
    managerAssemblyLineProduction: 0,

    servers: [0, 0],
    serverModifier: 1,
    managerProduction: 0,
    serverManagerProduction: 0,

    dataCenters: [0, 0],
    dataCenterModifier: 1,
    serverProduction: 0,
    dataCenterServerProduction: 0,

    planets: [0, 0],
    planetModifier: 1,
    dataCenterProduction: 0,
    planetsDataCenterProduction: 0,

    pocketDimensionsProduction: 0,
    quantumComputingProduction: 0,
    pocketDimensionsWithoutAnythingElseProduction: 0,
    pocketProtectorsProduction: 0,
    pocketMultiverseProduction: 0,

    totalPlanetProduction: 0,
    scientificPlanetsProduction: 0,
    stellarSacrificesProduction: 0,
    rudimentrySingularityProduction: 0,
    planetAssemblyProduction: 0,
    shellWorldsProduction: 0,

    scienceBoostOwned: 0,
    scienceBoostPercent: 0.05,

    moneyMultiUpgradeOwned: 0,
    moneyMultiUpgradePercent: 0.05,

    assemblyLineUpgradeOwned: 0,
    assemblyLineUpgradePercent: 0.03,

    aiManagerUpgradeOwned: 0,
    aiManagerUpgradePercent: 0.03,

    serverUpgradeOwned: 0,
    serverUpgradePercent: 0.03,

    dataCenterUpgradeOwned: 0,
    dataCenterUpgradePercent: 0.03,

    planetUpgradeOwned: 0,
    planetUpgradePercent: 0.03,

    panelLifetime1: false,
    panelLifetime2: false,
    panelLifetime3: false,
    panelLifetime4: false,

    totalPanelsDecayed: 0,

    goalSetter: 0,
  };
}

export function createDefaultDysonVerseSkillTreeData(): DysonVerseSkillTreeData {
  return {
    skillPointsTree: 0,
    fragments: 0,

    startHereTree: false,
    doubleScienceTree: false,
    producedAsScienceTree: false,
    panelLifetime20Tree: false,

    workerEfficiencyTree: false,
    burnOut: false,
    powerUnderwhelming: false,
    powerOverwhelming: false,

    assemblyLineTree: false,
    aiManagerTree: false,
    serverTree: false,
    dataCenterTree: false,
    planetsTree: false,

    pocketDimensions: false,
    scientificPlanets: false,

    banking: false,
    investmentPortfolio: false,

    scientificRevolution: false,
    economicRevolution: false,

    renewableEnergy: false,

    artificiallyEnhancedPanels: false,
    stayingPower: false,

    higgsBoson: false,
    rule34: false,

    androids: false,
    superchargedPower: false,
    workerBoost: false,

    stellarSacrifices: false,
    stellarImprovements: false,
    stellarObliteration: false,
    supernova: false,

    tasteOfPower: false,
    indulgingInPower: false,
    addictionToPower: false,

    progressiveAssembly: false,
    regulatedAcademia: false,
    panelWarranty: false,
    monetaryPolicy: false,
    terraformingProtocols: false,
    productionScaling: false,
    fragmentAssembly: false,

    assemblyMegaLines: false,

    idleElectricSheep: false,
    idleElectricSheepTimer: 0,

    superSwarm: false,
    megaSwarm: false,
    ultimateSwarm: false,

    purityOfMind: false,
    purityOfBody: false,
    purityOfSEssence: false,

    dysonSubsidies: false,
    oneMinutePlan: false,
    galacticPradigmShift: false,

    panelMaintenance: false,
    worthySacrifice: false,
    endOfTheLine: false,

    manualLabour: false,

    superRadiantScattering: false,
    superRadiantScatteringTimer: 0,

    repeatableResearch: false,
    shouldersOfGiants: false,
    shouldersOfPrecursors: false,
    shouldersOfTheFallen: false,
    shouldersOfTheEnlightened: false,
    shouldersOfTheRevolution: false,

    rocketMania: false,
    idleSpaceFlight: false,

    fusionReactors: false,
    coldFusion: false,

    scientificDominance: false,
    economicDominance: false,

    parallelProcessing: false,
    rudimentarySingularity: false,

    hubbleTelescope: false,
    jamesWebbTelescope: false,

    dimensionalCatCables: false,
    pocketProtectors: false,
    pocketMultiverse: false,
    whatCouldHaveBeen: false,
    shoulderSurgery: false,

    terraFirma: false,
    terraEculeo: false,
    terraInfirma: false,
    terraNullius: false,
    terraNova: false,
    terraGloriae: false,
    terraIrradiant: false,

    paragon: false,
    shepherd: false,
    citadelCouncil: false,
    renegade: false,
    saren: false,
    reapers: false,
    planetAssembly: false,
    shellWorlds: false,
    versatileProductionTactics: false,

    whatWillComeToPass: false,
    solarBubbles: false,
    pocketAndroids: false,
    hypercubeNetworks: false,
    parallelComputation: false,
    quantumComputing: false,
    unsuspiciousAlgorithms: false,
    agressiveAlgorithms: false,
    clusterNetworking: false,
    stellarDominance: false,
  };
}

export function createDefaultDysonVerseSaveData(): DysonVerseSaveData {
  return {
    lastCollapseDate: "",
    manualCreationTime: 10,

    skillAutoAssignmentList: [],

    skillAutoAssignmentList1: [],
    botDistPreset1: 0,
    preset1Name: "Preset 1",

    skillAutoAssignmentList2: [],
    botDistPreset2: 0,
    preset2Name: "Preset 2",

    skillAutoAssignmentList3: [],
    botDistPreset3: 0,
    preset3Name: "Preset 3",

    skillAutoAssignmentList4: [],
    botDistPreset4: 0,
    preset4Name: "Preset 4",

    skillAutoAssignmentList5: [],
    botDistPreset5: 0,
    preset5Name: "Preset 5",
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    universesConsumed: 0,
    workersReadyToGo: 0,
    workerAutoConvert: false,
    influence: 0,

    huntersPerPurchase: 1,
    gatherersPerPurchase: 1,
  };
}

export function createDefaultSaveDataPrestige(): SaveDataPrestige {
  return {
    doDoubleTime: false,
    doubleTimeOwned: false,
    doubleTime: 0,
    doubleTimeRate: 0,

    simulationCount: 0,
    strangeMatter: 0,

    disasterStage: 1,

    counterMeteor: false,
    counterAi: false,
    counterGw: false,

    engineering1: false,
    engineering2: false,
    engineering3: false,

    shipping1: false,
    shipping2: false,

    worldTrade1: false,
    worldTrade2: false,
    worldTrade3: false,

    worldPeace1: false,
    worldPeace2: false,
    worldPeace3: false,
    worldPeace4: false,

    mathematics1: false,
    mathematics2: false,
    mathematics3: false,

    advancedPhysics1: false,
    advancedPhysics2: false,
    advancedPhysics3: false,
    advancedPhysics4: false,

    hunter1: false,
    hunter2: false,
    hunter3: false,
    hunter4: false,

    gatherer1: false,
    gatherer2: false,
    gatherer3: false,
    gatherer4: false,

    workerBoost: false,
    workerBoostAcivator: false,

    citiesBoost: false,
    citiesBoostActivator: false,

    factoriesBoost: false,
    factoriesBoostActivator: false,

    bots1: false,
    botsBoost1Activator: false,
    bots2: false,
    botsBoost2Activator: false,

    rockets1: false,
    rockets2: false,
    rockets3: false,

    sfacs1: false,
    sfActivator1: false,
    sfacs2: false,
    sfActivator2: false,
    sfacs3: false,
    sfActivator3: false,

    railguns1: false,
    railgunActivator1: false,
    railguns2: false,
    railgunActivator2: false,

    translation1: false,
    translation2: false,
    translation3: false,
    translation4: false,
    translation5: false,
    translation6: false,
    translation7: false,
    translation8: false,

    speed1: false,
    speed2: false,
    speed3: false,
    speed4: false,
    speed5: false,
    speed6: false,
    speed7: false,
    speed8: false,
  };
}

export function createDefaultSaveDataDream1(): SaveDataDream1 {
  return {
    hunters: 0,
    hunterCost: 100,

    gatherers: 0,
    gathererCost: 100,

    community: 0,
    communityBoostCost: 0,
    communityBoostTime: 0,
    communityBoostDuration: 1200,

    housing: 0,
    villages: 0,
    workers: 0,
    cities: 0,

    engineering: false,
    engineeringComplete: false,
    engineeringProgress: 0,
    engineeringResearchTime: 600,
    engineeringCost: 1000,

    shipping: false,
    shippingComplete: false,
    shippingProgress: 0,
    shippingResearchTime: 1800,
    shippingCost: 5000,

    worldTrade: false,
    worldTradeComplete: false,
    worldTradeProgress: 0,
    worldTradeResearchTime: 3600,
    worldTradeCost: 7000,

    worldPeace: false,
    worldPeaceComplete: false,
    worldPeaceProgress: 0,
    worldPeaceResearchTime: 7200,
    worldPeaceCost: 8000,

    mathematics: false,
    mathematicsComplete: false,
    mathematicsProgress: 0,
    mathematicsResearchTime: 3600,
    mathematicsCost: 10000,

    advancedPhysics: false,
    advancedPhysicsComplete: false,
    advancedPhysicsProgress: 0,
    advancedPhysicsResearchTime: 7200,
    advancedPhysicsCost: 11000,

    factories: 0,
    factoriesBoostCost: 5000,
    factoriesBoostTime: 0,
    factoriesBoostDuration: 1200,

    bots: 0,

    rockets: 0,
    rocketsPerSpaceFactory: 10,

    energy: 0,

    spaceFactories: 0,

    dysonPanels: 0,

    railgunCharge: 0,
    railgunMaxCharge: 25000000,

    solarPanels: 0,
    solarCost: 50,
    solarPanelGeneration: 100,

    fusion: 0,
    fusionCost: 100000,
    fusionGeneration: 1250000,

    swarmPanels: 0,
    swarmPanelGeneration: 3212,
  };
}

export function createDefaultPrestigePlus(): PrestigePlus {
  return {
    points: 0,
    spentPoints: 0,

    botMultitasking: false,
    doubleIP: false,
    breakTheLoop: false,
    quantumEntanglement: false,
    automation: false,
    divisionsPurchased: 0,
    secrets: 0,
    avocatoPurchased: false,

    avocatoIP: 0,
    avocatoInfluence: 0,
    avocatoStrangeMatter: 0,
    avocatoOverflow: 0,

    purity: false,
    fragments: false,
    terra: false,
    power: false,
    paragade: false,
    stellar: false,

    influence: 0,
    cash: 0,
    science: 0,
  };
}

export function createDefaultSettings(): GameSettings {
  return {
    buyMode: "Buy1",
    roundedBulkBuy: false,
    researchBuyMode: "Buy1",
    researchRoundedBulkBuy: false,

    avotation: false,
    cheater: false,
    offlineTime: 0,
    maxOfflineTime: 86400,
    numberFormatting: "standard",

    infinityAutoResearchToggleAi: true,
    infinityAutoResearchToggleAssembly: true,
    infinityAutoResearchToggleMoney: true,
    infinityAutoResearchTogglePlanet: true,
    infinityAutoResearchToggleServer: true,
    infinityAutoResearchToggleDataCenter: true,
    infinityAutoResearchToggleScience: true,

    infinityAutoAssembly: true,
    infinityAutoManagers: true,
    infinityAutoServers: true,
    infinityAutoDataCenters: true,
    infinityAutoPlanets: true,
  };
}

export function createDefaultRuntime(): GameRuntime {
  return {
    modifiersTimer: 0,
    negativeGuardTimer: 0,
    autoBotsPriority: 0,

    manualBotCreation: {
      running: false,
      time: 0,
    },

    reality: {
      workerGenerationTime: 0,
    },
    dream1: {
      hunterTime: 0,
      gatherTime: 0,
      communityTime: 0,
      housingTime: 0,
      villagesTime: 0,
      workersTime: 0,
      citiesTime: 0,
      factoriesTime: 0,
      botsTime: 0,
      spaceFactoriesTime: 0,
      railgunFiring: false,
      railgunFireTime: 0,
      railgunFireTimesRemaining: 0,
      railgunTotalFireTime: 5,
    },

    secretPlanetMulti: 1,
    secretServerMulti: 1,
    secretAIMulti: 1,
    secretAssemblyMulti: 1,
    secretCashMulti: 1,
    secretScienceMulti: 1,
  };
}

export function createDefaultMeta(): GameMeta {
  return {
    firstInfinityDone: false,
    infinityInProgress: false,
    infinityPointsToBreakFor: 0,
    lastInfinityPointsGained: 0,
    timeLastInfinitySeconds: 0,
    lastPrestigeAtTimeSeconds: 0,
  };
}

export function createDefaultGameState(): GameState {
  return {
    timeSeconds: 0,
    meta: createDefaultMeta(),
    runtime: createDefaultRuntime(),
    settings: createDefaultSettings(),
    saveData: createDefaultSaveData(),
    sdPrestige: createDefaultSaveDataPrestige(),
    sdSimulation: createDefaultSaveDataDream1(),
    dysonVerseSaveData: createDefaultDysonVerseSaveData(),
    dysonVerseInfinityData: createDefaultDysonVerseInfinityData(),
    dysonVersePrestigeData: createDefaultDysonVersePrestigeData(),
    dysonVerseSkillTreeData: createDefaultDysonVerseSkillTreeData(),
    prestigePlus: createDefaultPrestigePlus(),
    debug: {
      debugOptions: false,
      doubleIp: false,
    },
  };
}
