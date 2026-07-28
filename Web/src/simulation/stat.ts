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
  const ordered = effects
    .map((effect, index) => ({ effect, index }))
    .sort(
      (left, right) =>
        left.effect.order - right.effect.order || left.index - right.index,
    )

  for (const { effect } of ordered) {
    switch (effect.operation) {
      case 'add':
        result += effect.value
        break
      case 'multiply':
        result *= effect.value
        break
      case 'power':
        result = Math.pow(result, effect.value)
        break
      case 'override':
        result = effect.value
        break
      case 'clamp-min':
        result = Math.max(result, effect.value)
        break
      case 'clamp-max':
        result = Math.min(result, effect.value)
        break
    }
  }
  return result
}
