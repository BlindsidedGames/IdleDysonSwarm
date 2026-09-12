import { performance } from 'node:perf_hooks'
import { percentile } from './performanceReport'

/** Alternating advisory timings; callers verify correctness before measuring. */
export function benchmarkOperations(
  operations: Readonly<{ reference: () => number; candidate: () => number }>,
  options: Readonly<{ samples: number; batchSize: number; warmupIterations: number }>,
) {
  let checksum = 0
  for (let iteration = 0; iteration < options.warmupIterations; iteration += 1) {
    checksum += operations.reference() + operations.candidate()
  }
  const timings = { reference: [] as number[], candidate: [] as number[] }
  for (let sample = 0; sample < options.samples; sample += 1) {
    const order = sample % 2 === 0
      ? ['reference', 'candidate'] as const
      : ['candidate', 'reference'] as const
    for (const name of order) {
      const start = performance.now()
      for (let batch = 0; batch < options.batchSize; batch += 1) {
        checksum += operations[name]()
      }
      timings[name].push((performance.now() - start) / options.batchSize)
    }
  }
  const summarize = (samples: readonly number[]) => ({
    medianMilliseconds: percentile(samples, 0.5),
    p95Milliseconds: percentile(samples, 0.95),
  })
  const before = summarize(timings.reference)
  const after = summarize(timings.candidate)
  return {
    ...options,
    before,
    after,
    medianReduction: 1 - after.medianMilliseconds / before.medianMilliseconds,
    p95Reduction: 1 - after.p95Milliseconds / before.p95Milliseconds,
    checksum,
  }
}
