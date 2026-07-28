import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  advanceCanonicalTinker,
  createCanonicalTinkerRuntimeState,
  deriveCanonicalTinkerStats,
  selectCanonicalTinkerUiFacts,
  startCanonicalTinker,
  timeToCanonicalTinkerCompletion,
} from './canonicalTinker'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(
  creationSeconds: number,
  manualLabour = false,
  managers = 0,
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  return {
    ...source,
    dyson: {
      ...source.dyson,
      bots: 0,
      manualCreationIntervalSeconds: creationSeconds,
      facilities: {
        ...source.dyson.facilities,
        assembly_lines: [0, 0],
        ai_managers: [0, managers],
      },
    },
    skills: {
      ...source.skills,
      byId: {
        ...source.skills.byId,
        manualLabour: {
          ...(source.skills.byId.manualLabour ?? {
            level: 0,
            timerSeconds: 0,
            secondaryTimerSeconds: 0,
          }),
          owned: manualLabour,
        },
      },
    },
  }
}

describe('canonical Tinker runtime', () => {
  test('selects idle UI facts without advancing or mutating inputs', () => {
    const canonical = state(2)
    const runtime = createCanonicalTinkerRuntimeState()
    const canonicalBefore = structuredClone(canonical)
    const runtimeBefore = structuredClone(runtime)

    const facts = selectCanonicalTinkerUiFacts(
      canonical,
      runtime,
      12,
    )

    expect(facts).toEqual({
      runtime: {
        running: false,
        repeat: false,
        elapsedSeconds: 0,
        effectiveManualLabour: false,
        cooldownSeconds: 2,
      },
      stats: {
        botYield: 1,
        assemblyYield: 12,
        cooldownSeconds: 2,
      },
      canStart: true,
      eligibility: 'available',
      timeToCompletionSeconds: null,
    })
    expect(canonical).toEqual(canonicalBefore)
    expect(runtime).toEqual(runtimeBefore)
  })

  test('reports exact synchronized running horizon and Manual Labour facts', () => {
    const canonical = state(10, true, 1)
    const staleRuntime = {
      running: true,
      repeat: true,
      elapsedSeconds: 7,
      effectiveManualLabour: false,
      cooldownSeconds: 10,
    }
    const facts = selectCanonicalTinkerUiFacts(
      canonical,
      staleRuntime,
      42,
    )

    expect(facts.runtime).toEqual({
      running: true,
      repeat: true,
      elapsedSeconds: 0,
      effectiveManualLabour: true,
      cooldownSeconds: 0.2,
    })
    expect(facts.stats).toEqual({
      botYield: 1,
      assemblyYield: 42,
      cooldownSeconds: 0.2,
    })
    expect(facts.canStart).toBe(false)
    expect(facts.eligibility).toBe('already-running')
    expect(facts.timeToCompletionSeconds).toBe(0.2)
    expect(canonical.dyson.manualCreationIntervalSeconds).toBe(10)
    expect(staleRuntime.elapsedSeconds).toBe(7)
  })

  test('starts with Unity initial progress and awards one bot after the horizon', () => {
    const canonical = state(10)
    const stats = deriveCanonicalTinkerStats(canonical, 0)
    const started = startCanonicalTinker(
      canonical,
      createCanonicalTinkerRuntimeState(),
      stats,
      false,
    )
    expect(started.runtime.elapsedSeconds).toBe(0.1)
    expect(
      timeToCanonicalTinkerCompletion(started.runtime, 20),
    ).toBe(9.9)

    const completed = advanceCanonicalTinker(
      started.state,
      started.runtime,
      stats,
      9.9,
    )
    expect(completed.completions).toBe(1)
    expect(completed.botsGranted).toBe(1)
    expect(completed.state.dyson.bots).toBe(1)
    expect(completed.state.dyson.manualCreationIntervalSeconds).toBe(9)
    expect(completed.runtime.running).toBe(false)
  })

  test('repeat mode owns multiple cooldowns and progressively shortens bot creation', () => {
    const canonical = state(2)
    const stats = deriveCanonicalTinkerStats(canonical, 0)
    const started = startCanonicalTinker(
      canonical,
      createCanonicalTinkerRuntimeState(),
      stats,
      true,
    )
    const advanced = advanceCanonicalTinker(
      started.state,
      started.runtime,
      stats,
      2.9,
    )
    expect(advanced.completions).toBe(2)
    expect(advanced.state.dyson.bots).toBe(2)
    expect(advanced.state.dyson.manualCreationIntervalSeconds).toBe(0)
    expect(advanced.runtime.running).toBe(true)
    expect(advanced.runtime.elapsedSeconds).toBe(0)
  })

  test('Manual Labour stays in bot mode until one manual AI Manager exists', () => {
    const withoutManager = state(0.2, true, 0)
    const botStats = deriveCanonicalTinkerStats(withoutManager, 42)
    expect(botStats.cooldownSeconds).toBe(0.2)

    const withManager = state(10, true, 1)
    const assemblyStats = deriveCanonicalTinkerStats(withManager, 42)
    expect(assemblyStats.cooldownSeconds).toBe(10)
    const started = startCanonicalTinker(
      withManager,
      createCanonicalTinkerRuntimeState(),
      assemblyStats,
      false,
    )
    expect(started.runtime.cooldownSeconds).toBe(0.2)
    const synchronizedStats = deriveCanonicalTinkerStats(
      started.state,
      42,
    )
    const completed = advanceCanonicalTinker(
      started.state,
      started.runtime,
      synchronizedStats,
      0.1,
    )
    expect(completed.assemblyLinesGranted).toBe(42)
    expect(completed.state.dyson.facilities.assembly_lines).toEqual([
      42,
      0,
    ])
    expect(completed.state.dyson.bots).toBe(0)
  })

  test('a mode or cooldown change resets transient progress without mutating input', () => {
    const initial = state(2)
    const initialStats = deriveCanonicalTinkerStats(initial, 10)
    const started = startCanonicalTinker(
      initial,
      createCanonicalTinkerRuntimeState(),
      initialStats,
      true,
    )
    const partial = advanceCanonicalTinker(
      started.state,
      started.runtime,
      initialStats,
      0.5,
    )
    const changed = state(0.2, true, 1)
    const changedStats = deriveCanonicalTinkerStats(changed, 10)
    const synchronized = advanceCanonicalTinker(
      changed,
      partial.runtime,
      changedStats,
      0,
    )
    expect(synchronized.runtime.elapsedSeconds).toBe(0)
    expect(synchronized.state.dyson.manualCreationIntervalSeconds).toBe(0.2)
    expect(changed.dyson.facilities.assembly_lines[0]).toBe(0)
  })
})
