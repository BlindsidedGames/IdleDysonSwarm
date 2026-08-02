import './components.css'

export interface PlayerTextProps {
  readonly children: string
  readonly className?: string
}

/**
 * Renders player-authored or imported text as inert React text content. Callers
 * must not pass this data through ICU message parsing or HTML injection.
 */
export function PlayerText({
  children,
  className,
}: PlayerTextProps) {
  return (
    <bdi
      className={['ui-player-text', className ?? '']
        .filter(Boolean)
        .join(' ')}
      dir="auto"
    >
      {children}
    </bdi>
  )
}
