import { useLayoutEffect, useRef } from 'react'
import { formatGameNumber } from './formatNumber'
import { projectPresentationValue } from './smoothPresentation'

interface SmoothNumberProps {
  value: number
  rate?: number
  prefix?: string
  suffix?: string
  minimum?: number
  maximum?: number
  className?: string
}

interface SmoothNumberRecord {
  element: HTMLSpanElement | null
  value: number
  rate: number
  sampledAtMilliseconds: number
  prefix: string
  suffix: string
  minimum: number
  maximum: number
}

const records = new Set<SmoothNumberRecord>()
let animationFrame: number | null = null

function renderRecord(record: SmoothNumberRecord, now: number): void {
  if (record.element === null) return
  const value = projectPresentationValue(
    record.value,
    record.rate,
    (now - record.sampledAtMilliseconds) / 1_000,
    record.minimum,
    record.maximum,
  )
  const nextText = `${record.prefix}${formatGameNumber(value)}${record.suffix}`
  if (record.element.textContent !== nextText) {
    record.element.textContent = nextText
  }
}

function animate(now: number): void {
  animationFrame = null
  let hasMovingValue = false
  for (const record of records) {
    renderRecord(record, now)
    hasMovingValue ||= record.rate !== 0
  }
  if (hasMovingValue) {
    animationFrame = window.requestAnimationFrame(animate)
  }
}

function ensureAnimation(): void {
  if (animationFrame !== null || typeof window === 'undefined') return
  animationFrame = window.requestAnimationFrame(animate)
}

export function SmoothNumber({
  value,
  rate = 0,
  prefix = '',
  suffix = '',
  minimum = 0,
  maximum = Number.MAX_VALUE,
  className,
}: SmoothNumberProps) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const recordRef = useRef<SmoothNumberRecord>({
    element: null,
    value,
    rate,
    sampledAtMilliseconds: 0,
    prefix,
    suffix,
    minimum,
    maximum,
  })

  useLayoutEffect(() => {
    const record = recordRef.current
    record.element = elementRef.current
    record.value = value
    record.rate = rate
    record.sampledAtMilliseconds = performance.now()
    record.prefix = prefix
    record.suffix = suffix
    record.minimum = minimum
    record.maximum = maximum
    records.add(record)
    renderRecord(record, record.sampledAtMilliseconds)
    if (rate !== 0) ensureAnimation()

    return () => {
      records.delete(record)
      if (records.size === 0 && animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    }
  }, [maximum, minimum, prefix, rate, suffix, value])

  return (
    <span
      ref={elementRef}
      className={className}
      data-canonical-value={value}
    >
      {prefix}
      {formatGameNumber(value)}
      {suffix}
    </span>
  )
}
