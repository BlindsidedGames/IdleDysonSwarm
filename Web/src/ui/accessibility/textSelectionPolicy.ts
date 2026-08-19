const EDITABLE_TEXT_SELECTOR = [
  'textarea',
  '[contenteditable="true"]',
  '[data-allow-text-selection="true"]',
  'input:not([type])',
  'input[type="text"]',
  'input[type="search"]',
  'input[type="url"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="number"]',
  'input[type="tel"]',
].join(',')

const NATIVE_TOUCH_MANAGED_SELECTOR = '[data-manages-native-touch="true"]'
const REPLAYABLE_CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'label',
].join(',')
const DOUBLE_TOUCH_WINDOW_MILLISECONDS = 500
const DOUBLE_TOUCH_RADIUS_CSS_PIXELS = 48
const TAP_MOVEMENT_TOLERANCE_CSS_PIXELS = 12

interface TouchPosition {
  readonly timeStamp: number
  readonly x: number
  readonly y: number
}

interface SuppressedTouch {
  readonly identifier: number
  readonly target: Element
  readonly startX: number
  readonly startY: number
  moved: boolean
}

/**
 * Keeps native selection and callout gestures inside genuine text editors.
 * Scrolling and Pointer Event controls remain untouched.
 */
export function installTextSelectionPolicy(
  documentPort: Document = document,
): () => void {
  const isEditableText = (target: EventTarget | null): boolean =>
    target instanceof Element &&
    target.closest(EDITABLE_TEXT_SELECTOR) !== null
  const preventOutsideEditor = (event: Event): void => {
    if (!isEditableText(event.target)) event.preventDefault()
  }
  const elementAtTarget = (target: EventTarget | null): Element | null =>
    target instanceof Element ? target : null
  const distanceSquared = (
    firstX: number,
    firstY: number,
    secondX: number,
    secondY: number,
  ): number => (firstX - secondX) ** 2 + (firstY - secondY) ** 2
  let previousTouch: TouchPosition | null = null
  let suppressedTouch: SuppressedTouch | null = null

  const clearSelection = (): void => {
    documentPort.getSelection()?.removeAllRanges()
  }
  const onTouchStart = (event: TouchEvent): void => {
    const target = elementAtTarget(event.target)
    if (
      target === null ||
      isEditableText(target) ||
      target.closest(NATIVE_TOUCH_MANAGED_SELECTOR) !== null ||
      event.touches.length !== 1
    ) {
      previousTouch = null
      suppressedTouch = null
      return
    }
    const touch = event.changedTouches[0] ?? event.touches[0]
    if (touch === undefined) return
    const position: TouchPosition = {
      timeStamp: event.timeStamp,
      x: touch.clientX,
      y: touch.clientY,
    }
    const elapsed =
      previousTouch === null
        ? Number.POSITIVE_INFINITY
        : position.timeStamp - previousTouch.timeStamp
    const repeatedNearbyTouch =
      previousTouch !== null &&
      elapsed >= 0 &&
      elapsed <= DOUBLE_TOUCH_WINDOW_MILLISECONDS &&
      distanceSquared(
        position.x,
        position.y,
        previousTouch.x,
        previousTouch.y,
      ) <= DOUBLE_TOUCH_RADIUS_CSS_PIXELS ** 2
    previousTouch = position
    if (!repeatedNearbyTouch) return

    event.preventDefault()
    clearSelection()
    suppressedTouch = {
      identifier: touch.identifier,
      target,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    }
  }
  const matchingChangedTouch = (event: TouchEvent): Touch | undefined => {
    if (suppressedTouch === null) return undefined
    return Array.from(event.changedTouches).find(
      (touch) => touch.identifier === suppressedTouch?.identifier,
    )
  }
  const onTouchMove = (event: TouchEvent): void => {
    const touch = matchingChangedTouch(event)
    if (touch === undefined || suppressedTouch === null) return
    event.preventDefault()
    if (
      distanceSquared(
        touch.clientX,
        touch.clientY,
        suppressedTouch.startX,
        suppressedTouch.startY,
      ) > TAP_MOVEMENT_TOLERANCE_CSS_PIXELS ** 2
    ) {
      suppressedTouch.moved = true
    }
  }
  const finishSuppressedTouch = (event: TouchEvent): void => {
    const touch = matchingChangedTouch(event)
    if (touch === undefined || suppressedTouch === null) return
    event.preventDefault()
    const { moved, target } = suppressedTouch
    suppressedTouch = null
    clearSelection()
    if (moved) return

    const control = target.closest<HTMLElement>(REPLAYABLE_CONTROL_SELECTOR)
    control?.click()
  }
  const cancelSuppressedTouch = (): void => {
    suppressedTouch = null
  }
  const clearOutsideEditorSelection = (): void => {
    // Safari keeps input and textarea caret state outside the document
    // Selection API. Its anchor can therefore point at the page even while a
    // text editor is actively receiving keyboard input. Clearing that
    // document selection terminates Safari's editing session after one key.
    if (isEditableText(documentPort.activeElement)) return
    const selection = documentPort.getSelection()
    const anchor = selection?.anchorNode
    if (
      selection === null ||
      anchor == null ||
      isEditableText(
        anchor.nodeType === Node.ELEMENT_NODE
          ? anchor
          : anchor.parentElement,
      )
    ) {
      return
    }
    selection.removeAllRanges()
  }

  for (const eventName of ['selectstart', 'contextmenu', 'dragstart', 'dblclick']) {
    documentPort.addEventListener(
      eventName,
      preventOutsideEditor,
      true,
    )
  }
  documentPort.addEventListener(
    'selectionchange',
    clearOutsideEditorSelection,
  )
  documentPort.addEventListener('touchstart', onTouchStart, {
    capture: true,
    passive: false,
  })
  documentPort.addEventListener('touchmove', onTouchMove, {
    capture: true,
    passive: false,
  })
  documentPort.addEventListener('touchend', finishSuppressedTouch, {
    capture: true,
    passive: false,
  })
  documentPort.addEventListener('touchcancel', cancelSuppressedTouch, true)
  return () => {
    for (const eventName of ['selectstart', 'contextmenu', 'dragstart', 'dblclick']) {
      documentPort.removeEventListener(
        eventName,
        preventOutsideEditor,
        true,
      )
    }
    documentPort.removeEventListener(
      'selectionchange',
      clearOutsideEditorSelection,
    )
    documentPort.removeEventListener('touchstart', onTouchStart, true)
    documentPort.removeEventListener('touchmove', onTouchMove, true)
    documentPort.removeEventListener('touchend', finishSuppressedTouch, true)
    documentPort.removeEventListener(
      'touchcancel',
      cancelSuppressedTouch,
      true,
    )
  }
}
