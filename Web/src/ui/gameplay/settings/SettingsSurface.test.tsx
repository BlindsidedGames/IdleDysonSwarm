// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  SettingsSurface,
  type SettingsSurfaceProps,
} from './SettingsSurface'
import type { GameAudioService } from '../../../audio'

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
      /@media \(max-width: 40rem\)[\s\S]*\.settings-surface__panel\s*\{[^}]*gap:\s*0\.45rem;[^}]*padding:\s*0\.55rem;/,
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
      /\.settings-surface__dialog-actions > button\s*\{[^}]*background:\s*#56815a;[^}]*cursor:\s*pointer;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__file-option > button:hover:not\(:disabled\),\s*\.settings-surface__dialog-actions > button:hover:not\(:disabled\)\s*\{[^}]*background:\s*#67976b;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__file-option > button:active:not\(:disabled\),\s*\.settings-surface__dialog-actions > button:active:not\(:disabled\)\s*\{[^}]*background:\s*#47704b;/,
    )
    expect(settingsStyles).toMatch(
      /\.settings-surface__dialog-actions > button:disabled\s*\{[^}]*cursor:\s*wait;[^}]*opacity:\s*0\.7;/,
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
    const readSaveText = vi.fn().mockResolvedValue('IDSWEB1:exported')
    const copySaveText = vi.fn().mockResolvedValue(undefined)
    const downloadSave = vi.fn().mockResolvedValue(true)
    renderSettings(vi.fn(), undefined, {
      readSaveText,
      copySaveText,
      downloadSave,
    })

    await user.click(screen.getByRole('button', { name: 'Export' }))

    const dialog = await screen.findByRole('dialog', {
      name: 'Export Save',
    })
    expect(readSaveText).toHaveBeenCalledOnce()
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
    expect(downloadSave).toHaveBeenCalledOnce()
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Save exported successfully.',
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

    await user.click(
      screen.getByRole('checkbox', { name: 'Show Story shortcut' }),
    )
    expect(onNavigationVisibilityChange).toHaveBeenCalledWith(
      'story',
      true,
    )
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
    expect(container).toHaveAttribute('inert')
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
) {
  return render(
    <IntlProvider
      locale="en"
      messages={{}}
      onError={() => undefined}
    >
      <SettingsSurface
        resetSave={resetSave}
        previewImportSaveFile={vi.fn()}
        previewImportSaveText={vi.fn()}
        importSaveFile={vi.fn()}
        importSaveText={vi.fn()}
        readSaveText={vi.fn().mockResolvedValue(null)}
        downloadSave={vi.fn()}
        copySaveText={vi.fn()}
        development={development}
        {...overrides}
      />
    </IntlProvider>,
  )
}
