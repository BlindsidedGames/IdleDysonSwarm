// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { applyOrientationPreference, readOrientationPreference, orientationAvailable, restoreScreenOrientation } from './screenOrientation'
afterEach(() => localStorage.clear())
test('orientation is device-local, validates stored values, and persists only after native acceptance', async () => {
  expect(readOrientationPreference()).toBe('auto')
  const native = { setOrientation: vi.fn().mockResolvedValue(undefined) }
  await applyOrientationPreference('landscape', native)
  expect(native.setOrientation).toHaveBeenCalledWith({ orientation: 'landscape' })
  expect(readOrientationPreference()).toBe('landscape')
  native.setOrientation.mockRejectedValue(new Error('unavailable'))
  await expect(applyOrientationPreference('portrait', native)).rejects.toThrow('unavailable')
  expect(readOrientationPreference()).toBe('landscape')
  localStorage.setItem('ids.screen-orientation', 'invalid')
  expect(readOrientationPreference()).toBe('auto')
})
test('browser does not request a native orientation lock', async () => {
  expect(orientationAvailable()).toBe(false)
  await expect(restoreScreenOrientation()).resolves.toBeUndefined()
})
