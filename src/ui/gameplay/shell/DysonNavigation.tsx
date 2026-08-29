import type {
  DysonNavigationPresentation,
} from './contracts'
import { fitBottomItems } from './bottomNavigationLayout'

export interface DysonNavigationProps
  extends DysonNavigationPresentation {
  readonly placement: 'drawer' | 'bottom'
  readonly onNavigate?: () => void
  readonly interactive?: boolean
  readonly maxItems?: number
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
  maxItems,
}: DysonNavigationProps) {
  const eligibleItems =
    placement === 'bottom'
      ? items.filter((item) => item.bottom !== false)
      : items
  const visibleItems = placement === 'bottom' && maxItems !== undefined
    ? fitBottomItems(eligibleItems, maxItems)
    : eligibleItems

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
            data-progress={item.progress !== undefined || undefined}
            data-new={item.newlyUnlocked || undefined}
          >
            {item.current ||
            ('onActivate' in item && item.onActivate !== undefined) ? (
              <button
                type="button"
                className="dyson-navigation__link"
                disabled={
                  item.current ||
                  ('disabled' in item && item.disabled === true)
                }
                aria-current={item.current ? 'page' : undefined}
                aria-label={item.ariaLabel ?? item.progress?.label}
                tabIndex={interactive ? undefined : -1}
                onClick={() => {
                  if (item.current) return
                  if ('onActivate' in item) item.onActivate?.()
                  onNavigate?.()
                }}
              >
                <NavigationItemContent item={item} placement={placement} />
              </button>
            ) : item.href ? (
              <a
                className="dyson-navigation__link"
                href={item.href}
                aria-current={item.current ? 'page' : undefined}
                aria-disabled={item.disabled || item.current || undefined}
                aria-label={item.ariaLabel ?? item.progress?.label}
                tabIndex={interactive && !item.disabled && !item.current ? undefined : -1}
                onClick={(event) => {
                  if (item.disabled || item.current) {
                    event.preventDefault()
                    return
                  }
                  onNavigate?.()
                }}
              >
                <NavigationItemContent item={item} placement={placement} />
              </a>
            ) : (
              <button
                type="button"
                className="dyson-navigation__link"
                disabled
                aria-label={
                  item.ariaLabel ??
                  item.progress?.label ??
                  (typeof item.label === 'string'
                    ? item.label
                    : undefined)
                }
              >
                <NavigationItemContent item={item} placement={placement} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function NavigationItemContent({
  item,
  placement,
}: {
  readonly item: DysonNavigationPresentation['items'][number]
  readonly placement: DysonNavigationProps['placement']
}) {
  return (
    <>
      {(item.iconSrc !== undefined || item.icon !== undefined) && (
        <span
          className="dyson-navigation__icon"
          aria-hidden="true"
        >
          {item.iconSrc !== undefined
            ? (
                <>
                  <img src={item.iconSrc} alt="" />
                  <span
                    className="dyson-navigation__icon-mask"
                    style={{
                      WebkitMaskImage: `url("${item.iconSrc}")`,
                      maskImage: `url("${item.iconSrc}")`,
                    }}
                  />
                </>
              )
            : item.icon}
          {placement === 'bottom' && item.badge !== undefined ? (
            <span className="dyson-navigation__badge">{item.badge}</span>
          ) : null}
        </span>
      )}
      <span className="dyson-navigation__label">
        {item.label}
      </span>
      {placement === 'drawer' && item.badge !== undefined ? (
        <span className="dyson-navigation__drawer-value">
          {item.badge}
        </span>
      ) : null}
      {item.progress !== undefined ? (
        <span
          className="dyson-navigation__progress"
          aria-hidden="true"
        >
          <i
            style={{
              inlineSize: `${Math.max(
                0,
                Math.min(1, item.progress.fraction),
              ) * 100}%`,
            }}
          />
        </span>
      ) : null}
    </>
  )
}
