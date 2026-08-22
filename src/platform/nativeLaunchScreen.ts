import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

let dismissal: Promise<boolean> | undefined
let dismissed = false

export interface NativeLaunchDismissalController {
  armFailsafe(delayMilliseconds?: number): void
  dismissNow(): Promise<boolean>
}

export interface NativeLaunchDismissalControllerOptions {
  readonly dismiss?: () => Promise<boolean>
  readonly retryDelayMilliseconds?: number
}

/** Dismisses the held Capacitor splash only after branded HTML is mounted. */
export function dismissNativeLaunchScreen(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || dismissed) {
    return Promise.resolve(true)
  }
  dismissal ??= SplashScreen.hide({
    fadeOutDuration: 150,
  }).then(
    () => {
      dismissed = true
      return true
    },
    () => false,
  ).finally(() => {
    dismissal = undefined
  })
  return dismissal
}

/** Keeps retry timing live until the held native launch screen is hidden. */
export function createNativeLaunchDismissalController(
  options: Readonly<NativeLaunchDismissalControllerOptions> = {},
): NativeLaunchDismissalController {
  const dismiss = options.dismiss ?? dismissNativeLaunchScreen
  const retryDelayMilliseconds = options.retryDelayMilliseconds ?? 1_000
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined

  const replaceTimer = (delayMilliseconds: number): void => {
    if (timer !== undefined) globalThis.clearTimeout(timer)
    timer = globalThis.setTimeout(() => {
      timer = undefined
      void dismissNow()
    }, delayMilliseconds)
  }
  const dismissNow = async (): Promise<boolean> => {
    const hidden = await dismiss()
    if (hidden) {
      if (timer !== undefined) globalThis.clearTimeout(timer)
      timer = undefined
    } else {
      replaceTimer(retryDelayMilliseconds)
    }
    return hidden
  }

  return Object.freeze({
    armFailsafe: (delayMilliseconds = 10_000) => {
      replaceTimer(delayMilliseconds)
    },
    dismissNow,
  })
}
