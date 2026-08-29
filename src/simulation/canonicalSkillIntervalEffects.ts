import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  breakInfinityBotThreshold,
  clampPreBreakInfinityBots,
  ordinaryInfinityBotThreshold,
  timeToNextInfinityEvent,
  type BasicDysonInfinityState,
} from './infinityCycle'
import { addContinuous, clampContinuous, multiplyContinuous } from './numeric'

export interface CanonicalSkillIntervalInputs {
  readonly seconds: number
  readonly botProductionPerSecond: number
  readonly stellarPlanetsPerSecond: number
  readonly stellarBotsPerSecond: number
  readonly scienceBoostPerSecond: number
  readonly moneyUpgradePerSecond: number
}

/**
 * Commits timer-backed skills, Shoulders research accrual, and the atomic
 * Stellar Sacrifices debit/credit after ordinary tick-start arrivals. Each
 * active or coarse Stored Time update is one canonical
 * interval: only Bots present at its start may fund sacrifice during it.
 * Produced Bots remain credited, but become eligible in the next interval.
 */
export function applyCanonicalSkillIntervalEffects(
  startingState: CanonicalGameStateV1,
  stateAfterArrivals: CanonicalGameStateV1,
  inputs: Readonly<CanonicalSkillIntervalInputs>,
): CanonicalGameStateV1 {
  validateInputs(inputs)
  if (inputs.seconds === 0) return stateAfterArrivals

  const skills = advanceSkillTimers(
    stateAfterArrivals.skills,
    inputs.seconds,
  )
  const research = accrueShouldersResearch(
    stateAfterArrivals.research,
    inputs.scienceBoostPerSecond,
    inputs.moneyUpgradePerSecond,
    inputs.seconds,
  )
  const stellar = resolveStellarAggregate(
    startingState.dyson.bots,
    inputs.botProductionPerSecond,
    inputs.stellarBotsPerSecond,
    inputs.stellarPlanetsPerSecond,
    inputs.seconds,
  )

  return {
    ...stateAfterArrivals,
    skills,
    research,
    dyson: {
      ...stateAfterArrivals.dyson,
      bots: clampPreBreakInfinityBots(
        stellar.bots,
        stateAfterArrivals.quantum.unlocks.breakTheLoop,
        stateAfterArrivals.quantum.divisionsPurchased,
      ),
      facilities: stellar.planetsProduced === 0
        ? stateAfterArrivals.dyson.facilities
        : {
            ...stateAfterArrivals.dyson.facilities,
            planets: [
              addContinuous(
                stateAfterArrivals.dyson.facilities.planets[0],
                stellar.planetsProduced,
              ),
              stateAfterArrivals.dyson.facilities.planets[1],
            ],
          },
    },
  }
}

/**
 * Predicts an Infinity boundary from the same interval-start Stellar funding
 * rule used by the commit path. While the starting Bot balance funds the
 * sacrifice, the projected balance changes at production minus debit. After
 * that balance is exhausted, all later Bot production remains available.
 * This prevents a gross-production prediction from inventing a material
 * boundary that would incorrectly refresh Stellar funding inside one tick or
 * coarse Stored Time update.
 */
export function timeToNextInfinityEventAfterStellarSettlement(
  startingBots: number,
  botProductionPerSecond: number,
  stellarBotsPerSecond: number,
  stellarPlanetsPerSecond: number,
  infinity: Readonly<BasicDysonInfinityState>,
  maximumSeconds: number,
  minimumCycleSeconds: number,
): number {
  const ordinaryHorizon = timeToNextInfinityEvent(
    startingBots,
    botProductionPerSecond,
    infinity,
    maximumSeconds,
    minimumCycleSeconds,
  )
  if (
    startingBots <= 0 ||
    stellarBotsPerSecond <= 0 ||
    stellarPlanetsPerSecond <= 0
  ) {
    return ordinaryHorizon
  }

  const affordableSeconds = startingBots / stellarBotsPerSecond
  const fundedNetRate = botProductionPerSecond - stellarBotsPerSecond
  const threshold = infinity.breakTheLoop
    ? breakInfinityBotThreshold(infinity)
    : ordinaryInfinityBotThreshold(infinity.divisionsPurchased)
  if (startingBots >= threshold) {
    const minimumRemaining = Math.max(
      0,
      minimumCycleSeconds - infinity.secondsInCurrentCycle,
    )
    if (minimumRemaining === 0) {
      // A mature imported or reconstructed Infinity must be processed before
      // even an epsilon interval can spend its already-qualifying Bots.
      return 0
    }
    if (minimumRemaining >= maximumSeconds) return maximumSeconds
    const projectedAtMinimum =
      startingBots +
      botProductionPerSecond * minimumRemaining -
      stellarBotsPerSecond * Math.min(
        minimumRemaining,
        affordableSeconds,
      )
    if (projectedAtMinimum >= threshold) return minimumRemaining
  }
  if (fundedNetRate > 0) {
    const fundedHorizon = timeToNextInfinityEvent(
      startingBots,
      fundedNetRate,
      infinity,
      maximumSeconds,
      minimumCycleSeconds,
    )
    if (fundedHorizon <= affordableSeconds) return fundedHorizon
  }

  // Once the complete interval-start balance has been spent, the Bot balance
  // is exactly productionRate * elapsedSeconds. The elapsed horizon therefore
  // starts from zero Bots at the original interval origin.
  return timeToNextInfinityEvent(
    0,
    botProductionPerSecond,
    infinity,
    maximumSeconds,
    minimumCycleSeconds,
  )
}

function advanceSkillTimers(
  skills: CanonicalGameStateV1['skills'],
  seconds: number,
): CanonicalGameStateV1['skills'] {
  let changed = false
  const byId = { ...skills.byId }
  for (const [id, maximum] of [
    ['androids', 600],
    ['pocketAndroids', 3_600],
    ['superRadiantScattering', Number.MAX_VALUE],
  ] as const) {
    const skill = byId[id]
    if (skill?.owned !== true) continue
    const timerSeconds = maximum === Number.MAX_VALUE
      ? addContinuous(skill.timerSeconds, seconds)
      : Math.max(
          skill.timerSeconds,
          Math.min(maximum, skill.timerSeconds + seconds),
        )
    if (timerSeconds === skill.timerSeconds) continue
    byId[id] = { ...skill, timerSeconds }
    changed = true
  }
  return changed ? { ...skills, byId } : skills
}

function accrueShouldersResearch(
  research: CanonicalGameStateV1['research'],
  scienceBoostPerSecond: number,
  moneyUpgradePerSecond: number,
  seconds: number,
): CanonicalGameStateV1['research'] {
  let result = research
  result = accrueResearch(
    result,
    'research.science_boost',
    multiplyContinuous(scienceBoostPerSecond, seconds),
  )
  return accrueResearch(
    result,
    'research.money_multiplier',
    multiplyContinuous(moneyUpgradePerSecond, seconds),
  )
}

function accrueResearch(
  research: CanonicalGameStateV1['research'],
  id: string,
  delta: number,
): CanonicalGameStateV1['research'] {
  if (delta <= 0) return research
  const level = research.levelsById[id] ?? 0
  const progress = research.progressById[id] ?? 0
  const total = addContinuous(progress, delta)
  const whole = Math.floor(total)
  if (whole <= 0) {
    return {
      ...research,
      progressById: { ...research.progressById, [id]: total },
    }
  }
  const nextLevel = Math.min(
    Number.MAX_SAFE_INTEGER,
    level + whole,
  )
  const represented = nextLevel - level
  return {
    ...research,
    levelsById: { ...research.levelsById, [id]: nextLevel },
    progressById: {
      ...research.progressById,
      [id]: clampContinuous(total - represented),
    },
  }
}

function resolveStellarAggregate(
  startingBots: number,
  botProductionPerSecond: number,
  botsPerSecond: number,
  planetsPerSecond: number,
  seconds: number,
): { readonly bots: number; readonly planetsProduced: number } {
  const ordinaryEndingBots = addContinuous(
    startingBots,
    multiplyContinuous(botProductionPerSecond, seconds),
  )
  if (botsPerSecond <= 0 || planetsPerSecond <= 0) {
    return { bots: ordinaryEndingBots, planetsProduced: 0 }
  }

  const affordableSeconds = Math.min(
    seconds,
    startingBots / botsPerSecond,
  )
  const totalDebited = multiplyContinuous(
    botsPerSecond,
    affordableSeconds,
  )
  return {
    bots: Math.max(0, ordinaryEndingBots - totalDebited),
    planetsProduced: multiplyContinuous(
      planetsPerSecond,
      affordableSeconds,
    ),
  }
}

function validateInputs(inputs: Readonly<CanonicalSkillIntervalInputs>): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (!isFiniteNonNegativeNumber(value)) {
      throw new Error(
        `Canonical skill interval '${key}' must be finite and non-negative.`,
      )
    }
  }
}
