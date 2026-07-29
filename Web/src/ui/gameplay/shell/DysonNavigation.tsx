import type {
  DysonNavigationPresentation,
} from './contracts'

export interface DysonNavigationProps
  extends DysonNavigationPresentation {
  readonly placement: 'rail' | 'bottom'
}

/**
 * Renders only destinations that the caller has already authorized.
 */
export function DysonNavigation({
  ariaLabel,
  items,
  placement,
}: DysonNavigationProps) {
  return (
    <nav
      className={`dyson-navigation dyson-navigation--${placement}`}
      aria-label={ariaLabel}
      data-placement={placement}
    >
      <ul className="dyson-navigation__list">
        {items.map((item) => (
          <li key={item.id} className="dyson-navigation__item">
            {item.current ? (
              <span
                className="dyson-navigation__link"
                aria-current="page"
              >
              {item.icon !== undefined && (
                <span
                  className="dyson-navigation__icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              )}
              <span className="dyson-navigation__label">
                {item.label}
              </span>
              </span>
            ) : (
              <a
                className="dyson-navigation__link"
                href={item.href}
              >
                {item.icon !== undefined && (
                  <span
                    className="dyson-navigation__icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                )}
                <span className="dyson-navigation__label">
                  {item.label}
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
