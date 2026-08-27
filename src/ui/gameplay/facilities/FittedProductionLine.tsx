import {
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ProductionDisplay } from './productionDisplay'

export function FittedProductionLine({
  display,
}: {
  readonly display: ProductionDisplay
}) {
  const containerRef = useRef<HTMLParagraphElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const lastWidthRef = useRef<number | null>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const line = lineRef.current
    if (container === null || line === null) return

    const measure = () => {
      const availableWidth = container.clientWidth
      const naturalWidth = line.scrollWidth
      if (availableWidth <= 0 || naturalWidth <= 0) return
      const nextScale = Math.max(
        0.62,
        Math.min(1, availableWidth / naturalWidth),
      )
      const widthChanged = lastWidthRef.current !== availableWidth
      lastWidthRef.current = availableWidth
      setScale((current) => widthChanged
        ? nextScale
        : Math.min(current, nextScale))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [display.text])

  return (
    <p ref={containerRef} className="basic-facility-card__production">
      <span
        ref={lineRef}
        className="basic-facility-card__production-line"
        style={{ transform: `scale(${scale})` }}
      >
        {display.prefix}
        {display.highlightedValue !== undefined && (
          <bdi className="basic-facility-card__production-value">
            {display.highlightedValue}
          </bdi>
        )}
        {display.suffix}
      </span>
    </p>
  )
}
