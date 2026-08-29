import type { ReactNode } from 'react'

export interface InlineResourceAmountProps {
  readonly leadingSymbol: ReactNode
  readonly value: ReactNode
  readonly className?: string
  readonly ariaHidden?: boolean
}

/**
 * Uses the same baseline, spacing, and bidirectional-number treatment as the
 * persistent resource header for compact icon-and-value currency mentions.
 */
export function InlineResourceAmount({
  leadingSymbol,
  value,
  className,
  ariaHidden,
}: InlineResourceAmountProps) {
  return (
    <span
      className={['ui-resource-value__content', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden={ariaHidden}
    >
      {leadingSymbol}
      <bdi dir="ltr">{value}</bdi>
    </span>
  )
}
