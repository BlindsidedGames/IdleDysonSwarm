// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { SKILL_PRESET_SLOTS, createEmptySkillPreset } from '../../../game-state/skillPresetSlots'
import { PresetAutomationSelect } from '../../components/PresetAutomationSelect'
import { SkillPresetQuickActions } from './SkillPresetQuickActions'
import { useExtendedSkillPresets } from '../../useExtendedSkillPresets'

afterEach(cleanup)

test('shares the optional row, remembers it, and hides it without losing presets or an existing tab binding', () => {
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null }))
  const presets = SKILL_PRESET_SLOTS.map(createEmptySkillPreset)
  presets[9] = { ...presets[9], name: 'Late game', skillIds: ['startHereTree'] }
  const select = vi.fn()
  function Controls() {
    const preference = useExtendedSkillPresets()
    return <>
      <label><input type="checkbox" checked={preference.enabled}
        onChange={e => preference.setEnabled(e.currentTarget.checked)} />Show presets 6–10</label>
      <SkillPresetQuickActions presets={presets} selectedSlot={10} disabled={false} onSelect={select} />
      <PresetAutomationSelect presets={presets} value={10} label="Automatic preset" offLabel="Off" onChange={vi.fn()} />
    </>
  }
  const view = () => <IntlProvider locale="en"><Controls /></IntlProvider>
  let mounted = render(view())
  expect(screen.getAllByRole('button')).toHaveLength(5)
  expect(screen.getAllByRole('option')).toHaveLength(7) // Off, first five, existing binding.
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getAllByRole('button')).toHaveLength(10)
  fireEvent.click(screen.getByRole('button', {name: 'Switch to Late game'}))
  expect(select).toHaveBeenCalledWith(10)
  mounted.unmount()
  mounted = render(view())
  expect(screen.getAllByRole('button')).toHaveLength(10)
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getAllByRole('button')).toHaveLength(5)
  expect(presets[9].skillIds).toEqual(['startHereTree'])
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('10')
})
