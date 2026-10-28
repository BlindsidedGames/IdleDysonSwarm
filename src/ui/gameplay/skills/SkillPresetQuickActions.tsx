import { useExtendedSkillPresets } from '../../useExtendedSkillPresets'
import { useIntl } from 'react-intl'
import type { CanonicalSkillPresetSlot, SkillPresetState } from '../../../game-state/types'
import { skillMessages as messages } from './messages'
import { skillPresetColorStyle } from './presetColors'
import './skillPresetQuickActions.css'

export function SkillPresetQuickActions({ presets, selectedSlot, disabled, onSelect }: {
  readonly presets: readonly SkillPresetState[]
  readonly selectedSlot: CanonicalSkillPresetSlot
  readonly disabled: boolean
  readonly onSelect: (slot: CanonicalSkillPresetSlot) => void
}) {
  const intl = useIntl()
  const { visibleCount } = useExtendedSkillPresets()
  return <div className="skill-preset-quick-actions" role="group" aria-label={intl.formatMessage(messages.presets)}>
    {presets.slice(0, visibleCount).map((preset, index) => {
      const slot = (index + 1) as CanonicalSkillPresetSlot
      const label = intl.formatMessage(messages.switchPreset, { name: preset.name })
      return <button className="skill-preset-quick-actions__button" key={slot} type="button" style={skillPresetColorStyle(preset.colorId)}
        aria-label={label} aria-pressed={selectedSlot === slot}
        disabled={disabled} onClick={() => onSelect(slot)}><span>{slot}</span></button>
    })}
  </div>
}
