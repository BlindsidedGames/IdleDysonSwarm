// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installNativeSafeAreaInsets,
  type NativeSafeAreaPlugin,
  type NativeSystemInsets,
} from './nativeHostBridge'

function fakePlugin(initial: NativeSystemInsets): {
  readonly plugin: NativeSafeAreaPlugin
  emit(insets: NativeSystemInsets): void
  readonly remove: ReturnType<typeof vi.fn>
} {
  let listener: ((event: NativeSystemInsets) => void) | undefined
  const remove = vi.fn(async () => undefined)
  return {
    plugin: {
      systemInsets: vi.fn(async () => initial),
      addListener: vi.fn(async (_eventName, nextListener) => {
        listener = nextListener
        return { remove }
      }),
    },
    emit: (insets) => listener?.(insets),
    remove,
  }
}

describe('native Android safe-area insets', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('applies the current insets and tracks later system changes', async () => {
    const source = fakePlugin({ top: 40, right: 0, bottom: 60, left: 0 })
    const uninstall = await installNativeSafeAreaInsets({
      isNativePlatform: true,
      platform: 'android',
      plugin: source.plugin,
    })

    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-top',
    )).toBe('40px')
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-bottom',
    )).toBe('60px')

    source.emit({ top: 0, right: 24, bottom: 0, left: 12 })
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-right',
    )).toBe('24px')
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-left',
    )).toBe('12px')

    uninstall()
    expect(source.remove).toHaveBeenCalledOnce()
  })

  it('sanitizes invalid native values before exposing them to CSS', async () => {
    const source = fakePlugin({
      top: Number.NaN,
      right: Number.POSITIVE_INFINITY,
      bottom: -10,
      left: 5000,
    })
    await installNativeSafeAreaInsets({
      isNativePlatform: true,
      platform: 'android',
      plugin: source.plugin,
    })

    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-top',
    )).toBe('0px')
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-right',
    )).toBe('0px')
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-bottom',
    )).toBe('0px')
    expect(document.documentElement.style.getPropertyValue(
      '--android-safe-area-left',
    )).toBe('2048px')
  })

  it('does nothing outside the native Android host', async () => {
    const source = fakePlugin({ top: 40, right: 0, bottom: 60, left: 0 })
    await installNativeSafeAreaInsets({
      isNativePlatform: true,
      platform: 'ios',
      plugin: source.plugin,
    })

    expect(source.plugin.systemInsets).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('style')).toBeNull()
  })

  it('fails open if the native bridge cannot provide insets', async () => {
    const remove = vi.fn(async () => undefined)
    const plugin: NativeSafeAreaPlugin = {
      systemInsets: vi.fn(async () => {
        throw new Error('unavailable')
      }),
      addListener: vi.fn(async () => ({ remove })),
    }

    await expect(installNativeSafeAreaInsets({
      isNativePlatform: true,
      platform: 'android',
      plugin,
    })).resolves.toBeTypeOf('function')
    expect(remove).toHaveBeenCalledOnce()
  })
})
