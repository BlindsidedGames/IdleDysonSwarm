import { isRecord } from '../save/graph'

export interface ParityDifference {
  readonly path: string
  readonly expected: unknown
  readonly actual: unknown
  readonly reason: 'missing' | 'type' | 'value' | 'length'
}

export function compareGraphs(
  actual: unknown,
  expected: unknown,
  options: { readonly expectedSubset?: boolean } = {},
): ParityDifference[] {
  const differences: ParityDifference[] = []
  compare(actual, expected, '$', differences, options.expectedSubset === true)
  return differences
}

function compare(
  actual: unknown,
  expected: unknown,
  path: string,
  differences: ParityDifference[],
  subset: boolean,
): void {
  if (Object.is(actual, expected)) return
  if (typeof expected === 'bigint' || typeof actual === 'bigint') {
    if (String(actual) !== String(expected)) {
      differences.push({ path, expected, actual, reason: 'value' })
    }
    return
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      differences.push({ path, expected, actual, reason: 'type' })
      return
    }
    if (!subset && actual.length !== expected.length) {
      differences.push({ path, expected: expected.length, actual: actual.length, reason: 'length' })
    }
    expected.forEach((entry, index) =>
      compare(actual[index], entry, `${path}[${index}]`, differences, subset),
    )
    return
  }
  if (isRecord(expected)) {
    if (!isRecord(actual)) {
      differences.push({ path, expected, actual, reason: 'type' })
      return
    }
    for (const [key, entry] of Object.entries(expected)) {
      if (!Object.hasOwn(actual, key)) {
        differences.push({
          path: `${path}.${key}`,
          expected: entry,
          actual: undefined,
          reason: 'missing',
        })
        continue
      }
      compare(actual[key], entry, `${path}.${key}`, differences, subset)
    }
    if (!subset) {
      for (const key of Object.keys(actual)) {
        if (!Object.hasOwn(expected, key)) {
          differences.push({
            path: `${path}.${key}`,
            expected: undefined,
            actual: actual[key],
            reason: 'missing',
          })
        }
      }
    }
    return
  }
  differences.push({
    path,
    expected,
    actual,
    reason: typeof actual === typeof expected ? 'value' : 'type',
  })
}
