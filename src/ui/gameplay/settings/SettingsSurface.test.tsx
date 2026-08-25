// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  SettingsSurface,
  type SettingsSurfaceProps,
} from './SettingsSurface'
import type { GameAudioService } from '../../../audio'
import {
  NumberNotationPreferenceService,
  NumberNotationProvider,
} from '../../number-notation'
import {
  LocalePreferenceProvider,
  LocalePreferenceService,
} from '../../i18n'
import enCatalog from '../../i18n/catalogs/compiled/en.json'

const settingsStyles = readFileSync(
  join(
    process.cwd(),
    'src',
    'ui',
    'gameplay',
    'settings',
    'settingsSurface.css',
  ),
  'utf8',
)

afterEach(cleanup)

describe('SettingsSurface', () => {
  test('changes the device-local game language and can return to device mode', async () => {
    const user = userEvent.setup()
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    }
    const language = new LocalePreferenceService({
      storage,
      preferredLocales: ['en-AU'],
    })
    renderSettings(vi.fn(), undefined, {}, undefined, language)

    const select = screen.getByRole('combobox', {
      name: 'Game language',
    })
    expect(select).toHaveValue('system')
    expect(within(select).getAllByRole('option')).toHaveLength(9)
    expect(within(select).getByRole('option', {
      name: 'Español (Latinoamérica)',
    })).toBeInTheDocument()
    expect(within(select).getByRole('option', {
      name: 'Português (Brasil)',
    })).toBeInTheDocument()
    expect(within(select).getByRole('option', {
      name: '简体中文',
    })).toBeInTheDocument()
    expect(within(select).getByRole('option', {
      name: 'Русский',
    })).toBeInTheDocument()
    expect(within(select).getByRole('option', {
      name: '日本語',
    })).toBeInTheDocument()
    await user.selectOptions(select, 'fr')
    await waitFor(() => expect(language.getSnapshot()).toEqual({
      preference: 'fr',
      locale: 'fr',
    }))
    expect(
      await screen.findByRole('heading', { name: 'Langue' }),
    ).toBeInTheDocument()
    expect(storage.setItem).toHaveBeenLastCalledWith(
      'idle-dyson-swarm.presentation-locale',
      'fr',
    )

    await user.selectOptions(select, 'system')
    expect(language.getSnapshot()).toEqual({
      preference: 'system',
      locale: 'en',
    })
    expect(
      await screen.findByRole('heading', { name: 'Language' }),
    ).toBeInTheDocument()
  })

  test('changes the accessible device-local notation select by mouse and keyboard', async () => {
    const user = userEvent.setup()
    const local = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    }
    const preference = new NumberNotationPreferenceService({ storage: local })
    renderSettings(vi.fn(), undefined, {}, preference)
    const select = screen.getByRole('combobox', {
      name: 'Large number notation',
    })
    expect(select).toHaveValue('standard')
    await user.selectOptions(select, 'scientific')
    expect(select).toHaveValue('scientific')
    expect(preference.getSnapshot()).toBe('scientific')
    expect(local.setItem).toHaveBeenCalledOnce()
    await user.selectOptions(select, 'engineering')
    expect(select).toHaveValue('engineering')
    select.blur()
    await user.tab()
    await user.tab()
    expect(select).toHaveFocus()
  })

  test('presents and updates the active game interval in Settings', () => {
    const onProcessingIntervalChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      processingIntervalMilliseconds: 50,
      onProcessingIntervalChange,
    })

    expect(
      screen.getByRole('heading', { name: 'Game processing' }),
    ).toBeInTheDocument()
    const interval = screen.getByRole('slider', { name: 'Update interval' })
    expect(interval).toHaveValue('50')
    expect(interval.previousElementSibling).toHaveTextContent('50 ms')
    fireEvent.change(interval, { target: { value: '100' } })
    expect(onProcessingIntervalChange).toHaveBeenLastCalledWith(100)
    expect(interval.previousElementSibling).toHaveTextContent('100 ms')
    expect(settingsStyles).toMatch(/\.settings-surface__processing-control/)
  })

  test('exposes localized device audio volumes and mute controls', async () => {
    const update = vi.fn(() => Promise.resolve())
    const audioSettings = { musicVolume: 0.7, effectsVolume: 0.5, muted: false } as const
    const audio: GameAudioService = {
      target: 'browser',
      initialize: vi.fn(() => Promise.resolve()),
      settings: () => audioSettings,
      subscribe: () => () => undefined,
      update,
      semanticAction: vi.fn(() => Promise.resolve()),
      setMusicIntended: vi.fn(() => Promise.resolve()),
      destroy: vi.fn(() => Promise.resolve()),
    }
    const user = userEvent.setup()
    renderSettings(vi.fn(), undefined, { audio })
    expect(screen.getByRole('heading', { name: 'Audio' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Music volume' })).toHaveValue('70')
    expect(screen.getByRole('slider', { name: 'Effects volume' })).toHaveValue('50')
    await user.click(screen.getByRole('checkbox', { name: 'Mute all audio' }))
    expect(update).toHaveBeenCalledWith({ muted: true })
  })

  test('has no serious or critical automated accessibility violations', async () => {
    const { container } = renderSettings(vi.fn())
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })

  test('owns vertical scrolling and keeps the default mobile layout compact', () => {
    expect(settingsStyles).toMatch(
      /\.settings-surface\s*\{[^}]*block-size:\s*100%;[^}]*min-block-size:\s*0;[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__content\s*\{[^}]*padding:\s*0\.5rem max\(0\.5rem, var\(--safe-area-right\)\) 0\.5rem max\(0\.5rem, var\(--safe-area-left\)\);/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__panel\s*\{[^}]*gap:\s*0\.45rem;[^}]*padding:\s*0\.55rem;/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__audio-controls\s*\{[^}]*gap:\s*0\.1rem;/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__audio-controls input\[type="range"\]\s*\{[^}]*block-size:\s*1\.75rem;/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__processing-control input\s*\{[^}]*min-block-size:\s*1\.75rem;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__audio-controls > label:not\(\.settings-surface__toggle\)\s*\{[^}]*font-weight:\s*var\(--font-weight-semibold\);/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__panel\.settings-surface__panel--audio\s*\{[^}]*gap:\s*0\.15rem;/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__audio-controls > label:not\(\.settings-surface__toggle\),\s*\.settings-surface__processing-control\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__copy h2\s*\{[^}]*font-size:\s*calc\(0\.95rem \* var\(--game-text-scale\)\);/,
    )
    expect(settingsStyles).not.toMatch(
      /\.settings-surface__(?:copy|toggle)[^{]*\{[^}]*white-space:\s*nowrap;/,
    )
  })

  test('styles enabled dialog and file actions as interactive controls', () => {
    expect(settingsStyles).toMatch(
      /\.settings-surface__dialog-actions > button\s*\{[^}]*background:\s*var\(--theme-selected\);[^}]*cursor:\s*pointer;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__file-option > button:hover:not\(:disabled\),\s*\.settings-surface__dialog-actions > button:hover:not\(:disabled\)\s*\{[^}]*background:\s*color-mix\(in srgb, var\(--theme-selected\) 78%, var\(--theme-accent\)\);/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__file-option > button:active:not\(:disabled\),\s*\.settings-surface__dialog-actions > button:active:not\(:disabled\)\s*\{[^}]*background:\s*var\(--theme-panel\);/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__dialog-actions > button:disabled\s*\{[^}]*cursor:\s*wait;[^}]*opacity:\s*0\.7;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__transfer textarea\s*\{[^}]*font-size:\s*max\(1rem,\s*calc\(0\.78rem \* var\(--game-text-scale\)\)\);/,
    )
    expect(settingsStyles).toMatch(
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__transfer textarea\s*\{[^}]*font-size:\s*max\(1rem,\s*calc\(0\.68rem \* var\(--game-text-scale\)\)\);/,
    )
  })

  test('omits the redundant route title and changes the visualization preference', async () => {
    const user = userEvent.setup()
    const onVisualizationVisibleChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      visualizationVisible: true,
      onVisualizationVisibleChange,
    })

    expect(
      screen.queryByRole('heading', { name: 'Settings' }),
    ).not.toBeInTheDocument()
    const toggle = screen.getByRole('checkbox', {
      name: 'Show visualization',
    })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(onVisualizationVisibleChange).toHaveBeenCalledWith(false)
    expect(
      screen.getByRole('heading', {
        name: 'More by Blindsided Games',
      }),
    ).toBeInTheDocument()
  })

  test('shows the export string with copy and optional download actions', async () => {
    const user = userEvent.setup()
    const readSaveExport = vi.fn().mockResolvedValue({
      text: 'IDSWEB1:exported',
      basis: 'current',
    })
    const copySaveText = vi.fn().mockResolvedValue(undefined)
    const downloadSaveText = vi.fn().mockResolvedValue(true)
    renderSettings(vi.fn(), undefined, {
      readSaveExport,
      copySaveText,
      downloadSaveText,
    })

    await user.click(screen.getByRole('button', { name: 'Export' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Export Save',
    })
    expect(dialog.closest('.dyson-shell')).not.toBeNull()
    expect(readSaveExport).toHaveBeenCalledOnce()
    expect(within(dialog).getByRole('textbox', {
      name: 'Save string',
    })).toHaveValue('IDSWEB1:exported')
    await user.click(
      within(dialog).getByRole('button', { name: 'Copy String' }),
    )
    expect(copySaveText).toHaveBeenCalledWith('IDSWEB1:exported')
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Save string copied.',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Download File' }),
    )
    expect(downloadSaveText).toHaveBeenCalledOnce()
    expect(downloadSaveText).toHaveBeenCalledWith('IDSWEB1:exported')
    expect(readSaveExport).toHaveBeenCalledOnce()
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Save exported successfully.',
    )
  })

  test('labels a pre-Stored-Time export and keeps Close and Escape available while capture is pending', async () => {
    const user = userEvent.setup()
    let resolveExport:
      | ((value: { text: string; basis: 'pre-stored-time' }) => void)
      | undefined
    const readSaveExport = vi.fn(() => new Promise<{
      text: string
      basis: 'pre-stored-time'
    }>((resolve) => {
      resolveExport = resolve
    }))
    renderSettings(vi.fn(), undefined, { readSaveExport })

    await user.click(screen.getByRole('button', { name: 'Export' }))
    let dialog = screen.getByRole('dialog', { name: 'Export Save' })
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeEnabled()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(async () => {
      resolveExport?.({
        text: 'IDSWEB1:pre-stored-time',
        basis: 'pre-stored-time',
      })
      await Promise.resolve()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const secondCapture = new Promise<{
      text: string
      basis: 'pre-stored-time'
    }>((resolve) => {
      resolveExport = resolve
    })
    readSaveExport.mockReturnValueOnce(secondCapture)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    dialog = screen.getByRole('dialog', { name: 'Export Save' })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => {
      resolveExport?.({
        text: 'IDSWEB1:pre-stored-time',
        basis: 'pre-stored-time',
      })
      await Promise.resolve()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    readSaveExport.mockResolvedValueOnce({
      text: 'IDSWEB1:pre-stored-time',
      basis: 'pre-stored-time',
    })
    await user.click(screen.getByRole('button', { name: 'Export' }))
    dialog = screen.getByRole('dialog', { name: 'Export Save' })
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'complete save from immediately before that simulation began',
    )
  })

  test('clears a prior pre-Stored-Time notice before capturing a current export', async () => {
    const user = userEvent.setup()
    let resolveCurrent:
      | ((value: { text: string; basis: 'current' }) => void)
      | undefined
    const readSaveExport = vi.fn()
      .mockResolvedValueOnce({
        text: 'IDSWEB1:pre-stored-time',
        basis: 'pre-stored-time' as const,
      })
      .mockImplementationOnce(() => new Promise<{
        text: string
        basis: 'current'
      }>((resolve) => {
        resolveCurrent = resolve
      }))
    renderSettings(vi.fn(), undefined, { readSaveExport })

    await user.click(screen.getByRole('button', { name: 'Export' }))
    let dialog = await screen.findByRole('dialog', { name: 'Export Save' })
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'complete save from immediately before that simulation began',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Export' }))
    dialog = screen.getByRole('dialog', { name: 'Export Save' })
    expect(dialog).not.toHaveTextContent(
      'complete save from immediately before that simulation began',
    )
    resolveCurrent?.({ text: 'IDSWEB1:current', basis: 'current' })
    expect(await within(dialog).findByDisplayValue('IDSWEB1:current'))
      .toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(
      'complete save from immediately before that simulation began',
    )
  })

  test('previews point progress before importing a pasted save string', async () => {
    const user = userEvent.setup()
    const previewImportSaveText = vi.fn().mockResolvedValue({
      accepted: true,
      preview: {
        infinityPoints: 42n,
        quantumPoints: 3n,
        skillPoints: 7n,
      },
    })
    const importSaveText = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    renderSettings(vi.fn(), undefined, {
      previewImportSaveText,
      importSaveText,
    })

    await user.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Import Save?',
    })
    const saveString = within(dialog).getByRole('textbox', {
      name: 'Save string',
    })
    expect(saveString).toHaveFocus()
    await user.type(saveString, 'IDSWEB1:test')
    expect(importSaveText).not.toHaveBeenCalled()
    await user.click(
      within(dialog).getByRole('button', { name: 'Review Save' }),
    )

    await waitFor(() =>
      expect(previewImportSaveText).toHaveBeenCalledWith('IDSWEB1:test'),
    )
    expect(importSaveText).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Infinity Points42.0Quantum Points3.00Skill Points7.00',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Import' }),
    )

    await waitFor(() =>
      expect(importSaveText).toHaveBeenCalledWith('IDSWEB1:test'),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  test('extends confirmed import copy while Offline Time processing is active', async () => {
    const user = userEvent.setup()
    renderSettings(vi.fn(), undefined, {
      storedTime: {
        status: () => ({
          kind: 'running',
          jobId: 'active-job',
          requestedSeconds: 60,
          computedSeconds: 1,
          fraction: 1 / 60,
          elapsedMilliseconds: 10,
          estimatedRemainingMilliseconds: 590,
          maximumChunkMilliseconds: 5,
        }),
        subscribe: () => () => undefined,
        cancel: vi.fn(),
      },
      previewImportSaveText: vi.fn().mockResolvedValue({
        accepted: true,
        preview: {
          infinityPoints: 1n,
          quantumPoints: 2n,
          skillPoints: 3n,
        },
      }),
    })
    await user.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Import Save?' })
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Save string' }),
      'IDSWEB1:test',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Review Save' }))
    expect(await within(dialog).findByText(
      /cancel the current Offline Time simulation without spending its Offline Time/i,
    )).toBeInTheDocument()
  })

  test('also accepts a save file from the import dialog', async () => {
    const user = userEvent.setup()
    const previewImportSaveFile = vi.fn().mockResolvedValue({
      accepted: true,
      preview: {
        infinityPoints: 1n,
        quantumPoints: 2n,
        skillPoints: 3n,
      },
    })
    const importSaveFile = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    renderSettings(vi.fn(), undefined, {
      previewImportSaveFile,
      importSaveFile,
    })
    const file = new File(['IDSWEB1:test'], 'backup.idsw', {
      type: 'text/plain',
    })

    await user.click(screen.getByRole('button', { name: 'Import' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Import Save?',
    })
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    )
    expect(dialog).toHaveTextContent('backup.idsw')
    await user.click(
      within(dialog).getByRole('button', { name: 'Review Save' }),
    )

    await waitFor(() =>
      expect(previewImportSaveFile).toHaveBeenCalledWith(file),
    )
    expect(importSaveFile).not.toHaveBeenCalled()
    await user.click(
      within(dialog).getByRole('button', { name: 'Import' }),
    )

    await waitFor(() =>
      expect(importSaveFile).toHaveBeenCalledWith(file),
    )
  })

  test('changes the persistent optional navigation shortcuts', async () => {
    const user = userEvent.setup()
    const onNavigationVisibilityChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      navigationVisibility: {
        story: false,
        wiki: true,
        statistics: true,
      },
      onNavigationVisibilityChange,
    })

    expect(
      screen.getByRole('checkbox', { name: 'Show Story shortcut' }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show Wiki shortcut' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show Bots' }),
    ).toBeChecked()
    expect(
      screen.getByRole('checkbox', { name: 'Show Store' }),
    ).not.toBeChecked()

    await user.click(
      screen.getByRole('checkbox', { name: 'Show Story shortcut' }),
    )
    expect(onNavigationVisibilityChange).toHaveBeenCalledWith(
      'story',
      true,
    )
  })

  test('offers available destinations and the Include text toggle', async () => {
    const user = userEvent.setup()
    const onNavigationVisibilityChange = vi.fn()
    const onBottomNavigationIncludeTextChange = vi.fn()
    renderSettings(vi.fn(), undefined, {
      availableNavigationItems: ['bots', 'infinity', 'store', 'settings'],
      navigationVisibility: {
        bots: true,
        infinity: false,
        store: true,
        settings: false,
      },
      onNavigationVisibilityChange,
      onBottomNavigationIncludeTextChange,
    })

    const navigationPanel = screen.getByRole('heading', {
      name: 'Navigation Shortcuts',
    }).closest('section')!
    expect(within(navigationPanel).getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.queryByRole('checkbox', { name: 'Show Wiki shortcut' }))
      .not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show Settings' }))
    expect(onNavigationVisibilityChange).toHaveBeenCalledWith('settings', true)

    expect(screen.queryByRole('combobox', { name: 'Bottom bar size' }))
      .not.toBeInTheDocument()
    const includeText = screen.getByRole('checkbox', { name: 'Include text' })
    expect(includeText).not.toBeChecked()
    await user.click(includeText)
    expect(onBottomNavigationIncludeTextChange).toHaveBeenCalledWith(true)
  })

  test('requires an accessible confirmation and cancels without resetting', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn()
    const { container } = renderSettings(resetSave)

    const trigger = screen.getByRole('button', {
      name: 'Reset Save',
    })
    await user.click(trigger)

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset Save?',
    })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      document.querySelector('.settings-surface__content'),
    ).toHaveAttribute('inert')
    expect(
      container.querySelector('.settings-surface'),
    ).toHaveAttribute('inert')
    expect(container).not.toHaveAttribute('inert')
    expect(cancel).toHaveFocus()
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(resetSave).not.toHaveBeenCalled()
  })

  test('warns before confirming a reset that cancels active Stored Time', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    renderSettings(resetSave, undefined, {
      storedTime: {
        status: () => ({
          kind: 'running',
          jobId: 'stored-time-test',
          requestedSeconds: 10,
          computedSeconds: 1,
          fraction: 0.1,
          elapsedMilliseconds: 10,
          estimatedRemainingMilliseconds: 90,
          maximumChunkMilliseconds: 5,
        }),
        subscribe: () => () => undefined,
        cancel: vi.fn(),
      },
    })

    await user.click(screen.getByRole('button', { name: 'Reset Save' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Reset Save?' })
    expect(dialog).toHaveTextContent(
      'Resetting now will cancel the current Offline Time simulation without spending its Offline Time.',
    )
    expect(resetSave).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Reset Save' }))
    await waitFor(() => expect(resetSave).toHaveBeenCalledOnce())
  })

  test('resets through the supplied runtime operation and reports success', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: true,
      sessionRevision: 2,
      recoveryAvailable: true,
      lifecycleReset: true,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    await waitFor(() => expect(resetSave).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Save reset. A fresh game has been created.',
    )
  })

  test('keeps the dialog and current save available when reset fails', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-COMMIT-FAILED',
      reason: 'private storage detail',
      recoveryAvailable: false,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The save could not be reset. Your current progress was kept.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'private storage detail',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  test('does not claim progress was preserved after a committed reconstruction failure', async () => {
    const user = userEvent.setup()
    const resetSave = vi.fn().mockResolvedValue({
      imported: false,
      committed: true,
      code: 'APP-POST-COMMIT-RELOAD',
      reason: 'private reload detail',
      recoveryAvailable: true,
    })
    renderSettings(resetSave)

    await user.click(
      screen.getByRole('button', { name: 'Reset Save' }),
    )
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Reset Save',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The fresh save was written, but the game could not reopen it.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'current progress was kept',
    )
  })

  test('hides development progression controls when the runtime omits them', () => {
    renderSettings(vi.fn())

    expect(
      screen.queryByRole('button', { name: 'Development Menu' }),
    ).not.toBeInTheDocument()
  })

  test('applies the selected real bot-count preset through the development runtime', async () => {
    const user = userEvent.setup()
    const setDysonBots = vi.fn().mockResolvedValue({
      applied: true,
      bots: 195_000,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, purchasedInGame: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots,
      unlockReality: vi.fn(),
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    expect(
      screen.queryByRole('combobox', { name: 'Progression state' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'near-star',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() =>
      expect(setDysonBots).toHaveBeenCalledWith(195_000),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Bot count saved.',
    )
  })

  test('toggles Developer Options for a development runtime', async () => {
    const user = userEvent.setup()
    let enabled = false
    const apply = vi.fn().mockImplementation(async (action) => {
      enabled = action.kind === 'purchase-debug-options'
      return {
        applied: true,
        stateRevision: 2,
        durableRevision: 2,
      }
    })
    renderSettings(vi.fn(), {
      status: () => ({
        enabled,
        entitled: true,
        purchasedInGame: true,
        quantumShards: 0n,
        strangeMatter: 0n,
      }),
      setDysonBots: vi.fn(),
      unlockReality: vi.fn(),
      apply,
      simulateOfflineTime: vi.fn(),
    })

    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    const toggle = screen.getByRole('checkbox', {
      name: 'Enable Developer Options',
    })
    expect(toggle).not.toBeChecked()

    await user.click(toggle)
    await waitFor(() => expect(toggle).toBeChecked())
    expect(apply).toHaveBeenLastCalledWith({
      kind: 'purchase-debug-options',
    })

    await user.click(toggle)
    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(apply).toHaveBeenLastCalledWith({
      kind: 'disable-debug-options',
    })
  })

  test('offers the canonical first-Infinity threshold as a real-state preset', async () => {
    const user = userEvent.setup()
    const setDysonBots = vi.fn().mockResolvedValue({
      applied: true,
      bots: 42_000_000_000_000_000_000,
      stateRevision: 2,
      durableRevision: 2,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, purchasedInGame: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots,
      unlockReality: vi.fn(),
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'first-infinity',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() =>
      expect(setDysonBots).toHaveBeenCalledWith(
        42_000_000_000_000_000_000,
      ),
    )
  })

  test('applies a canonical Reality-unlocked state through the development runtime', async () => {
    const user = userEvent.setup()
    const unlockReality = vi.fn().mockResolvedValue({
      applied: true,
      secretsOfTheUniverse: 27n,
      stateRevision: 3,
      durableRevision: 3,
    })
    renderSettings(vi.fn(), {
      status: () => ({ enabled: true, entitled: true, purchasedInGame: true, quantumShards: 0n, strangeMatter: 0n }),
      setDysonBots: vi.fn(),
      unlockReality,
      apply: vi.fn(),
      simulateOfflineTime: vi.fn(),
    })

    await user.click(
      screen.getByRole('button', { name: 'Development Menu' }),
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Progression state' }),
      'reality-unlocked',
    )
    await user.click(
      screen.getByRole('button', { name: 'Apply Progression' }),
    )

    await waitFor(() => expect(unlockReality).toHaveBeenCalledOnce())
    expect(screen.getByRole('status')).toHaveTextContent(
      'Reality unlocked.',
    )
  })
})

function renderSettings(
  resetSave: SettingsSurfaceProps['resetSave'],
  development?: SettingsSurfaceProps['development'],
  overrides: Partial<SettingsSurfaceProps> = {},
  preference = new NumberNotationPreferenceService({ storage: null }),
  language = new LocalePreferenceService({
    storage: null,
    preferredLocales: ['en'],
  }),
) {
  return render(
    <LocalePreferenceProvider
      preference={language}
      initialMessages={enCatalog}
    >
      <NumberNotationProvider preference={preference}>
        <div className="dyson-shell" data-route-theme="settings">
          <SettingsSurface
            resetSave={resetSave}
            previewImportSaveFile={vi.fn()}
            previewImportSaveText={vi.fn()}
            importSaveFile={vi.fn()}
            importSaveText={vi.fn()}
            readSaveExport={vi.fn().mockResolvedValue(null)}
            downloadSaveText={vi.fn()}
            copySaveText={vi.fn()}
            development={development}
            {...overrides}
          />
        </div>
      </NumberNotationProvider>
    </LocalePreferenceProvider>,
  )
}
