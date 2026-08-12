import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  compareGameDecimals,
  divideGameDecimals,
  floorGameDecimal,
  gameDecimalFromNumber,
  gameDecimalToSchedulerSeconds,
  isGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'

export interface V2EventHorizonCandidate {
  readonly id: string
  /** `null` means that the event is unreachable at the captured rate. */
  readonly horizon: GameDecimal | null
}

export interface V2EventSliceResolution {
  readonly seconds: number
  readonly reached: boolean
  readonly dueEventIds: readonly string[]
  readonly horizon: GameDecimal | null
}

export interface V2PeriodicClockAdvance {
  readonly elapsedSeconds: GameDecimal
  readonly intervalSeconds: GameDecimal
  readonly advancedSeconds: number
  readonly completedCycles: GameDecimal
  readonly remainderSeconds: GameDecimal
}

export const V2_MAXIMUM_EVENT_HORIZON_CANDIDATES = 64

/** Coincident boundaries retain the established whole-game V1 phase order. */
export const V2_EVENT_BOUNDARY_ORDER = Object.freeze([
  'production-arrival',
  'queued-input',
  'automation',
  'derived-timers-and-double-time',
  'dream-reset',
  'bot-cap-transition',
  'infinity-reset',
] as const)

/**
 * Derives `(required - current) / rate` without narrowing scalable values.
 * A zero result is due now; `null` is an unreachable event at a zero rate.
 */
export function deriveV2LinearEventHorizon(
  current: GameDecimal,
  required: GameDecimal,
  ratePerSecond: GameDecimal,
): GameDecimal | null {
  requireGameDecimal(current, 'current')
  requireGameDecimal(required, 'required')
  requireGameDecimal(ratePerSecond, 'ratePerSecond')
  if (compareGameDecimals(current, required) >= 0) return GAME_DECIMAL_ZERO
  if (compareGameDecimals(ratePerSecond, GAME_DECIMAL_ZERO) === 0) return null
  return divideGameDecimals(
    subtractGameDecimals(required, current),
    ratePerSecond,
  )
}

/**
 * Selects coincident earliest events with Decimal comparisons, then delegates
 * the only seconds conversion to the compare-before-convert scheduler adapter.
 */
export function resolveV2EventSlice(
  candidates: readonly Readonly<V2EventHorizonCandidate>[],
  sliceSeconds: number,
): Readonly<V2EventSliceResolution> {
  requirePositiveSlice(sliceSeconds)
  const capturedCandidates = captureHorizonCandidates(candidates)
  const ids = new Set<string>()
  let earliest: GameDecimal | null = null
  for (const candidate of capturedCandidates) {
    if (
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      ids.has(candidate.id)
    ) {
      throw new TypeError('V2 event horizon IDs must be non-empty and unique.')
    }
    ids.add(candidate.id)
    if (candidate.horizon === null) continue
    requireGameDecimal(candidate.horizon, `horizon '${candidate.id}'`)
    if (
      earliest === null ||
      compareGameDecimals(candidate.horizon, earliest) < 0
    ) {
      earliest = candidate.horizon
    }
  }
  if (earliest === null) {
    return Object.freeze({
      seconds: sliceSeconds,
      reached: false,
      dueEventIds: Object.freeze([]),
      horizon: null,
    })
  }
  const converted = gameDecimalToSchedulerSeconds(earliest, sliceSeconds)
  const dueEventIds = converted.reached
    ? Object.freeze(capturedCandidates
      .filter((candidate) => candidate.horizon !== null &&
        compareGameDecimals(candidate.horizon, earliest) === 0)
      .map((candidate) => candidate.id))
    : Object.freeze([])
  return Object.freeze({
    ...converted,
    dueEventIds,
    horizon: earliest,
  })
}

/**
 * A due-now event must change represented state before the caller asks for the
 * next horizon. This makes the zero-time loop failure explicit at the boundary.
 */
export function requireV2DueEventProgress(
  resolution: Readonly<V2EventSliceResolution>,
  representedStateChanged: boolean,
): void {
  if (
    resolution.reached &&
    resolution.seconds === 0 &&
    !representedStateChanged
  ) {
    throw new Error('V2_ZERO_TIME_EVENT_NO_PROGRESS')
  }
}

/**
 * Advances a fixed-period clock in bounded quotient/remainder work. The result
 * is Decimal-native so even a catch-up containing more than 1e308 cycles does
 * not materialize a loop counter or narrow through `number`. This is clock
 * math only: callers must not collapse N state-changing automation callbacks
 * into one callback unless that domain supplies its own analytic bulk effect.
 */
export function advanceV2PeriodicClock(
  elapsedSeconds: GameDecimal,
  intervalSeconds: GameDecimal,
  sliceSeconds: number,
): Readonly<V2PeriodicClockAdvance> {
  requireGameDecimal(elapsedSeconds, 'elapsedSeconds')
  requireGameDecimal(intervalSeconds, 'intervalSeconds')
  requirePositiveSlice(sliceSeconds)
  if (compareGameDecimals(intervalSeconds, GAME_DECIMAL_ZERO) <= 0) {
    throw new RangeError('V2 periodic interval must be positive.')
  }
  if (
    compareGameDecimals(elapsedSeconds, GAME_DECIMAL_ZERO) < 0 ||
    compareGameDecimals(elapsedSeconds, intervalSeconds) >= 0
  ) {
    throw new RangeError('V2 periodic elapsed time must be in [0, interval).')
  }

  const total = addGameDecimals(
    elapsedSeconds,
    gameDecimalFromNumber(sliceSeconds),
  )
  if (compareGameDecimals(total, elapsedSeconds) === 0) {
    throw new Error('V2_PERIODIC_CLOCK_NO_REPRESENTED_PROGRESS')
  }
  let completedCycles = floorGameDecimal(
    divideGameDecimals(total, intervalSeconds),
  )
  let representedCycles = multiplyGameDecimals(
    completedCycles,
    intervalSeconds,
  )

  // Break Infinity division can land one representable unit above an exact
  // quotient. Correct in bounded work; never walk once per completed cycle.
  if (
    compareGameDecimals(representedCycles, total) > 0 &&
    compareGameDecimals(completedCycles, GAME_DECIMAL_ZERO) > 0
  ) {
    completedCycles = subtractGameDecimals(completedCycles, GAME_DECIMAL_ONE)
    representedCycles = multiplyGameDecimals(completedCycles, intervalSeconds)
  }
  let remainderSeconds = subtractGameDecimals(total, representedCycles)
  if (compareGameDecimals(remainderSeconds, intervalSeconds) >= 0) {
    completedCycles = addGameDecimals(completedCycles, GAME_DECIMAL_ONE)
    remainderSeconds = subtractGameDecimals(remainderSeconds, intervalSeconds)
  }
  if (
    compareGameDecimals(remainderSeconds, GAME_DECIMAL_ZERO) < 0 ||
    compareGameDecimals(remainderSeconds, intervalSeconds) >= 0
  ) {
    throw new Error('V2 periodic quotient/remainder correction failed closed.')
  }

  return Object.freeze({
    elapsedSeconds,
    intervalSeconds,
    advancedSeconds: sliceSeconds,
    completedCycles,
    remainderSeconds,
  })
}

function captureHorizonCandidates(
  candidates: readonly Readonly<V2EventHorizonCandidate>[],
): readonly Readonly<V2EventHorizonCandidate>[] {
  if (!Array.isArray(candidates) || !Object.isFrozen(candidates)) {
    throw new TypeError('V2 event horizons must be a frozen candidate array.')
  }
  const arrayDescriptors = Object.getOwnPropertyDescriptors(candidates)
  const lengthDescriptor = Object.getOwnPropertyDescriptor(candidates, 'length')
  const lengthValue = lengthDescriptor === undefined ||
    !('value' in lengthDescriptor)
    ? undefined
    : lengthDescriptor.value
  if (
    !Number.isSafeInteger(lengthValue) ||
    (lengthValue as number) < 0 ||
    (lengthValue as number) > V2_MAXIMUM_EVENT_HORIZON_CANDIDATES
  ) {
    throw new RangeError('V2 event horizon candidate count is outside its bound.')
  }
  const length = lengthValue as number
  const allowedArrayKeys = new Set([
    'length',
    ...Array.from({ length }, (_, index) => index.toString()),
  ])
  if (
    Object.getOwnPropertySymbols(candidates).length !== 0 ||
    Object.keys(arrayDescriptors).some((key) => !allowedArrayKeys.has(key))
  ) {
    throw new TypeError('V2 event horizon array must be dense and data-only.')
  }

  const captured: V2EventHorizonCandidate[] = []
  for (let index = 0; index < length; index += 1) {
    const itemDescriptor = arrayDescriptors[index.toString()]
    if (
      itemDescriptor === undefined ||
      !('value' in itemDescriptor) ||
      itemDescriptor.enumerable !== true ||
      itemDescriptor.configurable !== false ||
      itemDescriptor.writable !== false
    ) {
      throw new TypeError('V2 event horizon array must be dense and data-only.')
    }
    const candidate = itemDescriptor.value as unknown
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      Array.isArray(candidate) ||
      Object.getPrototypeOf(candidate) !== Object.prototype ||
      !Object.isFrozen(candidate) ||
      Object.getOwnPropertySymbols(candidate).length !== 0
    ) {
      throw new TypeError('V2 event horizon candidate must be a frozen data-only object.')
    }
    const descriptors = Object.getOwnPropertyDescriptors(candidate)
    const keys = Object.keys(descriptors).sort()
    if (keys.length !== 2 || keys[0] !== 'horizon' || keys[1] !== 'id') {
      throw new TypeError('V2 event horizon candidate has an invalid closed shape.')
    }
    const idDescriptor = descriptors.id
    const horizonDescriptor = descriptors.horizon
    if (
      idDescriptor === undefined ||
      horizonDescriptor === undefined ||
      !('value' in idDescriptor) ||
      !('value' in horizonDescriptor) ||
      idDescriptor.enumerable !== true ||
      horizonDescriptor.enumerable !== true ||
      idDescriptor.configurable !== false ||
      horizonDescriptor.configurable !== false ||
      idDescriptor.writable !== false ||
      horizonDescriptor.writable !== false
    ) {
      throw new TypeError('V2 event horizon candidate must contain data properties.')
    }
    captured.push(Object.freeze({
      id: idDescriptor.value as string,
      horizon: horizonDescriptor.value as GameDecimal | null,
    }))
  }
  return Object.freeze(captured)
}

function requirePositiveSlice(sliceSeconds: number): void {
  if (
    !Number.isFinite(sliceSeconds) ||
    sliceSeconds <= 0 ||
    Object.is(sliceSeconds, -0)
  ) {
    throw new RangeError('V2 simulation slice must be finite and positive.')
  }
}

function requireGameDecimal(value: unknown, path: string): asserts value is GameDecimal {
  if (!isGameDecimal(value)) {
    throw new TypeError(`V2 ${path} must be a canonical GameDecimal.`)
  }
}
