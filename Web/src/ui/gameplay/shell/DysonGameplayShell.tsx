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
  botDistribution,
}: DysonGameplayShellProps) {
  const mainId = `dyson-gameplay-main-${useId().replaceAll(':', '')}`
  const hasLowerRegions =
    productionSummary !== undefined ||
    botDistribution !== undefined

  return (
    <div className="dyson-shell" dir={direction}>
      <a className="dyson-shell__skip-link" href={`#${mainId}`}>
        {skipLinkLabel}
      </a>

      <div className="dyson-shell__rail">
        <DysonNavigation {...navigation} placement="rail" />
      </div>

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

          {hasLowerRegions && (
            <div className="dyson-shell__lower-regions">
              {productionSummary !== undefined && (
                <ShellRegion
                  className="dyson-shell__production-summary"
                  region={productionSummary}
                />
              )}
              {botDistribution !== undefined && (
                <ShellRegion
                  className="dyson-shell__bot-distribution"
                  region={botDistribution}
                />
              )}
            </div>
          )}
        </div>
      </main>

      <div className="dyson-shell__bottom-navigation">
        <DysonNavigation {...navigation} placement="bottom" />
      </div>
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
