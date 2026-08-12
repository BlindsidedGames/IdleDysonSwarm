import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_TEN,
  GAME_DECIMAL_ZERO,
  ceilGameDecimal,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  gameDecimalFromBigInt,
  gameDecimalFromCanonicalString,
  isGameDecimal,
  isIntegerGameDecimal,
  isZeroGameDecimal,
  multiplyGameDecimals,
  powGameDecimal,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  geometricSeriesCostV2,
  maximumAffordableGeometricBatchesV2,
} from './transactionsV2'

export const INFINITY_TUNING_V2 = Object.freeze({
  ordinaryBotThreshold: gameDecimalFromCanonicalString('4.2e19'),
  rewardCostRatio: 3.9,
  maximumDivisions: 19n,
  minimumCycleSeconds: 1 / 60,
} as const)

export interface InfinityRewardAuthorityV2 {
  readonly permanentDoubleIp: boolean
}

export interface InfinityBoundaryEvaluationV2 {
  readonly mode: 'ordinary' | 'break'
  readonly ready: boolean
  readonly reward: GameDecimal
  readonly requiredBots: GameDecimal
  readonly sourceRevision: number
}

const issuedRewardAuthorities = new WeakSet<object>()
const boundaryDescriptors = new WeakMap<InfinityBoundaryEvaluationV2, Readonly<{
  snapshot: Readonly<CanonicalGameStateV2>
  authority: Readonly<InfinityRewardAuthorityV2>
  runtime: Readonly<CanonicalRuntimeSidecarV2> | null
  prepared: boolean
}>>()
const claimedBoundaryEvaluations = new WeakSet<object>()
const preparedBoundaryAuthorities = new WeakSet<object>()

export interface PreparedInfinityBoundaryAuthorityV2 {
  readonly policy: 'stored-time-transient-infinity-boundary-v1'
}

export function registerPreparedInfinityBoundaryAuthorityV2ForStoredTime():
Readonly<PreparedInfinityBoundaryAuthorityV2> {
  const authority = Object.freeze({
    policy: 'stored-time-transient-infinity-boundary-v1' as const,
  })
  preparedBoundaryAuthorities.add(authority)
  return authority
}

/** @internal Imported only by the application-local entitlement owner. */
export function registerInfinityRewardAuthorityV2ForApplication(
  permanentDoubleIp: boolean,
): Readonly<InfinityRewardAuthorityV2> {
  if (typeof permanentDoubleIp !== 'boolean') {
    throw new TypeError('Permanent Double-IP entitlement must be boolean.')
  }
  const authority = Object.freeze({ permanentDoubleIp })
  issuedRewardAuthorities.add(authority)
  return authority
}

/** @internal Verifies and preserves a locally issued entitlement at a simulation boundary. */
export function captureInfinityRewardAuthorityV2ForSimulation(
  authority: unknown,
): Readonly<InfinityRewardAuthorityV2> {
  requireIssuedRewardAuthority(authority as Readonly<InfinityRewardAuthorityV2>)
  return authority as Readonly<InfinityRewardAuthorityV2>
}

/** @internal Reissues the main-thread-pinned entitlement inside the same-release worker. */
export function registerInfinityRewardAuthorityV2ForWorker(
  permanentDoubleIp: boolean,
): Readonly<InfinityRewardAuthorityV2> {
  return registerInfinityRewardAuthorityV2ForApplication(permanentDoubleIp)
}

export function ordinaryInfinityBotThresholdV2(
  divisionsPurchased: bigint,
): GameDecimal {
  requireDivisions(divisionsPurchased)
  if (divisionsPurchased === 0n) {
    return cloneGameDecimal(INFINITY_TUNING_V2.ordinaryBotThreshold)
  }
  return divideGameDecimals(
    INFINITY_TUNING_V2.ordinaryBotThreshold,
    powGameDecimal(GAME_DECIMAL_TEN, Number(divisionsPurchased)),
  )
}

function infinityRewardMultiplierV2(
  authority: Readonly<InfinityRewardAuthorityV2>,
  quantumDoubleIp: boolean,
): GameDecimal {
  requireIssuedRewardAuthority(authority)
  if (typeof quantumDoubleIp !== 'boolean') {
    throw new TypeError('Quantum Double-IP authority must be boolean.')
  }
  let multiplier = 1n
  if (authority.permanentDoubleIp) multiplier *= 2n
  if (quantumDoubleIp) multiplier *= 2n
  return gameDecimalFromBigInt(multiplier)
}

function infinityRewardForBotsV2(
  bots: GameDecimal,
  divisionsPurchased: bigint,
  authority: Readonly<InfinityRewardAuthorityV2>,
  quantumDoubleIp: boolean,
): GameDecimal {
  requireGameDecimal(bots, 'Infinity bots')
  const affordable = maximumAffordableGeometricBatchesV2({
    available: bots,
    firstBatchCost: ordinaryInfinityBotThresholdV2(divisionsPurchased),
    ratio: INFINITY_TUNING_V2.rewardCostRatio,
    integerCost: false,
  })
  if (!affordable.accepted) {
    throw new RangeError(`Infinity reward affordability failed: ${affordable.rejection}.`)
  }
  return multiplyGameDecimals(
    affordable.batches,
    infinityRewardMultiplierV2(authority, quantumDoubleIp),
  )
}

function botsRequiredForInfinityRewardV2(
  targetReward: GameDecimal,
  divisionsPurchased: bigint,
  authority: Readonly<InfinityRewardAuthorityV2>,
  quantumDoubleIp: boolean,
): GameDecimal {
  requirePositiveIntegerDecimal(targetReward, 'Infinity reward target')
  const baseReward = ceilGameDecimal(divideGameDecimals(
    targetReward,
    infinityRewardMultiplierV2(authority, quantumDoubleIp),
  ))
  const firstCost = ordinaryInfinityBotThresholdV2(divisionsPurchased)
  if (compareGameDecimals(baseReward, GAME_DECIMAL_ONE) === 0) {
    return cloneGameDecimal(firstCost)
  }
  // The cost helper is authoritative and O(log target); target is never materialized as bigint.
  return geometricSeriesCostV2(
    firstCost,
    INFINITY_TUNING_V2.rewardCostRatio,
    baseReward,
  )
}

export function quoteInfinityBoundaryV2(
  state: Readonly<CanonicalGameStateV2>,
  sourceRevision: number,
  authority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<InfinityBoundaryEvaluationV2> {
  requireRevision(sourceRevision)
  requireIssuedRewardAuthority(authority)
  const snapshot = cloneCanonicalGameStateV2(state)
  const validation = validateCanonicalGameStateV2(snapshot)
  if (!validation.valid) {
    throw new TypeError(`Infinity boundary state is invalid: ${validation.errors.join('; ')}`)
  }
  const mode = snapshot.quantum.unlocks.breakTheLoop ? 'break' : 'ordinary'
  const requiredBots = mode === 'ordinary'
    ? ordinaryInfinityBotThresholdV2(snapshot.quantum.divisionsPurchased)
    : botsRequiredForInfinityRewardV2(
      snapshot.infinity.breakTarget,
      snapshot.quantum.divisionsPurchased,
      authority,
      snapshot.quantum.unlocks.doubleInfinityPoints,
    )
  const breakReward = infinityRewardForBotsV2(
    snapshot.dyson.bots,
    snapshot.quantum.divisionsPurchased,
    authority,
    snapshot.quantum.unlocks.doubleInfinityPoints,
  )
  const reward = mode === 'ordinary'
    ? infinityRewardMultiplierV2(
      authority,
      snapshot.quantum.unlocks.doubleInfinityPoints,
    )
    : breakReward
  const thresholdReady = mode === 'ordinary'
    ? compareGameDecimals(snapshot.dyson.bots, requiredBots) >= 0
    : compareGameDecimals(breakReward, snapshot.infinity.breakTarget) >= 0
  const ready = snapshot.infinity.botCapRewardsGranted || (
    snapshot.timeline.infinityCycleSeconds >= INFINITY_TUNING_V2.minimumCycleSeconds &&
    thresholdReady
  )
  const evaluation = Object.freeze({
    mode,
    ready,
    reward: cloneGameDecimal(reward),
    requiredBots: cloneGameDecimal(requiredBots),
    sourceRevision,
  })
  boundaryDescriptors.set(evaluation, Object.freeze({
    snapshot, authority, runtime: null, prepared: false,
  }))
  return evaluation
}

export function quotePreparedInfinityResetBoundaryV2(
  preparedAuthority: Readonly<PreparedInfinityBoundaryAuthorityV2>,
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  sourceRevision: number,
  authority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (!preparedBoundaryAuthorities.has(preparedAuthority as object)) {
    throw new TypeError('Prepared Infinity boundary authority is not authentic.')
  }
  requireRevision(sourceRevision)
  requireIssuedRewardAuthority(authority)
  const mode = state.quantum.unlocks.breakTheLoop ? 'break' : 'ordinary'
  const requiredBots = mode === 'ordinary'
    ? ordinaryInfinityBotThresholdV2(state.quantum.divisionsPurchased)
    : botsRequiredForInfinityRewardV2(
      state.infinity.breakTarget,
      state.quantum.divisionsPurchased,
      authority,
      state.quantum.unlocks.doubleInfinityPoints,
    )
  const breakReward = infinityRewardForBotsV2(
    state.dyson.bots,
    state.quantum.divisionsPurchased,
    authority,
    state.quantum.unlocks.doubleInfinityPoints,
  )
  const reward = mode === 'ordinary'
    ? infinityRewardMultiplierV2(
      authority, state.quantum.unlocks.doubleInfinityPoints,
    )
    : breakReward
  const thresholdReady = mode === 'ordinary'
    ? compareGameDecimals(state.dyson.bots, requiredBots) >= 0
    : compareGameDecimals(breakReward, state.infinity.breakTarget) >= 0
  const evaluation = Object.freeze({
    mode,
    ready: state.infinity.botCapRewardsGranted || (
      state.timeline.infinityCycleSeconds >= INFINITY_TUNING_V2.minimumCycleSeconds &&
      thresholdReady
    ),
    reward,
    requiredBots,
    sourceRevision,
  })
  boundaryDescriptors.set(evaluation, Object.freeze({
    snapshot: state,
    authority,
    runtime,
    prepared: true,
  }))
  return evaluation
}

export function preparePreparedInfinityBoundaryEvaluationV2ForReset(
  preparedAuthority: Readonly<PreparedInfinityBoundaryAuthorityV2>,
  evaluation: unknown,
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  revision: number,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (!preparedBoundaryAuthorities.has(preparedAuthority as object)) {
    throw new TypeError('Prepared Infinity boundary authority is not authentic.')
  }
  const descriptor = typeof evaluation === 'object' && evaluation !== null
    ? boundaryDescriptors.get(evaluation as InfinityBoundaryEvaluationV2)
    : undefined
  if (
    descriptor === undefined || !descriptor.prepared ||
    descriptor.snapshot !== state || descriptor.runtime !== runtime ||
    claimedBoundaryEvaluations.has(evaluation as object)
  ) throw new TypeError('Prepared Infinity boundary evaluation is stale or unauthentic.')
  requireRevision(revision)
  if ((evaluation as InfinityBoundaryEvaluationV2).sourceRevision !== revision) {
    throw new RangeError('Prepared Infinity boundary revision is stale.')
  }
  if (!(evaluation as InfinityBoundaryEvaluationV2).ready) {
    throw new RangeError('Infinity boundary is not ready to reset.')
  }
  return evaluation as Readonly<InfinityBoundaryEvaluationV2>
}

export function quoteNextPreparedInfinityBoundaryV2ForReset(
  preparedAuthority: Readonly<PreparedInfinityBoundaryAuthorityV2>,
  evaluation: unknown,
  resetState: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  nextRevision: number,
): Readonly<InfinityBoundaryEvaluationV2> {
  const descriptor = typeof evaluation === 'object' && evaluation !== null
    ? boundaryDescriptors.get(evaluation as InfinityBoundaryEvaluationV2)
    : undefined
  if (descriptor === undefined || !descriptor.prepared) {
    throw new TypeError('Prepared Infinity boundary evaluation is not authentic.')
  }
  return quotePreparedInfinityResetBoundaryV2(
    preparedAuthority, resetState, runtime, nextRevision, descriptor.authority,
  )
}

export function quoteInfinityResetBoundaryV2(
  state: Readonly<CanonicalGameStateV2>,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  sourceRevision: number,
  authority: Readonly<InfinityRewardAuthorityV2>,
): Readonly<InfinityBoundaryEvaluationV2> {
  const safeRuntime = cloneCanonicalRuntimeSidecarV2(runtime)
  const evaluation = quoteInfinityBoundaryV2(state, sourceRevision, authority)
  const descriptor = boundaryDescriptors.get(evaluation)!
  boundaryDescriptors.set(evaluation, Object.freeze({
    ...descriptor,
    runtime: safeRuntime,
  }))
  return evaluation
}

export function rederiveInfinityBoundaryV2(
  evaluation: unknown,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (typeof evaluation !== 'object' || evaluation === null) {
    throw new TypeError('Infinity boundary evaluation was not issued.')
  }
  const descriptor = boundaryDescriptors.get(evaluation as InfinityBoundaryEvaluationV2)
  if (descriptor === undefined) {
    throw new TypeError('Infinity boundary evaluation was not issued.')
  }
  return descriptor.runtime === null
    ? quoteInfinityBoundaryV2(
        descriptor.snapshot,
        (evaluation as InfinityBoundaryEvaluationV2).sourceRevision,
        descriptor.authority,
      )
    : quoteInfinityResetBoundaryV2(
        descriptor.snapshot,
        descriptor.runtime,
        (evaluation as InfinityBoundaryEvaluationV2).sourceRevision,
        descriptor.authority,
      )
}

/** @internal One-use reset owner admission for an issued boundary evaluation. */
export function prepareInfinityBoundaryEvaluationV2ForReset(
  evaluation: unknown,
  currentState: Readonly<CanonicalGameStateV2>,
  currentRuntime: Readonly<CanonicalRuntimeSidecarV2>,
  currentRevision: number,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (typeof evaluation !== 'object' || evaluation === null) {
    throw new TypeError('Infinity boundary evaluation was not issued.')
  }
  const issued = evaluation as InfinityBoundaryEvaluationV2
  const descriptor = boundaryDescriptors.get(issued)
  if (
    descriptor === undefined ||
    descriptor.runtime === null ||
    claimedBoundaryEvaluations.has(issued)
  ) {
    throw new TypeError('Infinity boundary evaluation was not issued or was already consumed.')
  }
  requireRevision(currentRevision)
  if (issued.sourceRevision !== currentRevision) {
    throw new RangeError('Infinity boundary evaluation revision is stale.')
  }
  const current = cloneCanonicalGameStateV2(currentState)
  if (!equalCanonicalValue(descriptor.snapshot, current)) {
    throw new TypeError('Infinity boundary evaluation state does not match the current state.')
  }
  const runtime = cloneCanonicalRuntimeSidecarV2(currentRuntime)
  if (!equalCanonicalValue(descriptor.runtime, runtime)) {
    throw new TypeError('Infinity boundary evaluation runtime does not match the current runtime.')
  }
  const authoritative = quoteInfinityResetBoundaryV2(
    current,
    runtime,
    currentRevision,
    descriptor.authority,
  )
  if (!authoritative.ready) {
    throw new RangeError('Infinity boundary is not ready to reset.')
  }
  return authoritative
}

/** @internal Finalizes a prepared evaluation only after reset candidate construction. */
export function consumeInfinityBoundaryEvaluationV2ForReset(evaluation: unknown): void {
  if (typeof evaluation !== 'object' || evaluation === null) {
    throw new TypeError('Infinity boundary evaluation was not issued.')
  }
  if (
    !boundaryDescriptors.has(evaluation as InfinityBoundaryEvaluationV2) ||
    claimedBoundaryEvaluations.has(evaluation)
  ) {
    throw new TypeError('Infinity boundary evaluation was not issued or was already consumed.')
  }
  claimedBoundaryEvaluations.add(evaluation)
}

/** @internal Reuses the captured local entitlement only for post-reset scheduling. */
export function quoteNextInfinityBoundaryV2ForReset(
  evaluation: unknown,
  resetState: Readonly<CanonicalGameStateV2>,
  nextRevision: number,
): Readonly<InfinityBoundaryEvaluationV2> {
  if (typeof evaluation !== 'object' || evaluation === null) {
    throw new TypeError('Infinity boundary evaluation was not issued.')
  }
  const descriptor = boundaryDescriptors.get(evaluation as InfinityBoundaryEvaluationV2)
  if (descriptor === undefined || claimedBoundaryEvaluations.has(evaluation)) {
    throw new TypeError('Infinity boundary evaluation was not issued or was already consumed.')
  }
  return quoteInfinityBoundaryV2(resetState, nextRevision, descriptor.authority)
}

export function infinityProductionHorizonV2(
  bots: GameDecimal,
  botRate: GameDecimal,
  requiredBots: GameDecimal,
): GameDecimal | null {
  requireGameDecimal(bots, 'Infinity bots')
  requireGameDecimal(botRate, 'Infinity bot rate')
  requireGameDecimal(requiredBots, 'Infinity required bots')
  if (compareGameDecimals(bots, requiredBots) >= 0) {
    return cloneGameDecimal(GAME_DECIMAL_ZERO)
  }
  if (isZeroGameDecimal(botRate)) return null
  return divideGameDecimals(
    subtractGameDecimals(requiredBots, bots),
    botRate,
  )
}

function requireDivisions(value: bigint): void {
  if (
    typeof value !== 'bigint' ||
    value < 0n ||
    value > INFINITY_TUNING_V2.maximumDivisions
  ) {
    throw new RangeError('Infinity Divisions must be within 0..19.')
  }
}

function requireIssuedRewardAuthority(
  authority: Readonly<InfinityRewardAuthorityV2>,
): void {
  if (
    typeof authority !== 'object' ||
    authority === null ||
    !issuedRewardAuthorities.has(authority)
  ) {
    throw new TypeError('Infinity reward authority was not issued locally.')
  }
}

function requireRevision(value: number): void {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new RangeError('Infinity boundary revision is invalid.')
  }
}

function requireGameDecimal(value: unknown, label: string): asserts value is GameDecimal {
  if (!isGameDecimal(value)) throw new TypeError(`${label} must be a GameDecimal.`)
}

function equalCanonicalValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    typeof left !== 'object' || left === null ||
    typeof right !== 'object' || right === null ||
    Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)
  ) return false
  const leftDescriptors = Object.getOwnPropertyDescriptors(left)
  const rightDescriptors = Object.getOwnPropertyDescriptors(right)
  const leftKeys = Reflect.ownKeys(leftDescriptors)
  const rightKeys = Reflect.ownKeys(rightDescriptors)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) return false
    const leftDescriptor = leftDescriptors[key as keyof typeof leftDescriptors]
    const rightDescriptor = rightDescriptors[key as keyof typeof rightDescriptors]
    return leftDescriptor !== undefined && rightDescriptor !== undefined &&
      'value' in leftDescriptor && 'value' in rightDescriptor &&
      equalCanonicalValue(leftDescriptor.value, rightDescriptor.value)
  })
}

function requireIntegerDecimal(
  value: unknown,
  label: string,
): asserts value is GameDecimal {
  requireGameDecimal(value, label)
  if (!isIntegerGameDecimal(value)) {
    throw new RangeError(`${label} must be integer-valued.`)
  }
}

function requirePositiveIntegerDecimal(
  value: unknown,
  label: string,
): asserts value is GameDecimal {
  requireIntegerDecimal(value, label)
  if (compareGameDecimals(value, GAME_DECIMAL_ZERO) <= 0) {
    throw new RangeError(`${label} must be positive.`)
  }
}
