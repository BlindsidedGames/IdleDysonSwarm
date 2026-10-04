import { expect, test } from 'vitest'
import { saveExportFileName, canExportSaveFile } from './saveFileExport'

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


test('optional filename timestamps preserve the native .idsw filename contract', () => {
  const now = new Date('2026-10-03T22:39:10.123Z')
  expect(saveExportFileName(false, now)).toBe('idle-dyson-swarm-save.idsw')
  expect(saveExportFileName(true, now)).toBe('idle-dyson-swarm-save-2026-10-03T22-39-10-123Z.idsw')
})
