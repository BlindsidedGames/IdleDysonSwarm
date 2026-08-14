import type { DreamUpgradeFlag } from '../game-state/types'
import type { RealityUpgradeId } from '../simulation/realityUpgrades'

export const FRONTEND_GAMEPLAY_SNAPSHOT_VERSION = 1 as const

export const FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS = Object.freeze([
  'hunters',
  'gatherers',
  'community',
  'housing',
  'villages',
  'workers',
  'cities',
] as const)

export type FrontendSimulationFoundationalPanelId =
  (typeof FRONTEND_SIMULATION_FOUNDATIONAL_PANEL_IDS)[number]

export const FRONTEND_SIMULATION_INFORMATION_PANEL_IDS = Object.freeze([
  'engineering',
  'shipping',
  'world-trade',
  'world-peace',
  'mathematics',
  'advanced-physics',
  'factories',
  'bots',
  'rockets',
] as const)

export type FrontendSimulationInformationPanelId =
  (typeof FRONTEND_SIMULATION_INFORMATION_PANEL_IDS)[number]

export const FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS = Object.freeze([
  'solar',
  'fusion',
  'space-factories',
  'railguns',
  'swarm-stats',
] as const)

export type FrontendSimulationSpaceAgePanelId =
  (typeof FRONTEND_SIMULATION_SPACE_AGE_PANEL_IDS)[number]

export const SIMULATION_UPGRADE_SECTIONS = Object.freeze({
  countermeasures: Object.freeze([
    'counterMeteor',
    'counterAi',
    'counterGw',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  education: Object.freeze([
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
  ] as const satisfies readonly DreamUpgradeFlag[]),
  foundational: Object.freeze([
    'hunter1',
    'hunter2',
    'hunter3',
    'hunter4',
    'gatherer1',
    'gatherer2',
    'gatherer3',
    'gatherer4',
    'workerBoost',
    'citiesBoost',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  information: Object.freeze([
    'factoriesBoost',
    'bots1',
    'bots2',
    'rockets1',
    'rockets2',
    'rockets3',
  ] as const satisfies readonly DreamUpgradeFlag[]),
  spaceAge: Object.freeze([
    'sfacs1',
    'sfacs2',
    'sfacs3',
    'railguns1',
    'railguns2',
  ] as const satisfies readonly DreamUpgradeFlag[]),
})

export const REALITY_UPGRADE_SECTIONS = Object.freeze({
  translation: Object.freeze([
    'translation1',
    'translation2',
    'translation3',
    'translation4',
    'translation5',
    'translation6',
    'translation7',
    'translation8',
  ] as const satisfies readonly RealityUpgradeId[]),
  speed: Object.freeze([
    'speed1',
    'speed2',
    'speed3',
    'speed4',
    'speed5',
    'speed6',
    'speed7',
    'speed8',
  ] as const satisfies readonly RealityUpgradeId[]),
  qualityOfLife: Object.freeze([
    'doubleTimeOwned',
    'workerAutoConvert',
  ] as const satisfies readonly RealityUpgradeId[]),
})
