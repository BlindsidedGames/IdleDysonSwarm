import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { applyCanonicalQuantumReset, applyQuantumEntanglementConversion } from './quantumTransitions'
import { purchaseDiscovery } from './discovery'
import { infinityChallenges } from './infinityChallenges'
import { runResearchAutomationTick } from './researchAutomation'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'

const hydrated = hydrateGameState(prepareIdb1Save(readFileSync(new URL(
  '../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url,
), 'utf8')).prepared)

function discoveryState(): CanonicalGameStateV1 {
  const source = hydrated.state
  const unlocked = purchaseDiscovery({ ...source,
    avocado: { ...source.avocado, overflowPoints: 20n },
  }, 'unlock')!
  const bought = purchaseDiscovery(purchaseDiscovery(unlocked, 'power')!, 'speed')!
  return { ...bought,
    discovery: { ...bought.discovery!, completions: 17n, progress: 1234.5 },
    challenges: { ...infinityChallenges(bought), unlocked: true, active: null },
  }
}

function successful<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result))
  return result as Extract<T, { ok: true }>
}

const transitions: readonly [string, (state: CanonicalGameStateV1) => CanonicalGameStateV1][] = [
  ...[false, true].map(automatic => [automatic ? 'automatic Infinity' : 'manual Infinity',
    (state: CanonicalGameStateV1) => successful(applyCanonicalInfinityReset(state, {
      breakInfinity: false, requestedReward: 1n, artifactSkillPoints: 0n, automatic,
    })).state] as const),
  ['Quantum', state => successful(applyCanonicalQuantumReset(state, 0n)).state],
  ['Entanglement', state => {
    const converted = applyQuantumEntanglementConversion({ ...state,
      infinity: { ...state.infinity, points: 84n, spentPoints: 0n },
    })
    expect(converted.quantumPointsGranted).toBe(2n)
    return converted.state
  }],
  ['challenge entry and abandonment', state => {
    const entered = successful(restartInfinityChallenge(state, 'enter', 0n)).state
    expect(entered.discovery).toEqual(state.discovery)
    return successful(restartInfinityChallenge(entered, 'abandon', 0n)).state
  }],
  ['challenge restart', state => successful(applyCanonicalInfinityReset({ ...state,
    challenges: { ...infinityChallenges(state), active: 'blank-slate' },
  }, { restartOnly: true, breakInfinity: false, requestedReward: 0n, artifactSkillPoints: 0n })).state],
]

describe('Discovery retention across progression resets', () => {
  it.each(transitions)('%s retains all Discovery state through reload', (_name, transition) => {
    const before = discoveryState()
    const after = transition(before)
    expect(after.discovery).toEqual(before.discovery)
    const loaded = hydrateGameState(dehydrateGameState(hydrated, after)).state
    expect(loaded.discovery).toEqual(before.discovery)
  })

  it('Transcendence clears completions and progress while retaining unlock and both purchases', () => {
    const before = discoveryState()
    const after = successful(applyCanonicalOverflowReset({ ...before,
      dyson: { ...before.dyson, bots: 4e242 },
    })).state
    expect(after.discovery).toEqual({ ...before.discovery, completions: 0n, progress: 0 })
    expect(hydrateGameState(dehydrateGameState(hydrated, after)).state.discovery).toEqual(after.discovery)
  })

  it.each(transitions)('%s cannot restore research through stale commands, automation or generated levels', (_name, transition) => {
    const reset = transition(discoveryState())
    // A stale configured automation flag and abundant Science must not bypass retirement.
    const state = { ...reset,
      dyson: { ...reset.dyson, science: 1e100 },
      infinity: { ...reset.infinity, automationUnlocked: { ...reset.infinity.automationUnlocked, research: true } },
      research: { ...reset.research, automation: { ...reset.research.automation,
        enabledById: { 'research.science_boost': true, 'research.money_multiplier': true },
      } },
    }
    expect(routeCanonicalGameCommand(state, { kind: 'research.purchase', researchId: 'research.science_boost' }).accepted).toBe(false)
    const automated = runResearchAutomationTick(state, hydrated.compatibilityTuning)
    expect(automated.purchases).toEqual([])
    expect(automated.state.research).toEqual(state.research)
    const generated = applyCanonicalSkillIntervalEffects(state, state, {
      seconds: 60, botProductionPerSecond: 0, stellarFacilitiesPerSecond: 0,
      stellarBotsPerSecond: 0, scienceBoostPerSecond: 100, moneyUpgradePerSecond: 100,
    })
    expect(generated.research).toEqual(state.research)
  })
})
