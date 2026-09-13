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
  /** Optional widest-case rendering to reserve space for changing values. */
  readonly measurement?: ReactNode
  readonly className?: string
  /** Preferred floor; actual text may shrink further rather than being cut off. */
  readonly minimumScale?: number
}

/**
 * Fits text on one line, using a reference to keep live numbers visually stable.
 * Reductions apply immediately; growth waits for the layout to settle.
 */
export function StableSingleLineText({
  children,
  measurement,
  className,
  minimumScale = DEFAULT_MINIMUM_SCALE,
}: StableSingleLineTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const visibleRef = useRef<HTMLSpanElement>(null)
  const measurementRef = useRef<HTMLSpanElement>(null)
  const retainedScaleRef = useRef(1)
  const [scale, setScale] = useState(1)
  const hasMeasurement = measurement !== undefined

  useLayoutEffect(() => {
    const container = containerRef.current
    const visible = visibleRef.current
    const sizingText = measurementRef.current
    if (container === null || visible === null) return undefined

    let growthTimer: ReturnType<typeof setTimeout> | undefined

    const fittedScale = () => {
      const availableWidth = Math.max(
        0,
        container.clientWidth - WIDTH_SAFETY_MARGIN_PX,
      )
      // Read the scale applied to the DOM, which may precede the next React
      // commit. The visible span remains intrinsically sized (no max-width).
      const renderedScale = Number.parseFloat(container.style.getPropertyValue(
        '--ui-stable-single-line-font-size',
      )) || 1
      const liveWidth = visible.getBoundingClientRect().width / renderedScale
      const requiredWidth = sizingText?.getBoundingClientRect().width ?? liveWidth
      if (availableWidth === 0 || requiredWidth === 0 || liveWidth === 0) return null

      const nextScale = Math.min(
        Math.max(minimumScale, Math.min(1, availableWidth / requiredWidth)),
        availableWidth / liveWidth,
        1,
      )
      return Math.floor(
        nextScale * SCALE_PRECISION,
      ) / SCALE_PRECISION
    }

    const update = (allowGrowth: boolean) => {
      const roundedDown = fittedScale()
      if (roundedDown === null) return

      // Live number changes may shrink the sentence, but only a change to
      // its available space/reference may grow it. This avoids pulsing.
      if (allowGrowth) {
        if (growthTimer !== undefined) clearTimeout(growthTimer)
        growthTimer = setTimeout(() => {
          const settledScale = fittedScale()
          if (
            settledScale === null ||
            settledScale === retainedScaleRef.current
          ) return
          retainedScaleRef.current = settledScale
          setScale(settledScale)
        }, GROWTH_SETTLE_DELAY_MS)
      }

      if (roundedDown >= retainedScaleRef.current) return

      retainedScaleRef.current = roundedDown
      setScale(roundedDown)
    }

    update(true)
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        if (growthTimer !== undefined) clearTimeout(growthTimer)
      }
    }

    const observer = new ResizeObserver((entries) => update(entries.some(
      ({ target }) => target === container || target === sizingText,
    )))
    observer.observe(container)
    observer.observe(visible)
    if (sizingText !== null) observer.observe(sizingText)
    return () => {
      if (growthTimer !== undefined) clearTimeout(growthTimer)
      observer.disconnect()
    }
  }, [minimumScale, hasMeasurement])

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
      <span ref={visibleRef} className="ui-stable-single-line-text__visible">
        {children}
      </span>
      {hasMeasurement && (
        <span
          ref={measurementRef}
          className="ui-stable-single-line-text__measurement"
          aria-hidden="true"
        >
          {measurement}
        </span>
      )}
    </span>
  )
}
