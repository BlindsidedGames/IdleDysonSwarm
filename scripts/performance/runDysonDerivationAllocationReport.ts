import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { deriveBasicDysonState } from '../../src/simulation/canonicalDysonDerivation'
import { loadCheckedInProgressionMatrixFixtures } from '../support/progressionMatrixFixtures'
import { prepareImportedSaveText } from '../../src/save/import'
import { extractDysonCompatibilityTuning } from '../../src/game-state/compatibilityTuning'
import { extractDysonSkillEffectEvaluationSnapshot } from '../../src/game-state/skillEffectEvaluationSnapshot'

const referenceCommit = '878f5bffecd59c699712103172e668d12853d16a'
const root = resolve(import.meta.dirname, '../..')
const source = execFileSync('git', [
  'show', `${referenceCommit}:src/simulation/canonicalDysonDerivation.ts`,
], { cwd: root, encoding: 'utf8' }).replace(
  /from '([.][^']+)'/g,
  (_match, specifier: string) => `from '${resolve(root, 'src/simulation', specifier)}'`,
)
const directory = mkdtempSync(resolve(tmpdir(), 'ids-derivation-reference-'))
const referencePath = resolve(directory, 'reference.mts')
writeFileSync(referencePath, source)

try {
  const { deriveBasicDysonState: reference } = await import(pathToFileURL(referencePath).href) as {
    deriveBasicDysonState: typeof deriveBasicDysonState
  }
  let checksum = 0
  const batchSize = 500
  const rows = []
  for (const fixture of loadCheckedInProgressionMatrixFixtures()) {
    const prepared = prepareImportedSaveText(fixture.saveText, '2026-08-19T00:00:00.000Z')
    const tuning = extractDysonCompatibilityTuning(prepared)
    const snapshot = extractDysonSkillEffectEvaluationSnapshot(prepared)
    for (const permanentDoubleIp of [false, true]) {
      if (!isDeepStrictEqual(
        reference(fixture.state, tuning, { permanentDoubleIp }, snapshot),
        deriveBasicDysonState(fixture.state, tuning, { permanentDoubleIp }, snapshot),
      )) throw new Error(`Derivation mismatch for ${fixture.id}.`)
    }
    const run = (derive: typeof deriveBasicDysonState) => {
      const result = derive(fixture.state, tuning, { permanentDoubleIp: false }, snapshot)
      if (!result.ok) throw new Error(`Rejected fixture ${fixture.id}.`)
      checksum += result.value.productionArrivalRates.bots > 0 ? 1 : 0
    }
    for (let index = 0; index < 50; index += 1) {
      run(reference)
      run(deriveBasicDysonState)
    }
    const samplesMs = { reference: [] as number[], optimized: [] as number[] }
    for (let round = 0; round < 7; round += 1) {
      const order = round % 2 === 0 ? ['reference', 'optimized'] as const : ['optimized', 'reference'] as const
      for (const name of order) {
        const started = performance.now()
        for (let index = 0; index < batchSize; index += 1) {
          run(name === 'reference' ? reference : deriveBasicDysonState)
        }
        samplesMs[name].push((performance.now() - started) / batchSize)
      }
    }
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[3]!
    rows.push({
      fixture: fixture.id,
      referenceMedianMs: median(samplesMs.reference),
      optimizedMedianMs: median(samplesMs.optimized),
      samplesMs,
    })
  }
  console.log(JSON.stringify({
    node: process.version,
    referenceCommit,
    note: 'Historical derivation algorithm with current dependencies. Differences near measurement noise are not speedup evidence; no timing gate.',
    exactOutputCases: rows.length * 2,
    batchSize,
    rounds: 7,
    rows,
    checksum,
  }, null, 2))
} finally {
  rmSync(directory, { recursive: true, force: true })
}
