import { applyCanonicalOverflowReset } from '../simulation/canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from '../simulation/overflowBoundary'
import { EMPTY_DISCOVERY } from '../simulation/discovery'
import { applyCanonicalInfinityReset } from '../simulation/canonicalInfinityReset'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { validateCanonicalGameState } from '../game-state/validate'
import { prepareIdb1Save } from '../save/prepare'
import { routeCanonicalGameCommand, type CanonicalGameCommand, type CanonicalGameCommandOptions } from './canonicalGameCommands'
import { deriveDysonProduction } from '../simulation/canonicalDysonDerivation'
import { EMPTY_INFINITY_CHALLENGES } from '../simulation/infinityChallenges'
import { previewCanonicalSkillCatalog, refundCanonicalSkill } from '../simulation/canonicalSkillTransactions'
import { purchaseCanonicalInfinityShopItem } from '../simulation/canonicalInfinityShop'
import { createCanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import { CanonicalEventTimeModel, createCapturedInfinityAssetLookup, type CanonicalEventTimeState } from '../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import { advanceGame } from '../simulation/gameStep'

const fixture = readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')
const session = () => hydrateGameState(prepareIdb1Save(fixture).prepared)
const runtime = session()

function commandOptions(): CanonicalGameCommandOptions {
  return {
    runtimeCarriers: { compatibilityTuning: runtime.compatibilityTuning,
      skillEffectEvaluationSnapshot: runtime.skillEffectEvaluationSnapshot,
      storedTimeCheater: false, selectedSkillPresetSlot: 1 },
    runtimeEvaluation: { evaluate: (state, previous) => {
      const result = deriveDysonProduction(state, runtime.compatibilityTuning, { permanentDoubleIp: false }, previous)
      return result.ok ? { accepted: true, snapshot: result.value.nextEvaluationSnapshot }
        : { accepted: false, code: 'derivation-failed', issues: result.issues }
    } },
  }
}

function legacyState(): CanonicalGameStateV1 {
  const state = runtime.state
  const owned = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }
  return { ...state,
    meta: { ...state.meta, reworkMigrationChoice: undefined, firstInfinityComplete: true },
    infinity: { ...state.infinity, points: 1000n, spentPoints: 5n, automaticResetEnabled: false,
      secretsOfTheUniverse: 5n, automationUnlocked: { research: true, bots: false },
      currentCyclePeakIpPerMinute: 900, currentCyclePeakReward: 9n,
      manualPeakIpPerMinute: 400, manualPeakReward: 4n, manualCalibrationObservedActiveSeconds: 60,
      activeAutomaticThroughputCycleEligible: true },
    timeline: { ...state.timeline, doubleTime: { ...state.timeline.doubleTime, unlocked: true } },
    statistics: { ...state.statistics,
      recentActiveAutomaticInfinityCycles: [{ breakInfinity: true, automatic: true, configuredTarget: 1n,
        reward: 1n, durationSeconds: 2, processingSource: 'active', activeIntervalMilliseconds: 200 }],
    },
    avocado: { ...state.avocado, unlocked: true, infinityPoints: 1000, influence: 1000, strangeMatter: 1000, overflowPoints: 7n },
    discovery: { unlocked: true, completions: 4n, progress: 0.3, startingPower: 2n, speedUpgrades: 1n },
    challenges: { ...EMPTY_INFINITY_CHALLENGES, blankSlateCompleted: true, galvanizedSkillIds: ['startHereTree', 'androids'], galvanizers: 2n },
    quantum: { ...state.quantum, pointsEarned: 100n, pointsSpent: 20n, permanentSecrets: 12n,
      unlocks: { ...state.quantum.unlocks, fragments: true, breakTheLoop: true, quantumEntanglement: true, automation: true } },
    skills: { ...state.skills, points: 10n, fragments: 0n, byId: { startHereTree: owned, androids: owned, higgsBoson: owned, manualLabour: owned, 'subskill.cashScience.lifetime': owned },
      activeAutoAssignment: ['startHereTree', 'subskill.cashScience.lifetime'],
      presets: state.skills.presets.map(preset => ({ ...preset, skillIds: ['startHereTree', 'subskill.cashScience.lifetime'] })) },
  }
}

describe('gameplay rework player contract', () => {
  test('a first-run save is already opted in before earning relocated benefits', () => {
    const firstRun = readFileSync(new URL('./firstRun/generated/first-run-schema-12.idb1.txt', import.meta.url), 'utf8')
    const hydrated = hydrateGameState(prepareIdb1Save(firstRun).prepared)
    expect(hydrated.state.meta.reworkMigrationChoice).toBe('keep')
    expect(hydrateGameState(dehydrateGameState(hydrated)).state.meta.reworkMigrationChoice).toBe('keep')
  })
  test.each([
    { choice: 'keep', ordinarySecrets: 5n, expectedSecrets: 12n },
    { choice: 'fresh', ordinarySecrets: 5n, expectedSecrets: 5n },
    { choice: 'keep', ordinarySecrets: 18n, expectedSecrets: 18n },
  ] as const)('persists $choice progression with $ordinarySecrets ordinary Secrets', ({ choice, ordinarySecrets, expectedSecrets }) => {
    const legacy = legacyState()
    const before = { ...legacy, infinity: { ...legacy.infinity, secretsOfTheUniverse: ordinarySecrets } }
    const result = routeCanonicalGameCommand(before, { kind: 'rework.choose-migration', choice }, commandOptions())
    expect(result.accepted, result.code).toBe(true)
    const after = hydrateGameState(dehydrateGameState(runtime, result.state)).state
    expect(after.meta.reworkMigrationChoice).toBe(choice)
    expect(after.dyson.money).toBe(before.dyson.money)
    expect(after.dyson.bots).toBe(before.dyson.bots)
    expect(after.dyson.facilities).toEqual(before.dyson.facilities)
    expect(after.infinity.points).toBe(1000n)
    expect(after.infinity.spentPoints).toBe(5n)
    expect(after.infinity.secretsOfTheUniverse).toBe(expectedSecrets)
    expect(after.infinity.automationUnlocked).toEqual({ research: true, bots: choice === 'keep' })
    expect(after.quantum.permanentSecrets).toBe(0n)
    expect(after.quantum.unlocks.automation).toBe(false)
    expect(after.timeline.doubleTime.unlocked).toBe(choice === 'keep')
    expect([after.infinity.currentCyclePeakIpPerMinute, after.infinity.currentCyclePeakReward,
      after.infinity.manualPeakIpPerMinute, after.infinity.manualPeakReward,
      after.infinity.manualCalibrationObservedActiveSeconds, after.infinity.activeAutomaticThroughputCycleEligible])
      .toEqual(choice === 'fresh' ? [0, 0n, 0, 0n, 0, false] : [900, 9n, 400, 4n, 60, true])
    expect(after.statistics.recentActiveAutomaticInfinityCycles)
      .toEqual(choice === 'fresh' ? [] : before.statistics.recentActiveAutomaticInfinityCycles)
    expect(after.statistics.recentInfinityCycles).toEqual(before.statistics.recentInfinityCycles)
    expect(after.avocado.overflowPoints).toBe(7n)
    expect(after.discovery).toEqual(before.discovery)
    expect(after.challenges?.blankSlateCompleted).toBe(true)
    expect(after.challenges?.galvanizedSkillIds).toEqual(choice === 'keep' ? ['startHereTree', 'androids'] : [])
    expect(after.quantum.unlocks.fragments).toBe(choice === 'keep')
    expect(after.skills.byId.startHereTree.owned).toBe(choice === 'keep')
    expect(after.skills.byId.androids.owned).toBe(choice === 'keep')
    expect(after.skills.byId.higgsBoson.owned).toBe(choice === 'keep')
    expect(after.skills.byId.manualLabour).toEqual(before.skills.byId.manualLabour)
    if (choice === 'fresh') {
      const refund = refundCanonicalSkill(after, 'androids')
      expect(refund.changed).toBe(false)
      expect(refund.state.skills.points).toBe(after.skills.points)
    }
    expect(after.skills.byId['subskill.cashScience.lifetime'].owned).toBe(choice === 'keep')
    expect(after.skills.points).toBe(choice === 'keep' ? 10n : 13n)
    expect(after.skills.presets[0].skillIds).toEqual(choice === 'keep' ? before.skills.presets[0].skillIds : ['startHereTree'])
    const again = routeCanonicalGameCommand(after, { kind: 'rework.choose-migration', choice: choice === 'keep' ? 'fresh' : 'keep' }, commandOptions())
    expect(again.accepted).toBe(false)
    expect(again.state).toBe(after)
    const infinity = applyCanonicalInfinityReset(after, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
    expect(infinity.ok).toBe(true)
    if (!infinity.ok) return
    expect(infinity.state.infinity.secretsOfTheUniverse).toBe(expectedSecrets)
    expect(infinity.state.infinity.automationUnlocked).toEqual(after.infinity.automationUnlocked)
    const transcendence = applyCanonicalOverflowReset({ ...infinity.state,
      dyson: { ...infinity.state.dyson, bots: OVERFLOW_BOT_CAP } })
    expect(transcendence.ok).toBe(true)
    if (!transcendence.ok) return
    expect(transcendence.state.infinity.secretsOfTheUniverse).toBe(0n)
    expect(transcendence.state.infinity.automationUnlocked).toEqual({ research: false, bots: false })
    expect(transcendence.state.avocado.overflowPoints).toBe(8n)
    expect(transcendence.state.discovery?.unlocked).toBe(true)
    expect(transcendence.state.discovery?.speedUpgrades).toBe(1n)
  })

  test.each(['keep', 'fresh'] as const)('%s migration preserves a wallet-inferred starter milestone through reload and Infinity', choice => {
    const before = legacyState()
    const legacy = { ...before,
      meta: { ...before.meta, firstQuantumComplete: undefined },
      avocado: { ...before.avocado, overflowPoints: 0n },
      discovery: { ...EMPTY_DISCOVERY },
      statistics: { ...before.statistics, speedruns: undefined,
        lifetime: { ...before.statistics.lifetime, botCapOverflowRewards: 0n } },
      infinity: { ...before.infinity, retainedFacilities: { ...before.infinity.retainedFacilities, assembly_lines: false } },
    }
    const migrated = routeCanonicalGameCommand(legacy, { kind: 'rework.choose-migration', choice }, commandOptions())
    expect(migrated.accepted, migrated.code).toBe(true)
    expect(migrated.state.quantum.pointsEarned).toBe(0n)
    const reloaded = hydrateGameState(dehydrateGameState(runtime, migrated.state)).state
    expect(reloaded.meta.firstQuantumComplete).toBe(true)
    const reset = applyCanonicalInfinityReset(reloaded, { breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n })
    expect(reset.ok).toBe(true)
    if (reset.ok) expect(reset.state.dyson.facilities.assembly_lines).toEqual([1, 0])
  })

  test('relocated benefits spend IP without reducing total IP or creating Quantum currency', () => {
    let state = legacyState()
    state = { ...state, meta: { ...state.meta, reworkMigrationChoice: 'keep' }, discovery: { ...state.discovery!, unlocked: false }, quantum: { ...state.quantum,
      pointsEarned: 0n, pointsSpent: 0n, unlocks: { ...state.quantum.unlocks, fragments: false, matrioshkaBrains: false, birchPlanets: false, galacticBrains: false } } }
    for (const id of ['rework-Fragments', 'rework-MatrioshkaBrains', 'rework-BirchPlanets', 'rework-GalacticBrains'] as const) {
      const purchase = purchaseCanonicalInfinityShopItem(state, id)
      expect(purchase.accepted, purchase.code).toBe(true)
      state = purchase.state
    }
    expect(state.infinity.points).toBe(1000n)
    expect(state.infinity.spentPoints).toBe(88n)
    expect(state.quantum.pointsEarned).toBe(0n)
    expect(state.quantum.pointsSpent).toBe(0n)
    expect(state.quantum.unlocks.fragments).toBe(true)
    expect(state.quantum.unlocks.galacticBrains).toBe(true)
  })

  test('buying Double Time clears prior rate measurements while preserving IP and earned history', () => {
    const legacy = legacyState()
    const before = { ...legacy, timeline: { ...legacy.timeline,
      doubleTime: { ...legacy.timeline.doubleTime, unlocked: false } } }
    const migrated = routeCanonicalGameCommand(before, { kind: 'rework.choose-migration', choice: 'keep' }, commandOptions())
    expect(migrated.accepted, migrated.code).toBe(true)
    const purchase = routeCanonicalGameCommand(migrated.state,
      { kind: 'infinity.purchase-shop-item', itemId: 'rework-DoubleTime' }, commandOptions())
    expect(purchase.accepted, purchase.code).toBe(true)
    expect(purchase.state.timeline.doubleTime.unlocked).toBe(true)
    expect(purchase.state.infinity.points).toBe(1000n)
    expect(purchase.state.infinity.spentPoints).toBe(25n)
    expect(purchase.state.infinity).toMatchObject({ currentCyclePeakIpPerMinute: 0, currentCyclePeakReward: 0n,
      manualPeakIpPerMinute: 0, manualPeakReward: 0n, manualCalibrationObservedActiveSeconds: 0,
      activeAutomaticThroughputCycleEligible: false })
    expect(purchase.state.statistics.recentActiveAutomaticInfinityCycles).toEqual([])
    expect(purchase.state.statistics.recentInfinityCycles).toEqual(before.statistics.recentInfinityCycles)
    expect(purchase.state.statistics.lifetime).toEqual(before.statistics.lifetime)
  })

  test('a first Catalyst can fracture and reload without any completed challenge', () => {
    const before = legacyState()
    const state = { ...before, challenges: { ...EMPTY_INFINITY_CHALLENGES, galvanizers: 1n },
      skills: { ...before.skills, byId: {}, activeAutoAssignment: [], presets: before.skills.presets.map(preset => ({ ...preset, skillIds: [] })) } }
    const preview = previewCanonicalSkillCatalog(state).skills.find(skill => skill.skillId === 'startHereTree')!
    expect(preview.canGalvanize).toBe(true)
    const result = routeCanonicalGameCommand(state, { kind: 'skill.galvanize', skillId: 'startHereTree' }, commandOptions())
    expect(result.accepted, result.code).toBe(true)
    expect(result.state.challenges?.galvanizers).toBe(0n)
    expect(validateCanonicalGameState(result.state).valid).toBe(true)
    const reloaded = hydrateGameState(dehydrateGameState(runtime, result.state)).state
    expect(reloaded.challenges?.galvanizedSkillIds).toEqual(['startHereTree'])
    expect(reloaded.skills.byId.startHereTree.owned).toBe(true)
  })

  test.each<CanonicalGameCommand>([
    { kind: 'dream.set-buy-mode', buyMode: 'buy-max' },
    { kind: 'quantum.set-buy-mode', buyMode: 'buy-50' },
    { kind: 'quantum.purchase-upgrade', upgradeId: 'CashBonus', quantity: 10n },
    { kind: 'avocado.feed', source: 'influence' },
    { kind: 'quantum.request-leap' }, { kind: 'quantum.purchase-upgrade', upgradeId: 'DoubleIP' },
    { kind: 'reality.gather-influence' }, { kind: 'dream.request-reset' },
    { kind: 'dream.purchase-foundational', purchase: 'hunters' },
    { kind: 'avocado.feed', source: 'infinity-points' },
    { kind: 'avocado.complete-meditation-step', requiredStepIndex: 0 },
  ])('rejects retired player action $kind without debiting or resetting state', command => {
    const state = legacyState()
    const result = routeCanonicalGameCommand(state, command)
    expect(result.code).toBe('rework:retired-system')
    expect(result.accepted).toBe(false)
    expect(result.state).toBe(state)
  })

  test('game stepping freezes retired producers and direct queued Quantum input cannot convert IP', () => {
    const before = legacyState()
    const state = { ...before, dyson: { ...before.dyson, bots: 100, money: 1000, science: 0,
      facilities: { ...before.dyson.facilities, assembly_lines: [1, 0] as const } } }
    const carrier: CanonicalEventTimeState = { gameState: state, compatibilityTuning: runtime.compatibilityTuning,
      evaluationSnapshot: runtime.skillEffectEvaluationSnapshot, entitlements: { permanentDoubleIp: false }, tinker: createCanonicalTinkerRuntimeState() }
    const context = { mode: 'active' as const, automationIntervalSeconds: 1,
      realityWorkerTuning: { workerBatchSize: 128n, baseWorkerGenerationSpeed: 4 },
      dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS, realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
      infinityResetAssetLookup: createCapturedInfinityAssetLookup([]) }
    const result = advanceGame(carrier, { source: 'active', baseSeconds: 1, automation: 'enabled' }, context, 1)
    expect(result.issue).toBeUndefined()
    expect(result.state.gameState.dream).toEqual(state.dream)
    expect(result.state.gameState.reality).toEqual(state.reality)
    expect(result.state.gameState.quantum.pointsEarned).toBe(state.quantum.pointsEarned)
    expect(result.summary.strangeMatter).toBe(0)
    expect(result.summary.realityWorkers).toBe(0n)
    const model = new CanonicalEventTimeModel(result.state, context)
    model.applyQueuedInput({ kind: 'quantum-leap', timeSeconds: 0 }, { ...result.summary, disasterEvents: [], storedTimeFirstDisasterEvents: [] })
    expect(model.state.gameState.infinity.points).toBe(1000n)
    expect(model.state.gameState.quantum.pointsEarned).toBe(100n)
  })
})
