import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as optimized from '../../src/ui/i18n/formatters'
import { ENABLED_LOCALES } from '../../src/ui/i18n/localeRegistry'
import type { NumberNotationMode } from '../../src/ui/number-notation/contracts'

// This commit predates the private fixed-fraction cache. Loading the historical
// module keeps the comparison reproducible without shipping a copied formatter.
const referenceCommit = '878f5bffecd59c699712103172e668d12853d16a'
const root = resolve(import.meta.dirname, '../..')
const sourceDirectory = resolve(root, 'src/ui/i18n')
const referenceSource = execFileSync('git', [
  'show', `${referenceCommit}:src/ui/i18n/formatters.ts`,
], { cwd: root, encoding: 'utf8' }).replace(
  /from '([.][^']+)'/g,
  (_match, specifier: string) =>
    `from ${JSON.stringify(pathToFileURL(resolve(sourceDirectory, specifier)).href)}`,
)
const directory = mkdtempSync(resolve(tmpdir(), 'ids-formatting-reference-'))
const referencePath = resolve(directory, 'reference.mts')
writeFileSync(referencePath, referenceSource)

try {
  const reference = await import(pathToFileURL(referencePath).href) as typeof optimized
  const values = [
    0, -0, NaN, Infinity, -Infinity, Number.MIN_VALUE, Number.MAX_VALUE,
    0.001, 0.999, 1, 9.995, 99.95, 1000, 1000.1, 999999.9, 1e22, 1e300,
    -0.99, -1e300, 0n, 999n, 1001n, 999999n, 10n ** 100n, -(10n ** 100n),
  ]
  const notations: readonly NumberNotationMode[] = ['standard', 'scientific', 'engineering', 'mixed']
  let parityCases = 0
  for (const locale of ENABLED_LOCALES) for (const notation of notations) for (const value of values) {
    for (const wholeBelowHundred of [false, true]) {
      const options = { notation, wholeBelowHundred }
      if (reference.formatGameNumber(locale, value, options) !== optimized.formatGameNumber(locale, value, options)) {
        throw new Error(`Number-format mismatch: ${locale}, ${notation}, ${value}.`)
      }
      parityCases += 1
    }
    if (typeof value === 'number') {
      for (const unit of ['watts', 'joules'] as const) {
        if (reference.formatGameEnergy(locale, value, unit, notation) !== optimized.formatGameEnergy(locale, value, unit, notation)) {
          throw new Error(`Energy-format mismatch: ${locale}, ${notation}, ${value}.`)
        }
        parityCases += 1
      }
    }
  }
  const batchSize = 50_000
  const samplesMs = { reference: [] as number[], optimized: [] as number[] }
  let checksum = 0
  for (let round = 0; round < 5; round += 1) {
    const order = round % 2 === 0 ? ['reference', 'optimized'] as const : ['optimized', 'reference'] as const
    for (const name of order) {
      const format = name === 'reference' ? reference.formatGameNumber : optimized.formatGameNumber
      const started = performance.now()
      for (let index = 0; index < batchSize; index += 1) {
        checksum += format(
          ENABLED_LOCALES[index % ENABLED_LOCALES.length]!,
          values[index % values.length]!,
          { notation: notations[index % notations.length]! },
        ).length
      }
      samplesMs[name].push(performance.now() - started)
    }
  }
  const median = (samples: number[]) => [...samples].sort((a, b) => a - b)[2]!
  console.log(JSON.stringify({
    node: process.version,
    referenceCommit,
    note: 'Advisory full formatGameNumber timings; exact output parity gates only, no timing thresholds.',
    parityCases,
    batchSize,
    referenceMedianMs: median(samplesMs.reference),
    optimizedMedianMs: median(samplesMs.optimized),
    medianReduction: 1 - median(samplesMs.optimized) / median(samplesMs.reference),
    samplesMs,
    checksum,
  }, null, 2))
} finally {
  rmSync(directory, { recursive: true, force: true })
}
