import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import './components.css'

const DEFAULT_MINIMUM_SCALE = 0.72
const WIDTH_SAFETY_MARGIN_PX = 2
const SCALE_PRECISION = 1000
const GROWTH_SETTLE_DELAY_MS = 2_000

export interface StableSingleLineTextProps {
  readonly children: ReactNode
  /** A stable, widest-case rendering used instead of measuring live values. */
  readonly measurement: ReactNode
  readonly className?: string
  readonly minimumScale?: number
}

/**
 * Fits a bounded status sentence onto one line without reacting to every live
 * value update. Reductions apply immediately, while increases wait until the
 * measured layout has been quiet long enough to avoid pulsing during resize.
 */
export function StableSingleLineText({
  children,
  measurement,
  className,
  minimumScale = DEFAULT_MINIMUM_SCALE,
}: StableSingleLineTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const measurementRef = useRef<HTMLSpanElement>(null)
  const retainedScaleRef = useRef(1)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const sizingText = measurementRef.current
    if (container === null || sizingText === null) return undefined

    let growthTimer: ReturnType<typeof setTimeout> | undefined

    const fittedScale = () => {
      const availableWidth = Math.max(
        0,
        container.clientWidth - WIDTH_SAFETY_MARGIN_PX,
      )
      const requiredWidth = sizingText.getBoundingClientRect().width
      if (availableWidth === 0 || requiredWidth === 0) return null

      const nextScale = Math.max(
        minimumScale,
        Math.min(1, availableWidth / requiredWidth),
      )
      return Math.floor(
        nextScale * SCALE_PRECISION,
      ) / SCALE_PRECISION
    }

    const update = () => {
      if (growthTimer !== undefined) clearTimeout(growthTimer)
      const roundedDown = fittedScale()
      if (roundedDown === null) return

      growthTimer = setTimeout(() => {
        const settledScale = fittedScale()
        if (
          settledScale === null ||
          settledScale === retainedScaleRef.current
        ) return
        retainedScaleRef.current = settledScale
        setScale(settledScale)
      }, GROWTH_SETTLE_DELAY_MS)

      if (roundedDown >= retainedScaleRef.current) return

      retainedScaleRef.current = roundedDown
      setScale(roundedDown)
    }

    update()
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (growthTimer !== undefined) clearTimeout(growthTimer)
      }
    }

    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(sizingText)
    return () => {
      if (growthTimer !== undefined) clearTimeout(growthTimer)
      observer.disconnect()
    }
  }, [minimumScale])

  return (
    <span
      ref={containerRef}
      className={[
        'ui-stable-single-line-text',
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{
        '--ui-stable-single-line-font-size': `${scale}em`,
      } as CSSProperties}
    >
      <span className="ui-stable-single-line-text__visible">
        {children}
      </span>
      <span
        ref={measurementRef}
        className="ui-stable-single-line-text__measurement"
        aria-hidden="true"
      >
        {measurement}
      </span>
    </span>
  )
}
