import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEventHandler,
  type FocusEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type RefCallback,
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

export type TinkerPressPhase = 'idle' | 'pressed' | 'repeating'

export interface TinkerPressControllerOptions {
  readonly canInteract: boolean
  readonly repeatAvailable: boolean
  readonly runtimeRepeat: boolean
  readonly dispatch: TinkerCommandDispatch
  readonly onResult: (
    command: TinkerPlayerCommand,
    result: UiRuntimePlayerCommandResult,
  ) => void
  readonly onDispatchFailure: (command: TinkerPlayerCommand) => void
}

export interface TinkerPressControllerBindings {
  readonly phase: TinkerPressPhase
  readonly active: boolean
  readonly repeating: boolean
  readonly controlRef: RefCallback<HTMLButtonElement>
  readonly onPointerDown: PointerEventHandler<HTMLButtonElement>
  readonly onPointerUp: PointerEventHandler<HTMLButtonElement>
  readonly onPointerCancel: PointerEventHandler<HTMLButtonElement>
  readonly onLostPointerCapture: PointerEventHandler<HTMLButtonElement>
  readonly onKeyDown: KeyboardEventHandler<HTMLButtonElement>
  readonly onKeyUp: KeyboardEventHandler<HTMLButtonElement>
  readonly onBlur: FocusEventHandler<HTMLButtonElement>
  readonly onClick: MouseEventHandler<HTMLButtonElement>
  readonly onContextMenu: MouseEventHandler<HTMLButtonElement>
  readonly onDragStart: DragEventHandler<HTMLButtonElement>
}

type PressSource =
  | {
      readonly kind: 'pointer'
      readonly pointerId: number
      readonly control: HTMLButtonElement
    }
  | { readonly kind: 'space' }

/**
 * Owns one press through either a single activation or a latched repeat. The
 * controller expresses only start and desired-repeat intents; canonical
 * simulation owns cycle completion and rewards.
 */
export function useTinkerPressController({
  canInteract,
  repeatAvailable,
  runtimeRepeat,
  dispatch,
  onResult,
  onDispatchFailure,
}: TinkerPressControllerOptions): TinkerPressControllerBindings {
  const [phase, setPhase] = useState<TinkerPressPhase>('idle')
  const mountedRef = useRef(true)
  const sourceRef = useRef<PressSource | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardClickTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatEnabledRequestedRef = useRef(false)
  const repeatDisabledRequestedRef = useRef(false)
  const suppressSpaceClickRef = useRef(false)
  const dispatchQueueRef = useRef<Promise<void> | null>(null)
  const controlRef = useRef<HTMLButtonElement | null>(null)
  const canInteractRef = useRef(canInteract)
  const repeatAvailableRef = useRef(repeatAvailable)
  const runtimeRepeatRef = useRef(runtimeRepeat)
  const dispatchRef = useRef(dispatch)
  const onResultRef = useRef(onResult)
  const onDispatchFailureRef = useRef(onDispatchFailure)

  canInteractRef.current = canInteract
  repeatAvailableRef.current = repeatAvailable
  runtimeRepeatRef.current = runtimeRepeat
  dispatchRef.current = dispatch
  onResultRef.current = onResult
  onDispatchFailureRef.current = onDispatchFailure

  const enqueue = useCallback((command: TinkerPlayerCommand): void => {
    const run = async (): Promise<void> => {
      try {
        const result = await dispatchRef.current(command)
        if (mountedRef.current) onResultRef.current(command, result)
      } catch {
        if (mountedRef.current) onDispatchFailureRef.current(command)
      }
    }
    const previous = dispatchQueueRef.current
    const current = previous === null ? run() : previous.then(run, run)
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
    enqueue({ kind: 'tinker.set-repeat', enabled: false })
  }, [enqueue])

  const releasePointerCapture = useCallback((
    source: PressSource | null,
  ): void => {
    if (
      source?.kind !== 'pointer' ||
      !source.control.hasPointerCapture?.(source.pointerId)
    ) return
    try {
      source.control.releasePointerCapture(source.pointerId)
    } catch {
      // The browser may have released capture during cancellation.
    }
  }, [])

  const stopInteraction = useCallback((): void => {
    const source = sourceRef.current
    sourceRef.current = null
    clearHoldTimer()
    requestRepeatDisabled()
    repeatEnabledRequestedRef.current = false
    if (mountedRef.current) setPhase('idle')
    releasePointerCapture(source)
  }, [clearHoldTimer, releasePointerCapture, requestRepeatDisabled])

  const releasePress = useCallback((): void => {
    const source = sourceRef.current
    if (source === null) return
    sourceRef.current = null
    clearHoldTimer()
    releasePointerCapture(source)
    if (
      repeatEnabledRequestedRef.current ||
      runtimeRepeatRef.current
    ) {
      if (mountedRef.current) setPhase('repeating')
      return
    }
    if (mountedRef.current) setPhase('idle')
  }, [clearHoldTimer, releasePointerCapture])

  const beginPress = useCallback((source: PressSource): boolean => {
    if (
      sourceRef.current !== null ||
      repeatEnabledRequestedRef.current ||
      runtimeRepeatRef.current ||
      !canInteractRef.current
    ) return false
    sourceRef.current = source
    repeatEnabledRequestedRef.current = false
    repeatDisabledRequestedRef.current = false
    if (mountedRef.current) setPhase('pressed')
    enqueue({ kind: 'tinker.start', repeat: false })
    if (!repeatAvailableRef.current) return true
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      if (sourceRef.current !== source) return
      repeatEnabledRequestedRef.current = true
      if (mountedRef.current) setPhase('repeating')
      enqueue({ kind: 'tinker.start', repeat: true })
    }, TINKER_REPEAT_HOLD_MILLISECONDS)
    return true
  }, [enqueue])

  const onPointerDown = useCallback<
    PointerEventHandler<HTMLButtonElement>
  >((event) => {
    if (event.button !== 0) return
    const source: PressSource = {
      kind: 'pointer',
      pointerId: event.pointerId,
      control: event.currentTarget,
    }
    if (!beginPress(source)) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Page lifecycle cleanup still clears transient repeat without capture.
    }
  }, [beginPress])

  const finishMatchingPointer = useCallback((pointerId: number): void => {
    const source = sourceRef.current
    if (source?.kind !== 'pointer' || source.pointerId !== pointerId) return
    releasePress()
  }, [releasePress])

  const cancelMatchingPointer = useCallback((pointerId: number): void => {
    const source = sourceRef.current
    if (source?.kind !== 'pointer' || source.pointerId !== pointerId) return
    stopInteraction()
  }, [stopInteraction])

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.key === 'Enter') {
        if (event.repeat) event.preventDefault()
        return
      }
      if (event.key !== ' ' && event.key !== 'Spacebar') return
      event.preventDefault()
      if (event.repeat) return
      suppressSpaceClickRef.current = true
      beginPress({ kind: 'space' })
    },
    [beginPress],
  )

  const onKeyUp = useCallback<KeyboardEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.key !== ' ' && event.key !== 'Spacebar') return
      event.preventDefault()
      if (sourceRef.current?.kind === 'space') releasePress()
      if (keyboardClickTimerRef.current !== null) {
        clearTimeout(keyboardClickTimerRef.current)
      }
      keyboardClickTimerRef.current = setTimeout(() => {
        keyboardClickTimerRef.current = null
        suppressSpaceClickRef.current = false
      }, 0)
    },
    [releasePress],
  )

  const onClick = useCallback<MouseEventHandler<HTMLButtonElement>>(
    (event) => {
      if (event.detail > 0) {
        event.preventDefault()
        return
      }
      if (suppressSpaceClickRef.current) {
        suppressSpaceClickRef.current = false
        return
      }
      if (
        canInteractRef.current &&
        !repeatEnabledRequestedRef.current &&
        !runtimeRepeatRef.current
      ) {
        enqueue({ kind: 'tinker.start', repeat: false })
      }
    },
    [enqueue],
  )

  const preventContextMenu = useCallback<
    MouseEventHandler<HTMLButtonElement>
  >((event) => event.preventDefault(), [])
  const preventDrag = useCallback<DragEventHandler<HTMLButtonElement>>(
    (event) => event.preventDefault(),
    [],
  )

  const preventNativeSelection = useCallback((event: Event): void => {
    event.preventDefault()
    document.getSelection()?.removeAllRanges()
  }, [])
  const setControlRef = useCallback<RefCallback<HTMLButtonElement>>(
    (control) => {
      controlRef.current?.removeEventListener(
        'selectstart',
        preventNativeSelection,
        true,
      )
      controlRef.current?.removeEventListener(
        'touchstart',
        preventNativeSelection,
        true,
      )
      controlRef.current?.removeEventListener(
        'touchmove',
        preventNativeSelection,
        true,
      )
      controlRef.current = control
      control?.addEventListener(
        'selectstart',
        preventNativeSelection,
        { capture: true },
      )
      control?.addEventListener(
        'touchstart',
        preventNativeSelection,
        { capture: true, passive: false },
      )
      control?.addEventListener(
        'touchmove',
        preventNativeSelection,
        { capture: true, passive: false },
      )
    },
    [preventNativeSelection],
  )

  useEffect(() => {
    mountedRef.current = true
    const endTransientInput = (): void => stopInteraction()
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== 'visible') stopInteraction()
    }
    window.addEventListener('blur', endTransientInput)
    window.addEventListener('pagehide', endTransientInput)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      mountedRef.current = false
      window.removeEventListener('blur', endTransientInput)
      window.removeEventListener('pagehide', endTransientInput)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
      clearHoldTimer()
      if (keyboardClickTimerRef.current !== null) {
        clearTimeout(keyboardClickTimerRef.current)
        keyboardClickTimerRef.current = null
      }
      stopInteraction()
      sourceRef.current = null
    }
  }, [clearHoldTimer, stopInteraction])

  useEffect(() => {
    if (repeatAvailable || phase !== 'repeating') return
    stopInteraction()
  }, [phase, repeatAvailable, stopInteraction])

  useEffect(() => {
    if (phase !== 'repeating') return
    const stopOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target
      if (
        target instanceof Node &&
        controlRef.current?.contains(target)
      ) return
      stopInteraction()
    }
    document.addEventListener(
      'pointerdown',
      stopOnOutsidePointer,
      true,
    )
    return () => document.removeEventListener(
      'pointerdown',
      stopOnOutsidePointer,
      true,
    )
  }, [phase, stopInteraction])

  return {
    phase,
    active: phase !== 'idle',
    repeating: phase === 'repeating',
    controlRef: setControlRef,
    onPointerDown,
    onPointerUp: (event) => finishMatchingPointer(event.pointerId),
    onPointerCancel: (event) => cancelMatchingPointer(event.pointerId),
    onLostPointerCapture: (event) =>
      cancelMatchingPointer(event.pointerId),
    onKeyDown,
    onKeyUp,
    onBlur: stopInteraction,
    onClick,
    onContextMenu: preventContextMenu,
    onDragStart: preventDrag,
  }
}
