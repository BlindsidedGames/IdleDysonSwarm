import {
  useId,
  type ElementType,
  type ReactNode,
} from 'react'
import './components.css'

export interface FacilityCardProps {
  readonly title: ReactNode
  readonly summary: ReactNode
  readonly action: ReactNode
  readonly details?: ReactNode
  readonly headingLevel?: 'h2' | 'h3' | 'h4'
  readonly className?: string
}

export function FacilityCard({
  title,
  summary,
  action,
  details,
  headingLevel = 'h3',
  className,
}: FacilityCardProps) {
  const titleId = useId()
  const Heading = headingLevel as ElementType
  return (
    <article
      className={['ui-facility-card', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={titleId}
    >
      <header className="ui-facility-card__header">
        <Heading id={titleId} className="ui-facility-card__title">
          {title}
        </Heading>
      </header>
      <div className="ui-facility-card__summary">{summary}</div>
      {details && (
        <div className="ui-facility-card__details">{details}</div>
      )}
      <div className="ui-facility-card__action">{action}</div>
    </article>
  )
}
