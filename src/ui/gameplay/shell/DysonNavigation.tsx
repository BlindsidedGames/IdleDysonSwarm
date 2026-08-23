import type {
  DysonNavigationPresentation,
} from './contracts'

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
          >
            {item.current ? (
              <span
                className="dyson-navigation__link"
                aria-current="page"
                aria-label={item.ariaLabel}
              >
                <NavigationItemContent item={item} />
              </span>
            ) : item.onActivate !== undefined && !item.disabled ? (
              <button
                type="button"
                className="dyson-navigation__link"
                aria-label={item.ariaLabel ?? item.progress?.label}
                tabIndex={interactive ? undefined : -1}
                onClick={() => {
                  item.onActivate?.()
                  onNavigate?.()
                }}
              >
                <NavigationItemContent item={item} />
              </button>
            ) : item.href && !item.disabled ? (
              <a
                className="dyson-navigation__link"
                href={item.href}
                aria-label={item.ariaLabel ?? item.progress?.label}
                tabIndex={interactive ? undefined : -1}
                onClick={onNavigate}
              >
                <NavigationItemContent item={item} />
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
                <NavigationItemContent item={item} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

function fitBottomItems(
  items: readonly DysonNavigationPresentation['items'][number][],
  maxItems: number,
) {
  if (items.length <= maxItems) return items
  if (maxItems <= 0) return []
  const visible = items.slice(0, maxItems)
  const current = items.find((item) => item.current)
  if (current !== undefined && !visible.includes(current)) {
    visible[visible.length - 1] = current
  }
  return visible
}

function NavigationItemContent({
  item,
}: {
  readonly item: DysonNavigationPresentation['items'][number]
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
        </span>
      )}
      <span className="dyson-navigation__label">
        {item.label}
      </span>
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
