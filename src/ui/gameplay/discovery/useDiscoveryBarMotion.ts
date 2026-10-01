import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DiscoveryTierState } from '../../../game-state/types'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'

type Position = Pick<DiscoveryTierState, 'completions' | 'progress'>
const CATCH_UP_MS = 2000

/** Presentation only: rewards and saves always use the authoritative tier. */
export function useDiscoveryBarMotion(tier: Position, maximum: number, incomingCompletions: bigint): Position {
  const reducedMotion = usePrefersReducedMotion()
  const [visible, setVisible] = useState<Position>(tier)
  const current = useRef<Position>(tier)
  const previous = useRef({ tier, incomingCompletions })
  const target = useRef<Position>(tier)
  const animation = useRef<{ from: Position; start: number; end: number; distance: number } | null>(null)
  const frame = useRef(0)

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = { tier, incomingCompletions }
    target.current = tier
    const reset = tier.completions < before.tier.completions ||
      (tier.completions === before.tier.completions && tier.progress < before.tier.progress) ||
      incomingCompletions < before.incomingCompletions
    const settle = () => {
      cancelAnimationFrame(frame.current)
      animation.current = null
      current.current = tier
      setVisible(tier)
    }
    if (reducedMotion || document.hidden || reset) {
      settle()
      return
    }
    const now = performance.now()
    if (animation.current && now >= animation.current.end) {
      animation.current = null
      current.current = before.tier
    }
    if (incomingCompletions > before.incomingCompletions) {
      // Retarget from the visible position without extending an existing deadline.
      const from = current.current
      const wraps = Math.min(Number(tier.completions - from.completions), 3)
      animation.current = { from, start: now, end: animation.current?.end ?? now + CATCH_UP_MS,
        distance: Math.max(0, wraps * maximum + tier.progress - from.progress) }
    } else if (animation.current) {
      // Ordinary target wraps must extend the same path, not reset it backwards.
      animation.current.distance += Number(tier.completions - before.tier.completions) * maximum + tier.progress - before.tier.progress
    }
    if (!animation.current) {
      settle()
      return
    }
    cancelAnimationFrame(frame.current)
    const tick = (now: number) => {
      const motion = animation.current
      if (!motion) return
      const destination = target.current
      const fraction = now >= motion.end ? 1 : Math.max(0, (now - motion.start) / (motion.end - motion.start))
      if (fraction >= 1) {
        animation.current = null
        current.current = destination
        setVisible(destination)
        return
      }
      const eased = 1 - (1 - fraction) ** 2
      const completed = destination.completions - motion.from.completions
      // Large awards get at most three visible wraps, not thousands of flashes.
      const travelled = motion.from.progress + motion.distance * eased
      const visualWraps = BigInt(Math.floor(travelled / maximum))
      const awarded = completed <= 3n ? visualWraps : completed * BigInt(Math.floor(eased * 1_000_000)) / 1_000_000n
      current.current = { completions: motion.from.completions + awarded, progress: travelled % maximum }
      setVisible(current.current)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [tier, incomingCompletions, maximum, reducedMotion])

  useEffect(() => {
    const settleHidden = () => {
      if (!document.hidden) return
      cancelAnimationFrame(frame.current)
      animation.current = null
      current.current = target.current
      setVisible(target.current)
    }
    document.addEventListener('visibilitychange', settleHidden)
    return () => {
      cancelAnimationFrame(frame.current)
      document.removeEventListener('visibilitychange', settleHidden)
    }
  }, [])
  return visible
}
