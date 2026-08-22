import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { ResearchVisibilityPreferenceService } from '../ui/research-visibility'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import {
  runResearchAutomationTick,
  selectCanonicalResearchPresentationFacts,
} from './researchAutomation'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const entitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

function configuredRuntime() {
  const session = new CanonicalRuntimeSession(
    prepareIdb1Save(fixture).prepared,
    { entitlements },
  )
  const runtime = structuredClone(session.initialState)
  const source = runtime.gameState
  runtime.gameState = {
    ...source,
    research: {
      levelsById: {
        'research.panel_lifetime_1': 1,
        'research.money_multiplier': 2,
      },
      progressById: {
        'research.panel_lifetime_1': 0.75,
        'research.money_multiplier': 0.5,
      },
      automation: {
        buyMode: 'buy-1',
        roundedBulkBuy: true,
        enabledById: {
          ...source.research.automation.enabledById,
          'research.money_multiplier': true,
        },
      },
    },
    infinity: {
      ...source.infinity,
      automationUnlocked: {
        ...source.infinity.automationUnlocked,
        research: true,
      },
    },
    skills: {
      ...source.skills,
      activeAutoAssignment: [],
      tabPresetAutomation: {
        ...source.skills.tabPresetAutomation,
        research: 3,
      },
      presets: source.skills.presets.map((preset, index) =>
        index === 2
          ? { ...preset, name: 'Reset Research', skillIds: ['startHereTree'] }
          : preset,
      ),
    },
  }
  return { session, runtime }
}

function reset(
  state: CanonicalGameStateV1,
  breakInfinity: boolean,
) {
  const result = applyCanonicalInfinityReset(state, {
    breakInfinity,
    requestedReward: 1n,
    artifactSkillPoints: 0n,
  })
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.state
}

describe.each([
  ['ordinary Infinity', false],
  ['Break Infinity', true],
] as const)('Research across %s', (_label, breakInfinity) => {
  test('clears levels and progress durably while retaining settings and presets', () => {
    const { session, runtime } = configuredRuntime()
    const automation = runtime.gameState.research.automation
    const presets = runtime.gameState.skills.presets
    const presetAutomation = runtime.gameState.skills.tabPresetAutomation
    const preferenceStorage = new Map<string, string>()
    const storage = {
      getItem: (key: string) => preferenceStorage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        preferenceStorage.set(key, value)
      },
    }
    const preference = new ResearchVisibilityPreferenceService({ storage })
    preference.setHideCompleted(true)

    const resetState = reset(runtime.gameState, breakInfinity)
    expect(resetState.research.levelsById).toEqual({})
    expect(resetState.research.progressById).toEqual({})
    expect(resetState.research.automation).toBe(automation)
    expect(resetState.skills.presets).toBe(presets)
    expect(resetState.skills.tabPresetAutomation).toBe(presetAutomation)
    expect(selectCanonicalResearchPresentationFacts(
      resetState,
      runtime.compatibilityTuning,
      'research.panel_lifetime_1',
      1n,
    )).toMatchObject({ visible: true, maxed: false, currentEffect: 0 })

    const committed = session.prepare({ ...runtime, gameState: resetState })
    const reopened = new CanonicalRuntimeSession(committed, { entitlements })
    expect(reopened.initialState.gameState.research.levelsById).toEqual({})
    expect(reopened.initialState.gameState.research.progressById).toEqual({})
    expect(reopened.initialState.gameState.research.automation).toEqual(automation)
    expect(reopened.initialState.gameState.skills.presets).toEqual(presets)
    expect(reopened.initialState.gameState.skills.tabPresetAutomation)
      .toEqual(presetAutomation)
    expect(new ResearchVisibilityPreferenceService({ storage }).getSnapshot())
      .toBe(true)
  })

  test('does not repurchase during reset and can repurchase on the next automation tick', () => {
    const { runtime } = configuredRuntime()
    const resetState = reset(runtime.gameState, breakInfinity)
    expect(resetState.research.levelsById['research.money_multiplier'])
      .toBeUndefined()

    const fundedNextTick = {
      ...resetState,
      dyson: { ...resetState.dyson, science: 5_000 },
    }
    const automatic = runResearchAutomationTick(
      fundedNextTick,
      runtime.compatibilityTuning,
    )
    expect(automatic.purchases).toContainEqual(expect.objectContaining({
      researchId: 'research.money_multiplier',
    }))
    expect(automatic.state.research.levelsById['research.money_multiplier'])
      .toBe(1)
  })
})

test('a rejected reset leaves Research levels, progress and settings untouched', () => {
  const { runtime } = configuredRuntime()
  const before = structuredClone(runtime.gameState)
  const result = applyCanonicalInfinityReset(runtime.gameState, {
    breakInfinity: false,
    requestedReward: -1n,
    artifactSkillPoints: 0n,
  })
  expect(result.ok).toBe(false)
  expect(runtime.gameState).toEqual(before)
})
