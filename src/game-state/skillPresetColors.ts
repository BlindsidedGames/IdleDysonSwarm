export const SKILL_PRESET_COLOR_IDS = [
  'cyan',
  'orange',
  'gold',
  'rose',
  'pink',
] as const

export type SkillPresetColorId =
  (typeof SKILL_PRESET_COLOR_IDS)[number]

/**
 * Returns whether an unknown persisted or imported value is one of the five
 * authored preset colors.
 */
export function isSkillPresetColorId(
  value: unknown,
): value is SkillPresetColorId {
  return (
    typeof value === 'string' &&
    SKILL_PRESET_COLOR_IDS.includes(value as SkillPresetColorId)
  )
}

/**
 * Assigns a distinct authored default to each of the five canonical preset
 * slots. Invalid slot values safely fall back to cyan.
 */
export function defaultSkillPresetColorId(
  slot: number,
): SkillPresetColorId {
  return SKILL_PRESET_COLOR_IDS[slot - 1] ?? 'cyan'
}
