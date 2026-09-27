import { defaultSkillPresetColorId } from './skillPresetColors'
import type { SkillPresetState } from './types'

export const SKILL_PRESET_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type SkillPresetSlot = (typeof SKILL_PRESET_SLOTS)[number]
export const SKILL_PRESET_COUNT = SKILL_PRESET_SLOTS.length
export const SKILL_PRESET_ROW_SIZE = 5

export function createEmptySkillPreset(slot: SkillPresetSlot): SkillPresetState {
  return {
    name: `Preset ${slot}`,
    skillIds: [],
    botDistribution: 0,
    colorId: defaultSkillPresetColorId(slot),
  }
}
