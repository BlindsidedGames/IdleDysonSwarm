import type {
  DysonNavigationPresentation,
} from './contracts'

export interface DysonNavigationProps
  extends DysonNavigationPresentation {
  readonly placement: 'drawer' | 'bottom'
  readonly onNavigate?: () => void
  readonly interactive?: boolean
}

/**
 * Renders only destinations that the caller has already authorized.
 */
export function DysonNavigation({
  ariaLabel,
  drawerAriaLabel,
  bottomAriaLabel,
  items,
  placement,
  onNavigate,
  interactive = true,
}: DysonNavigationProps) {
  const visibleItems =
    placement === 'bottom'
      ? items.filter((item) => item.bottom !== false)
      : items

  return (
    <nav
      className={`dyson-navigation dyson-navigation--${placement}`}
      aria-label={
        placement === 'drawer'
          ? drawerAriaLabel ?? ariaLabel
          : bottomAriaLabel ?? ariaLabel
      }
      data-placement={placement}
    >
      <ul className="dyson-navigation__list">
        {visibleItems.map((item) => (
          <li
            key={item.id}
            className="dyson-navigation__item"
            data-navigation-id={item.id}
          >
            {item.current ? (
              <span
                className="dyson-navigation__link"
                aria-current="page"
              >
              {(item.iconSrc !== undefined || item.icon !== undefined) && (
                <span
                  className="dyson-navigation__icon"
                  aria-hidden="true"
                >
                  {item.iconSrc !== undefined
                    ? <img src={item.iconSrc} alt="" />
                    : item.icon}
                </span>
              )}
              <span className="dyson-navigation__label">
                {item.label}
              </span>
              </span>
            ) : item.onActivate !== undefined && !item.disabled ? (
              <button
                type="button"
                className="dyson-navigation__link"
                tabIndex={interactive ? undefined : -1}
                onClick={() => {
                  item.onActivate?.()
                  onNavigate?.()
                }}
              >
                {(item.iconSrc !== undefined || item.icon !== undefined) && (
                  <span
                    className="dyson-navigation__icon"
                    aria-hidden="true"
                  >
                    {item.iconSrc !== undefined
                      ? <img src={item.iconSrc} alt="" />
                      : item.icon}
                  </span>
                )}
                <span className="dyson-navigation__label">
                  {item.label}
                </span>
              </button>
            ) : item.href && !item.disabled ? (
              <a
                className="dyson-navigation__link"
                href={item.href}
                tabIndex={interactive ? undefined : -1}
                onClick={onNavigate}
              >
                {(item.iconSrc !== undefined || item.icon !== undefined) && (
                  <span
                    className="dyson-navigation__icon"
                    aria-hidden="true"
                  >
                    {item.iconSrc !== undefined
                      ? <img src={item.iconSrc} alt="" />
                      : item.icon}
                  </span>
                )}
                <span className="dyson-navigation__label">
                  {item.label}
                </span>
              </a>
            ) : (
              <button
                type="button"
                className="dyson-navigation__link"
                disabled
                aria-label={typeof item.label === 'string'
                  ? item.label
                  : undefined}
              >
                {(item.iconSrc !== undefined || item.icon !== undefined) && (
                  <span
                    className="dyson-navigation__icon"
                    aria-hidden="true"
                  >
                    {item.iconSrc !== undefined
                      ? <img src={item.iconSrc} alt="" />
                      : item.icon}
                  </span>
                )}
                <span className="dyson-navigation__label">
                  {item.label}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
