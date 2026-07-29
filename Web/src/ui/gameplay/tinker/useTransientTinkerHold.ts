import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
} from 'react'
import type {
  CanonicalPlayerCommand,
  UiRuntimePlayerCommandResult,
} from '../../runtime'

export const TINKER_REPEAT_HOLD_MILLISECONDS = 500

export type TinkerPlayerCommand = Extract<
  CanonicalPlayerCommand,
  { readonly kind: 'tinker.start' | 'tinker.set-repeat' }
>

export type TinkerCommandDispatch = (
  command: TinkerPlayerCommand,
) => Promise<UiRuntimePlayerCommandResult>

export interface TransientTinkerHoldOptions {
  readonly canStart: boolean
  readonly runtimeRepeat: boolean
  readonly dispatch: TinkerCommandDispatch
  readonly onResult: (
    command: TinkerPlayerCommand,
    result: UiRuntimePlayerCommandResult,
  ) => void
  readonly onDispatchFailure: (command: TinkerPlayerCommand) => void
}

export interface TransientTinkerHoldBindings {
  readonly active: boolean
  readonly onPointerDown: PointerEventHandler<HTMLButtonElement>
  readonly onPointerUp: PointerEventHandler<HTMLButtonElement>
  readonly onPointerCancel: PointerEventHandler<HTMLButtonElement>
  readonly onLostPointerCapture: PointerEventHandler<HTMLButtonElement>
  readonly onKeyDown: KeyboardEventHandler<HTMLButtonElement>
  readonly onKeyUp: KeyboardEventHandler<HTMLButtonElement>
  readonly onBlur: FocusEventHandler<HTMLButtonElement>
  readonly onClick: MouseEventHandler<HTMLButtonElement>
}

type HoldSource = 'pointer' | 'space'

export function useTransientTinkerHold({
  canStart,
  runtimeRepeat,
  dispatch,
  onResult,
  onDispatchFailure,
}: TransientTinkerHoldOptions): TransientTinkerHoldBindings {
  const [active, setActive] = useState(false)
  const mountedRef = useRef(true)
  const activeSourceRef = useRef<HoldSource | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const capturedControlRef = useRef<HTMLButtonElement | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardClickTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatEnabledRequestedRef = useRef(false)
  const repeatDisabledRequestedRef = useRef(false)
  const suppressSpaceClickRef = useRef(false)
  const dispatchQueueRef = useRef<Promise<void> | null>(null)
  const canStartRef = useRef(canStart)
  const runtimeRepeatRef = useRef(runtimeRepeat)
  const dispatchRef = useRef(dispatch)
  const onResultRef = useRef(onResult)
  const onDispatchFailureRef = useRef(onDispatchFailure)

  canStartRef.current = canStart
  runtimeRepeatRef.current = runtimeRepeat
  dispatchRef.current = dispatch
  onResultRef.current = onResult
  onDispatchFailureRef.current = onDispatchFailure

  const send = useCallback((command: TinkerPlayerCommand): void => {
    const run = async (): Promise<void> => {
      try {
        const result = await dispatchRef.current(command)
        if (mountedRef.current) onResultRef.current(command, result)
      } catch {
        if (mountedRef.current) {
          onDispatchFailureRef.current(command)
        }
      }
    }
    const previous = dispatchQueueRef.current
    const current = previous === null
      ? run()
      : previous.then(run, run)
    dispatchQueueRef.current = current
    void current.finally(() => {
      if (dispatchQueueRef.current === current) {
        dispatchQueueRef.current = null
      }
    })
  }, [])

  const clearHoldTimer = useCallback((): void => {
    if (holdTimerRef.current === null) return
    clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  const requestRepeatDisabled = useCallback((): void => {
    const repeatMayBeEnabled =
      repeatEnabledRequestedRef.current || runtimeRepeatRef.current
    if (!repeatMayBeEnabled || repeatDisabledRequestedRef.current) return
    repeatDisabledRequestedRef.current = true
    send({ kind: 'tinker.set-repeat', enabled: false })
  }, [send])

  const finishActiveHold = useCallback((): void => {
    const source = activeSourceRef.current
    if (source === null) return

    const pointerId = activePointerIdRef.current
    const control = capturedControlRef.current
    activeSourceRef.current = null
    activePointerIdRef.current = null
    capturedControlRef.current = null
    clearHoldTimer()
    requestRepeatDisabled()
    if (mountedRef.current) setActive(false)

    if (
      source === 'pointer' &&
      pointerId !== null &&
      control?.hasPointerCapture?.(pointerId)
    ) {
      try {
        control.releasePointerCapture(pointerId)
      } catch {
        // Capture may already have been released by the browser.
      }
    }
  }, [clearHoldTimer, requestRepeatDisabled])

  const beginHold = useCallback((source: HoldSource): boolean => {
    if (activeSourceRef.current !== null || !canStartRef.current) {
      return false
    }
    activeSourceRef.current = source
    repeatEnabledRequestedRef.current = false
    repeatDisabledRequestedRef.current = false
    if (mountedRef.current) setActive(true)
    send({ kind: 'tinker.start', repeat: false })
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      if (activeSourceRef.current !== source) return
      repeatEnabledRequestedRef.current = true
      send({ kind: 'tinker.set-repeat', enabled: true })
    }, TINKER_REPEAT_HOLD_MILLISECONDS)
    return true
  }, [send])

  const onPointerDown = useCallback<
    PointerEventHandler<HTMLButtonElement>
  >((event) => {
    if (event.button !== 0 || !beginHold('pointer')) return
    activePointerIdRef.current = event.pointerId
    capturedControlRef.current = event.currentTarget
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The remaining window/blur cleanup paths still stop transient repeat.
    }
  }, [beginHold])

  const finishMatchingPointer = useCallback(
    (pointerId: number): void => {
      if (
        activeSourceRef.current !== 'pointer' ||
        activePointerIdRef.current !== pointerId
      ) {
        return
      }
      finishActiveHold()
    },
    [finishActiveHold],
  )

  const onPointerUp = useCallback<PointerEventHandler<HTMLButtonElement>>(
    (event) => finishMatchingPointer(event.pointerId),
    [finishMatchingPointer],
  )
  const onPointerCancel =
    useCallback<PointerEventHandler<HTMLButtonElement>>(
      (event) => finishMatchingPointer(event.pointerId),
      [finishMatchingPointer],
    )
  const onLostPointerCapture =
    useCallback<PointerEventHandler<HTMLButtonElement>>(
      (event) => finishMatchingPointer(event.pointerId),
      [finishMatchingPointer],
    )

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.key === 'Enter') {
        suppressSpaceClickRef.current = false
        if (event.repeat) event.preventDefault()
        return
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return
      event.preventDefault()
      if (event.repeat) return
      suppressSpaceClickRef.current = true
      beginHold('space')
    },
    [beginHold],
  )

  const onKeyUp = useCallback<KeyboardEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.key !== ' ' && event.key !== 'Spacebar') return
      event.preventDefault()
      if (activeSourceRef.current === 'space') finishActiveHold()
      if (keyboardClickTimerRef.current !== null) {
        clearTimeout(keyboardClickTimerRef.current)
      }
      keyboardClickTimerRef.current = setTimeout(() => {
        keyboardClickTimerRef.current = null
        suppressSpaceClickRef.current = false
      }, 0)
    },
    [finishActiveHold],
  )

  const onClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.detail > 0) return
      if (suppressSpaceClickRef.current) {
        suppressSpaceClickRef.current = false
        return
      }
      if (canStartRef.current) {
        send({ kind: 'tinker.start', repeat: false })
      }
    },
    [send],
  )

  useEffect(() => {
    mountedRef.current = true
    const handleWindowBlur = (): void => {
      finishActiveHold()
      if (activeSourceRef.current === null) requestRepeatDisabled()
    }
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      mountedRef.current = false
      window.removeEventListener('blur', handleWindowBlur)
      clearHoldTimer()
      if (keyboardClickTimerRef.current !== null) {
        clearTimeout(keyboardClickTimerRef.current)
        keyboardClickTimerRef.current = null
      }
      requestRepeatDisabled()
      activeSourceRef.current = null
      activePointerIdRef.current = null
      capturedControlRef.current = null
    }
  }, [clearHoldTimer, finishActiveHold, requestRepeatDisabled])

  return {
    active,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    onKeyDown,
    onKeyUp,
    onBlur: finishActiveHold,
    onClick,
  }
}
