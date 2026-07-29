import type { ReactNode } from 'react'
import './components.css'

export interface ResourceValueProps {
  readonly label: ReactNode
  readonly value: string
  readonly fullPrecisionValue?: string
  readonly machineValue?: string
  readonly className?: string
}

export function ResourceValue({
  label,
  value,
  fullPrecisionValue,
  machineValue,
  className,
}: ResourceValueProps) {
  return (
    <span
      className={['ui-resource-value', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <span>{label}</span>
      <data
        className="ui-resource-value__value"
        value={machineValue}
        aria-label={fullPrecisionValue}
        title={fullPrecisionValue}
        tabIndex={fullPrecisionValue ? 0 : undefined}
      >
        <bdi dir="ltr">{value}</bdi>
      </data>
    </span>
  )
}
