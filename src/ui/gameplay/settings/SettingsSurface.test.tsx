// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { LocalePreferenceContext } from '../../i18n/localeContext'
import { SettingsSurface, type SettingsSurfaceProps } from './SettingsSurface'

afterEach(cleanup)
async function openExport(available: boolean, download = vi.fn(async (): Promise<boolean | null> => true)) {
  const unused = vi.fn()
  const props: SettingsSurfaceProps = {
    resetSave: unused, importSaveFile: unused, importSaveText: unused,
    previewImportSaveFile: unused, previewImportSaveText: unused,
    readSaveExport: async () => ({ text: 'captured-save-text', basis: 'current' }),
    downloadSaveText: download, copySaveText: unused,
    saveFileExportAvailable: available,
  }
  render(<IntlProvider locale="en" messages={{}}>
    <LocalePreferenceContext.Provider value={{locale: 'en', preference: 'en', setPreference: unused}}>
      <SettingsSurface {...props} />
    </LocalePreferenceContext.Provider>
  </IntlProvider>)
  fireEvent.click(screen.getByRole('button', {name: 'Export'}))
  await waitFor(() => expect((screen.getByLabelText('Save string') as HTMLTextAreaElement).value).toBe('captured-save-text'))
  return download
}
test('iOS retains Copy String but has no file export button', async () => {
  await openExport(false)
  expect(screen.getByRole('button', {name: 'Copy String'})).toBeTruthy()
  expect(screen.queryByRole('button', {name: 'Save File'})).toBeNull()
})
test('save action waits for completion and exports the captured text', async () => {
  let finish!: (result: boolean) => void
  const download = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve }))
  await openExport(true, download)
  const button = screen.getByRole('button', {name: 'Save File'}) as HTMLButtonElement
  expect(button.classList.contains('is-selected')).toBe(false)
  fireEvent.click(button)
  expect(download).toHaveBeenCalledWith('captured-save-text')
  expect(screen.queryByText('Save exported successfully.')).toBeNull()
  finish(true)
  expect(await screen.findByText('Save exported successfully.')).toBeTruthy()
})
test('cancel keeps the export dialog usable without success or failure', async () => {
  await openExport(true, vi.fn(async () => null))
  fireEvent.click(screen.getByRole('button', {name: 'Save File'}))
  await waitFor(() => expect((screen.getByRole('button', {name: 'Save File'}) as HTMLButtonElement).disabled).toBe(false))
  expect(screen.queryByText('Save exported successfully.')).toBeNull()
  expect(screen.queryByText('The save could not be exported. Please try again.')).toBeNull()
})
test('write failure shows failure and keeps Copy String available', async () => {
  await openExport(true, vi.fn(async () => { throw new Error('write failed') }))
  fireEvent.click(screen.getByRole('button', {name: 'Save File'}))
  expect(await screen.findByText('The save could not be exported. Please try again.')).toBeTruthy()
  expect((screen.getByRole('button', {name: 'Copy String'}) as HTMLButtonElement).disabled).toBe(false)
})

test('restoring the default wins over a slider update still being saved', async () => {
  let finishSlider!: () => void
  const change = vi.fn()
    .mockImplementationOnce(() => new Promise<void>(resolve => { finishSlider = resolve }))
    .mockResolvedValue(undefined)
  const unused = vi.fn()
  render(<IntlProvider locale="en" messages={{}}>
    <LocalePreferenceContext.Provider value={{ locale: 'en', preference: 'en', setPreference: unused }}>
      <SettingsSurface
        resetSave={unused} importSaveFile={unused} importSaveText={unused}
        previewImportSaveFile={unused} previewImportSaveText={unused}
        readSaveExport={unused} downloadSaveText={unused} copySaveText={unused}
        processingIntervalMilliseconds={100} onProcessingIntervalChange={change}
      />
    </LocalePreferenceContext.Provider>
  </IntlProvider>)
  const slider = screen.getByRole('slider', { name: 'Update interval' }) as HTMLInputElement
  fireEvent.pointerDown(slider)
  fireEvent.change(slider, { target: { value: '150' } })
  fireEvent.pointerUp(slider)
  expect(change).toHaveBeenCalledWith(150)
  fireEvent.click(screen.getByRole('button', { name: 'Default' }))
  expect(slider.value).toBe('33')
  expect(change).toHaveBeenCalledTimes(1)
  finishSlider()
  await waitFor(() => expect(change).toHaveBeenLastCalledWith(33))
  expect(change).toHaveBeenCalledTimes(2)
  expect(slider.value).toBe('33')
})
