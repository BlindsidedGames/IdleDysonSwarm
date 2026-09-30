import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { dehydrateGameState, hydrateGameState } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/game-state/mapping.ts'
import { validateCanonicalGameState } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/game-state/validate.ts'
import { prepareImportedSaveText } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/save/import.ts'
import { serializeWebSave } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/save/serialization.ts'
import { purchaseRealityUpgrade, type RealityUpgradeId } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/simulation/realityUpgrades.ts'
import {
  purchaseDreamFoundationalInformation,
  runDreamFoundationalInformationConversions,
  runDreamFoundationalInformationProduction,
} from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/simulation/dreamFoundationalInformation.ts'

const repo = '/Users/matthewrushworth/Projects/Idle Dyson Swarm'
const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const sourcePath = resolve(repo, 'test/fixtures/progression/mature-simulations.idsweb1.txt')
const outputPath = resolve(root, 'fixtures/mature-reality-review.idsweb1.txt')
const evidencePath = resolve(root, 'fixtures/mature-reality-review.json')
const simulationOutputPath = resolve(root, 'fixtures/populated-simulations-review.idsweb1.txt')
const simulationEvidencePath = resolve(root, 'fixtures/populated-simulations-review.json')
const frozenDate = '2026-08-19T00:00:00.000Z'
const transactions: readonly RealityUpgradeId[] = [
  'translation1',
  'translation2',
  'translation3',
  'doubleTimeOwned',
  'workerAutoConvert',
]

mkdirSync(resolve(root, 'fixtures'), { recursive: true })

const sourceText = readFileSync(sourcePath, 'utf8').trimEnd()
const sourceSession = hydrateGameState(prepareImportedSaveText(sourceText, frozenDate))
let state = sourceSession.state
const before = summarize(state)
const results: Array<{ id: RealityUpgradeId; code: string; strangeMatterAfter: number }> = []

for (const id of transactions) {
  const result = purchaseRealityUpgrade(state, id)
  if (!result.accepted || !result.changed || result.code !== 'purchased') {
    throw new Error(`Canonical Reality purchase ${id} failed: ${result.code}`)
  }
  state = result.candidate
  results.push({ id, code: result.code, strangeMatterAfter: state.dream.strangeMatter })
}

const validation = validateCanonicalGameState(state)
if (!validation.valid) throw new Error(`Derived state invalid: ${validation.errors.join(' ')}`)

const prepared = dehydrateGameState(sourceSession, state)
const outputText = serializeWebSave(prepared.copyValidatedState())
const roundTrip = hydrateGameState(prepareImportedSaveText(outputText, frozenDate)).state
const roundTripValidation = validateCanonicalGameState(roundTrip)
if (!roundTripValidation.valid) throw new Error(`Round-trip state invalid: ${roundTripValidation.errors.join(' ')}`)

const sourceSha256 = createHash('sha256').update(sourceText).digest('hex')
const saveSha256 = createHash('sha256').update(outputText).digest('hex')
writeFileSync(outputPath, outputText)
writeFileSync(evidencePath, `${JSON.stringify({
  id: 'mature-reality-review',
  sourceFixture: 'mature-simulations',
  sourceFixtureSha256: sourceSha256,
  derivation: 'Applied only five accepted canonical Reality purchase transactions to a certified reachable mature-simulations state, then mapped and serialized through the production save codec.',
  transactions: results,
  before,
  after: summarize(roundTrip),
  validation: { valid: true, roundTripValid: true },
  frozenImportDate: frozenDate,
  saveSha256,
  file: outputPath,
}, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}\n`)

process.stdout.write(`${saveSha256}\n`)

let simulationState = sourceSession.state
const simulationTransactions: Array<Record<string, unknown>> = []
for (const command of ['hunters', 'gatherers'] as const) {
  const purchase = purchaseDreamFoundationalInformation(simulationState, command)
  if (!purchase.purchased || purchase.status !== 'success') {
    throw new Error(`Canonical Simulation purchase ${command} failed: ${purchase.status}`)
  }
  simulationState = purchase.state
  simulationTransactions.push({ kind: 'purchase', command, cost: purchase.cost })
}
for (let hour = 1; hour <= 24; hour += 1) {
  const production = runDreamFoundationalInformationProduction(simulationState, {
    tickSeconds: 3_600,
    doubleTimeMultiplier: 1,
  })
  if (production.status !== 'success') throw new Error(`Canonical Simulation production hour ${hour} failed`)
  simulationState = production.state
  let conversions = { housingToVillages: 0, villagesToCities: 0, rocketsToSpaceFactories: 0 }
  for (let index = 0; index < 2_000; index += 1) {
    const conversion = runDreamFoundationalInformationConversions(simulationState)
    simulationState = conversion.state
    conversions = {
      housingToVillages: conversions.housingToVillages + conversion.housingToVillages,
      villagesToCities: conversions.villagesToCities + conversion.villagesToCities,
      rocketsToSpaceFactories: conversions.rocketsToSpaceFactories + conversion.rocketsToSpaceFactories,
    }
    if (conversion.housingToVillages + conversion.villagesToCities + conversion.rocketsToSpaceFactories === 0) break
  }
  simulationTransactions.push({
    kind: 'production-hour',
    hour,
    produced: production.produced,
    conversions,
  })
}
const simulationValidation = validateCanonicalGameState(simulationState)
if (!simulationValidation.valid) throw new Error(`Simulation review state invalid: ${simulationValidation.errors.join(' ')}`)
const simulationPrepared = dehydrateGameState(sourceSession, simulationState)
const simulationText = serializeWebSave(simulationPrepared.copyValidatedState())
const simulationRoundTrip = hydrateGameState(prepareImportedSaveText(simulationText, frozenDate)).state
const simulationRoundTripValidation = validateCanonicalGameState(simulationRoundTrip)
if (!simulationRoundTripValidation.valid) throw new Error(`Simulation review round-trip invalid: ${simulationRoundTripValidation.errors.join(' ')}`)
const simulationSha256 = createHash('sha256').update(simulationText).digest('hex')
writeFileSync(simulationOutputPath, simulationText)
writeFileSync(simulationEvidencePath, `${JSON.stringify({
  id: 'populated-simulations-review',
  sourceFixture: 'mature-simulations',
  sourceFixtureSha256: sourceSha256,
  derivation: 'Purchased one additional Hunter and Gatherer through canonical transactions, then applied 24 one-hour canonical production advances and their canonical automation conversions. No state fields were assigned directly.',
  transactions: simulationTransactions,
  before,
  after: summarize(simulationRoundTrip),
  validation: { valid: true, roundTripValid: true },
  frozenImportDate: frozenDate,
  saveSha256: simulationSha256,
  file: simulationOutputPath,
}, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}\n`)
process.stdout.write(`${simulationSha256}\n`)

function summarize(candidate: typeof state) {
  return {
    reality: candidate.reality,
    strangeMatter: candidate.dream.strangeMatter,
    ownedRealityUpgrades: [
      ...Object.entries(candidate.dream.upgrades).filter(([id, owned]) => owned && (id.startsWith('translation') || id.startsWith('speed'))).map(([id]) => id),
      ...(candidate.timeline.doubleTimeOwned ? ['doubleTimeOwned'] : []),
      ...(candidate.reality.autoGather ? ['workerAutoConvert'] : []),
    ],
    dream: {
      resetCount: candidate.dream.resetCount,
      disasterStage: candidate.dream.disasterStage,
      hunters: candidate.dream.resources.hunters,
      gatherers: candidate.dream.resources.gatherers,
      community: candidate.dream.resources.community,
      housing: candidate.dream.resources.housing,
      villages: candidate.dream.resources.villages,
      workers: candidate.dream.resources.workers,
      cities: candidate.dream.resources.cities,
      factories: candidate.dream.resources.factories,
      bots: candidate.dream.resources.bots,
      counterMeteor: candidate.dream.upgrades.counterMeteor,
    },
  }
}
