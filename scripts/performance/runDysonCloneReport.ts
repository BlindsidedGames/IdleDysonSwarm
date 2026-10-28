import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import fixture from '../../test/parity/dyson-no-skills-two-ticks.json'
import { BasicDysonSimulationModel, createBasicDysonState, type BasicDysonStateInput } from '../../src/simulation/dysonModel'
import { advanceEventTime } from '../../src/simulation/eventTime'

const referenceCommit = '878f5bffecd59c699712103172e668d12853d16a'
const root = resolve(import.meta.dirname, '../..')
const source = execFileSync('git', ['show', `${referenceCommit}:src/simulation/dysonModel.ts`], { cwd: root, encoding: 'utf8' }).replace(
  /from '([.][^']+)'/g,
  (_match, specifier: string) =>
    `from ${JSON.stringify(pathToFileURL(resolve(root, 'src/simulation', specifier)).href)}`,
)
const directory = mkdtempSync(resolve(tmpdir(), 'ids-clone-reference-'))
const referencePath = resolve(directory, 'reference.mts')
writeFileSync(referencePath, source)
try {
  const reference = await import(pathToFileURL(referencePath).href) as typeof import('../../src/simulation/dysonModel')
  const rows = []
  let exactOutputCases = 0
  let checksum = 0
  for (const effectCount of [0, 10, 100]) {
    const input = {
      ...fixture.initialState,
      skillEffectsByStat: Object.fromEntries(Array.from({ length: effectCount }, (_, index) => [
        `synthetic-unused-stat-${index}`, [{ id: `effect-${index}`, operation: 'multiply' as const, value: 2, order: index }],
      ])),
    } as BasicDysonStateInput
    const models = {
      reference: new reference.BasicDysonSimulationModel(reference.createBasicDysonState(input)),
      optimized: new BasicDysonSimulationModel(createBasicDysonState(input)),
    }
    const event = (model: BasicDysonSimulationModel) => advanceEventTime({
      startingState: model,
      durationSeconds: 1,
      automationIntervalSeconds: 0.1,
      processingBudgetMilliseconds: 0,
    })
    const before = event(models.reference)
    const after = event(models.optimized)
    // Classes differ across modules; compare their state and all result fields,
    // except the deliberately nondeterministic wall-clock measurement.
    const comparable = (result: typeof after) => ({
      ...result,
      candidateState: { ...result.candidateState },
      work: { ...result.work, processingMilliseconds: 0 },
    })
    if (!isDeepStrictEqual(comparable(before), comparable(after))) throw new Error(`Event mismatch: ${effectCount}`)
    exactOutputCases += 1
    for (const operation of ['clone', 'event'] as const) {
      const run = (model: BasicDysonSimulationModel) => {
        const output = operation === 'clone' ? model.clone() : event(model).candidateState
        checksum += output.state.money > 0 ? 1 : 0
      }
      for (let index = 0; index < 100; index += 1) { run(models.reference); run(models.optimized) }
      const samplesMs = { reference: [] as number[], optimized: [] as number[] }
      const batchSize = operation === 'clone' ? 2000 : 100
      for (let round = 0; round < 7; round += 1) {
        const order = round % 2 === 0 ? ['reference', 'optimized'] as const : ['optimized', 'reference'] as const
        for (const name of order) {
          const started = performance.now()
          for (let index = 0; index < batchSize; index += 1) run(models[name])
          samplesMs[name].push((performance.now() - started) / batchSize)
        }
      }
      const median = (values: number[]) => [...values].sort((a, b) => a - b)[3]!
      rows.push({ effectCount, operation, batchSize, referenceMedianMs: median(samplesMs.reference), optimizedMedianMs: median(samplesMs.optimized), samplesMs })
    }
  }
  console.log(JSON.stringify({ node: process.version, referenceCommit, exactOutputCases, note: 'Synthetic effect-map sizes on the checked-in basic Dyson fixture. Unused stat IDs isolate clone cost. This basic adapter benchmark does not establish a canonical gameplay speedup. No timing gate.', rows, checksum }, null, 2))
} finally {
  rmSync(directory, { recursive: true, force: true })
}
