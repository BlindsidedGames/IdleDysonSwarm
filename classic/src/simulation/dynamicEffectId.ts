export const DYNAMIC_SKILL_EFFECT_PREFIX = 'effect.' as const

export function extractDynamicSkillId(
  effectId: string,
  suffix: string,
): string | undefined {
  if (
    suffix.length === 0 ||
    !effectId.startsWith(DYNAMIC_SKILL_EFFECT_PREFIX) ||
    !effectId.endsWith(suffix)
  ) {
    return undefined
  }
  const value = effectId.slice(
    DYNAMIC_SKILL_EFFECT_PREFIX.length,
    -suffix.length,
  )
  return value.length > 0 ? value : undefined
}
