import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dehydrateGameState, hydrateGameState } from '../../src/game-state/mapping'
import type { CanonicalGameStateV1 } from '../../src/game-state/types'
import { validateCanonicalGameState } from '../../src/game-state/validate'
import { prepareIdb1Save } from '../../src/save/prepare'
import { serializeWebSave } from '../../src/save/serialization'
import { prepareImportedSaveText } from '../../src/save/import'
import { withDysonSkillEffectEvaluationSnapshot, type DysonSkillEffectEvaluationSnapshot } from '../../src/game-state/skillEffectEvaluationSnapshot'
import { applyCanonicalInfinityReset } from '../../src/simulation/canonicalInfinityReset'
import { purchaseCanonicalInfinityShopItem } from '../../src/simulation/canonicalInfinityShop'
import { previewCanonicalSkillCatalog, purchaseCanonicalSkill } from '../../src/simulation/canonicalSkillTransactions'
import { purchaseSimulationUpgrade } from '../../src/simulation/dreamEducationUpgrades'
import { advanceCanonicalGoalProgression } from '../../src/simulation/canonicalGoalProgression'
import { applyCanonicalDreamReset } from '../../src/simulation/canonicalDreamReset'
import {
  purchaseDreamFoundationalInformation,
  runDreamFoundationalInformationProduction,
} from '../../src/simulation/dreamFoundationalInformation'
import { purchaseQuantumUpgrade, QUANTUM_UPGRADE_IDS } from '../../src/simulation/quantumUpgrades'
import { applyCanonicalQuantumReset } from '../../src/simulation/quantumTransitions'
import { withCanonicalBotAllocation } from '../../src/simulation/canonicalBotAllocation'
import { deriveBasicDysonState } from '../../src/simulation/canonicalDysonDerivation'
import { createDeterministicMatureDysonFixture } from './deterministicMatureDysonFixture'
import { selectGameplayVisibility } from '../../src/application/frontendSnapshot'
import { advanceRealityWorkers, gatherRealityInfluence } from '../../src/simulation/realityWorkers'
import { DEFAULT_AUTOMATION_INTERVAL_SECONDS } from '../../src/simulation/eventTime'

export const PROGRESSION_FIXTURE_IDS = [
  'fresh', 'mid-swarm', 'first-infinity', 'mature-infinity',
  'reality-unlock', 'mature-simulations', 'quantum-unlock',
  'late-quantum', 'maximum-skills',
] as const

// Unity rolls maxOfflineTime back to one day at 100 days. Capacity doubles
// from one day, so 64 days is the largest save-persisted reachable value.
export const MAXIMUM_PERSISTED_STORED_TIME_SECONDS = 5_529_600

export type ProgressionFixtureId = (typeof PROGRESSION_FIXTURE_IDS)[number]
export type ProgressionRoute =
  | 'bots' | 'research' | 'skills' | 'infinity' | 'reality'
  | 'simulations' | 'quantum' | 'avocato' | 'story' | 'wiki'
  | 'offline-time' | 'statistics' | 'settings'

export interface ProgressionMatrixFixture {
  readonly id: ProgressionFixtureId
  readonly description: string
  readonly state: CanonicalGameStateV1
  readonly fingerprint: string
  readonly saveSha256: string
  readonly reachableRoutes: readonly ProgressionRoute[]
  readonly saveText: string
  readonly certification: readonly string[]
}

// Direct file loading keeps this support module Node-safe; plain tsx cannot
// interpret the production module's Vite-only `?raw` import.
const firstRunText = readFileSync(new URL(
  '../../src/application/firstRun/generated/first-run-schema-12.idb1.txt',
  import.meta.url,
), 'utf8')
const freshSession = hydrateGameState(prepareIdb1Save(firstRunText).prepared)
const freshState = freshSession.state

export function createProgressionMatrixFixtures(): readonly ProgressionMatrixFixture[] {
  const firstInfinity = canonicalFirstInfinity()
  const matureInfinity = withMatureActiveEconomy(withInfinityShop(firstInfinity, 41n, 20, 0))
  const realityUnlock = withInfinityShop(firstInfinity, 41n, 27, 10)
  const quantumUnlock = withInfinityShop(firstInfinity, 42n, 27, 10)
  const lateQuantum = withCanonicalQuantumPurchases(quantumUnlock)
  const maximumSkills = withMaximumCanonicalSkills(lateQuantum)
  const rows: ReadonlyArray<readonly [ProgressionFixtureId, string, CanonicalGameStateV1, readonly string[]]> = [
    ['fresh', 'Unmodified production first-run artifact.', freshState, ['production first-run artifact']],
    ['mid-swarm', 'Deterministic pre-Infinity run with every basic Dyson facility visible.', midSwarm(), ['pre-Infinity invariants']],
    ['first-infinity', 'The result of one canonical Infinity reset awarding one point.', firstInfinity, ['applyCanonicalInfinityReset']],
    ['mature-infinity', 'Active mature Infinity economy with twenty Secrets and both automation unlocks purchased canonically.', matureInfinity.state, ['canonical reset', '20 canonical Secret purchases', 'canonical automation purchases', 'characterized active-economy seed', 'goal progression fixed point']],
    ['reality-unlock', 'The authored 27 Secrets and ten permanent Skill purchases paid from 41 Infinity Points.', realityUnlock, ['canonical reset', '37 canonical Infinity shop purchases']],
    ['mature-simulations', 'Reality unlocked with a reset, populated Dream run, and Simulation upgrade produced through canonical transactions.', matureSimulations(realityUnlock), ['canonical Dream reset', 'canonical Reality generation/gather', 'canonical Dream purchases/production', 'canonical Simulation upgrade purchase']],
    ['quantum-unlock', 'The 42 Infinity Point Quantum threshold with valid Reality-unlock spending.', quantumUnlock, ['canonical reset', '37 canonical Infinity shop purchases']],
    ['late-quantum', 'Late Quantum built by 420 canonical leap cycles followed by canonical upgrade transactions.', lateQuantum, ['canonical Infinity resets', 'canonical Quantum resets', 'canonical Quantum upgrade purchases']],
    ['maximum-skills', 'Maximum deterministic non-conflicting Skill ownership from an explicit stress-funding seed and canonical purchases.', maximumSkills, ['explicit 200-point/42-fragment stress seed', 'canonical Skill purchase fixed point', 'exclusive choices respected']],
  ]
  return rows.map(([id, description, state, certification]) => materialize(
    id,
    description,
    state,
    certification,
    id === 'mature-infinity' ? matureInfinity.evaluationSnapshot : undefined,
  ))
}

/** Loads the immutable serialized artifacts used by performance runs. */
export function loadCheckedInProgressionMatrixFixtures(): readonly ProgressionMatrixFixture[] {
  const directory = new URL('../../test/fixtures/progression/', import.meta.url)
  const manifest = JSON.parse(readFileSync(new URL('fixture-manifest.json', directory), 'utf8')) as {
    readonly schemaVersion: number
    readonly fixtures: readonly {
      readonly id: ProgressionFixtureId
      readonly description: string
      readonly fingerprint: string
      readonly saveSha256: string
      readonly reachableRoutes: readonly ProgressionRoute[]
      readonly certification: readonly string[]
      readonly file: string
    }[]
  }
  if (manifest.schemaVersion !== 1) throw new Error(`Unsupported progression manifest ${manifest.schemaVersion}`)
  return manifest.fixtures.map((entry) => {
    const saveText = readFileSync(new URL(entry.file, directory), 'utf8').trimEnd()
    const saveSha256 = createHash('sha256').update(saveText).digest('hex')
    if (saveSha256 !== entry.saveSha256) throw new Error(`${entry.id}: checked-in save SHA mismatch`)
    const state = hydrateGameState(prepareImportedSaveText(saveText, '2026-08-19T00:00:00.000Z')).state
    const fingerprint = createHash('sha256').update(stableStringify(state)).digest('hex')
    if (fingerprint !== entry.fingerprint) throw new Error(`${entry.id}: checked-in state fingerprint mismatch`)
    assertProgressionAccounting(entry.id, state)
    return Object.freeze({ ...entry, state, saveText }) as ProgressionMatrixFixture
  })
}

function midSwarm(): CanonicalGameStateV1 {
  const seed: CanonicalGameStateV1 = {
    ...freshState,
    meta: { ...freshState.meta, tutorialComplete: true },
    dyson: {
      ...freshState.dyson,
      money: 1e18, science: 1e12, bots: 250_000,
      workers: 150_000, researchers: 100_000, botDistribution: 0.4,
      facilities: {
        ...freshState.dyson.facilities,
        assembly_lines: [100, 10], ai_managers: [30, 5], servers: [10, 2],
        data_centers: [3, 1], planets: [1, 0],
      },
    },
  }
  const progressed = advanceCanonicalGoalProgression(seed, deriveGoalFacts)
  if (
    !progressed.ok ||
    progressed.state.dyson.goalStage !== 2n ||
    progressed.completedStages.length !== 2
  ) {
    throw new Error(`Mid-swarm canonical goal progression reached ${progressed.state.dyson.goalStage}`)
  }
  return progressed.state
}

function canonicalFirstInfinity(): CanonicalGameStateV1 {
  const mid = midSwarm()
  const eligible: CanonicalGameStateV1 = {
    ...mid,
    dyson: {
      ...mid.dyson,
      bots: 42e18,
      workers: 25.2e18,
      researchers: 16.8e18,
    },
  }
  const clean: CanonicalGameStateV1 = {
    ...eligible,
    meta: { ...eligible.meta, firstInfinityComplete: false },
    infinity: { ...eligible.infinity, points: 0n, spentPoints: 0n, permanentSkillPoints: 0n, secretsOfTheUniverse: 0n },
    skills: { ...eligible.skills, points: 0n, fragments: 0n, activeAutoAssignment: [] },
    quantum: freshState.quantum,
    reality: freshState.reality,
    avocado: freshState.avocado,
  }
  const result = applyCanonicalInfinityReset(clean, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
  if (!result.ok) throw new Error(`Canonical first Infinity failed: ${JSON.stringify(result.issues)}`)
  return result.state
}

function withInfinityShop(source: CanonicalGameStateV1, earnedPoints: bigint, secrets: number, permanentSkills: number): CanonicalGameStateV1 {
  const transition = applyCanonicalInfinityReset(
    { ...source, dyson: { ...source.dyson, bots: 42e18 } },
    {
      breakInfinity: false,
      requestedReward: earnedPoints - source.infinity.points,
      artifactSkillPoints: 0n,
    },
  )
  if (!transition.ok) throw new Error('Infinity fixture reward transition failed')
  let state = transition.state
  for (let count = 0; count < secrets; count += 1) {
    const result = purchaseCanonicalInfinityShopItem(state, 'secret')
    if (!result.accepted || !result.changed) throw new Error(`Secret purchase ${count + 1} failed: ${result.code}`)
    state = result.state
  }
  for (let count = 0; count < permanentSkills; count += 1) {
    const result = purchaseCanonicalInfinityShopItem(state, 'permanent-skill-point')
    if (!result.accepted || !result.changed) throw new Error(`Permanent Skill purchase ${count + 1} failed: ${result.code}`)
    state = result.state
  }
  return state
}

function matureSimulations(source: CanonicalGameStateV1): CanonicalGameStateV1 {
  const reset = applyCanonicalDreamReset(source, {
    kind: 'explicit', cause: 'Meteor', requestedReward: 100,
  })
  if (!reset.ok || !reset.applied) throw new Error('Simulation fixture Dream reset failed')
  let funded = reset.state
  for (let batch = 0; batch < 4; batch += 1) {
    const workers = advanceRealityWorkers(funded, 32)
    if (workers.status !== 'success') throw new Error(`Simulation fixture Reality advance failed: ${workers.status}`)
    const gathered = gatherRealityInfluence(workers.state)
    if (!gathered.gathered) throw new Error(`Simulation fixture Reality gather failed: ${gathered.status}`)
    funded = gathered.state
  }
  const hunters = purchaseDreamFoundationalInformation(funded, 'hunters')
  if (!hunters.purchased) throw new Error(`Simulation fixture hunter purchase failed: ${hunters.status}`)
  const gatherers = purchaseDreamFoundationalInformation(hunters.state, 'gatherers')
  if (!gatherers.purchased) throw new Error(`Simulation fixture gatherer purchase failed: ${gatherers.status}`)
  const produced = runDreamFoundationalInformationProduction(gatherers.state, {
    tickSeconds: 1_200,
    doubleTimeMultiplier: 1,
  })
  if (produced.status !== 'success') throw new Error(`Simulation fixture production failed: ${produced.status}`)
  const upgrade = purchaseSimulationUpgrade(produced.state, 'counterMeteor')
  if (upgrade.code !== 'purchased') throw new Error(`Simulation fixture purchase failed: ${upgrade.code}`)
  return upgrade.candidate
}

function withMatureActiveEconomy(source: CanonicalGameStateV1): {
  readonly state: CanonicalGameStateV1
  readonly evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
} {
  let state = source
  for (const item of ['unlock-research-automation', 'unlock-bot-automation'] as const) {
    const purchase = purchaseCanonicalInfinityShopItem(state, item)
    if (!purchase.accepted || !purchase.changed) throw new Error(`Mature economy ${item} purchase failed`)
    state = purchase.state
  }
  const characterized = createDeterministicMatureDysonFixture()
  const spliced = {
    ...state,
    dyson: characterized.dyson,
    research: characterized.research,
    timeline: {
      ...state.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent:
        DEFAULT_AUTOMATION_INTERVAL_SECONDS,
      storedTimeAvailableSeconds: MAXIMUM_PERSISTED_STORED_TIME_SECONDS,
      storedTimeCapacitySeconds: MAXIMUM_PERSISTED_STORED_TIME_SECONDS,
    },
  }
  let candidate = spliced
  let evaluationSnapshot = freshSession.skillEffectEvaluationSnapshot
  for (let pass = 0; pass < 16; pass += 1) {
    const progressed = advanceCanonicalGoalProgression(
      candidate,
      (state) => deriveGoalFacts(state, evaluationSnapshot),
    )
    if (!progressed.ok) throw new Error(progressed.detail)
    candidate = progressed.state
    evaluationSnapshot = deriveDyson(candidate, evaluationSnapshot)
      .nextEvaluationSnapshot
    if (progressed.completedStages.length === 0) break
  }
  candidate = withCanonicalBotAllocation(candidate)
  for (let pass = 0; pass < 16; pass += 1) {
    const progressed = advanceCanonicalGoalProgression(
      candidate,
      (state) => deriveGoalFacts(state, evaluationSnapshot),
    )
    if (!progressed.ok) throw new Error(progressed.detail)
    candidate = progressed.state
    evaluationSnapshot = deriveDyson(candidate, evaluationSnapshot)
      .nextEvaluationSnapshot
    if (progressed.completedStages.length === 0) break
  }
  const fixedPoint = advanceCanonicalGoalProgression(
    candidate,
    (state) => deriveGoalFacts(state, evaluationSnapshot),
  )
  if (!fixedPoint.ok || fixedPoint.completedStages.length !== 0) {
    throw new Error('Mature economy retained deferred goal progression')
  }
  if (candidate.dyson.goalStage !== 10n) {
    throw new Error(`Mature economy goal catch-up reached ${candidate.dyson.goalStage}`)
  }
  evaluationSnapshot = deriveDyson(candidate, evaluationSnapshot)
    .nextEvaluationSnapshot
  return { state: candidate, evaluationSnapshot }
}

function deriveGoalFacts(
  candidate: CanonicalGameStateV1,
  evaluationSnapshot = freshSession.skillEffectEvaluationSnapshot,
) {
  const derived = deriveDyson(candidate, evaluationSnapshot)
  return {
    panelsPerSecond: derived.globals.panelsPerSecond,
    panelLifetimeSeconds: derived.globals.panelLifetimeSeconds,
  }
}

function deriveDyson(
  candidate: CanonicalGameStateV1,
  evaluationSnapshot: Readonly<DysonSkillEffectEvaluationSnapshot>,
) {
  const derived = deriveBasicDysonState(
    candidate,
    freshSession.compatibilityTuning,
    { permanentDoubleIp: false },
    evaluationSnapshot,
  )
  if (!derived.ok) {
    throw new Error(`Dyson goal derivation failed: ${derived.issues[0]?.detail ?? 'unknown issue'}`)
  }
  return derived.value
}

function withCanonicalQuantumPurchases(source: CanonicalGameStateV1): CanonicalGameStateV1 {
  let state = source
  for (let leap = 0; leap < 420; leap += 1) {
    const thresholdReady: CanonicalGameStateV1 = {
      ...state,
      dyson: { ...state.dyson, bots: 42e18 },
    }
    const infinity = applyCanonicalInfinityReset(thresholdReady, {
      breakInfinity: false,
      requestedReward: 42n,
      artifactSkillPoints: 0n,
    })
    if (!infinity.ok) throw new Error(`Late Quantum Infinity cycle ${leap + 1} failed`)
    const quantum = applyCanonicalQuantumReset(infinity.state, 0n)
    if (!quantum.ok) throw new Error(`Late Quantum leap ${leap + 1} failed`)
    state = quantum.state
  }
  for (let pass = 0; pass < 64; pass += 1) {
    let changed = false
    for (const id of QUANTUM_UPGRADE_IDS) {
      const result = purchaseQuantumUpgrade(state, id)
      if (result.accepted && result.changed) { state = result.state; changed = true }
    }
    if (!changed) break
  }
  return state
}

function withMaximumCanonicalSkills(source: CanonicalGameStateV1): CanonicalGameStateV1 {
  const reset = applyCanonicalInfinityReset(
    { ...source, dyson: { ...source.dyson, bots: 42e18 } },
    { breakInfinity: false, requestedReward: 10n, artifactSkillPoints: 0n },
  )
  if (!reset.ok) throw new Error('Maximum Skills Infinity seed failed')
  let state = reset.state
  for (let count = 0; count < 10; count += 1) {
    const purchase = purchaseCanonicalInfinityShopItem(state, 'permanent-skill-point')
    if (!purchase.accepted || !purchase.changed) throw new Error(`Maximum Skills permanent purchase ${count + 1} failed`)
    state = purchase.state
  }
  state = { ...state, skills: { ...state.skills, points: 200n, fragments: 42n, activeAutoAssignment: [] } }
  for (let pass = 0; pass < 128; pass += 1) {
    const preview = previewCanonicalSkillCatalog(state)
    if (!preview.complete) throw new Error(preview.definitionGap ?? 'Skill catalog incomplete')
    let changed = false
    for (const skill of preview.skills) {
      if (!skill.purchase.eligible || skill.owned) continue
      const result = purchaseCanonicalSkill(state, skill.skillId)
      if (result.accepted && result.changed) { state = result.state; changed = true }
    }
    if (!changed) break
  }
  return state
}

function materialize(
  id: ProgressionFixtureId,
  description: string,
  state: CanonicalGameStateV1,
  certification: readonly string[],
  evaluationSnapshot?: Readonly<DysonSkillEffectEvaluationSnapshot>,
): ProgressionMatrixFixture {
  const validation = validateCanonicalGameState(state)
  if (!validation.valid) throw new Error(`Progression fixture '${id}' is invalid: ${validation.errors.join(' ')}`)
  assertProgressionAccounting(id, state)
  const mapped = dehydrateGameState(freshSession, state)
  const prepared = evaluationSnapshot === undefined
    ? mapped
    : withDysonSkillEffectEvaluationSnapshot(mapped, evaluationSnapshot)
  const saveText = serializeWebSave(prepared.copyValidatedState())
  const serializedState = hydrateGameState(
    prepareImportedSaveText(saveText, '2026-08-19T00:00:00.000Z'),
  ).state
  return Object.freeze({
    id, description, state: serializedState,
    fingerprint: createHash('sha256').update(stableStringify(serializedState)).digest('hex'),
    saveSha256: createHash('sha256').update(saveText).digest('hex'),
    reachableRoutes: deriveProgressionRoutes(serializedState), saveText,
    certification: Object.freeze([
      ...certification,
      'full production application/engine startup and advance',
    ]),
  })
}

function assertProgressionAccounting(id: ProgressionFixtureId, state: CanonicalGameStateV1): void {
  const shopSecrets = state.infinity.secretsOfTheUniverse > state.quantum.permanentSecrets
    ? state.infinity.secretsOfTheUniverse - state.quantum.permanentSecrets
    : 0n
  const minimumSpent = shopSecrets + state.infinity.permanentSkillPoints
  if (state.infinity.spentPoints < minimumSpent) throw new Error(`${id}: Infinity spending is below purchased Secrets/permanent Skills`)
  if (state.infinity.spentPoints > state.infinity.points) throw new Error(`${id}: Infinity spending exceeds earned points`)
  const preview = previewCanonicalSkillCatalog(state)
  if (!preview.complete) throw new Error(`${id}: ${preview.definitionGap}`)
  const owned = new Set(preview.skills.filter((skill) => skill.owned).map((skill) => skill.skillId))
  for (const skill of preview.skills) {
    if (!skill.owned) continue
    const conflict = skill.exclusiveWithSkillIds.find((other) => owned.has(other))
    if (conflict !== undefined) throw new Error(`${id}: mutually exclusive Skills '${skill.skillId}' and '${conflict}' are both owned`)
  }
}

export function deriveProgressionRoutes(state: CanonicalGameStateV1): readonly ProgressionRoute[] {
  const routes: ProgressionRoute[] = ['bots', 'research']
  const visibility = selectGameplayVisibility(state)
  if (visibility.skills.routeUnlocked) routes.push('skills')
  if (visibility.infinity.routeUnlocked) routes.push('infinity')
  if (visibility.reality.routeVisible && visibility.reality.routeUnlocked) routes.push('reality')
  if (visibility.reality.routeVisible && visibility.simulations.routeUnlocked) routes.push('simulations')
  if (state.infinity.points >= 42n || state.quantum.pointsEarned > 0n) routes.push('quantum')
  if (state.avocado.unlocked) routes.push('avocato')
  routes.push('story', 'wiki', 'offline-time', 'statistics', 'settings')
  return Object.freeze(routes)
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === 'bigint') return { $bigint: entry.toString() }
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) return Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    return entry
  })
}
