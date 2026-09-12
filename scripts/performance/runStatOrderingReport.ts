import { strict as assert } from 'node:assert'
import { benchmarkOperations } from './benchmarkOperations'
import { orderStatEffects, type StatEffect } from '../../src/simulation/stat'

// Keep the previous algorithm here as a differential oracle and timing baseline.
function reference(effects: readonly StatEffect[]): readonly StatEffect[] {
  return effects
    .map((effect, index) => ({ effect, index }))
    .sort((left, right) => left.effect.order - right.effect.order || left.index - right.index)
    .map(({ effect }) => effect)
}

const measurements = [0, 1, 4, 16, 64].map((count) => {
  const effects = Object.freeze(Array.from({ length: count }, (_, index) =>
    Object.freeze({
      id: String(index), operation: 'add' as const, value: index,
      order: (index * 7) % 11,
    }),
  ))
  assert.deepEqual(orderStatEffects(effects), reference(effects))
  return { count, ...benchmarkOperations({
    reference: () => reference(effects).length,
    candidate: () => orderStatEffects(effects).length,
  }, { samples: 300, batchSize: 1_000, warmupIterations: 10_000 }) }
})
console.log(JSON.stringify({ kind: 'stat-ordering', node: process.version,
  exactReferenceParity: true, measurements }, null, 2))
