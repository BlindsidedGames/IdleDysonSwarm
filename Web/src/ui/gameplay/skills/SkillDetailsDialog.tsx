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
  readonly closeLabel: string
  readonly palette: SkillDetailsPalette
  readonly className?: string
  readonly children: ReactNode
  readonly onClose: () => void
}

/**
 * Presents skill information in the Unity-authored category palette while
 * keeping modal focus, Escape handling, and focus restoration inside the UI
 * layer.
 */
export function SkillDetailsDialog({
  title,
  closeLabel,
  palette,
  className,
  children,
  onClose,
}: SkillDetailsDialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
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
        <header className="skill-details-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="skill-details-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </header>
        <div className="skill-details-dialog__content">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  )
}
