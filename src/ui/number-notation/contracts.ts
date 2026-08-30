export const NUMBER_NOTATION_MODES = Object.freeze([
  'mixed',
  'standard',
  'scientific',
  'engineering',
] as const)

export type NumberNotationMode =
  (typeof NUMBER_NOTATION_MODES)[number]

export const DEFAULT_NUMBER_NOTATION: NumberNotationMode = 'mixed'

let activeNumberNotation: NumberNotationMode = DEFAULT_NUMBER_NOTATION

/** Presentation-root selection used by the existing shared formatter calls. */
export function getActiveNumberNotation(): NumberNotationMode {
  return activeNumberNotation
}

export function setActiveNumberNotation(mode: NumberNotationMode): void {
  activeNumberNotation = mode
}

export function isNumberNotationMode(
  value: unknown,
): value is NumberNotationMode {
  return NUMBER_NOTATION_MODES.some((mode) => mode === value)
}

/** Unity serialized Standard, Scientific and Engineering as 0, 1 and 2. */
export function numberNotationFromLegacyUnity(
  value: unknown,
): NumberNotationMode | null {
  switch (value) {
    case 0:
      return 'standard'
    case 1:
      return 'scientific'
    case 2:
      return 'engineering'
    default:
      return null
  }
}
