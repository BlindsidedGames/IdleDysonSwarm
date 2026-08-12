import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalGameStateV2,
} from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  floorGameDecimal,
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  gameDecimalToNumberChecked,
  gameDecimalToSchedulerSeconds,
  isGameDecimal,
  isZeroGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  canonicalRealityCatalogV2,
  isRealityUpgradeIdV2,
  type RealityUpgradeEffectV2,
  type RealityUpgradeIdV2,
} from './realityCatalogV2'
import { recordRealityStatisticsSegmentV2 } from './realityStatisticsV2'

export type RealityWorkerAdvanceCodeV2 =
  | 'advanced'
  | 'unchanged'
  | 'invalid-state'
  | 'invalid-duration'
  | 'invalid-remainder'

export interface RealityWorkerAdvanceResultV2 {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: RealityWorkerAdvanceCodeV2
  readonly state: Readonly<CanonicalGameStateV2>
  readonly generationPerSecond: GameDecimal
  readonly workersGenerated: GameDecimal
  readonly automaticInfluence: GameDecimal
  readonly stalledSeconds: number
}

export type RealityGatherCodeV2 =
  | 'gathered'
  | 'not-ready'
  | 'output-unrepresented'
  | 'invalid-state'

export interface RealityGatherResultV2 {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: RealityGatherCodeV2
  readonly state: Readonly<CanonicalGameStateV2>
  readonly influenceGathered: GameDecimal
}

export interface RealityStrangeMatterAccountV2 {
  readonly kind: 'reality-strange-matter-account-v2'
  readonly currencyPath: '$.dream.strangeMatter'
  readonly accountId: string
  readonly revision: number
  readonly balance: GameDecimal
}

export type RealityUpgradeQuoteCodeV2 =
  | 'ready'
  | 'unknown-upgrade'
  | 'already-owned'
  | 'prerequisites-not-met'
  | 'insufficient-strange-matter'
  | 'invalid-state'
  | 'invalid-account'
  | 'revision-exhausted'

export interface RealityUpgradeQuoteV2 {
  readonly kind: 'reality-upgrade-quote-v2'
  readonly accepted: boolean
  readonly code: RealityUpgradeQuoteCodeV2
  readonly upgradeId: string
  readonly currencyPath: '$.dream.strangeMatter'
  readonly accountId: string
  readonly sourceRevision: number
  readonly cost: GameDecimal
  readonly sourceBalance: GameDecimal
  readonly expectedBalance: GameDecimal
}

export type RealityUpgradeCommitCodeV2 =
  | 'committed'
  | 'quote-rejected'
  | 'stale-state'
  | 'stale-account'

export interface RealityUpgradeCommitResultV2 {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: RealityUpgradeCommitCodeV2
  readonly state: Readonly<CanonicalGameStateV2>
  readonly account: Readonly<RealityStrangeMatterAccountV2>
  readonly upgradeId: string
  readonly cost: GameDecimal
}

interface IssuedUpgradeQuoteV2 {
  readonly sourceSnapshot: Readonly<CanonicalGameStateV2>
  readonly sourceAccount: Readonly<RealityStrangeMatterAccountV2>
  readonly candidateState: Readonly<CanonicalGameStateV2>
  readonly candidateAccount: Readonly<RealityStrangeMatterAccountV2>
}

const issuedAccounts = new WeakSet<object>()
const issuedQuotes = new WeakMap<object, IssuedUpgradeQuoteV2>()
const workerGenerationRatesByBonus = new WeakMap<object, GameDecimal>()
const FLOAT32_MAXIMUM = 3.4028234663852886e38
const FLOAT32_MAXIMUM_DECIMAL = gameDecimalFromNumber(FLOAT32_MAXIMUM)

/**
 * Advances Reality using raw simulated seconds. Dream Double Time is not an
 * input: its accounting owner must pass the underlying material duration.
 */
export function advanceRealityWorkersV2(
  state: Readonly<CanonicalGameStateV2>,
  seconds: number,
): Readonly<RealityWorkerAdvanceResultV2> {
  const invalid = validateRealityBoundary(state)
  if (invalid !== null) return emptyAdvance(state, 'invalid-state')
  return advancePreparedRealityWorkersV2(state, seconds)
}

/**
 * @internal CanonicalEventTimeModelV2 owns the validated/frozen state boundary.
 * Keeping this entry point restricted to that owner avoids a whole-state clone
 * or graph validation at every material segment while retaining the strict
 * public Reality boundary above.
 */
export function advancePreparedRealityWorkersV2(
  state: Readonly<CanonicalGameStateV2>,
  seconds: number,
): Readonly<RealityWorkerAdvanceResultV2> {
  if (!Number.isFinite(seconds) || seconds < 0 || Object.is(seconds, -0)) {
    return emptyAdvance(state, 'invalid-duration')
  }

  const rate = realityWorkerGenerationRateV2(state.quantum.influenceSpeedBonus)
  if (seconds === 0 || isZeroGameDecimal(rate)) {
    return Object.freeze({
      ...emptyAdvance(state, 'unchanged'),
      generationPerSecond: rate,
    })
  }
  const batch = canonicalRealityCatalogV2.workerBatchSize
  if (!state.reality.autoGather && state.reality.workersReady === batch) {
    return Object.freeze({
      accepted: true,
      changed: false,
      code: 'unchanged',
      state,
      generationPerSecond: rate,
      workersGenerated: cloneGameDecimal(GAME_DECIMAL_ZERO),
      automaticInfluence: cloneGameDecimal(GAME_DECIMAL_ZERO),
      stalledSeconds: seconds,
    })
  }

  const totalProgress = addGameDecimals(
    gameDecimalFromNumber(state.reality.workerGenerationProgress),
    multiplyGameDecimals(rate, gameDecimalFromNumber(seconds)),
  )
  const completed = floorGameDecimal(totalProgress)
  const fractional = subtractGameDecimals(totalProgress, completed)
  let progress: number
  try {
    progress = gameDecimalToNumberChecked(fractional, { minimum: 0, maximum: 1 })
  } catch {
    return emptyAdvance(state, 'invalid-remainder')
  }
  if (progress >= 1) return emptyAdvance(state, 'invalid-remainder')

  let workersReady = state.reality.workersReady
  let workersGenerated = cloneGameDecimal(GAME_DECIMAL_ZERO)
  let automaticInfluence = cloneGameDecimal(GAME_DECIMAL_ZERO)
  let nextInfluence = state.reality.influence
  let stalledSeconds = 0
  if (state.reality.autoGather) {
    const batchDecimal = gameDecimalFromBigInt(batch)
    const available = addGameDecimals(completed, gameDecimalFromBigInt(workersReady))
    const batches = floorGameDecimal(divideGameDecimals(available, batchDecimal))
    automaticInfluence = multiplyGameDecimals(batches, batchDecimal)
    nextInfluence = addGameDecimals(state.reality.influence, automaticInfluence)
    if (
      !isZeroGameDecimal(automaticInfluence) &&
      equalGameDecimals(nextInfluence, state.reality.influence)
    ) {
      automaticInfluence = cloneGameDecimal(GAME_DECIMAL_ZERO)
      nextInfluence = state.reality.influence
      const space = batch - workersReady
      const spaceDecimal = gameDecimalFromBigInt(space)
      if (compareGameDecimals(completed, spaceDecimal) >= 0) {
        workersReady = batch
        workersGenerated = spaceDecimal
        progress = 0
        stalledSeconds = stalledAfterReadyCap(
          seconds,
          space,
          state.reality.workerGenerationProgress,
          rate,
        )
      } else {
        try {
          const accepted = gameDecimalToBigIntChecked(completed, { maximum: space })
          workersReady += accepted
          workersGenerated = completed
        } catch {
          return emptyAdvance(state, 'invalid-remainder')
        }
      }
    } else {
      const remainder = subtractGameDecimals(available, automaticInfluence)
      try {
        workersReady = gameDecimalToBigIntChecked(remainder, { maximum: batch - 1n })
      } catch {
        return emptyAdvance(state, 'invalid-remainder')
      }
      workersGenerated = completed
    }
  } else {
    const space = batch - workersReady
    const spaceDecimal = gameDecimalFromBigInt(space)
    if (compareGameDecimals(completed, spaceDecimal) >= 0) {
      workersReady = batch
      workersGenerated = spaceDecimal
      progress = 0
      stalledSeconds = stalledAfterReadyCap(
        seconds,
        space,
        state.reality.workerGenerationProgress,
        rate,
      )
    } else {
      try {
        const accepted = gameDecimalToBigIntChecked(completed, { maximum: space })
        workersReady += accepted
        workersGenerated = completed
      } catch {
        return emptyAdvance(state, 'invalid-remainder')
      }
    }
  }

  if (
    isZeroGameDecimal(workersGenerated) &&
    isZeroGameDecimal(automaticInfluence) &&
    progress === state.reality.workerGenerationProgress
  ) {
    return Object.freeze({
      accepted: true,
      changed: false,
      code: 'unchanged',
      state,
      generationPerSecond: rate,
      workersGenerated,
      automaticInfluence,
      stalledSeconds,
    })
  }
  const candidate = preparedRealityCandidate(state, {
    universeDesignationCount: addGameDecimals(
      state.reality.universeDesignationCount,
      workersGenerated,
    ),
    workersReady,
    workerGenerationProgress: progress,
    influence: nextInfluence,
  })
  return Object.freeze({
    accepted: true,
    changed: true,
    code: 'advanced',
    state: candidate,
    generationPerSecond: rate,
    workersGenerated,
    automaticInfluence,
    stalledSeconds,
  })
}

/** Converts exactly one complete 128-worker batch to scalable Influence. */
export function gatherRealityInfluenceV2(
  state: Readonly<CanonicalGameStateV2>,
): Readonly<RealityGatherResultV2> {
  if (validateRealityBoundary(state) !== null) {
    return emptyGather(state, 'invalid-state')
  }
  const batch = canonicalRealityCatalogV2.workerBatchSize
  if (state.reality.workersReady !== batch) return emptyGather(state, 'not-ready')
  const gathered = gameDecimalFromBigInt(batch)
  const influence = addGameDecimals(state.reality.influence, gathered)
  if (equalGameDecimals(influence, state.reality.influence)) {
    return emptyGather(state, 'output-unrepresented')
  }
  const gatheredState = realityCandidate(state, {
    workersReady: 0n,
    influence,
  })
  const statistics = recordRealityStatisticsSegmentV2(
    gatheredState.statistics,
    0,
    Object.freeze({
      workersGenerated: GAME_DECIMAL_ZERO,
      workerGenerationStartProgress: state.reality.workerGenerationProgress,
      generationPerSecond: GAME_DECIMAL_ZERO,
      automaticInfluence: GAME_DECIMAL_ZERO,
      manualInfluence: gathered,
      stalledSeconds: 0,
    }),
  )
  return Object.freeze({
    accepted: true,
    changed: true,
    code: 'gathered',
    state: Object.freeze({ ...gatheredState, statistics }) as CanonicalGameStateV2,
    influenceGathered: gathered,
  })
}

/**
 * Authoritative reset input: sums only catalog-authored Skill Point grants for
 * currently owned Reality artifacts. Callers cannot supply a raw grant count.
 */
export function realityArtifactSkillPointsV2(
  state: Readonly<CanonicalGameStateV2>,
): bigint {
  const invalid = validateRealityBoundary(state)
  if (invalid !== null) throw new TypeError(`Invalid Reality V2 state: ${invalid}`)
  let total = 0n
  for (const id of canonicalRealityCatalogV2.upgradeIds) {
    if (!upgradeOwned(state, id)) continue
    for (const effect of canonicalRealityCatalogV2.upgrades[id].effects) {
      if (effect.kind === 'grant-skill-points') total += effect.amount
    }
  }
  return total
}

/** @internal Stage 6's Strange Matter owner is the only intended caller. */
export function registerRealityStrangeMatterAccountV2ForOwner(
  accountId: string,
  revision: number,
  balance: GameDecimal,
): Readonly<RealityStrangeMatterAccountV2> {
  if (
    typeof accountId !== 'string' ||
    accountId.trim().length === 0 ||
    accountId.length > 128 ||
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    !isGameDecimal(balance)
  ) {
    throw new TypeError('Reality Strange Matter account input is invalid.')
  }
  const account = Object.freeze({
    kind: 'reality-strange-matter-account-v2' as const,
    currencyPath: '$.dream.strangeMatter' as const,
    accountId,
    revision,
    balance: cloneGameDecimal(balance),
  })
  issuedAccounts.add(account)
  return account
}

/**
 * Quotes a one-time Reality upgrade against Stage 6-owned Strange Matter.
 * The returned candidate intentionally does not mutate dream.strangeMatter;
 * the currency owner must atomically publish the committed account balance.
 */
export function quoteRealityUpgradeV2(
  state: Readonly<CanonicalGameStateV2>,
  account: Readonly<RealityStrangeMatterAccountV2>,
  upgradeId: string,
): Readonly<RealityUpgradeQuoteV2> {
  if (validateRealityBoundary(state) !== null) {
    return rejectedUpgradeQuote(upgradeId, 'invalid-state')
  }
  let sourceSnapshot: Readonly<CanonicalGameStateV2>
  try {
    sourceSnapshot = cloneCanonicalGameStateV2(state)
  } catch {
    return rejectedUpgradeQuote(upgradeId, 'invalid-state')
  }
  if (!issuedAccounts.has(account as object)) {
    return rejectedUpgradeQuote(upgradeId, 'invalid-account')
  }
  if (!equalGameDecimals(account.balance, sourceSnapshot.dream.strangeMatter)) {
    return rejectedUpgradeQuote(upgradeId, 'invalid-account', account)
  }
  if (!isRealityUpgradeIdV2(upgradeId)) {
    return rejectedUpgradeQuote(upgradeId, 'unknown-upgrade', account)
  }
  const definition = canonicalRealityCatalogV2.upgrades[upgradeId]
  if (upgradeOwned(sourceSnapshot, upgradeId)) {
    return rejectedUpgradeQuote(upgradeId, 'already-owned', account)
  }
  if (definition.prerequisites.some(
    (requirement) => upgradeOwned(sourceSnapshot, requirement.key) !== requirement.mustBeOwned,
  )) {
    return rejectedUpgradeQuote(upgradeId, 'prerequisites-not-met', account)
  }
  const cost = gameDecimalFromBigInt(definition.cost)
  if (compareGameDecimals(account.balance, cost) < 0) {
    return rejectedUpgradeQuote(upgradeId, 'insufficient-strange-matter', account, cost)
  }
  if (account.revision === Number.MAX_SAFE_INTEGER) {
    return rejectedUpgradeQuote(upgradeId, 'revision-exhausted', account, cost)
  }

  let candidate = sourceSnapshot
  for (const effect of definition.effects) candidate = applyUpgradeEffect(candidate, effect)
  const validation = validateCanonicalGameStateV2(candidate)
  if (!validation.valid) return rejectedUpgradeQuote(upgradeId, 'invalid-state', account, cost)
  const expectedBalance = subtractGameDecimals(account.balance, cost)
  const expectedAccount = registerRealityStrangeMatterAccountV2ForOwner(
    account.accountId,
    account.revision + 1,
    expectedBalance,
  )
  const quote = Object.freeze({
    kind: 'reality-upgrade-quote-v2' as const,
    accepted: true,
    code: 'ready' as const,
    upgradeId,
    currencyPath: account.currencyPath,
    accountId: account.accountId,
    sourceRevision: account.revision,
    cost,
    sourceBalance: cloneGameDecimal(account.balance),
    expectedBalance,
  })
  issuedQuotes.set(quote, Object.freeze({
    sourceSnapshot,
    sourceAccount: account,
    candidateState: candidate,
    candidateAccount: expectedAccount,
  }))
  return quote
}

export function commitRealityUpgradeV2(
  quote: Readonly<RealityUpgradeQuoteV2>,
  state: Readonly<CanonicalGameStateV2>,
  account: Readonly<RealityStrangeMatterAccountV2>,
): Readonly<RealityUpgradeCommitResultV2> {
  if (quote === null || typeof quote !== 'object') {
    return rejectedUpgradeCommit(state, account, 'quote-rejected')
  }
  const issued = issuedQuotes.get(quote as object)
  if (issued === undefined) return rejectedUpgradeCommit(state, account, 'quote-rejected')
  let currentSnapshot: Readonly<CanonicalGameStateV2>
  try {
    currentSnapshot = cloneCanonicalGameStateV2(state)
  } catch {
    return rejectedUpgradeCommit(state, account, 'stale-state')
  }
  if (!equalCanonicalData(currentSnapshot, issued.sourceSnapshot)) {
    return rejectedUpgradeCommit(state, account, 'stale-state')
  }
  if (account !== issued.sourceAccount || !issuedAccounts.has(account as object)) {
    return rejectedUpgradeCommit(state, account, 'stale-account')
  }
  issuedQuotes.delete(quote as object)
  return Object.freeze({
    accepted: true,
    changed: true,
    code: 'committed',
    state: issued.candidateState,
    account: issued.candidateAccount,
    upgradeId: quote.upgradeId,
    cost: cloneGameDecimal(quote.cost),
  })
}

function applyUpgradeEffect(
  state: Readonly<CanonicalGameStateV2>,
  effect: Readonly<RealityUpgradeEffectV2>,
): Readonly<CanonicalGameStateV2> {
  if (effect.kind === 'grant-skill-points') {
    return Object.freeze({
      ...state,
      skills: Object.freeze({ ...state.skills, points: state.skills.points + effect.amount }),
    })
  }
  if (effect.kind === 'set-double-time-bank') {
    return Object.freeze({
      ...state,
      timeline: Object.freeze({
        ...state.timeline,
        doubleTime: Object.freeze({
          ...state.timeline.doubleTime,
          bankSeconds: effect.seconds,
        }),
      }),
    })
  }
  if (effect.key === 'doubleTimeOwned') {
    return Object.freeze({
      ...state,
      timeline: Object.freeze({
        ...state.timeline,
        doubleTime: Object.freeze({
          ...state.timeline.doubleTime,
          unlocked: effect.value,
        }),
      }),
    })
  }
  if (effect.key === 'workerAutoConvert') {
    return Object.freeze({
      ...state,
      reality: Object.freeze({ ...state.reality, autoGather: effect.value }),
    })
  }
  return Object.freeze({
    ...state,
    dream: Object.freeze({
      ...state.dream,
      upgrades: Object.freeze({
        ...state.dream.upgrades,
        [effect.key]: effect.value,
      }),
    }),
  })
}

function upgradeOwned(
  state: Readonly<CanonicalGameStateV2>,
  id: RealityUpgradeIdV2,
): boolean {
  if (id === 'doubleTimeOwned') return state.timeline.doubleTime.unlocked
  if (id === 'workerAutoConvert') return state.reality.autoGather
  return state.dream.upgrades[id]
}

export function realityWorkerGenerationRateV2(
  influenceSpeedBonus: GameDecimal,
): GameDecimal {
  if (!isGameDecimal(influenceSpeedBonus)) {
    throw new TypeError('Reality Influence speed bonus must be a frozen GameDecimal.')
  }
  const cached = workerGenerationRatesByBonus.get(influenceSpeedBonus as object)
  if (cached !== undefined) return cached
  const bonus = influenceSpeedBonus
  let rate: GameDecimal
  if (compareGameDecimals(bonus, FLOAT32_MAXIMUM_DECIMAL) <= 0) {
    const bonusNumber = gameDecimalToNumberChecked(bonus, {
      minimum: 0,
      maximum: FLOAT32_MAXIMUM,
    })
    rate = gameDecimalFromNumber(Math.fround(Math.min(
      FLOAT32_MAXIMUM,
      canonicalRealityCatalogV2.baseWorkerGenerationPerSecond + bonusNumber,
    )))
  } else {
    rate = addGameDecimals(
      gameDecimalFromNumber(canonicalRealityCatalogV2.baseWorkerGenerationPerSecond),
      bonus,
    )
  }
  workerGenerationRatesByBonus.set(influenceSpeedBonus as object, rate)
  return rate
}

function stalledAfterReadyCap(
  seconds: number,
  space: bigint,
  initialProgress: number,
  rate: GameDecimal,
): number {
  if (space === 0n) return seconds
  const remaining = subtractGameDecimals(
    gameDecimalFromBigInt(space),
    gameDecimalFromNumber(initialProgress),
  )
  const materialSeconds = gameDecimalToSchedulerSeconds(
    divideGameDecimals(remaining, rate),
    seconds,
  ).seconds
  return Math.max(0, seconds - materialSeconds)
}

function equalCanonicalData(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    left === null || right === null ||
    typeof left !== 'object' || typeof right !== 'object' ||
    Array.isArray(left) !== Array.isArray(right)
  ) return false
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key, index) => key !== rightKeys[index])
  ) return false
  const leftDescriptors = Object.getOwnPropertyDescriptors(left)
  const rightDescriptors = Object.getOwnPropertyDescriptors(right)
  return leftKeys.every((key) => {
    const leftDescriptor = leftDescriptors[key as keyof typeof leftDescriptors]
    const rightDescriptor = rightDescriptors[key as keyof typeof rightDescriptors]
    return (
      leftDescriptor !== undefined &&
      rightDescriptor !== undefined &&
      'value' in leftDescriptor &&
      'value' in rightDescriptor &&
      equalCanonicalData(leftDescriptor.value, rightDescriptor.value)
    )
  })
}

function validateRealityBoundary(
  state: Readonly<CanonicalGameStateV2>,
): string | null {
  const validation = validateCanonicalGameStateV2(state)
  if (!validation.valid) return validation.errors[0] ?? 'Invalid V2 state.'
  if (
    state.reality.workersReady < 0n ||
    state.reality.workersReady > REALITY_WORKERS_READY_MAXIMUM_V2
  ) {
    return 'Reality workers ready must be from 0 through 128.'
  }
  return null
}

function realityCandidate(
  state: Readonly<CanonicalGameStateV2>,
  replacement: Readonly<Partial<CanonicalGameStateV2['reality']>>,
): Readonly<CanonicalGameStateV2> {
  const candidate = Object.freeze({
    ...state,
    reality: Object.freeze({ ...state.reality, ...replacement }),
  })
  const validation = validateRealityBoundary(candidate)
  if (validation !== null) throw new Error(`Reality V2 produced invalid state: ${validation}`)
  return candidate
}

function preparedRealityCandidate(
  state: Readonly<CanonicalGameStateV2>,
  replacement: Readonly<Pick<
    CanonicalGameStateV2['reality'],
    | 'universeDesignationCount'
    | 'workersReady'
    | 'workerGenerationProgress'
    | 'influence'
  >>,
): Readonly<CanonicalGameStateV2> {
  if (
    !Object.isFrozen(state) ||
    !isGameDecimal(replacement.universeDesignationCount) ||
    !isGameDecimal(replacement.influence) ||
    typeof replacement.workersReady !== 'bigint' ||
    replacement.workersReady < 0n ||
    replacement.workersReady > REALITY_WORKERS_READY_MAXIMUM_V2 ||
    typeof replacement.workerGenerationProgress !== 'number' ||
    !Number.isFinite(replacement.workerGenerationProgress) ||
    Object.is(replacement.workerGenerationProgress, -0) ||
    replacement.workerGenerationProgress < 0 ||
    replacement.workerGenerationProgress >= 1
  ) {
    throw new Error('Prepared Reality V2 produced invalid local state.')
  }
  return Object.freeze({
    ...state,
    reality: Object.freeze({ ...state.reality, ...replacement }),
  })
}

function emptyAdvance(
  state: Readonly<CanonicalGameStateV2>,
  code: Exclude<RealityWorkerAdvanceCodeV2, 'advanced'>,
): Readonly<RealityWorkerAdvanceResultV2> {
  return Object.freeze({
    accepted: code === 'unchanged',
    changed: false,
    code,
    state,
    generationPerSecond: cloneGameDecimal(GAME_DECIMAL_ZERO),
    workersGenerated: cloneGameDecimal(GAME_DECIMAL_ZERO),
    automaticInfluence: cloneGameDecimal(GAME_DECIMAL_ZERO),
    stalledSeconds: 0,
  })
}

function emptyGather(
  state: Readonly<CanonicalGameStateV2>,
  code: Exclude<RealityGatherCodeV2, 'gathered'>,
): Readonly<RealityGatherResultV2> {
  return Object.freeze({
    accepted: false,
    changed: false,
    code,
    state,
    influenceGathered: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
}

function rejectedUpgradeQuote(
  upgradeId: string,
  code: Exclude<RealityUpgradeQuoteCodeV2, 'ready'>,
  account?: Readonly<RealityStrangeMatterAccountV2>,
  cost: GameDecimal = GAME_DECIMAL_ZERO,
): Readonly<RealityUpgradeQuoteV2> {
  return Object.freeze({
    kind: 'reality-upgrade-quote-v2',
    accepted: false,
    code,
    upgradeId: typeof upgradeId === 'string' ? upgradeId : '',
    currencyPath: '$.dream.strangeMatter',
    accountId: account?.accountId ?? '',
    sourceRevision: account?.revision ?? 0,
    cost: cloneGameDecimal(cost),
    sourceBalance: account === undefined
      ? cloneGameDecimal(GAME_DECIMAL_ZERO)
      : cloneGameDecimal(account.balance),
    expectedBalance: account === undefined
      ? cloneGameDecimal(GAME_DECIMAL_ZERO)
      : cloneGameDecimal(account.balance),
  })
}

function rejectedUpgradeCommit(
  state: Readonly<CanonicalGameStateV2>,
  account: Readonly<RealityStrangeMatterAccountV2>,
  code: Exclude<RealityUpgradeCommitCodeV2, 'committed'>,
): Readonly<RealityUpgradeCommitResultV2> {
  const safeAccount = issuedAccounts.has(account as object)
    ? account
    : registerRealityStrangeMatterAccountV2ForOwner(
        'rejected',
        0,
        GAME_DECIMAL_ZERO,
      )
  return Object.freeze({
    accepted: false,
    changed: false,
    code,
    state,
    account: safeAccount,
    upgradeId: '',
    cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
}
