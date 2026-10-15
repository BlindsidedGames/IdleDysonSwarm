import type { DeepReadonly } from './contracts'

/** Recursively freezes an owned, acyclic graph of plain objects and arrays. */
export function deepFreezePlainGraph<T>(value: T): DeepReadonly<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value as DeepReadonly<T>
  }
  for (const child of Object.values(value)) {
    deepFreezePlainGraph(child)
  }
  return Object.freeze(value) as DeepReadonly<T>
}
