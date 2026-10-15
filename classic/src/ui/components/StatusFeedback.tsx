import type { ReactNode } from 'react'
import './components.css'

export interface StatusFeedbackProps {
  readonly tone: 'neutral' | 'success' | 'warning' | 'error'
  readonly title?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

export function StatusFeedback({
  tone,
  title,
  children,
  className,
}: StatusFeedbackProps) {
  const assertive = tone === 'error'
  return (
    <div
      className={['ui-status-feedback', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-tone={tone}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {title && (
        <strong className="ui-status-feedback__title">{title}</strong>
      )}
      <div>{children}</div>
    </div>
  )
}
