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

export interface ForwardProgressAnimationOptions {
  readonly canonicalProgress: number
  readonly normalizedRatePerSecond: number
  readonly active: boolean
  readonly wraps: boolean
  readonly reducedMotion: boolean
}

/**
 * Reconciles to each canonical 10 Hz publication, then asks the browser's
 * animation compositor to present the expected next interval. No gameplay or
 * React state is advanced between publications.
 */
export function useForwardProgressAnimation(
  elementRef: RefObject<HTMLElement | null>,
  options: Readonly<ForwardProgressAnimationOptions>,
): void {
  const animationRef = useRef<Animation | null>(null)
  const canonicalProgress = clampUnit(options.canonicalProgress)

  useLayoutEffect(() => {
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

    const keyframes = buildForwardProgressKeyframes(
      canonicalProgress,
      options.normalizedRatePerSecond,
      options.wraps,
    )
    if (keyframes.length < 2) return undefined

    const animation = element.animate(keyframes, {
      duration: FORWARD_PROGRESS_INTERVAL_MILLISECONDS,
      easing: 'linear',
      fill: 'forwards',
    })
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
    ? Math.max(0, normalizedRatePerSecond)
    : 0
  const advance =
    rate * (FORWARD_PROGRESS_INTERVAL_MILLISECONDS / 1_000)
  if (advance <= 0 || start >= 1) return []

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

  const keyframes: Keyframe[] = [
    { offset: 0, transform: progressTransform(start) },
  ]
  for (
    let boundary = 1;
    boundary < rawEnd;
    boundary += 1
  ) {
    const boundaryOffset = (boundary - start) / advance
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
  const endFraction = rawEnd - Math.floor(rawEnd)
  keyframes.push({
    offset: 1,
    transform: progressTransform(
      endFraction === 0 ? 1 : endFraction,
    ),
  })
  return keyframes
}

function progressTransform(progress: number): string {
  return `scaleX(${clampUnit(progress)})`
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
