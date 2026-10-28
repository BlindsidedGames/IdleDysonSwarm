import { expect, test } from 'vitest'
import { canExportSaveFile } from './saveFileExport'

test('file export is available for Android and desktop, including desktop web', () => {
  expect(canExportSaveFile('android', 'Android Mobile', 5)).toBe(true)
  expect(canExportSaveFile('web', 'Android Mobile', 5)).toBe(true)
  expect(canExportSaveFile('web', 'Windows', 0)).toBe(true)
  expect(canExportSaveFile('web', 'Macintosh', 0)).toBe(true)
})
test('file export is hidden on iOS native, iPhone web and iPad desktop-mode web', () => {
  expect(canExportSaveFile('ios', '', 0)).toBe(false)
  expect(canExportSaveFile('web', 'iPhone', 5)).toBe(false)
  expect(canExportSaveFile('web', 'Macintosh', 5)).toBe(false)
})
