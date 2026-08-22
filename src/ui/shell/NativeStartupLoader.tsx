import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import type { StartupShellPhase } from './contracts'
import { startupShellMessages } from './messages'

const SLOW_STARTUP_DELAY_MILLISECONDS = 3_000

export interface NativeStartupLoaderProps {
  readonly phase: Extract<
    StartupShellPhase,
    'idle' | 'starting' | 'ready-placeholder' | 'stopping'
  >
  readonly slowDelayMilliseconds?: number
}

/** Continuous native launch presentation between the OS splash and gameplay. */
export function NativeStartupLoader({
  phase,
  slowDelayMilliseconds = SLOW_STARTUP_DELAY_MILLISECONDS,
}: NativeStartupLoaderProps) {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (phase !== 'idle' && phase !== 'starting') {
      setSlow(false)
      return undefined
    }
    const handle = globalThis.setTimeout(
      () => setSlow(true),
      slowDelayMilliseconds,
    )
    return () => globalThis.clearTimeout(handle)
  }, [phase, slowDelayMilliseconds])

  const status = phase === 'stopping'
    ? startupShellMessages.nativeSaving
    : slow
      ? startupShellMessages.nativeStartingSlow
      : startupShellMessages.nativeStarting

  return (
    <main
      className="native-launch-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img
        className="native-launch-loader__mark"
        src="./icons/pwa-icon-512.png"
        alt=""
      />
      <h1 className="native-launch-loader__title">
        <FormattedMessage {...startupShellMessages.appName} />
      </h1>
      <span
        className="native-launch-loader__activity"
        aria-hidden="true"
      />
      <p className="native-launch-loader__status">
        <FormattedMessage {...status} />
      </p>
    </main>
  )
}
