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

export interface StableSingleLineTextProps {
  readonly children: ReactNode
  /** A stable, widest-case rendering used instead of measuring live values. */
  readonly measurement: ReactNode
  readonly className?: string
  readonly minimumScale?: number
}

/**
 * Fits a bounded status sentence onto one line without reacting to every live
 * value update. Once reduced, its scale is deliberately retained until the
 * component is remounted so changing digit widths cannot make it pulse.
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

    const update = () => {
      const availableWidth = Math.max(
        0,
        container.clientWidth - WIDTH_SAFETY_MARGIN_PX,
      )
      const requiredWidth = sizingText.getBoundingClientRect().width
      if (availableWidth === 0 || requiredWidth === 0) return

      const fittedScale = Math.max(
        minimumScale,
        Math.min(1, availableWidth / requiredWidth),
      )
      const roundedDown = Math.floor(
        fittedScale * SCALE_PRECISION,
      ) / SCALE_PRECISION
      if (roundedDown >= retainedScaleRef.current) return

      retainedScaleRef.current = roundedDown
      setScale(roundedDown)
    }

    update()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(sizingText)
    return () => observer.disconnect()
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
