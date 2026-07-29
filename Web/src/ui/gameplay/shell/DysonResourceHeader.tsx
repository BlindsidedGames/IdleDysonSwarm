import { ResourceValue } from '../../components'
import type {
  DysonResourceHeaderPresentation,
  DysonResourcePresentation,
  DysonShellDirection,
} from './contracts'

export interface DysonResourceHeaderProps
  extends DysonResourceHeaderPresentation {
  readonly direction: DysonShellDirection
}

/**
 * Preserves the confirmed Unity resource hierarchy: Cash, Total Bots, Science.
 */
export function DysonResourceHeader({
  ariaLabel,
  direction,
  cash,
  totalBots,
  science,
}: DysonResourceHeaderProps) {
  return (
    <section
      className="dyson-resource-header"
      aria-label={ariaLabel}
      dir="ltr"
    >
      <Resource
        placement="cash"
        direction={direction}
        presentation={cash}
      />
      <Resource
        placement="total-bots"
        direction={direction}
        presentation={totalBots}
      />
      <Resource
        placement="science"
        direction={direction}
        presentation={science}
      />
    </section>
  )
}

interface ResourceProps {
  readonly placement: 'cash' | 'total-bots' | 'science'
  readonly direction: DysonShellDirection
  readonly presentation: DysonResourcePresentation
}

function Resource({
  placement,
  direction,
  presentation,
}: ResourceProps) {
  return (
    <div
      className={`dyson-resource-header__item dyson-resource-header__item--${placement}`}
      data-resource={placement}
      dir={direction}
    >
      <ResourceValue
        label={presentation.label}
        value={presentation.value}
        fullPrecisionValue={presentation.fullPrecisionValue}
        machineValue={presentation.machineValue}
      />
      {presentation.rate !== undefined && (
        <span
          className="dyson-resource-header__rate"
          aria-label={presentation.fullPrecisionRate}
          title={presentation.fullPrecisionRate}
        >
          <bdi dir="ltr">{presentation.rate}</bdi>
        </span>
      )}
    </div>
  )
}
