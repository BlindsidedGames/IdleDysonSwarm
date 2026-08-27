import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export interface FacilityDetailsDialogProps {
  readonly title: ReactNode
  readonly subtitle?: ReactNode
  readonly closeLabel: string
  readonly children: ReactNode
  readonly onClose: () => void
}

export function FacilityDetailsDialog({
  title,
  subtitle,
  closeLabel,
  children,
  onClose,
}: FacilityDetailsDialogProps) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const backgroundSiblings = Array.from(document.body.children)
      .filter((element): element is HTMLElement =>
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
        last.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      for (const { element, hadInertAttribute } of backgroundSiblings) {
        if (!hadInertAttribute) element.removeAttribute('inert')
      }
      returnFocusRef.current?.focus()
    }
  }, [])

  return createPortal(
    <div
      ref={backdropRef}
      className="facility-details-dialog__backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="facility-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="facility-details-dialog__header">
          <span className="facility-details-dialog__heading">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <span>{subtitle}</span>}
          </span>
          <button
            ref={closeRef}
            type="button"
            className="facility-details-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="facility-details-dialog__content">
          {children}
        </div>
        <div className="facility-details-dialog__safe-area" aria-hidden="true" />
      </section>
    </div>,
    document.body,
  )
}
