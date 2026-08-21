import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useMediaQuery } from '../../accessibility/useMediaQuery'
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
  menuHeading,
  closeMenuLabel,
  openMenuLabel,
  heading,
  routeTheme = 'bots',
  routeThemeVariant,
  navigation,
  resources,
  showResourceHeader = true,
  tinker,
  hasVisibleFacilities,
  facilities,
  swarmVisual,
  info,
  productionSummary,
  distribution,
  sidePanelSupplement,
  routeSupplement,
  routeContent,
}: DysonGameplayShellProps) {
  const mainId = `dyson-gameplay-main-${useId().replaceAll(':', '')}`
  const menuId = `dyson-menu-${useId().replaceAll(':', '')}`
  const [menuOpen, setMenuOpen] = useState(false)
  const openMenuRef = useRef<HTMLButtonElement>(null)
  const closeMenuRef = useRef<HTMLButtonElement>(null)
  const sidePanelRef = useRef<HTMLElement>(null)
  const wideLayout = useMediaQuery('(min-width: 1024px)')
  const compactMenuOpen = menuOpen && !wideLayout
  const drawerUnavailable = !wideLayout && !menuOpen

  useEffect(() => {
    if (wideLayout && menuOpen) setMenuOpen(false)
  }, [menuOpen, wideLayout])

  useEffect(() => {
    if (!compactMenuOpen) return undefined
    const returnFocus = openMenuRef.current
    closeMenuRef.current?.focus()
    const handleMenuKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = sidePanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !sidePanelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !sidePanelRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleMenuKeyDown)
    return () => {
      document.removeEventListener('keydown', handleMenuKeyDown)
      if (
        returnFocus?.isConnected &&
        returnFocus.closest('[inert]') === null
      ) {
        returnFocus.focus()
      }
    }
  }, [compactMenuOpen])

  return (
    <div
      className="dyson-shell"
      dir={direction}
      data-menu-open={menuOpen}
      data-resource-header={showResourceHeader}
      data-route-content={routeContent !== undefined}
      data-route-theme={routeTheme}
      data-route-theme-variant={routeThemeVariant}
    >
      <a
        className="dyson-shell__skip-link"
        href={`#${mainId}`}
        aria-hidden={compactMenuOpen || undefined}
        tabIndex={compactMenuOpen ? -1 : undefined}
      >
        {skipLinkLabel}
      </a>

      <button
        type="button"
        className="dyson-shell__menu-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        ref={sidePanelRef}
        id={menuId}
        className="dyson-shell__side-panel"
        aria-label={navigation.drawerAriaLabel ?? navigation.ariaLabel}
        aria-hidden={drawerUnavailable || undefined}
        aria-modal={compactMenuOpen || undefined}
        inert={drawerUnavailable || undefined}
        role={wideLayout ? undefined : 'dialog'}
      >
        <header className="dyson-shell__side-heading">
          <span>{menuHeading}</span>
          <button
            ref={closeMenuRef}
            type="button"
            className="dyson-shell__menu-close"
            aria-label={closeMenuLabel}
            tabIndex={compactMenuOpen ? 0 : -1}
            onClick={() => setMenuOpen(false)}
          >
            <span aria-hidden="true">{'×'}</span>
          </button>
        </header>
        <DysonNavigation
          {...navigation}
          placement="drawer"
          interactive={!drawerUnavailable}
          onNavigate={() => setMenuOpen(false)}
        />
        {sidePanelSupplement !== undefined && (
          <div className="dyson-shell__side-supplement">
            {sidePanelSupplement}
          </div>
        )}
      </aside>

      <main
        id={mainId}
        className="dyson-shell__main"
        aria-hidden={compactMenuOpen || undefined}
        inert={compactMenuOpen || undefined}
      >
        <div className="dyson-shell__content">
          <h1 className="dyson-shell__route-heading">{heading}</h1>

          {showResourceHeader ? (
            <DysonResourceHeader
              {...resources}
              direction={direction}
            />
          ) : null}

          {routeContent !== undefined ? (
            <ShellRegion
              className="dyson-shell__route-content"
              region={routeContent}
            />
          ) : (
            <div
              className="dyson-shell__playfield"
              data-has-swarm={swarmVisual !== undefined}
            >
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
                <div className="dyson-shell__facility-region">
                  {facilities}
                </div>

                {tinker !== undefined && (
                  <ShellRegion
                    className="dyson-shell__tinker"
                    region={tinker}
                  />
                )}
              </div>
            </div>
          )}

          {(routeSupplement !== undefined || distribution !== undefined ||
            (routeContent === undefined &&
              (info !== undefined ||
                productionSummary !== undefined))) && (
            <div className="dyson-shell__lower-regions">
              {routeSupplement !== undefined && (
                <ShellRegion
                  className="dyson-shell__route-supplement"
                  region={routeSupplement}
                />
              )}
              {routeContent === undefined && info !== undefined && (
                <ShellRegion
                  className="dyson-shell__info"
                  region={info}
                />
              )}
              {routeContent === undefined &&
                productionSummary !== undefined && (
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
          )}
        </div>
      </main>

      <div
        className="dyson-shell__bottom-navigation"
        aria-hidden={(compactMenuOpen || wideLayout) || undefined}
        inert={(compactMenuOpen || wideLayout) || undefined}
      >
        <button
          ref={openMenuRef}
          type="button"
          className="dyson-shell__bottom-menu"
          aria-label={openMenuLabel}
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
          <DysonNavigation
            {...navigation}
            placement="bottom"
            interactive={!compactMenuOpen && !wideLayout}
          />
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
