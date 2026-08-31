import { describe, expect, test } from 'vitest'
import { ordinaryInfinityBotThreshold } from '../simulation/infinityCycle'
import { CanonicalRuntimeSession } from './canonicalRuntimeSession'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { selectFrontendGameplaySnapshot } from './frontendSnapshot'

const entitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

const runtime = structuredClone(
  new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-09-01T00:00:00.000Z',
    }),
    { entitlements },
  ).initialState,
)

function gameplaySnapshotAtDivision(divisionsPurchased: bigint) {
  const gameState = {
    ...runtime.gameState,
    dyson: {
      ...runtime.gameState.dyson,
      goalStage: 10n,
    },
    quantum: {
      ...runtime.gameState.quantum,
      divisionsPurchased,
    },
  }
  return selectFrontendGameplaySnapshot(gameState, {
    compatibilityTuning: runtime.compatibilityTuning,
    evaluationSnapshot: runtime.evaluationSnapshot,
    entitlements: runtime.entitlements,
    tinker: runtime.tinker,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    quantumLeap: {
      eligible: false,
      code: 'not-ready',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    },
    storedTimeCheater: runtime.storedTimeCheater,
    selectedSkillPresetSlot: runtime.selectedSkillPresetSlot,
    lastSkillPresetApplication: runtime.lastSkillPresetApplication,
  })
}

describe('frontend gameplay snapshot', () => {
  test('uses the Division-adjusted ordinary Infinity threshold for the final Dyson goal', () => {
    for (let division = 0n; division <= 19n; division += 1n) {
      const snapshot = gameplaySnapshotAtDivision(division)
      expect(snapshot.derived.dyson.status).toBe('ready')
      if (snapshot.derived.dyson.status !== 'ready') {
        throw new Error('Expected the first-run Dyson derivation to be ready.')
      }
      const threshold = ordinaryInfinityBotThreshold(division)
      expect(snapshot.derived.dyson.value.presentation.currentGoal).toEqual({
        kind: 'reach-bots',
        target: threshold,
      })
      expect(snapshot.derived.infinity).toMatchObject({
        mode: 'ordinary',
        resetThresholdBots: threshold,
      })
    }
  })
})
