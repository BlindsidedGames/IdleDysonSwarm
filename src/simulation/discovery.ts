import { completeRetiredResearchSecret } from './avocadoMeditation'
import type { CanonicalGameStateV1, DiscoveryState } from '../game-state/types'
import { addContinuous, addDiscrete, DISCRETE_MAXIMUM, floorToDiscrete, isDiscreteResource, multiplyContinuous } from './numeric'

/** Prototype tuning lives here, independently of save format and presentation. */
export const DISCOVERY_TUNING = Object.freeze({
  completionProgress: 3600,
  startingStrength: 10,
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

export function advanceDiscovery(discovery: Readonly<DiscoveryState>, seconds: number, speed: number): DiscoveryState {
  if (!discovery.unlocked || seconds <= 0 || speed <= 0) return discovery
  const progress = addContinuous(discovery.progress, multiplyContinuous(seconds, speed))
  const remainder = progress % DISCOVERY_TUNING.completionProgress
  // Fractional gameplay ticks can leave an exact hour a fraction of a microsecond
  // short. Normalize only that boundary, independently of the number of levels.
  const atBoundary = DISCOVERY_TUNING.completionProgress - remainder <= 1e-6
  return {
    ...discovery,
    completions: addDiscrete(discovery.completions, addDiscrete(floorToDiscrete(progress / DISCOVERY_TUNING.completionProgress), atBoundary ? 1n : 0n)),
    progress: atBoundary ? 0 : remainder,
  }
}

export type DiscoveryPurchase = 'unlock' | 'speed' | 'power'
export function discoveryPurchaseCost(discovery: Readonly<DiscoveryState>, purchase: DiscoveryPurchase): bigint | null {
  if (purchase === 'unlock') return discovery.unlocked ? null : 1n
  if (!discovery.unlocked) return null
  const count = purchase === 'speed' ? discovery.speedUpgrades : discovery.startingPower
  return count < DISCRETE_MAXIMUM ? count + 1n : null
}

/** Returns the whole transaction; callers commit through the existing command boundary. */
export function purchaseDiscovery(state: CanonicalGameStateV1, purchase: DiscoveryPurchase): CanonicalGameStateV1 | null {
  if (!['unlock', 'speed', 'power'].includes(purchase)) return null
  const discovery = state.discovery ?? EMPTY_DISCOVERY
  const cost = discoveryPurchaseCost(discovery, purchase)
  const balance = state.avocado.overflowPoints ?? 0n
  if (cost === null || balance < cost || state.infinity.inProgress) return null
  return completeRetiredResearchSecret({
    ...state,
    discovery: {
      ...discovery, unlocked: true,
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
  return null
}
