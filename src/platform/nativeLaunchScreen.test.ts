import { beforeEach, describe, expect, test, vi } from 'vitest'

const hide = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}))
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide },
}))

describe('native launch screen', () => {
  beforeEach(() => {
    hide.mockReset()
    vi.resetModules()
  })

  test('retries after a transient hide failure instead of caching it forever', async () => {
    hide.mockRejectedValueOnce(new Error('transient native failure'))
      .mockResolvedValueOnce(undefined)
    const { dismissNativeLaunchScreen } =
      await import('./nativeLaunchScreen')

    await expect(dismissNativeLaunchScreen()).resolves.toBe(false)
    await expect(dismissNativeLaunchScreen()).resolves.toBe(true)
    await expect(dismissNativeLaunchScreen()).resolves.toBe(true)
    expect(hide).toHaveBeenCalledTimes(2)
  })

  test('replaces the long failsafe with a prompt retry after presentation commits', async () => {
    vi.useFakeTimers()
    const dismiss = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const { createNativeLaunchDismissalController } =
      await import('./nativeLaunchScreen')
    const controller = createNativeLaunchDismissalController({ dismiss })

    controller.armFailsafe(10_000)
    await expect(controller.dismissNow()).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(999)
    expect(dismiss).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    expect(dismiss).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(dismiss).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
