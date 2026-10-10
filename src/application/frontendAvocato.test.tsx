// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import type { SaveRepository } from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { EMPTY_DISCOVERY } from '../simulation/discovery'
import { ReadyDysonSlice, type ReadyGameRoute } from '../ui/gameplay/dyson/ReadyDysonSlice'

const prepared = createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-07T00:00:00Z' })
class MemoryRepository implements SaveRepository {
  current: PreparedSave
  constructor(current: PreparedSave) { this.current = current }
  async hasCurrent() { return true }
  async loadCurrent() { return this.current }
  async migrateLegacyOnFirstLaunch() { return { status: 'already-migrated' as const, save: this.current } }
  async commit(save: PreparedSave) { this.current = save; return save }
}
afterEach(cleanup)

// Protect actual route admission/order and store dispatch; the pure unlock
// predicate cannot detect a route guard or a store left on the wrong screen.
test.each([
  { choice: 'keep', discovery: false, unlocked: true },
  { choice: 'fresh', discovery: false, unlocked: true },
  { choice: 'keep', discovery: true, unlocked: true },
  { choice: 'fresh', discovery: true, unlocked: true },
  { choice: 'keep', discovery: false, unlocked: false },
] as const)('Avocato and Transcendence stay paired ($choice, Discovery=$discovery, unlocked=$unlocked)', async ({ choice, discovery, unlocked }) => {
  const hydrated = hydrateGameState(prepared)
  const repo = new MemoryRepository(dehydrateGameState(hydrated, {
    ...hydrated.state,
    meta: { ...hydrated.state.meta, reworkMigrationChoice: undefined, firstInfinityComplete: unlocked && !discovery },
    quantum: { ...hydrated.state.quantum, cashBonusLevels: unlocked ? 1n : 0n },
    avocado: { ...hydrated.state.avocado, overflowPoints: discovery ? 8n : 0n },
    discovery: { ...EMPTY_DISCOVERY, unlocked: discovery },
  }))
  const factory = createProductionCanonicalApplicationFactory({ createFirstRunSave: () => prepared, readHostEntitlements: () => ({ permanentDoubleIp: false }) })
  const app = factory(repo)
  await app.start()
  const dispatch = async (command: CanonicalPlayerCommand) => {
    const before = app.snapshot()
    if (before.phase !== 'ready') throw Error(before.phase)
    const result = await app.dispatchPlayer({ sessionRevision: before.revision.session, expectedStateRevision: before.revision.state, command })
    if (result.kind !== 'transition') throw Error('Expected transition')
    if (!result.transition.accepted) throw Error(result.transition.code)
    expect(result.transition.accepted).toBe(true)
    return { status: 'accepted' as const, kind: 'transition' as const, changed: result.transition.changed,
      stateRevision: result.transition.revision, activationRevision: { session: before.revision.session, state: result.transition.revision } }
  }
  if (app.frontendSnapshot('bots').phase !== 'ready') throw Error('Not ready')
  // Saves without retired benefits initialize Keep. Discovery saves have a real
  // compensation choice; execute it through the production application.
  const state = app.snapshot()
  if (state.phase !== 'ready') throw Error(state.phase)
  if ((state.state as CanonicalRuntimeState).gameState.meta.reworkMigrationChoice === undefined) {
    await dispatch({ kind: 'rework.choose-migration', choice })
  }
  const surface = (route: ReadyGameRoute) => {
    const snapshot = app.frontendSnapshot(route === 'transcendence' ? 'bots' : 'avocato')
    if (snapshot.phase !== 'ready') throw Error(snapshot.phase)
    return <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <ReadyDysonSlice locale="en" route={route} snapshot={snapshot} dispatchPlayer={dispatch} />
    </IntlProvider>
  }
  const mounted = render(surface('avocato'))
  const items = [...mounted.container.querySelectorAll('.dyson-navigation--drawer [data-navigation-id]')].map(element => element.getAttribute('data-navigation-id'))
  if (!unlocked) {
    expect(items).not.toContain('transcendence')
    expect(items).not.toContain('avocato')
    expect(mounted.container.querySelector('.avocato-surface')).toBeNull()
    return
  }
  expect(items.slice(0, 2)).toEqual(['transcendence', 'avocato'])
  const store = mounted.container.querySelector('.avocato-surface')
  expect(store).not.toBeNull()
  expect(mounted.container.querySelector('.avocato-feed-card')).toBeNull()
  expect(mounted.container.textContent).not.toMatch(/friendly interdimensional|fourth-dimensional deity/)
  if (discovery) {
    fireEvent.click(within(store as HTMLElement).getByText('Discovery upgrades'))
    await act(async () => { fireEvent.click(within(store as HTMLElement).getAllByRole('button', { name: 'Buy · 1 TP' })[0]) })
    const updated = app.snapshot()
    if (updated.phase !== 'ready') throw Error(updated.phase)
    expect((updated.state as CanonicalRuntimeState).gameState.avocado.overflowPoints).toBe(7n)
    await app.checkpoint()
    const reopened = factory(repo)
    await reopened.start()
    const saved = reopened.snapshot()
    if (saved.phase !== 'ready') throw Error(saved.phase)
    expect((saved.state as CanonicalRuntimeState).gameState.discovery?.speedUpgrades).toBe(1n)
  }
  mounted.rerender(surface('transcendence'))
  expect(mounted.container.querySelector('.discovery-purchase')).toBeNull()
  expect(mounted.container.querySelector('.avocato-surface')).toBeNull()
  expect(!!mounted.container.querySelector('.discovery-card')).toBe(discovery)
})
