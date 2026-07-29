import { useEffect, useId, useState } from 'react'
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
  swarmVisual,
  info,
  productionSummary,
  distribution,
  sidePanelSupplement,
}: DysonGameplayShellProps) {
  const mainId = `dyson-gameplay-main-${useId().replaceAll(':', '')}`
  const menuId = `dyson-menu-${useId().replaceAll(':', '')}`
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <div
      className="dyson-shell"
      dir={direction}
      data-menu-open={menuOpen}
    >
      <a className="dyson-shell__skip-link" href={`#${mainId}`}>
        {skipLinkLabel}
      </a>

      <button
        type="button"
        className="dyson-shell__menu-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id={menuId}
        className="dyson-shell__side-panel"
        aria-label="Game menu"
      >
        <header className="dyson-shell__side-heading">
          <span>Menu</span>
          <button
            type="button"
            className="dyson-shell__menu-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <DysonNavigation
          {...navigation}
          placement="drawer"
          onNavigate={() => setMenuOpen(false)}
        />
        {sidePanelSupplement !== undefined && (
          <div className="dyson-shell__side-supplement">
            {sidePanelSupplement}
          </div>
        )}
      </aside>

      <main id={mainId} className="dyson-shell__main">
        <div className="dyson-shell__content">
          <h1 className="dyson-shell__route-heading">{heading}</h1>

          <DysonResourceHeader
            {...resources}
            direction={direction}
          />

          <div className="dyson-shell__playfield">
            {swarmVisual !== undefined && (
              <ShellRegion
                className="dyson-shell__swarm"
                region={swarmVisual}
              />
            )}

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
          </div>

          <div className="dyson-shell__lower-regions">
            {info !== undefined && (
              <ShellRegion
                className="dyson-shell__info"
                region={info}
              />
            )}
            {productionSummary !== undefined && (
              <ShellRegion
                className="dyson-shell__production-summary"
                region={productionSummary}
              />
            )}
            {distribution !== undefined && (
              <ShellRegion
                className="dyson-shell__distribution"
                region={distribution}
              />
            )}
          </div>
        </div>
      </main>

      <div className="dyson-shell__bottom-navigation">
        <button
          type="button"
          className="dyson-shell__bottom-menu"
          aria-label="Open menu"
          aria-controls={menuId}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span className="dyson-shell__menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
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
