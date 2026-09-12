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

import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_TUNING, DETERMINISTIC_DYSON_SNAPSHOT } from '../support/deterministicMatureDysonFixture'

const referenceCommit = '5050e5448c51397b0d17c39c73ecb054be5698e7'
const root = resolve(import.meta.dirname, '../..')
const source = execFileSync('git', [
  'show', `${referenceCommit}:src/simulation/canonicalDysonDerivation.ts`,
], { cwd: root, encoding: 'utf8' }).replace(
  /from '([.][^']+)'/g,
  (_match, specifier: string) =>
    `from ${JSON.stringify(pathToFileURL(resolve(root, 'src/simulation', specifier)).href)}`,
)
const directory = mkdtempSync(resolve(tmpdir(), 'ids-derivation-reference-'))
const referencePath = resolve(directory, 'reference.mts')
writeFileSync(referencePath, source)

try {
  const { deriveBasicDysonState: reference } = await import(pathToFileURL(referencePath).href) as {
    deriveBasicDysonState: typeof deriveBasicDysonState
  }
  let boundaryOutputCases = 0
  const boundaryCounts = [49, 50, 68, 69, 89, 90, 99, 100, 101]
  for (const skills of [
    [], ['avocados'], ['productionScaling'], ['superSwarm'],
    ['megaSwarm'], ['ultimateSwarm'], ['terraFirma', 'terraIrradiant'],
    ['avocados', 'supernova'],
  ]) {
    // Mutate the same state across calls so stale cross-call reuse would fail.
    const state = createDeterministicMatureDysonFixture({ ownedSkillIds: skills })
    for (const galvanized of [false, true]) {
      state.challenges = { ...state.challenges, galvanizedSkillIds: galvanized ? ['supernova'] : [] }
      for (const count of boundaryCounts) {
        for (const pair of Object.values(state.dyson.facilities)) pair[1] = count
        state.skills.fragments = count > 90 ? 3n : 1n
        for (const permanentDoubleIp of [false, true]) {
          const args = [state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp }, DETERMINISTIC_DYSON_SNAPSHOT] as const
          const before = reference(...args)
          const after = deriveBasicDysonState(...args)
          if (!before.ok || !after.ok || !isDeepStrictEqual(before, after)) {
            throw new Error(`Boundary mismatch: ${skills.join(',')}, ${count}, galvanized=${galvanized}`)
          }
          boundaryOutputCases += 1
        }
      }
    }
  }
  const parityOnly = process.argv.includes('--parity-only')
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
    if (parityOnly) {
      rows.push({ fixture: fixture.id })
      continue
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
    note: 'Checkpoint derivation with current dependencies, isolating within-call manual purchase layer reuse. Differences near measurement noise are not speedup evidence; no timing gate.',
    exactOutputCases: rows.length * 2,
    boundaryOutputCases,
    batchSize,
    rounds: 7,
    rows,
    checksum,
  }, null, 2))
} finally {
  rmSync(directory, { recursive: true, force: true })
}
