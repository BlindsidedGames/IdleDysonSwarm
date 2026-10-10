import { useId, type ReactNode } from 'react'
import './components.css'

export interface ProgressProps {
  readonly label: ReactNode
  readonly valueText: string
  readonly valueContent?: ReactNode
  readonly value?: number
  readonly maximum?: number
  readonly className?: string
}

export function Progress({
  label,
  valueText,
  valueContent,
  value,
  maximum = 1,
  className,
}: ProgressProps) {
  const labelId = useId()
  const valueId = useId()
  const determinate = value !== undefined

  return (
    <div
      className={['ui-progress', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="ui-progress__header">
        <span id={labelId}>{label}</span>
        <span id={valueId} className="ui-progress__value">
          {valueContent ?? valueText}
        </span>
      </div>
      <progress
        aria-labelledby={labelId}
        aria-describedby={valueId}
        aria-valuetext={valueText}
        max={maximum}
        value={determinate ? value : undefined}
      />
    </div>
  )
}
