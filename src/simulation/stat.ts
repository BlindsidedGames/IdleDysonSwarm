import {
  addContinuous,
  multiplyContinuous,
  powerContinuous,
} from './numeric'

export type StatOperation =
  | 'add'
  | 'multiply'
  | 'power'
  | 'override'
  | 'clamp-min'
  | 'clamp-max'

export interface StatEffect {
  readonly id: string
  readonly operation: StatOperation
  readonly value: number
  readonly order: number
  readonly conditionIdentifier?: string
}

export function orderStatEffects(
  effects: readonly StatEffect[],
): readonly StatEffect[] {
  return effects
    .map((effect, index) => ({ effect, index }))
    .sort(
      (left, right) =>
        left.effect.order - right.effect.order || left.index - right.index,
    )
    .map(({ effect }) => effect)
}

export function applyStatEffect(
  current: number,
  effect: Readonly<StatEffect>,
): number {
  switch (effect.operation) {
    case 'add':
      return canUseNonNegativeContinuousArithmetic(current, effect.value)
        ? addContinuous(current, effect.value)
        : current + effect.value
    case 'multiply':
      return canUseNonNegativeContinuousArithmetic(current, effect.value)
        ? multiplyContinuous(current, effect.value)
        : current * effect.value
    case 'power':
      return Number.isFinite(current) &&
        current >= 0 &&
        Number.isFinite(effect.value) &&
        !(current === 0 && effect.value < 0)
        ? powerContinuous(current, effect.value)
        : Math.pow(current, effect.value)
    case 'override':
      return effect.value
    case 'clamp-min':
      return Math.max(current, effect.value)
    case 'clamp-max':
      return Math.min(current, effect.value)
  }
}

function canUseNonNegativeContinuousArithmetic(
  left: number,
  right: number,
): boolean {
  return (
    Number.isFinite(left) &&
    left >= 0 &&
    Number.isFinite(right) &&
    right >= 0
  )
}

export function operationFromUnity(value: number): StatOperation {
  switch (value) {
    case 0:
      return 'add'
    case 1:
      return 'multiply'
    case 2:
      return 'power'
    case 3:
      return 'override'
    case 4:
      return 'clamp-min'
    case 5:
      return 'clamp-max'
    default:
      throw new Error(`Unsupported Unity StatOperation '${value}'`)
  }
}

export function calculateStat(
  baseValue: number,
  effects: readonly StatEffect[],
): number {
  let result = baseValue
  for (const effect of orderStatEffects(effects)) {
    result = applyStatEffect(result, effect)
  }
  return result
}
