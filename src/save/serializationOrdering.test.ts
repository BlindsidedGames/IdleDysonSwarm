import { readFileSync, readdirSync } from 'node:fs'
import { expect, test } from 'vitest'
import { referenceSerializeWebSave } from '../../scripts/support/allocationOptimizationReference'
import { deserializeWebSave, serializeWebSave } from './serialization'
import type { SaveRecord } from './graph'

test('optimized encoding retains exact compressed bytes for every progression fixture', () => {
  const directory = new URL('../../test/fixtures/progression/', import.meta.url)
  for (const filename of readdirSync(directory).filter((name) => name.endsWith('.idsweb1.txt'))) {
    const state = deserializeWebSave(readFileSync(new URL(filename, directory), 'utf8'))
    expect(serializeWebSave(state), filename).toBe(referenceSerializeWebSave(state))
  }
})

test('encoding preserves integer and special keys, getter order, nested values and aliases', () => {
  const build = () => {
    const calls: string[] = []
    const nested = Object.create(null) as SaveRecord
    nested['__proto__'] = 'retained'
    nested['constructor'] = 'ordinary key'
    nested['10'] = 10n
    nested['2'] = Uint8Array.from([0, 255])
    const source: SaveRecord = { saveVersion: 17 }
    for (const key of ['z', '10', '2', 'a']) {
      Object.defineProperty(source, key, {
        enumerable: true,
        get() {
          calls.push(key)
          return key === 'z' ? nested : key
        },
      })
    }
    source.alias = nested
    source.array = [nested, 2n, { z: 1, a: 2 }]
    return { source, calls }
  }
  const reference = build()
  const actual = build()
  expect(serializeWebSave(actual.source)).toBe(referenceSerializeWebSave(reference.source))
  expect(actual.calls).toEqual(reference.calls)
  expect(actual.calls).toEqual(['2', '10', 'z', 'a'])
})
