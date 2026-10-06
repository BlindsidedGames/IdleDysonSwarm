// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { CanonicalRuntimeSession, type CanonicalRuntimeState } from './canonicalRuntimeSession'
import { EMPTY_INFINITY_CHALLENGES } from '../simulation/infinityChallenges'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import { MANUAL_LABOUR_AUGMENTS as A } from '../simulation/skillSubskills'
import { validateCanonicalGameState } from '../game-state/validate'
import { TinkerSurface } from '../ui/gameplay/tinker/TinkerSurface'
import { StoredTimeSimulation } from '../workers/storedTime/storedTimeSimulation'
import { createProductionEventContext } from '../simulation/productionEventContext'

async function fixture() {
  const session = new CanonicalRuntimeSession(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-05T00:00:00Z' }), { entitlements: { permanentDoubleIp: false } })
  const initial = session.initialState
  const game = initial.gameState
  // Valid earned-resource preconditions; commands buy augments/Double Time.
  const seed: CanonicalRuntimeState = { ...initial, gameState: { ...game,
    meta: { ...game.meta, firstInfinityComplete: true },
    challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, galvanizedSkillIds: ['manualLabour'], active: 'built-by-hand' },
    skills: { ...game.skills, points: 10n, byId: { ...game.skills.byId,
      manualLabour: { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 },
    } },
    timeline: { ...game.timeline, storedTimeAvailableSeconds: 1000 },
    infinity: { ...game.infinity, automaticResetEnabled: false },
    quantum: { ...game.quantum, unlocks: { ...game.quantum.unlocks, breakTheLoop: true } },
    reality: { ...game.reality, influence: 100000 },
    avocado: { ...game.avocado, overflowPoints: 100n },
    dream: { ...game.dream, strangeMatter: 100, resources: { ...game.dream.resources, hunters: 1000n } },
  } }
  let current = session.prepare(seed)
  const app = createProductionCanonicalApplicationFactory({ createFirstRunSave: () => current, readHostEntitlements: () => ({ permanentDoubleIp: false }) })({
    hasCurrent: async () => true, loadCurrent: async () => current,
    migrateLegacyOnFirstLaunch: async () => ({ status: 'already-migrated', save: current }),
    commit: async save => { current = save; return save },
  })
  await app.start()
  function state() {
    const s = app.snapshot()
    if (s.phase !== 'ready') throw Error(s.phase)
    return s.state as CanonicalRuntimeState
  }
  async function command(command: CanonicalPlayerCommand) {
    const s = app.snapshot()
    if (s.phase !== 'ready') throw Error(s.phase)
    const r = await app.dispatchPlayer({ sessionRevision: s.revision.session, expectedStateRevision: s.revision.state, command })
    if (r.kind !== 'transition') throw Error('Expected transition')
    expect(r.transition.accepted, JSON.stringify(r.transition)).toBe(true)
    return { status: 'accepted', kind: 'transition', changed: r.transition.accepted && r.transition.changed,
      stateRevision: r.transition.revision, activationRevision: { session: s.revision.session, state: r.transition.revision },
    } as const
  }
  for (const skillId of [A.handAssembly, A.practice, A.patientHands]) await command({ kind: 'skill.purchase', skillId })
  expect(validateCanonicalGameState(state().gameState).valid).toBe(true)
  function surface() {
    const s = app.frontendSnapshot()
    if (s.phase !== 'ready' || s.gameplay.runtime.tinker.status !== 'ready') throw Error('Tinker unavailable')
    return <IntlProvider locale="en"><TinkerSurface facts={s.gameplay.runtime.tinker.value}
      dispatch={command} /></IntlProvider>
  }
  const mounted = render(surface())
  return { app, state, command, refresh: () => mounted.rerender(surface()),
    advance: (ms: number) => { expect(app.advanceActive(ms).accepted).toBe(true) } }
}
afterEach(() => { cleanup(); vi.useRealTimers() })

// Real tap/hold -> application -> canonical update. Only the stopped interval's
// remainder is idle; fractional progress and stored work must remain intact.
test.each([
  { tick: 33, boost: 42, double: true, partial: 0, expected: 2.572 },
  { tick: 200, boost: 42, double: true, partial: 0, expected: 16.6 },
  { tick: 200, boost: 42, double: false, partial: 0, expected: 8.2 },
  { tick: 200, boost: 1, double: false, partial: 0, expected: 0 },
  { tick: 33, boost: 1, double: false, partial: 0, expected: .031 },
  { tick: 200, boost: 42, double: true, partial: 130, expected: 16.73 },
])('a tap recharges Patient Hands with its unused update time: %j', async p => {
  const h = await fixture()
  await h.command({ kind: 'settings.set-processing-interval', milliseconds: p.tick })
  if (p.double) await h.command({ kind: 'reality.purchase-upgrade', upgradeId: 'doubleTimeOwned' })
  const before = h.state().gameState.dyson.bots
  const button = screen.getByRole('button')
  await act(async () => { fireEvent.keyDown(button, { key: ' ' }); fireEvent.keyUp(button, { key: ' ' }) })
  expect(h.state().tinker.repeat).toBe(false)
  if (p.partial) h.advance(p.partial / (p.double ? 2 : 1))
  await h.command({ kind: 'time.set-offline-boost-multiplier', multiplier: p.boost })
  for (let i = 0; h.state().tinker.running && i < 10; i++) h.advance(p.tick)
  expect(h.state().tinker.running).toBe(false)
  const first = h.state().gameState
  expect(first.dyson.bots - before).toBe(1)
  expect(first.skills.byId[A.handAssembly].level).toBe(1)
  expect(first.skills.byId[A.practice].level).toBe(1)
  expect(first.skills.byId[A.patientHands].secondaryTimerSeconds).toBe(0)
  expect(first.skills.byId[A.patientHands].timerSeconds).toBeCloseTo(p.expected, 10)
  // Consume the recovered charge once; independently sum the documented ramp.
  await act(async () => { h.refresh() })
  await act(async () => { fireEvent.keyDown(button, { key: ' ' }); fireEvent.keyUp(button, { key: ' ' }) })
  // Respect the represented timer at a whole-action boundary (16.6 can
  // be stored just below that decimal after funded-time arithmetic).
  const stored = Math.floor(first.skills.byId[A.patientHands].timerSeconds / .2)
  let reward = 0
  for (let i = 0; i <= stored; i++) reward += (2 + i) ** 5 * (1 + 2 * (1 + i) / (501 + i)) * (i < stored ? 1.25 : 1)
  const bots = h.state().gameState.dyson.bots
  for (let i = 0; h.state().tinker.running && i < 10; i++) h.advance(p.tick)
  expect(h.state().gameState.dyson.bots - bots).toBeCloseTo(reward, 4)
  expect(h.state().gameState.skills.byId[A.handAssembly].level).toBe(2 + stored)
  expect(h.state().gameState.skills.byId[A.practice].level).toBe(2 + stored)
})

test('holding consumes boosted time; stopping repeat restores idle charge and its cap', async () => {
  vi.useFakeTimers()
  const h = await fixture()
  await h.command({ kind: 'reality.purchase-upgrade', upgradeId: 'doubleTimeOwned' })
  await h.command({ kind: 'time.set-offline-boost-multiplier', multiplier: 42 })
  const button = screen.getByRole('button')
  await act(async () => { fireEvent.keyDown(button, { key: ' ' }); await vi.advanceTimersByTimeAsync(600) })
  expect(h.state().tinker.repeat).toBe(true)
  h.advance(200)
  expect(h.state().gameState.skills.byId[A.handAssembly].level).toBe(84)
  expect(h.state().gameState.skills.byId[A.patientHands].timerSeconds).toBe(0)
  await act(async () => { h.refresh(); fireEvent.pointerDown(document.body) })
  expect(h.state().tinker.repeat).toBe(false)
  h.advance(200)
  expect(h.state().gameState.skills.byId[A.handAssembly].level).toBe(85)
  expect(h.state().gameState.skills.byId[A.patientHands].timerSeconds).toBeCloseTo(16.6, 10)
  h.advance(1000)
  expect(h.state().gameState.skills.byId[A.patientHands].timerSeconds).toBe(42)
})

test('detached Stored Time charges idle Patient Hands without completing live Tinker', async () => {
  const h = await fixture()
  await act(async () => { fireEvent.keyDown(screen.getByRole('button'), { key: ' ' }); fireEvent.keyUp(screen.getByRole('button'), { key: ' ' }) })
  const initial = structuredClone(h.state())
  const replay = new StoredTimeSimulation({ jobId: 'patient-hands-detached', state: initial, requestedSeconds: 60, infinityMinimumCycleSeconds: 1, eventContext: createProductionEventContext() })
  let result
  do { result = replay.step(1000, false) } while (result === null)
  if (result.type !== 'completed') throw Error('Replay failed')
  expect(result.candidate.gameState.skills.byId[A.patientHands].timerSeconds).toBe(42)
  expect(result.candidate.gameState.skills.byId[A.handAssembly].level).toBe(0)
  expect(result.candidate.gameState.dyson.bots).toBe(initial.gameState.dyson.bots)
})
