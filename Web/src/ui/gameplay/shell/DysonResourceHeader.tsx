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
        showScienceIcon
      />
    </section>
  )
}

interface ResourceProps {
  readonly placement: 'cash' | 'total-bots' | 'science'
  readonly direction: DysonShellDirection
  readonly presentation: DysonResourcePresentation
  readonly showScienceIcon?: boolean
}

function Resource({
  placement,
  direction,
  presentation,
  showScienceIcon = false,
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
      {showScienceIcon && (
        <span
          className="dyson-resource-header__science-icon"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M9 2h6v2h-1v5.2l4.7 7.7A2 2 0 0 1 17 20H7a2 2 0 0 1-1.7-3.1L10 9.2V4H9V2Zm2.7 8.3-2.2 3.6h5l-2.2-3.6-.3-.5-.3.5Zm-3.4 5.6L7 18h10l-1.3-2.1H8.3Z" />
          </svg>
        </span>
      )}
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
