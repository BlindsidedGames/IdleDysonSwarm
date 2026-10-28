import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_DYSON_TUNING,
  DETERMINISTIC_DYSON_SNAPSHOT,
} from '../../scripts/support/deterministicMatureDysonFixture'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { createCanonicalGameEngineDefinition } from '../application/canonicalGameApplication'
import { TransactionalSimulationEngine } from '../core/simulationEngine'
import { gameDataCatalog, getGameAsset } from '../game-data/catalog'
import { validateCanonicalGameState } from '../game-state/validate'
import { prepareIdb1Save } from '../save/prepare'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { SIMULATION_UPGRADE_DEFINITIONS } from './dreamEducationUpgrades'
import { resolveMoneyScienceSkillEffect } from './moneyScienceSkillEffects'
import { applyCanonicalQuantumReset } from './quantumTransitions'
import { REALITY_UPGRADE_DEFINITIONS } from './realityUpgrades'

const affectedSkills = ['regulatedAcademia', 'shouldersOfTheRevolution'] as const
const affectedEffects = [
  ['regulatedAcademia.money_multiplier', 'research.money_multiplier', 0],
  ['regulatedAcademia.science_multiplier', 'research.science_boost', 0],
  ['shouldersOfTheRevolution.money_multiplier', 'research.science_boost', 1],
] as const

// Public catalog prerequisites reproduce both triggers without a private player save.
function prerequisiteQueue(skillId: string): string[] {
  const queue: string[] = []
  function visit(id: string) {
    const asset = gameDataCatalog.assets.find((entry) => entry.id === id && entry.kind === 'GameData.SkillDefinition')
    if (asset?.kind !== 'GameData.SkillDefinition') throw new Error(id)
    for (const requiredId of asset.data.requiredSkillIds) visit(requiredId)
    if (!queue.includes(id)) queue.push(id)
  }
  visit(skillId)
  return queue
}

const savedFixture = readFileSync(new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url,
), 'utf8')

function runtimeForSkill(skillId: string) {
  const runtime = structuredClone(new CanonicalRuntimeSession(
    prepareIdb1Save(savedFixture).prepared,
    { entitlements: { extraAnalysisPower: false, permanentDoubleIp: false } },
  ).initialState)
  const state = runtime.gameState
  const queue = prerequisiteQueue(skillId)
  state.meta.firstInfinityComplete = true
  state.dyson.bots = 42e18
  state.dyson.botDistribution = 0.5
  state.timeline.infinityCycleSeconds = 60
  state.infinity.automaticResetEnabled = true
  state.infinity.permanentSkillPoints = 10n
  state.skills.points = 100n
  state.skills.fragments = 5n
  state.skills.activeAutoAssignment = queue
  state.skills.autoAssignNonRefundable = true
  for (const [id, skill] of Object.entries(state.skills.byId)) {
    skill.owned = queue.includes(id)
  }
  state.quantum.unlocks = Object.fromEntries(
    Object.keys(state.quantum.unlocks).map((id) => [id, true]),
  ) as typeof state.quantum.unlocks
  state.quantum.unlocks.breakTheLoop = false
  for (const [id, upgrade] of REALITY_UPGRADE_DEFINITIONS) {
    if (upgrade.purchaseEffects.some((effect) => effect.effectType === 2)) {
      state.dream.upgrades[id] = true
    }
  }
  return runtime
}

const definition = createCanonicalGameEngineDefinition({
  eventContext: {
    mode: 'active', automationIntervalSeconds: 1,
    realityWorkerTuning: { workerBatchSize: 128n, baseWorkerGenerationSpeed: 4 },
    dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
    realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
    infinityResetAssetLookup: getGameAsset,
  },
})

describe('sparse research in skill effects', () => {
  test.each(affectedEffects)('%s treats absent research as level zero', (effect, key, neutral) => {
    const state = createDeterministicMatureDysonFixture({ ownedSkillIds: affectedSkills })
    const resolve = (levelsById: Record<string, number>) => resolveMoneyScienceSkillEffect(
      `effect.${effect}`, { ...state, research: { levelsById } },
      DETERMINISTIC_DYSON_TUNING, DETERMINISTIC_DYSON_SNAPSHOT,
    )
    expect(resolve({})).toEqual({ handled: true, ok: true, value: neutral })
    expect(resolve({})).toEqual(resolve({ [key]: 0 }))
    expect(resolve({ [key]: 20 })).toMatchObject({ handled: true, ok: true })
    expect(resolve({ [key]: 20 })).not.toEqual(resolve({}))
    for (const invalid of [undefined, null, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(resolve({ [key]: invalid as number })).toMatchObject({
        handled: true, ok: false,
        issue: { code: 'DYSON_MONEY_SCIENCE_CANONICAL_INPUT_INVALID', path: `research.levelsById.${key}` },
      })
    }
  })
})

describe.each(affectedSkills)('%s reset recovery', (skillId) => {
  test.each(['manual', 'active', 'stored'] as const)('%s Infinity commits and keeps advancing', (mode) => {
    const runtime = runtimeForSkill(skillId)
    expect(validateCanonicalGameState(runtime.gameState)).toEqual({ valid: true, errors: [] })
    const engine = new TransactionalSimulationEngine(runtime, definition)
    const result = mode === 'active' ? engine.advanceBy(100) : engine.dispatch({
      expectedRevision: 0,
      command: mode === 'manual' ? { kind: 'infinity.request-reset' }
        : { kind: 'internal.advance-stored-time', seconds: 1 },
    })
    expect(result).toMatchObject({ accepted: true, changed: true })
    const after = engine.snapshot().state.gameState
    expect(after.dyson.bots).toBeLessThan(42e18)
    expect(after.skills.byId[skillId].owned).toBe(true)
    expect(engine.advanceBy(100)).toMatchObject({ accepted: true, changed: true })
  })

  test.each(['active', 'stored'] as const)('%s advances an existing sparse save', (mode) => {
    const runtime = runtimeForSkill(skillId)
    runtime.gameState.research.levelsById = {}
    runtime.gameState.infinity.automaticResetEnabled = false
    const engine = new TransactionalSimulationEngine(runtime, definition)
    const result = mode === 'active' ? engine.advanceBy(100) : engine.dispatch({
      expectedRevision: 0,
      command: { kind: 'internal.advance-stored-time', seconds: 1 },
    })
    expect(result).toMatchObject({ accepted: true, changed: true })
  })

  test('Quantum reassigns the skill with zero research and derives successfully', () => {
    const reset = applyCanonicalQuantumReset(runtimeForSkill(skillId).gameState, 100n)
    expect(reset.ok).toBe(true)
    if (!reset.ok) throw new Error(JSON.stringify(reset.issues))
    expect(reset.autoAssignedSkillIds).toContain(skillId)
    expect(reset.state.research.levelsById).toEqual({})
    expect(deriveBasicDysonState(
      reset.state, DETERMINISTIC_DYSON_TUNING,
      { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT,
    ).ok).toBe(true)
  })
})
