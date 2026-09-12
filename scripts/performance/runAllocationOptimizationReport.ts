import { readFileSync } from 'node:fs'
import { bitDecrement, bitIncrement } from '../../src/simulation/numeric'
import { deserializeWebSave, serializeWebSave } from '../../src/save/serialization'
import {
  referenceBitDecrement,
  referenceBitIncrement,
  referenceSerializeWebSave,
} from '../support/allocationOptimizationReference'

// Advisory local timings only. Correctness is checked; elapsed time never gates
// a build because CPU scheduling and JS-engine warm-up vary between machines.
const ROUNDS = 5
let checksum = 0

function compare(reference: () => number, optimized: () => number, batchSize: number) {
  for (let index = 0; index < 20; index += 1) {
    checksum += reference()
    checksum += optimized()
  }
  const timings = { reference: [] as number[], optimized: [] as number[] }
  const operations = { reference, optimized }
  for (let round = 0; round < ROUNDS; round += 1) {
    const order = round % 2 === 0
      ? ['reference', 'optimized'] as const
      : ['optimized', 'reference'] as const
    for (const name of order) {
      const start = performance.now()
      for (let index = 0; index < batchSize; index += 1) checksum += operations[name]()
      timings[name].push((performance.now() - start) / batchSize)
    }
  }
  const median = (samples: number[]) => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)]!
  const referenceMedianMs = median(timings.reference)
  const optimizedMedianMs = median(timings.optimized)
  return {
    batchSize,
    rounds: ROUNDS,
    referenceMedianMs,
    optimizedMedianMs,
    medianReduction: 1 - optimizedMedianMs / referenceMedianMs,
    samplesMs: timings,
  }
}

const values = [
  Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE,
  0, -0, NaN, Infinity, -Infinity, 1, -1, 0.1, -0.1, 1e100, 1e-200,
]
for (const value of values) {
  if (
    !Object.is(bitIncrement(value), referenceBitIncrement(value)) ||
    !Object.is(bitDecrement(value), referenceBitDecrement(value))
  ) throw new Error(`Numeric neighbor mismatch for ${value}.`)
}
let referenceIndex = 0
let optimizedIndex = 0
const numericNeighbors = compare(
  () => {
    const value = values[referenceIndex++ % values.length]!
    return (referenceBitIncrement(value) > 0 ? 1 : -1) +
      (referenceBitDecrement(value) > 0 ? 1 : -1)
  },
  () => {
    const value = values[optimizedIndex++ % values.length]!
    return (bitIncrement(value) > 0 ? 1 : -1) +
      (bitDecrement(value) > 0 ? 1 : -1)
  },
  200_000,
)

const serialization = Object.fromEntries(
  ['fresh', 'maximum-skills', 'late-quantum'].map((fixture) => {
    const source = readFileSync(
      new URL(`../../test/fixtures/progression/${fixture}.idsweb1.txt`, import.meta.url),
      'utf8',
    )
    const state = deserializeWebSave(source)
    if (serializeWebSave(state) !== referenceSerializeWebSave(state)) {
      throw new Error(`Serialized bytes differ for ${fixture}.`)
    }
    return [fixture, compare(
      () => referenceSerializeWebSave(state).length,
      () => serializeWebSave(state).length,
      100,
    )]
  }),
)

console.log(JSON.stringify({
  node: process.version,
  note: 'Numeric timing is per increment/decrement pair. Serialization includes gzip and base64. Advisory only.',
  numericNeighbors,
  serialization,
  checksum,
}, null, 2))
