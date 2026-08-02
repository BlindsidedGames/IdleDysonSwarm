import {
  useId,
  type ElementType,
  type ReactNode,
} from 'react'
import './components.css'

export interface FacilityCardProps {
  readonly title: ReactNode
  readonly production: ReactNode
  readonly description: ReactNode
  readonly progress: ReactNode
  readonly action: ReactNode
  readonly feedback?: ReactNode
  readonly headingLevel?: 'h2' | 'h3' | 'h4'
  readonly className?: string
}

export function FacilityCard({
  title,
  production,
  description,
  progress,
  action,
  feedback,
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
      <div className="ui-facility-card__production">{production}</div>
      <div className="ui-facility-card__description">{description}</div>
      <div className="ui-facility-card__progress">{progress}</div>
      {feedback && (
        <div className="ui-facility-card__feedback">{feedback}</div>
      )}
      <div className="ui-facility-card__action">{action}</div>
    </article>
  )
}
