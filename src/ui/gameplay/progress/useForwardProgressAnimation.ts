import {
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react'
import {
  DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS,
} from '../../runtime/activeTimeDriver'

export const FORWARD_PROGRESS_INTERVAL_MILLISECONDS =
  DEFAULT_ACTIVE_TIME_DELIVERY_INTERVAL_MILLISECONDS

const RESET_OFFSET_EPSILON = 0.000_001
const MAXIMUM_VISUAL_PROGRESS_ADVANCE = 1

export interface ForwardProgressAnimationOptions {
  readonly canonicalProgress: number
  readonly normalizedRatePerSecond?: number
  readonly inferRate?: 'increasing' | 'decreasing' | 'either'
  readonly active: boolean
  readonly wraps: boolean
  readonly reducedMotion: boolean
}

/**
 * Reconciles to each canonical publication, then asks the browser's animation
 * compositor to present the expected next interval. No gameplay or React state
 * is advanced between publications.
 */
export function useForwardProgressAnimation(
  elementRef: RefObject<HTMLElement | null>,
  options: Readonly<ForwardProgressAnimationOptions>,
): void {
  const animationRef = useRef<Animation | null>(null)
  const previousSampleRef = useRef<{
    readonly progress: number
    readonly sampledAt: number
  } | null>(null)
  const canonicalProgress = clampUnit(options.canonicalProgress)

  useLayoutEffect(() => {
    const sampledAt = performance.now()
    const previousSample = previousSampleRef.current
    previousSampleRef.current = {
      progress: canonicalProgress,
      sampledAt,
    }
    const element = elementRef.current
    animationRef.current?.cancel()
    animationRef.current = null
    if (!element) return undefined

    element.style.transform = progressTransform(canonicalProgress)
    if (
      !options.active ||
      options.reducedMotion ||
      typeof element.animate !== 'function'
    ) {
      return undefined
    }

    const inferredRate = inferProgressRate(
      previousSample,
      canonicalProgress,
      sampledAt,
      options.inferRate,
      options.wraps,
    )
    const keyframes = buildForwardProgressKeyframes(
      canonicalProgress,
      options.normalizedRatePerSecond ?? inferredRate,
      options.wraps,
    )
    if (keyframes.length < 2) return undefined

    let animation: Animation
    try {
      animation = element.animate(keyframes, {
        duration: FORWARD_PROGRESS_INTERVAL_MILLISECONDS,
        easing: 'linear',
        fill: 'forwards',
      })
    } catch {
      // The canonical transform was already applied above. A browser-specific
      // animation rejection must not take down the gameplay render tree.
      return undefined
    }
    animationRef.current = animation

    return () => {
      animation.cancel()
      if (animationRef.current === animation) {
        animationRef.current = null
      }
    }
  }, [
    canonicalProgress,
    elementRef,
    options.active,
    options.inferRate,
    options.normalizedRatePerSecond,
    options.reducedMotion,
    options.wraps,
  ])
}

export function buildForwardProgressKeyframes(
  canonicalProgress: number,
  normalizedRatePerSecond: number,
  wraps: boolean,
): Keyframe[] {
  const start = clampUnit(canonicalProgress)
  const rate = Number.isFinite(normalizedRatePerSecond)
    ? normalizedRatePerSecond
    : 0
  const advance =
    rate * (FORWARD_PROGRESS_INTERVAL_MILLISECONDS / 1_000)
  if (advance === 0) return []

  if (advance < 0) {
    return buildReverseProgressKeyframes(start, advance, wraps)
  }
  if (start >= 1) return []

  const rawEnd = start + advance
  if (rawEnd <= 1) {
    return [
      { offset: 0, transform: progressTransform(start) },
      { offset: 1, transform: progressTransform(rawEnd) },
    ]
  }
  if (!wraps) {
    const completionOffset = (1 - start) / advance
    return [
      { offset: 0, transform: progressTransform(start) },
      { offset: completionOffset, transform: progressTransform(1) },
      { offset: 1, transform: progressTransform(1) },
    ]
  }

  // More than one complete cycle per publication cannot be represented
  // meaningfully to a player. Keep the presentation work constant by showing
  // one representative wrap instead of allocating keyframes for every real
  // worker batch. Gameplay continues to use the uncapped canonical rate.
  const visualAdvance = Math.min(
    advance,
    MAXIMUM_VISUAL_PROGRESS_ADVANCE,
  )
  const visualRawEnd = start + visualAdvance

  const keyframes: Keyframe[] = [
    { offset: 0, transform: progressTransform(start) },
  ]
  for (
    let boundary = 1;
    boundary < visualRawEnd;
    boundary += 1
  ) {
    const boundaryOffset = (boundary - start) / visualAdvance
    keyframes.push({
      offset: boundaryOffset,
      transform: progressTransform(1),
    })
    keyframes.push({
      offset: Math.min(
        1,
        boundaryOffset + RESET_OFFSET_EPSILON,
      ),
      transform: progressTransform(0),
    })
  }
  const endFraction = visualRawEnd - Math.floor(visualRawEnd)
  keyframes.push({
    offset: 1,
    transform: progressTransform(
      endFraction === 0 ? 1 : endFraction,
    ),
  })
  return keyframes
}

function buildReverseProgressKeyframes(
  start: number,
  advance: number,
  wraps: boolean,
): Keyframe[] {
  if (start <= 0) return []
  const rawEnd = start + advance
  if (rawEnd >= 0) {
    return [
      { offset: 0, transform: progressTransform(start) },
      { offset: 1, transform: progressTransform(rawEnd) },
    ]
  }
  if (!wraps) {
    const completionOffset = start / -advance
    return [
      { offset: 0, transform: progressTransform(start) },
      { offset: completionOffset, transform: progressTransform(0) },
      { offset: 1, transform: progressTransform(0) },
    ]
  }

  const boundaryOffset = start / -advance
  const endFraction = rawEnd - Math.floor(rawEnd)
  return [
    { offset: 0, transform: progressTransform(start) },
    { offset: boundaryOffset, transform: progressTransform(0) },
    {
      offset: Math.min(1, boundaryOffset + RESET_OFFSET_EPSILON),
      transform: progressTransform(1),
    },
    { offset: 1, transform: progressTransform(endFraction) },
  ]
}

function inferProgressRate(
  previous: {
    readonly progress: number
    readonly sampledAt: number
  } | null,
  current: number,
  sampledAt: number,
  direction: ForwardProgressAnimationOptions['inferRate'],
  wraps: boolean,
): number {
  if (previous === null || direction === undefined) return 0
  const elapsedSeconds = (sampledAt - previous.sampledAt) / 1_000
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0

  let delta = current - previous.progress
  if (
    wraps &&
    direction === 'increasing' &&
    delta < 0 &&
    previous.progress > 0.5 &&
    current < 0.5
  ) {
    delta = 1 - previous.progress + current
  } else if (
    wraps &&
    direction === 'decreasing' &&
    delta > 0 &&
    previous.progress < 0.5 &&
    current > 0.5
  ) {
    delta = -(previous.progress + 1 - current)
  }

  if (direction === 'increasing' && delta <= 0) return 0
  if (direction === 'decreasing' && delta >= 0) return 0
  return delta / elapsedSeconds
}

function progressTransform(progress: number): string {
  return `scaleX(${clampUnit(progress)})`
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
