export type BuyMode = "Buy1" | "Buy10" | "Buy50" | "Buy100" | "BuyMax";

export interface DysonVersePrestigeData {
  infinityPoints: number;
  spentInfinityPoints: number;
  secretsOfTheUniverse: number;
  permanentSkillPoint: number;

  infinityAssemblyLines: boolean;
  infinityAiManagers: boolean;
  infinityServers: boolean;
  infinityDataCenter: boolean;
  infinityPlanets: boolean;

  infinityAutoResearch: boolean;
  infinityAutoBots: boolean;

  androidsSkillTimer: number;
  pocketAndroidsTimer: number;

  botDistribution: number;
}

export interface DysonVerseInfinityData {
  skillTreeSaveData?: Record<number, boolean>;

  money: number;
  moneyMulti: number;

  science: number;
  scienceMulti: number;

  bots: number;
  workers: number;
  researchers: number;

  panelsPerSec: number;
  panelsPerSecMulti: number;
  panelLifetime: number;

  assemblyLines: [number, number];
  assemblyLineModifier: number;
  botProduction: number;
  assemblyLineBotProduction: number;

  managers: [number, number];
  managerModifier: number;
  assemblyLineProduction: number;
  managerAssemblyLineProduction: number;

  servers: [number, number];
  serverModifier: number;
  managerProduction: number;
  serverManagerProduction: number;

  dataCenters: [number, number];
  dataCenterModifier: number;
  serverProduction: number;
  dataCenterServerProduction: number;

  planets: [number, number];
  planetModifier: number;
  dataCenterProduction: number;
  planetsDataCenterProduction: number;

  pocketDimensionsProduction: number;
  quantumComputingProduction: number;
  pocketDimensionsWithoutAnythingElseProduction: number;
  pocketProtectorsProduction: number;
  pocketMultiverseProduction: number;

  totalPlanetProduction: number;
  scientificPlanetsProduction: number;
  stellarSacrificesProduction: number;
  rudimentrySingularityProduction: number;
  planetAssemblyProduction: number;
  shellWorldsProduction: number;

  scienceBoostOwned: number;
  scienceBoostPercent: number;

  moneyMultiUpgradeOwned: number;
  moneyMultiUpgradePercent: number;

  assemblyLineUpgradeOwned: number;
  assemblyLineUpgradePercent: number;

  aiManagerUpgradeOwned: number;
  aiManagerUpgradePercent: number;

  serverUpgradeOwned: number;
  serverUpgradePercent: number;

  dataCenterUpgradeOwned: number;
  dataCenterUpgradePercent: number;

  planetUpgradeOwned: number;
  planetUpgradePercent: number;

  panelLifetime1: boolean;
  panelLifetime2: boolean;
  panelLifetime3: boolean;
  panelLifetime4: boolean;

  totalPanelsDecayed: number;

  goalSetter: number;
}

export interface DysonVerseSkillTreeData {
  skillPointsTree: number;
  fragments: number;

  startHereTree: boolean;
  doubleScienceTree: boolean;
  producedAsScienceTree: boolean;
  panelLifetime20Tree: boolean;

  workerEfficiencyTree: boolean;
  burnOut: boolean;
  powerUnderwhelming: boolean;
  powerOverwhelming: boolean;

  assemblyLineTree: boolean;
  aiManagerTree: boolean;
  serverTree: boolean;
  dataCenterTree: boolean;
  planetsTree: boolean;

  pocketDimensions: boolean;
  scientificPlanets: boolean;

  banking: boolean;
  investmentPortfolio: boolean;

  scientificRevolution: boolean;
  economicRevolution: boolean;

  renewableEnergy: boolean;

  artificiallyEnhancedPanels: boolean;
  stayingPower: boolean;

  higgsBoson: boolean;
  rule34: boolean;

  androids: boolean;
  superchargedPower: boolean;
  workerBoost: boolean;

  stellarSacrifices: boolean;
  stellarImprovements: boolean;
  stellarObliteration: boolean;
  supernova: boolean;

  tasteOfPower: boolean;
  indulgingInPower: boolean;
  addictionToPower: boolean;

  progressiveAssembly: boolean;
  regulatedAcademia: boolean;
  panelWarranty: boolean;
  monetaryPolicy: boolean;
  terraformingProtocols: boolean;
  productionScaling: boolean;
  fragmentAssembly: boolean;

  assemblyMegaLines: boolean;

  idleElectricSheep: boolean;
  idleElectricSheepTimer: number;

  superSwarm: boolean;
  megaSwarm: boolean;
  ultimateSwarm: boolean;

  purityOfMind: boolean;
  purityOfBody: boolean;
  purityOfSEssence: boolean;

  dysonSubsidies: boolean;
  oneMinutePlan: boolean;
  galacticPradigmShift: boolean;

  panelMaintenance: boolean;
  worthySacrifice: boolean;
  endOfTheLine: boolean;

  manualLabour: boolean;

  superRadiantScattering: boolean;
  superRadiantScatteringTimer: number;

  repeatableResearch: boolean;
  shouldersOfGiants: boolean;
  shouldersOfPrecursors: boolean;
  shouldersOfTheFallen: boolean;
  shouldersOfTheEnlightened: boolean;
  shouldersOfTheRevolution: boolean;

  rocketMania: boolean;
  idleSpaceFlight: boolean;

  fusionReactors: boolean;
  coldFusion: boolean;

  scientificDominance: boolean;
  economicDominance: boolean;

  parallelProcessing: boolean;
  rudimentarySingularity: boolean;

  hubbleTelescope: boolean;
  jamesWebbTelescope: boolean;

  dimensionalCatCables: boolean;
  pocketProtectors: boolean;
  pocketMultiverse: boolean;
  whatCouldHaveBeen: boolean;
  shoulderSurgery: boolean;

  terraFirma: boolean;
  terraEculeo: boolean;
  terraInfirma: boolean;
  terraNullius: boolean;
  terraNova: boolean;
  terraGloriae: boolean;
  terraIrradiant: boolean;

  paragon: boolean;
  shepherd: boolean;
  citadelCouncil: boolean;
  renegade: boolean;
  saren: boolean;
  reapers: boolean;
  planetAssembly: boolean;
  shellWorlds: boolean;
  versatileProductionTactics: boolean;

  whatWillComeToPass: boolean;
  solarBubbles: boolean;
  pocketAndroids: boolean;
  hypercubeNetworks: boolean;
  parallelComputation: boolean;
  quantumComputing: boolean;
  unsuspiciousAlgorithms: boolean;
  agressiveAlgorithms: boolean;
  clusterNetworking: boolean;
  stellarDominance: boolean;
}

export interface DysonVerseSaveData {
  lastCollapseDate: string;
  manualCreationTime: number;

  skillAutoAssignmentList: number[];

  skillAutoAssignmentList1: number[];
  botDistPreset1: number;
  preset1Name: string;

  skillAutoAssignmentList2: number[];
  botDistPreset2: number;
  preset2Name: string;

  skillAutoAssignmentList3: number[];
  botDistPreset3: number;
  preset3Name: string;

  skillAutoAssignmentList4: number[];
  botDistPreset4: number;
  preset4Name: string;

  skillAutoAssignmentList5: number[];
  botDistPreset5: number;
  preset5Name: string;
}

export interface GameSettings {
  buyMode: BuyMode;
  roundedBulkBuy: boolean;
  researchBuyMode: BuyMode;
  researchRoundedBulkBuy: boolean;

  avotation: boolean;
  cheater: boolean;
  offlineTime: number;
  maxOfflineTime: number;
  numberFormatting: "standard" | "engineering" | "scientific";

  infinityAutoResearchToggleAi: boolean;
  infinityAutoResearchToggleAssembly: boolean;
  infinityAutoResearchToggleMoney: boolean;
  infinityAutoResearchTogglePlanet: boolean;
  infinityAutoResearchToggleServer: boolean;
  infinityAutoResearchToggleDataCenter: boolean;
  infinityAutoResearchToggleScience: boolean;

  infinityAutoAssembly: boolean;
  infinityAutoManagers: boolean;
  infinityAutoServers: boolean;
  infinityAutoDataCenters: boolean;
  infinityAutoPlanets: boolean;
}

export interface PrestigePlus {
  points: number;
  spentPoints: number;

  botMultitasking: boolean;
  doubleIP: boolean;
  breakTheLoop: boolean;
  quantumEntanglement: boolean;
  automation: boolean;
  divisionsPurchased: number;
  secrets: number;
  avocatoPurchased: boolean;

  avocatoIP: number;
  avocatoInfluence: number;
  avocatoStrangeMatter: number;
  avocatoOverflow: number;

  purity: boolean;
  fragments: boolean;
  terra: boolean;
  power: boolean;
  paragade: boolean;
  stellar: boolean;

  influence: number;
  cash: number;
  science: number;
}

export interface RealityRuntime {
  workerGenerationTime: number;
}

export interface Dream1Runtime {
  hunterTime: number;
  gatherTime: number;
  communityTime: number;
  housingTime: number;
  villagesTime: number;
  workersTime: number;
  citiesTime: number;

  factoriesTime: number;
  botsTime: number;

  spaceFactoriesTime: number;

  railgunFiring: boolean;
  railgunFireTime: number;
  railgunFireTimesRemaining: number;
  railgunTotalFireTime: number;
}

export interface GameRuntime {
  modifiersTimer: number;
  negativeGuardTimer: number;
  autoBotsPriority: number;

  manualBotCreation: {
    running: boolean;
    time: number;
  };

  reality: RealityRuntime;
  dream1: Dream1Runtime;

  secretPlanetMulti: number;
  secretServerMulti: number;
  secretAIMulti: number;
  secretAssemblyMulti: number;
  secretCashMulti: number;
  secretScienceMulti: number;
}

export interface GameMeta {
  firstInfinityDone: boolean;
  infinityInProgress: boolean;
  infinityPointsToBreakFor: number;
  lastInfinityPointsGained: number;
  timeLastInfinitySeconds: number;
  lastPrestigeAtTimeSeconds: number;
}

export interface SaveData {
  universesConsumed: number;
  workersReadyToGo: number;
  workerAutoConvert: boolean;
  influence: number;

  huntersPerPurchase: number;
  gatherersPerPurchase: number;
}

export interface SaveDataPrestige {
  doDoubleTime: boolean;
  doubleTimeOwned: boolean;
  doubleTime: number;
  doubleTimeRate: number;

  simulationCount: number;
  strangeMatter: number;

  disasterStage: number;

  counterMeteor: boolean;
  counterAi: boolean;
  counterGw: boolean;

  engineering1: boolean;
  engineering2: boolean;
  engineering3: boolean;

  shipping1: boolean;
  shipping2: boolean;

  worldTrade1: boolean;
  worldTrade2: boolean;
  worldTrade3: boolean;

  worldPeace1: boolean;
  worldPeace2: boolean;
  worldPeace3: boolean;
  worldPeace4: boolean;

  mathematics1: boolean;
  mathematics2: boolean;
  mathematics3: boolean;

  advancedPhysics1: boolean;
  advancedPhysics2: boolean;
  advancedPhysics3: boolean;
  advancedPhysics4: boolean;

  hunter1: boolean;
  hunter2: boolean;
  hunter3: boolean;
  hunter4: boolean;

  gatherer1: boolean;
  gatherer2: boolean;
  gatherer3: boolean;
  gatherer4: boolean;

  workerBoost: boolean;
  workerBoostAcivator: boolean;

  citiesBoost: boolean;
  citiesBoostActivator: boolean;

  factoriesBoost: boolean;
  factoriesBoostActivator: boolean;

  bots1: boolean;
  botsBoost1Activator: boolean;
  bots2: boolean;
  botsBoost2Activator: boolean;

  rockets1: boolean;
  rockets2: boolean;
  rockets3: boolean;

  sfacs1: boolean;
  sfActivator1: boolean;
  sfacs2: boolean;
  sfActivator2: boolean;
  sfacs3: boolean;
  sfActivator3: boolean;

  railguns1: boolean;
  railgunActivator1: boolean;
  railguns2: boolean;
  railgunActivator2: boolean;

  translation1: boolean;
  translation2: boolean;
  translation3: boolean;
  translation4: boolean;
  translation5: boolean;
  translation6: boolean;
  translation7: boolean;
  translation8: boolean;

  speed1: boolean;
  speed2: boolean;
  speed3: boolean;
  speed4: boolean;
  speed5: boolean;
  speed6: boolean;
  speed7: boolean;
  speed8: boolean;
}

export interface SaveDataDream1 {
  hunters: number;
  hunterCost: number;

  gatherers: number;
  gathererCost: number;

  community: number;
  communityBoostCost: number;
  communityBoostTime: number;
  communityBoostDuration: number;

  housing: number;
  villages: number;
  workers: number;
  cities: number;

  engineering: boolean;
  engineeringComplete: boolean;
  engineeringProgress: number;
  engineeringResearchTime: number;
  engineeringCost: number;

  shipping: boolean;
  shippingComplete: boolean;
  shippingProgress: number;
  shippingResearchTime: number;
  shippingCost: number;

  worldTrade: boolean;
  worldTradeComplete: boolean;
  worldTradeProgress: number;
  worldTradeResearchTime: number;
  worldTradeCost: number;

  worldPeace: boolean;
  worldPeaceComplete: boolean;
  worldPeaceProgress: number;
  worldPeaceResearchTime: number;
  worldPeaceCost: number;

  mathematics: boolean;
  mathematicsComplete: boolean;
  mathematicsProgress: number;
  mathematicsResearchTime: number;
  mathematicsCost: number;

  advancedPhysics: boolean;
  advancedPhysicsComplete: boolean;
  advancedPhysicsProgress: number;
  advancedPhysicsResearchTime: number;
  advancedPhysicsCost: number;

  factories: number;
  factoriesBoostCost: number;
  factoriesBoostTime: number;
  factoriesBoostDuration: number;

  bots: number;

  rockets: number;
  rocketsPerSpaceFactory: number;

  energy: number;

  spaceFactories: number;

  dysonPanels: number;

  railgunCharge: number;
  railgunMaxCharge: number;

  solarPanels: number;
  solarCost: number;
  solarPanelGeneration: number;

  fusion: number;
  fusionCost: number;
  fusionGeneration: number;

  swarmPanels: number;
  swarmPanelGeneration: number;
}

export interface GameState {
  timeSeconds: number;
  meta: GameMeta;
  runtime: GameRuntime;
  settings: GameSettings;

  saveData: SaveData;
  sdPrestige: SaveDataPrestige;
  sdSimulation: SaveDataDream1;

  dysonVerseSaveData: DysonVerseSaveData;
  dysonVerseInfinityData: DysonVerseInfinityData;
  dysonVersePrestigeData: DysonVersePrestigeData;
  dysonVerseSkillTreeData: DysonVerseSkillTreeData;

  prestigePlus: PrestigePlus;

  debug: {
    debugOptions: boolean;
    doubleIp: boolean;
  };
}
