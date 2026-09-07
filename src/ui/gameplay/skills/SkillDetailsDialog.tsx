import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export type SkillDetailsPalette =
  | 'normal'
  | 'fragment'
  | 'non-refundable'

export interface SkillDetailsDialogProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly closeLabel: string
  readonly palette: SkillDetailsPalette
  readonly className?: string
  readonly children: ReactNode
  readonly onClose: () => void
  readonly onBack?: () => void
  readonly backLabel?: string
}

/**
 * Presents skill information in the Unity-authored category palette while
 * keeping modal focus, Escape handling, and focus restoration inside the UI
 * layer.
 */
export function SkillDetailsDialog({
  title,
  description,
  closeLabel,
  palette,
  className,
  children,
  onClose,
  onBack,
  backLabel,
}: SkillDetailsDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onBack ?? onClose
  const showingBack = onBack !== undefined
  useEffect(() => {
    if (showingBack) closeRef.current?.focus({ preventScroll: true })
  }, [showingBack])

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const backgroundSiblings = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== backdropRef.current,
      )
      .map((element) => ({
        element,
        hadInertAttribute: element.hasAttribute('inert'),
      }))

    for (const { element } of backgroundSiblings) {
      element.setAttribute('inert', '')
    }
    closeRef.current?.focus({ preventScroll: true })

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialogs = document.querySelectorAll(
        '.skill-details-dialog__backdrop',
      )
      if (openDialogs.item(openDialogs.length - 1) !== backdropRef.current) {
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      for (const { element, hadInertAttribute } of backgroundSiblings) {
        if (!hadInertAttribute) element.removeAttribute('inert')
      }
      if (
        returnFocusRef.current?.isConnected &&
        returnFocusRef.current.closest('[inert]') === null
      ) {
        returnFocusRef.current.focus({ preventScroll: true })
      }
    }
  }, [])

  return createPortal(
    <div
      ref={backdropRef}
      className="skill-details-dialog__backdrop"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        // Keep the backdrop and inert background through the whole touch gesture.
        // Closing on pointerdown can expose controls to the tap's later click.
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
      }}
    >
      <section
        ref={dialogRef}
        className={[
          'skill-details-dialog',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-palette={palette}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="skill-details-dialog__header" data-description={description !== undefined || undefined} data-back={onBack !== undefined || undefined}>
          {onBack && <button ref={closeRef} type="button" className="skill-details-dialog__close"
            aria-label={backLabel ?? closeLabel} onClick={onBack}><span aria-hidden="true">←</span></button>}
          {!onBack && <button
            ref={closeRef}
            type="button"
            className="skill-details-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span aria-hidden="true">{'×'}</span>
          </button>}
          <h2 id={titleId}>{title}</h2>
          {description !== undefined && <p className="skill-details__description">{description}</p>}
        </header>
        <div className="skill-details-dialog__content">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}
