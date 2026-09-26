import { completeRetiredResearchSecret } from './avocadoMeditation'
import type { CanonicalGameStateV1, DiscoveryState, DiscoveryTierState } from '../game-state/types'
import { addContinuous, addDiscrete, DISCRETE_MAXIMUM, floorToDiscrete, isDiscreteResource, multiplyContinuous } from './numeric'

/** Prototype tuning lives here, independently of save format and presentation. */
export const DISCOVERY_TUNING = Object.freeze({
  completionProgress: 3600,
  startingStrength: 10,
  initialCashBots: 7,
  initialLifetime: 20,
  elevation: Object.freeze({ progress: 1800, cost: 3n, startingStrength: 10, treeWeight: 0.5 }),
  enlightenment: Object.freeze({ progress: 600, cost: 5n, startingStrength: 30, treeWeight: 0.25 }),
  strengthPerCompletion: 0.1,
  strengthPerPurchase: 5,
  speedPerPurchase: 0.25,
  growingScale: 0.1,
  growingCap: 2,
  skillSpeed: Object.freeze({
    startHereTree: 0.2, doubleScienceTree: 0.25, producedAsScienceTree: 1,
    coldFusion: 0.75, scientificRevolution: 0.5, scientificDominance: 1,
    paragon: 1.5, superchargedPower: 0.25, powerUnderwhelming: 0.25,
    'subskill.cashScience.production': 0.25, repeatableResearch: 0.5,
  }),
  strengthSecrets: [1, 3, 4, 5, 7, 9, 12, 13, 14] as readonly number[],
  speedSecrets: [6, 10, 11, 15, 22] as readonly number[],
})

export const EMPTY_DISCOVERY: Readonly<DiscoveryState> = Object.freeze({
  unlocked: false, completions: 0n, progress: 0, startingPower: 0n, speedUpgrades: 0n,
})

export function discoveryGrowingBonus(value: number): number {
  return Math.min(DISCOVERY_TUNING.growingCap,
    DISCOVERY_TUNING.growingScale * Math.log10(1 + Math.max(0, value)))
}

export function discoveryBaseStrength(discovery: Readonly<DiscoveryState>): number {
  return DISCOVERY_TUNING.startingStrength +
    DISCOVERY_TUNING.strengthPerPurchase * Number(discovery.startingPower) +
    DISCOVERY_TUNING.strengthPerCompletion * Number(discovery.completions)
}

export function discoveryProductionMultiplier(discovery: Readonly<DiscoveryState>, enhancement: number): number {
  return addContinuous(1, multiplyContinuous(discoveryBaseStrength(discovery) - 1, 1 + enhancement))
}

export const EMPTY_DISCOVERY_TIER: Readonly<DiscoveryTierState> = Object.freeze({ completions: 0n, progress: 0, startingPower: 0n })
export interface DiscoverySpeeds { readonly speed: number; readonly elevationSpeed: number; readonly enlightenmentSpeed: number }

export function discoveryCashBotsStrength(discovery: Readonly<DiscoveryState>): number {
  const tier = discovery.elevation
  return tier ? DISCOVERY_TUNING.elevation.startingStrength + DISCOVERY_TUNING.strengthPerPurchase * Number(tier.startingPower) + DISCOVERY_TUNING.strengthPerCompletion * Number(tier.completions) : DISCOVERY_TUNING.initialCashBots
}
export function discoveryPanelLifetime(discovery: Readonly<DiscoveryState>): number {
  const tier = discovery.enlightenment
  return tier ? DISCOVERY_TUNING.enlightenment.startingStrength + DISCOVERY_TUNING.strengthPerPurchase * Number(tier.startingPower) + DISCOVERY_TUNING.strengthPerCompletion * Number(tier.completions) : DISCOVERY_TUNING.initialLifetime
}

function advanceTier<T extends DiscoveryTierState>(tier: T, progressAdded: number, requirement: number): { state: T; completed: bigint } {
  const progress = addContinuous(tier.progress, progressAdded)
  const remainder = progress % requirement
  const atBoundary = requirement - remainder <= 1e-6
  const completed = addDiscrete(floorToDiscrete(progress / requirement), atBoundary ? 1n : 0n)
  return { state: { ...tier, completions: addDiscrete(tier.completions, completed), progress: atBoundary ? 0 : remainder }, completed }
}

/** Each completion advances the preceding bar by a fixed duration at its current speed.
 * Process highest tier first so transferred time can complete and cascade normally. */
export function advanceDiscovery(discovery: Readonly<DiscoveryState>, seconds: number, speeds: number | DiscoverySpeeds): DiscoveryState {
  if (!discovery.unlocked || !Number.isFinite(seconds) || seconds <= 0) return discovery
  const rates = typeof speeds === 'number' ? { speed: speeds, elevationSpeed: speeds, enlightenmentSpeed: speeds } : speeds
  if ([rates.speed, rates.elevationSpeed, rates.enlightenmentSpeed].some(rate => !Number.isFinite(rate) || rate <= 0)) return discovery
  const enlightenment = discovery.enlightenment ? advanceTier(discovery.enlightenment, multiplyContinuous(seconds, rates.enlightenmentSpeed), DISCOVERY_TUNING.enlightenment.progress) : undefined
  const elevation = discovery.elevation ? advanceTier(discovery.elevation,
    multiplyContinuous(addContinuous(seconds, multiplyContinuous(Number(enlightenment?.completed ?? 0n), DISCOVERY_TUNING.enlightenment.progress)), rates.elevationSpeed), DISCOVERY_TUNING.elevation.progress) : undefined
  const base = advanceTier(discovery, multiplyContinuous(addContinuous(seconds, multiplyContinuous(Number(elevation?.completed ?? 0n), DISCOVERY_TUNING.elevation.progress)), rates.speed), DISCOVERY_TUNING.completionProgress)
  return { ...base.state, ...(elevation ? { elevation: elevation.state } : {}), ...(enlightenment ? { enlightenment: enlightenment.state } : {}) }
}

/** Time to each next completion, including incoming time transfers.
 * Monotone bisection is bounded independently of how many levels a spend earns.
 */
export function discoveryCompletionTimes(state: Readonly<DiscoveryState>, rates: DiscoverySpeeds): readonly number[] {
  const tiers = [state, state.elevation, state.enlightenment]
  const requirements = [DISCOVERY_TUNING.completionProgress, DISCOVERY_TUNING.elevation.progress, DISCOVERY_TUNING.enlightenment.progress]
  const speeds = [rates.speed, rates.elevationSpeed, rates.enlightenmentSpeed]
  const reaches = (index: number, seconds: number): boolean => {
    const advanced = advanceDiscovery(state, seconds, rates)
    return [advanced, advanced.elevation, advanced.enlightenment][index]!.completions > tiers[index]!.completions
  }
  return tiers.map((tier, index) => {
    if (!tier) return 0
    let low = 0
    let high = (requirements[index] - tier.progress) / speeds[index]
    for (let step = 0; step < 40; step++) {
      const middle = (low + high) / 2
      if (reaches(index, middle)) high = middle
      else low = middle
    }
    return high
  })
}

export function resetDiscoveryProgress(discovery: DiscoveryState): DiscoveryState {
  return { ...discovery, completions: 0n, progress: 0,
    ...(discovery.elevation ? { elevation: { ...discovery.elevation, completions: 0n, progress: 0 } } : {}),
    ...(discovery.enlightenment ? { enlightenment: { ...discovery.enlightenment, completions: 0n, progress: 0 } } : {}) }
}

export type DiscoveryPurchase = 'unlock' | 'elevation' | 'enlightenment' | 'speed' | 'power' | 'elevation-power' | 'enlightenment-power'
export function discoveryPurchaseCount(discovery: Readonly<DiscoveryState>, purchase: DiscoveryPurchase): bigint {
  if (purchase === 'speed') return discovery.speedUpgrades
  if (purchase === 'elevation-power') return discovery.elevation?.startingPower ?? 0n
  if (purchase === 'enlightenment-power') return discovery.enlightenment?.startingPower ?? 0n
  return discovery.startingPower
}
export function discoveryPurchaseCost(discovery: Readonly<DiscoveryState>, purchase: DiscoveryPurchase): bigint | null {
  if (purchase === 'unlock') return discovery.unlocked ? null : 1n
  if (!discovery.unlocked) return null
  if (purchase === 'elevation') return discovery.elevation ? null : DISCOVERY_TUNING.elevation.cost
  if (purchase === 'enlightenment') return !discovery.elevation || discovery.enlightenment ? null : DISCOVERY_TUNING.enlightenment.cost
  if (purchase === 'elevation-power' && !discovery.elevation || purchase === 'enlightenment-power' && !discovery.enlightenment) return null
  const count = discoveryPurchaseCount(discovery, purchase)
  return count < DISCRETE_MAXIMUM ? count + 1n : null
}

/** Returns the whole transaction; callers commit through the existing command boundary. */
export function purchaseDiscovery(state: CanonicalGameStateV1, purchase: DiscoveryPurchase): CanonicalGameStateV1 | null {
  if (!['unlock', 'elevation', 'enlightenment', 'speed', 'power', 'elevation-power', 'enlightenment-power'].includes(purchase)) return null
  const discovery = state.discovery ?? EMPTY_DISCOVERY
  const cost = discoveryPurchaseCost(discovery, purchase)
  const balance = state.avocado.overflowPoints ?? 0n
  if (cost === null || balance < cost || state.infinity.inProgress) return null
  return completeRetiredResearchSecret({
    ...state,
    discovery: {
      ...discovery, unlocked: true,
      ...(purchase === 'elevation' ? { elevation: { ...EMPTY_DISCOVERY_TIER } } : {}),
      ...(purchase === 'enlightenment' ? { enlightenment: { ...EMPTY_DISCOVERY_TIER } } : {}),
      ...(purchase === 'elevation-power' && discovery.elevation ? { elevation: { ...discovery.elevation, startingPower: discovery.elevation.startingPower + 1n } } : {}),
      ...(purchase === 'enlightenment-power' && discovery.enlightenment ? { enlightenment: { ...discovery.enlightenment, startingPower: discovery.enlightenment.startingPower + 1n } } : {}),
      speedUpgrades: discovery.speedUpgrades + (purchase === 'speed' ? 1n : 0n),
      startingPower: discovery.startingPower + (purchase === 'power' ? 1n : 0n),
    },
    avocado: { ...state.avocado, overflowPoints: balance - cost },
    ...(purchase === 'unlock' ? { meta: { ...state.meta, navigationVisibility: {
      story: false, wiki: true, statistics: false, ...state.meta.navigationVisibility,
      transcendence: state.meta.navigationVisibility?.research ?? true,
    } } } : {}),
    ...(purchase === 'unlock' ? {
      dyson: { ...state.dyson, science: 0, workers: state.dyson.bots, researchers: 0 },
      research: { ...state.research, levelsById: {}, progressById: {} },
    } : {}),
  })
}

export function validateDiscovery(value: DiscoveryState | undefined): string | null {
  if (value === undefined) return null
  if (!value || typeof value.unlocked !== 'boolean' ||
    !isDiscreteResource(value.completions) || !isDiscreteResource(value.startingPower) ||
    !isDiscreteResource(value.speedUpgrades) || !Number.isFinite(value.progress) ||
    value.progress < 0 || value.progress >= DISCOVERY_TUNING.completionProgress ||
    (!value.unlocked && (value.completions !== 0n || value.progress !== 0 || value.startingPower !== 0n || value.speedUpgrades !== 0n))) {
    return 'Invalid Discovery state.'
  }
  for (const [tier, requirement] of [[value.elevation, DISCOVERY_TUNING.elevation.progress], [value.enlightenment, DISCOVERY_TUNING.enlightenment.progress]] as const) {
    if (tier !== undefined && (!tier || !value.unlocked || !isDiscreteResource(tier.completions) || !isDiscreteResource(tier.startingPower) || !Number.isFinite(tier.progress) || tier.progress < 0 || tier.progress >= requirement)) return 'Invalid Discovery tier.'
  }
  if (value.enlightenment && !value.elevation) return 'Enlightenment requires Elevation.'
  return null
}
