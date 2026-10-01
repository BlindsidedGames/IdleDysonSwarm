import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'

const HOLD_REPEAT_DELAY_MS = 400
const HOLD_REPEAT_INTERVAL_MS = 100

// Repeat only serial, accepted purchases. Release/cancellation invalidates pending work.
export function usePressAndHoldRepeat(
  enabled: boolean,
  action: () => Promise<boolean>,
  resetKey: string | number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdingRef = useRef(false)
  const repeatedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const enabledRef = useRef(enabled)
  const actionRef = useRef(action)
  const generationRef = useRef(0)
  const heldKeyRef = useRef<string | null>(null)
  enabledRef.current = enabled
  actionRef.current = action

  const clearTimer = () => {
    if (timerRef.current === null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const schedule = (delay: number) => {
    clearTimer()
    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      if (!holdingRef.current || !enabledRef.current) return
      repeatedRef.current = true
      // A completed command from an earlier press cannot restart a newer hold.
      const generation = generationRef.current
      const accepted = await actionRef.current()
      if (generation !== generationRef.current) return
      if (!accepted) {
        end()
        return
      }
      if (holdingRef.current && enabledRef.current) {
        schedule(HOLD_REPEAT_INTERVAL_MS)
      }
    }, delay)
  }

  const begin = () => {
    if (!enabledRef.current || holdingRef.current) return
    holdingRef.current = true
    generationRef.current += 1
    repeatedRef.current = false
    suppressClickRef.current = false
    schedule(HOLD_REPEAT_DELAY_MS)
  }

  const end = () => {
    heldKeyRef.current = null
    if (!holdingRef.current) return
    holdingRef.current = false
    generationRef.current += 1
    clearTimer()
    if (repeatedRef.current) suppressClickRef.current = true
  }

  useEffect(() => {
    end()
  }, [resetKey, enabled])

  useEffect(() => {
    // A pending purchase disables the button. Browsers are not required to
    // deliver the matching pointerup to a disabled control, so also observe
    // release outside the control to prevent a completed dispatch from
    // restarting a hold the player has already ended.
    const endGlobalHold = () => {
      heldKeyRef.current = null
      if (!holdingRef.current) return
      holdingRef.current = false
      generationRef.current += 1
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (repeatedRef.current) suppressClickRef.current = true
    }
    window.addEventListener('pointerup', endGlobalHold)
    window.addEventListener('pointercancel', endGlobalHold)
    window.addEventListener('blur', endGlobalHold)
    // Disabling a pending purchase can remove keyboard focus. Release must
    // still finish the press even when its keyup targets the document body.
    const onGlobalKeyUp = (event: KeyboardEvent) => {
      if (event.key !== heldKeyRef.current) return
      event.preventDefault()
      const activate = !repeatedRef.current
      endGlobalHold()
      suppressClickRef.current = false
      if (activate) void actionRef.current()
    }
    window.addEventListener('keyup', onGlobalKeyUp)
    const onVisibilityChange = () => {
      if (document.hidden) endGlobalHold()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pointerup', endGlobalHold)
      window.removeEventListener('pointercancel', endGlobalHold)
      window.removeEventListener('blur', endGlobalHold)
      window.removeEventListener('keyup', onGlobalKeyUp)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      holdingRef.current = false
      heldKeyRef.current = null
      generationRef.current += 1
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return {
    onClick: () => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }
      void actionRef.current()
    },
    onPointerDown: () => {
      suppressClickRef.current = false
      begin()
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      // The timer (or keyup for a tap/Max) owns activation, not browser repeat.
      event.preventDefault()
      if (event.repeat || heldKeyRef.current !== null) return
      heldKeyRef.current = event.key
      repeatedRef.current = false
      suppressClickRef.current = false
      begin()
    },
    onKeyUp: (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') event.preventDefault()
    },
  }
}
