import type { CSSProperties } from 'react'
import type { SkillPresetColorId } from '../../../game-state/skillPresetColors'

export const SKILL_PRESET_COLOR_VALUES: Readonly<
  Record<SkillPresetColorId, string>
> = Object.freeze({
  cyan: '#59d8d1',
  orange: '#f0a45b',
  gold: '#d8c65a',
  rose: '#d86d7f',
  pink: '#e38ace',
  green: '#72db69',
  blue: '#6199f5',
  violet: '#a486f2',
  red: '#f05242',
  white: '#ecf1f5',
})

export type SkillPresetColorStyle = CSSProperties & {
  readonly '--skill-preset-color': string
}

/**
 * Maps canonical preset color IDs to the presentation token consumed by the
 * Skills surface. Game state stores only the stable ID, never a CSS value.
 */
export function skillPresetColorStyle(
  colorId: SkillPresetColorId,
): SkillPresetColorStyle {
  return {
    '--skill-preset-color': SKILL_PRESET_COLOR_VALUES[colorId],
  }
}
