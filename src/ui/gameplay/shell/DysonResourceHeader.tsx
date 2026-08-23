import scienceSymbolSrc from '../../assets/symbol-science.png'
import {
  InlineImageSymbol,
  ResourceValue,
} from '../../components'
import type {
  DysonResourceHeaderPresentation,
  DysonResourcePresentation,
  DysonShellDirection,
} from './contracts'
import { navigationAssets } from './navigationAssets'

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
        showBotsIcon
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
  readonly showBotsIcon?: boolean
  readonly showScienceIcon?: boolean
}

function Resource({
  placement,
  direction,
  presentation,
  showBotsIcon = false,
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
        leadingSymbol={
          showBotsIcon
            ? <BotsSymbol />
            : showScienceIcon
              ? <ScienceSymbol />
              : undefined
        }
        fullPrecisionValue={presentation.fullPrecisionValue}
        machineValue={presentation.machineValue}
      />
      {presentation.rate !== undefined && (
        <span
          className="dyson-resource-header__rate"
          aria-label={presentation.fullPrecisionRate}
          title={presentation.fullPrecisionRate}
        >
          {showScienceIcon && <ScienceSymbol />}
          <bdi dir="ltr">{presentation.rate}</bdi>
        </span>
      )}
      {presentation.detail !== undefined && (
        <div className="dyson-resource-header__detail">
          {presentation.detail}
        </div>
      )}
    </div>
  )
}

function BotsSymbol() {
  return (
    <InlineImageSymbol
      src={navigationAssets.bots}
      symbol="bots"
    />
  )
}

function ScienceSymbol() {
  return (
    <InlineImageSymbol
      src={scienceSymbolSrc}
      symbol="science"
    />
  )
}
