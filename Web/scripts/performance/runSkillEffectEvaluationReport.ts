import { isDeepStrictEqual } from 'node:util'
import { performance } from 'node:perf_hooks'
import { deriveBasicDysonState } from '../../src/simulation/canonicalDysonDerivation'
import { prepareDynamicSkillEffectResolver } from '../../src/simulation/dynamicSkillEffectResolver'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_SNAPSHOT,
  DETERMINISTIC_DYSON_TUNING,
} from '../../test/support/deterministicMatureDysonFixture'
import { resolveReferenceDynamicSkillEffect } from '../../test/support/referenceDynamicSkillEffectResolver'
import { materializeReferenceSkillEffects } from '../../test/support/referenceSkillEffectMaterializer'
import {
  ALL_EFFECT_DEFINITION_IDS,
  materializeCandidateCertificationTargets,
  materializeCertificationTargets,
} from '../../test/support/skillEffectCertification'

const DEFAULT_SAMPLES = 300
const WARMUP_SAMPLES = 50
const BATCH_SIZE = 5
const ACCEPTANCE_MEDIAN_REDUCTION = 0.35
const ACCEPTANCE_P95_REDUCTION = 0.25

interface TimingSummary {
  readonly medianMilliseconds: number
  readonly p95Milliseconds: number
  readonly minimumMilliseconds: number
  readonly maximumMilliseconds: number
  readonly samples: number
  readonly batchSize: number
}

const args = new Set(process.argv.slice(2))
const assertBudgets = args.has('--assert')
const samples = integerArgument('--samples') ?? DEFAULT_SAMPLES
if (samples < 20) {
  throw new Error('Skill-effect performance reports require at least 20 samples.')
}

const mature = createDeterministicMatureDysonFixture({
  ownedSkillIds: 'all',
})
const alternate = createDeterministicMatureDysonFixture({
  ownedSkillIds: [
    'parallelComputation',
    'stayingPower',
    'androids',
    'planetAssembly',
    'shouldersOfGiants',
    'scientificPlanets',
    'manualLabour',
    'shouldersOfPrecursors',
    'higgsBoson',
  ],
})

const referenceMaterialization = () =>
  materializeCertificationTargets(
    mature,
    materializeReferenceSkillEffects,
    resolveReferenceDynamicSkillEffect,
  )
const candidateMaterialization = () =>
  materializeCandidateCertificationTargets(mature)

const referenceValue = referenceMaterialization()
const candidateValue = candidateMaterialization()
if (!isDeepStrictEqual(candidateValue, referenceValue)) {
  throw new Error(
    'Candidate skill-effect materialization does not match the reference oracle.',
  )
}

let churnIndex = 0
const churnStates = [mature, alternate] as const
const candidateOwnershipChurn = () => {
  const state = churnStates[churnIndex % churnStates.length]!
  churnIndex += 1
  return materializeCandidateCertificationTargets(state)
}

const referenceDynamicSweep = () => {
  for (const effectId of ALL_EFFECT_DEFINITION_IDS) {
    resolveReferenceDynamicSkillEffect(
      effectId,
      mature,
      DETERMINISTIC_DYSON_TUNING,
      DETERMINISTIC_DYSON_SNAPSHOT,
    )
  }
}
const candidateDynamicSweep = () => {
  const prepared = prepareDynamicSkillEffectResolver(
    mature,
    DETERMINISTIC_DYSON_TUNING,
    DETERMINISTIC_DYSON_SNAPSHOT,
  )
  for (const effectId of ALL_EFFECT_DEFINITION_IDS) {
    prepared.resolve(effectId)
  }
}
const candidateFullDerivation = () => {
  const result = deriveBasicDysonState(
    mature,
    DETERMINISTIC_DYSON_TUNING,
    { permanentDoubleIp: true },
    DETERMINISTIC_DYSON_SNAPSHOT,
  )
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues))
  }
}

for (let index = 0; index < WARMUP_SAMPLES; index += 1) {
  referenceMaterialization()
  candidateMaterialization()
  candidateOwnershipChurn()
  referenceDynamicSweep()
  candidateDynamicSweep()
  candidateFullDerivation()
}

const referenceMaterializationTiming = measure(
  referenceMaterialization,
  samples,
)
const candidateMaterializationTiming = measure(
  candidateMaterialization,
  samples,
)
const candidateOwnershipChurnTiming = measure(
  candidateOwnershipChurn,
  samples,
)
const referenceDynamicTiming = measure(referenceDynamicSweep, samples)
const candidateDynamicTiming = measure(candidateDynamicSweep, samples)
const candidateDerivationTiming = measure(
  candidateFullDerivation,
  samples,
)

const materializationMedianReduction = reduction(
  referenceMaterializationTiming.medianMilliseconds,
  candidateMaterializationTiming.medianMilliseconds,
)
const materializationP95Reduction = reduction(
  referenceMaterializationTiming.p95Milliseconds,
  candidateMaterializationTiming.p95Milliseconds,
)
const dynamicMedianReduction = reduction(
  referenceDynamicTiming.medianMilliseconds,
  candidateDynamicTiming.medianMilliseconds,
)
const dynamicP95Reduction = reduction(
  referenceDynamicTiming.p95Milliseconds,
  candidateDynamicTiming.p95Milliseconds,
)

const budgets = {
  exactReferenceParity: true,
  materializationMedianReduction: {
    required: ACCEPTANCE_MEDIAN_REDUCTION,
    actual: materializationMedianReduction,
    passed:
      materializationMedianReduction >= ACCEPTANCE_MEDIAN_REDUCTION,
  },
  materializationP95Reduction: {
    required: ACCEPTANCE_P95_REDUCTION,
    actual: materializationP95Reduction,
    passed: materializationP95Reduction >= ACCEPTANCE_P95_REDUCTION,
  },
}
const passed =
  budgets.materializationMedianReduction.passed &&
  budgets.materializationP95Reduction.passed

const report = {
  version: 1,
  kind: 'skill-effect-evaluation',
  acceptanceEligible: assertBudgets && samples >= DEFAULT_SAMPLES,
  configuration: {
    samples,
    warmupSamples: WARMUP_SAMPLES,
    batchSize: BATCH_SIZE,
    deterministicFixture: 'schema-08-canonical-idb1-main-save',
    ownedSkills: Object.values(mature.skills.byId).filter(
      (skill) => skill.owned,
    ).length,
    authoredEffectDefinitions: ALL_EFFECT_DEFINITION_IDS.length,
  },
  measurements: {
    referenceMaterialization: referenceMaterializationTiming,
    candidateMaterialization: candidateMaterializationTiming,
    candidateOwnershipChurn: candidateOwnershipChurnTiming,
    referenceDynamicResolverSweep: referenceDynamicTiming,
    candidateDynamicResolverSweep: candidateDynamicTiming,
    candidateFullDysonDerivation: candidateDerivationTiming,
  },
  reductions: {
    materializationMedian: materializationMedianReduction,
    materializationP95: materializationP95Reduction,
    dynamicResolverMedian: dynamicMedianReduction,
    dynamicResolverP95: dynamicP95Reduction,
  },
  budgets,
  passed,
}

console.log(JSON.stringify(report, null, 2))

if (assertBudgets && (!passed || samples < DEFAULT_SAMPLES)) {
  process.exitCode = 1
}

function measure(operation: () => unknown, count: number): TimingSummary {
  const values: number[] = []
  for (let sample = 0; sample < count; sample += 1) {
    const started = performance.now()
    for (let batch = 0; batch < BATCH_SIZE; batch += 1) operation()
    values.push((performance.now() - started) / BATCH_SIZE)
  }
  values.sort((left, right) => left - right)
  return {
    medianMilliseconds: percentile(values, 0.5),
    p95Milliseconds: percentile(values, 0.95),
    minimumMilliseconds: values[0] ?? 0,
    maximumMilliseconds: values.at(-1) ?? 0,
    samples: count,
    batchSize: BATCH_SIZE,
  }
}

function percentile(values: readonly number[], value: number): number {
  if (values.length === 0) return 0
  const rank = Math.max(1, Math.ceil(values.length * value))
  return values[rank - 1] ?? 0
}

function reduction(reference: number, candidate: number): number {
  return reference <= 0 ? 0 : 1 - candidate / reference
}

function integerArgument(name: string): number | undefined {
  const prefix = `${name}=`
  const raw = process.argv.slice(2).find((argument) =>
    argument.startsWith(prefix),
  )
  if (raw === undefined) return undefined
  const parsed = Number(raw.slice(prefix.length))
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`)
  }
  return parsed
}
