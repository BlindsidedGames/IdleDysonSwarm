import type {
  CanonicalSkillPresetAutomationSlot,
  CanonicalSkillPresetSlot,
  SkillPresetState,
} from '../../game-state/types'

export interface PresetAutomationSelectProps {
  readonly label: string
  readonly offLabel: string
  readonly value: CanonicalSkillPresetAutomationSlot
  readonly presets: readonly SkillPresetState[]
  readonly disabled?: boolean
  readonly onChange: (
    slot: CanonicalSkillPresetAutomationSlot,
  ) => void
}

/**
 * Presents a reusable tab-to-preset binding without applying gameplay rules.
 * The caller forwards the selected slot through the lifecycle coordinator.
 */
export function PresetAutomationSelect({
  label,
  offLabel,
  value,
  presets,
  disabled = false,
  onChange,
}: PresetAutomationSelectProps) {
  return (
    <label className="ui-preset-automation">
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            Number(event.currentTarget.value) as
              CanonicalSkillPresetAutomationSlot,
          )
        }
      >
        <option value={0}>{offLabel}</option>
        {presets.map((preset, index) => {
          const slot = (index + 1) as CanonicalSkillPresetSlot
          return (
            <option key={slot} value={slot}>
              {preset.name}
            </option>
          )
        })}
      </select>
    </label>
  )
}
