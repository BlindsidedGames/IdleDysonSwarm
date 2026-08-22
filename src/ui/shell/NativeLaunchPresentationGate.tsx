import { useLayoutEffect, useRef } from 'react'

export interface NativeLaunchPresentationGateProps {
  readonly enabled: boolean
  readonly onPresented: () => void
}

/** Signals that React has committed a native presentation of any startup phase. */
export function NativeLaunchPresentationGate({
  enabled,
  onPresented,
}: NativeLaunchPresentationGateProps) {
  const presented = useRef(false)
  useLayoutEffect(() => {
    if (!enabled || presented.current) return
    presented.current = true
    onPresented()
  }, [enabled, onPresented])

  return null
}
