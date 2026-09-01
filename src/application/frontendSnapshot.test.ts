import { describe, expect, test } from 'vitest'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'
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

function gameplaySnapshot(
  gameState: typeof runtime.gameState = runtime.gameState,
) {
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
  test('projects an exact next Universe Designation beyond the discrete ceiling', () => {
    const designation = DISCRETE_MAXIMUM + 42n
    const snapshot = gameplaySnapshot({
      ...runtime.gameState,
      reality: {
        ...runtime.gameState.reality,
        universeDesignationCount: designation,
      },
    })

    expect(snapshot.resources.reality.universeDesignationCount)
      .toBe(designation)
    expect(snapshot.derived.reality.nextUniverseDesignation)
      .toBe(designation + 1n)
  })
})
