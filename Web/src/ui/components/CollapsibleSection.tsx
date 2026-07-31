import {
  useId,
  useState,
  type ReactNode,
} from 'react'
import {
  disclosurePreferenceKey,
  readDisclosurePreference,
  writeDisclosurePreference,
} from './disclosurePreference'
import './collapsibleSection.css'

type CollapsibleHeadingLevel = 'h2' | 'h3' | 'h4'

export interface CollapsibleSectionProps {
  /** Stable, feature-owned identifier used only for this UI preference. */
  readonly storageKey: string
  readonly title: ReactNode
  readonly ariaLabel?: string
  readonly children: ReactNode
  readonly defaultExpanded?: boolean
  readonly headingLevel?: CollapsibleHeadingLevel
  readonly className?: string
  readonly contentClassName?: string
}

/**
 * Accessible disclosure with a versioned, UI-only browser preference.
 * Collapsed content is unmounted so it cannot remain in the tab order.
 */
export function CollapsibleSection({
  storageKey,
  title,
  ariaLabel,
  children,
  defaultExpanded = true,
  headingLevel: Heading = 'h2',
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  const reactId = useId().replaceAll(':', '')
  const contentId = `ui-disclosure-content-${reactId}`
  const preferenceKey = disclosurePreferenceKey(storageKey)
  const [expanded, setExpanded] = useState(() =>
    readDisclosurePreference(preferenceKey, defaultExpanded),
  )
  const classes = [
    'ui-collapsible-section',
    className ?? '',
  ].filter(Boolean).join(' ')
  const contentClasses = [
    'ui-collapsible-section__content',
    contentClassName ?? '',
  ].filter(Boolean).join(' ')

  const toggle = (): void => {
    setExpanded((current) => {
      const next = !current
      writeDisclosurePreference(preferenceKey, next)
      return next
    })
  }

  return (
    <section className={classes} data-expanded={expanded}>
      <Heading className="ui-collapsible-section__heading">
        <button
          type="button"
          className="ui-collapsible-section__trigger"
          aria-label={ariaLabel}
          aria-expanded={expanded}
          aria-controls={expanded ? contentId : undefined}
          onClick={toggle}
        >
          <span className="ui-collapsible-section__title">{title}</span>
          <span
            className="ui-collapsible-section__chevron"
            aria-hidden="true"
          />
        </button>
      </Heading>
      {expanded ? (
        <div id={contentId} className={contentClasses}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
