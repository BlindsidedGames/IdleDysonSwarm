import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { Progress } from '../../components'
import { usePrefersReducedMotion } from '../../accessibility/useMediaQuery'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { clampProgress } from '../progress/clampProgress'
import { FORWARD_PROGRESS_INTERVAL_MILLISECONDS } from '../progress/useForwardProgressAnimation'
import { simulationsMessages } from './messages'

// Product comfort policy, not a WCAG flash/compliance measurement. Resume 10%
// below entry so small worker/rate changes cannot chatter between presentations.
const SOLID_CYCLES_PER_SECOND = 2
const REDUCED_MOTION_SOLID_CYCLES_PER_SECOND = 1

interface Props {
  readonly label: string
  readonly value: number
  readonly maximum: number
  readonly valueText: string
  readonly timerText: string
  readonly sampleSeconds: number
  readonly cycleKey: string
  readonly gameSpeed: number
  readonly active: boolean
  readonly cycleRate: number
  readonly locale: EnabledLocale
}

interface PresentationSample {
  readonly start: number
  readonly target: number
  readonly startedAt: number
  readonly duration: number
  readonly sampleSeconds: number
  readonly cycleKey: string
  readonly maximum: number
  readonly active: boolean
  readonly solid: boolean
}

/** The old Simulations composition: canonical semantics, compositor-only fill.
 * Interpolate observed work rather than predicting it: Farming publishes whole
 * game-second steps and can reallocate labor when a resource job stops/starts.
 */
export function CivilizationCycleProgress({
  label, value, maximum, valueText, timerText, sampleSeconds, cycleKey,
  gameSpeed, active, cycleRate, locale,
}: Props) {
  const intl = useIntl()
  const reducedMotion = usePrefersReducedMotion()
  const fillRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<HTMLSpanElement>(null)
  const timerTextRef = useRef<HTMLSpanElement>(null)
  const timerWidthRef = useRef(0)
  const previousRef = useRef<PresentationSample | null>(null)
  const animationRef = useRef<Animation | null>(null)
  const validMaximum = Number.isFinite(maximum) && maximum > 0
  const validValue = Number.isFinite(value) && value >= 0 && value <= maximum
  const actualValue = validMaximum && validValue ? value : 0
  const actualMaximum = validMaximum ? maximum : 1
  const fraction = clampProgress(actualValue / actualMaximum)
  const running = active && validMaximum && validValue &&
    Number.isFinite(sampleSeconds) && sampleSeconds >= 0 &&
    Number.isFinite(cycleRate) && cycleRate > 0 && Number.isFinite(gameSpeed) && gameSpeed > 0
  const entryRate = reducedMotion ? REDUCED_MOTION_SOLID_CYCLES_PER_SECOND : SOLID_CYCLES_PER_SECOND
  const [wasSolid, setWasSolid] = useState(false)
  const solid = running && Number.isFinite(cycleRate) && cycleRate > 0 &&
    (cycleRate >= entryRate || wasSolid && cycleRate >= entryRate * .9)
  useLayoutEffect(() => { setWasSolid(solid) }, [solid])
  const rateText = intl.formatMessage(simulationsMessages.productionRate, { value: formatGameNumber(locale, cycleRate) })
  const visibleTimer = solid ? rateText : timerText

  useLayoutEffect(() => () => {
    animationRef.current?.cancel()
    animationRef.current = null
    previousRef.current = null
  }, [])
  useLayoutEffect(() => {
    const element = fillRef.current
    if (!element) return undefined
    const now = performance.now(), previous = previousRef.current
    const sameCycle = previous !== null && previous.cycleKey === cycleKey &&
      previous.maximum === maximum && fraction >= previous.target &&
      sampleSeconds >= previous.sampleSeconds
    // Clock-only publications must not keep extending the catch-up animation.
    // Its endpoint is real work and it finishes within one second even when
    // publications continue without any additional work.
    if (sameCycle && fraction === previous.target && previous.active === running && previous.solid === solid) {
      previousRef.current = { ...previous, sampleSeconds }
      return undefined
    }
    const from = previous === null ? fraction : previous.duration <= 0 ? previous.target :
      previous.start + (previous.target - previous.start) *
        Math.min(1, Math.max(0, (now - previous.startedAt) / previous.duration))
    const duration = sameCycle && running ? Math.min(1_000, Math.max(
      FORWARD_PROGRESS_INTERVAL_MILLISECONDS,
      (sampleSeconds - previous.sampleSeconds) * 1_000 / gameSpeed,
    )) : 0
    const animate = sameCycle && previous.active && !previous.solid && running && !solid &&
      typeof element.animate === 'function' && from < fraction
    animationRef.current?.cancel()
    animationRef.current = null
    previousRef.current = {
      start: animate ? from : fraction, target: fraction, startedAt: now,
      duration: animate ? duration : 0, sampleSeconds, cycleKey, maximum, active: running, solid,
    }
    element.style.transform = `scaleX(${solid ? 1 : fraction})`
    if (!animate) return undefined
    try {
      animationRef.current = element.animate([
        { transform: `scaleX(${from})` },
        { transform: `scaleX(${fraction})` },
      ], { duration, easing: 'linear', fill: 'forwards' })
      return undefined
    } catch {
      // A WebView without usable animation still shows the real published work.
      previousRef.current = { ...previousRef.current, start: fraction, duration: 0 }
      return undefined
    }
  }, [fraction, maximum, sampleSeconds, cycleKey, gameSpeed, running, solid])

  const measureTimer = useCallback(() => {
    const text = timerTextRef.current, timer = timerRef.current
    if (!text || !timer) return
    const fontSize = Number.parseFloat(getComputedStyle(text).fontSize)
    if (!(fontSize > 0)) return
    // Keep the widest observed countdown in font-relative units. Losing the
    // decimal or switching to infinity must not stretch the neighboring track.
    timerWidthRef.current = Math.max(timerWidthRef.current, text.getBoundingClientRect().width / fontSize)
    timer.style.setProperty('--civilization-timer-width', `${timerWidthRef.current}em`)
  }, [])
  useLayoutEffect(() => {
    measureTimer()
    if (typeof ResizeObserver !== 'function' || !timerTextRef.current) return undefined
    const observer = new ResizeObserver(measureTimer)
    observer.observe(timerTextRef.current)
    return () => observer.disconnect()
  }, [measureTimer])
  useLayoutEffect(() => {
    if (typeof ResizeObserver !== 'function') measureTimer()
  }, [visibleTimer, measureTimer])

  return <div className="civilization-cycle" data-presentation={solid ? 'solid' : 'cycle'}>
    <div className="civilization-cycle-progress civilization-cycle-progress--animated">
      <Progress label={label} value={actualValue} maximum={actualMaximum} valueText={valueText} />
      <div className="civilization-cycle-track" aria-hidden="true">
        <span ref={fillRef} className="civilization-cycle-fill" style={{ transform: `scaleX(${solid ? 1 : fraction})` }} />
      </div>
    </div>
    <span ref={timerRef} className="civilization-job-timer" aria-label={valueText} title={valueText}>
      <span ref={timerTextRef}>{visibleTimer}</span>
    </span>
  </div>
}
