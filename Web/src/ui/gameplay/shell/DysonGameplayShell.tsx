import { useId } from 'react'
import type {
  DysonGameplayShellProps,
  DysonShellRegion,
} from './contracts'
import { DysonNavigation } from './DysonNavigation'
import { DysonResourceHeader } from './DysonResourceHeader'
import './dysonGameplayShell.css'

/**
 * Presentation-only responsive composition for the Dyson gameplay route.
 *
 * Gameplay visibility, ordering, formatting, timing and interaction remain
 * owned by the supplied facts and feature slots.
 */
export function DysonGameplayShell({
  direction,
  skipLinkLabel,
  heading,
  navigation,
  resources,
  tinker,
  hasVisibleFacilities,
  facilities,
  productionSummary,
}: DysonGameplayShellProps) {
  const mainId = `dyson-gameplay-main-${useId().replaceAll(':', '')}`
  const hasNavigation = navigation.items.length >= 2

  return (
    <div
      className="dyson-shell"
      dir={direction}
      data-has-navigation={hasNavigation}
    >
      <a className="dyson-shell__skip-link" href={`#${mainId}`}>
        {skipLinkLabel}
      </a>

      {hasNavigation && (
        <div className="dyson-shell__rail">
          <DysonNavigation {...navigation} placement="rail" />
        </div>
      )}

      <main id={mainId} className="dyson-shell__main">
        <div className="dyson-shell__content">
          <h1 className="dyson-shell__route-heading">{heading}</h1>

          <DysonResourceHeader
            {...resources}
            direction={direction}
          />

          <div
            className="dyson-shell__stage"
            data-has-tinker={tinker !== undefined}
            data-has-visible-facilities={hasVisibleFacilities}
          >
            {tinker !== undefined && (
              <ShellRegion
                className="dyson-shell__tinker"
                region={tinker}
              />
            )}

            <div className="dyson-shell__facility-region">
              {facilities}
            </div>
          </div>

          {productionSummary !== undefined && (
            <div className="dyson-shell__lower-regions">
              <ShellRegion
                className="dyson-shell__production-summary"
                region={productionSummary}
              />
            </div>
          )}
        </div>
      </main>

      {hasNavigation && (
        <div className="dyson-shell__bottom-navigation">
          <DysonNavigation {...navigation} placement="bottom" />
        </div>
      )}
    </div>
  )
}

interface ShellRegionProps {
  readonly className: string
  readonly region: DysonShellRegion
}

function ShellRegion({ className, region }: ShellRegionProps) {
  return (
    <section className={className} aria-label={region.ariaLabel}>
      {region.content}
    </section>
  )
}
