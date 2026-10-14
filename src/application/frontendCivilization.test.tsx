// @vitest-environment jsdom
import { growForager } from '../../test/support/foragerPopulation'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import type { SaveRepository } from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { civilizationCycle } from '../simulation/civilization'
import { CivilizationSurface } from '../ui/gameplay/simulations/CivilizationSurface'
import { ReadyDysonSlice, type ReadyGameRoute } from '../ui/gameplay/dyson/ReadyDysonSlice'

const prepared = createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-07T00:00:00Z' })
class MemoryRepository implements SaveRepository {
  current: PreparedSave
  failNext = false
  gate: Promise<void> | undefined
  commits = 0
  constructor(current: PreparedSave) { this.current = current }
  async hasCurrent() { return true }
  async loadCurrent() { return this.current }
  async migrateLegacyOnFirstLaunch() { return { status: 'already-migrated' as const, save: this.current } }
  async commit(save: PreparedSave) {
    await this.gate
    if (this.failNext) { this.failNext = false; throw Error('Deliberate isolated save failure') }
    this.commits++; this.current = save; return save
  }
}
afterEach(cleanup)
const factory = createProductionCanonicalApplicationFactory({ createFirstRunSave: () => prepared, readHostEntitlements: () => ({ permanentDoubleIp: false }) })
type Application = ReturnType<typeof factory>
function ready(app: Application) {
  const s = app.snapshot(); if (s.phase !== 'ready') throw Error(s.phase); return s
}
function envelope(app: Application) { const s = ready(app); return { sessionRevision: s.revision.session, expectedStateRevision: s.revision.state } }
async function dispatch(app: Application, command: CanonicalPlayerCommand) {
  const result = await app.dispatchPlayer({ ...envelope(app), command })
  if (result.kind !== 'transition') throw Error(result.kind)
  return result.transition
}
function seed(legacy = false) {
  const h = hydrateGameState(prepared)
  return new MemoryRepository(dehydrateGameState(h, { ...h.state,
    dyson: { ...h.state.dyson, goalStage: 10n },
    meta: { ...h.state.meta, reworkMigrationChoice: legacy ? undefined : 'keep', firstInfinityComplete: legacy },
    quantum: { ...h.state.quantum, cashBonusLevels: legacy ? 1n : 0n },
    infinity: { ...h.state.infinity, automaticResetEnabled: false },
    timeline: { ...h.state.timeline, storedTimeAvailableSeconds: 10000, processing: { ...h.state.timeline.processing, storedTimePreset: 'fast' } },
  }))
}
function surface(app: Application, route: ReadyGameRoute, dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<import('../ui/runtime').UiRuntimePlayerCommandResult>) {
  const s = app.frontendSnapshot(route === 'simulations' ? 'simulations' : 'skills'); if (s.phase !== 'ready') throw Error(s.phase)
  return <IntlProvider locale="en" messages={{}} onError={() => undefined}><ReadyDysonSlice locale="en" route={route} snapshot={s} dispatchPlayer={dispatchPlayer} /></IntlProvider>
}

function matureSeed(){const h=hydrateGameState(prepared);return new MemoryRepository(dehydrateGameState(h,growForager({...h.state,dyson:{...h.state.dyson,goalStage:10n},meta:{...h.state.meta,reworkMigrationChoice:'keep'}})))}

test.each(['first-run', 'keep', 'fresh'] as const)('playable civilization and first Catalyst/fracture/save path: %s', async path => {
  const repo = seed(path !== 'first-run'); const app = factory(repo); await app.start()
  if (path !== 'first-run') expect((await dispatch(app, { kind: 'rework.choose-migration', choice: path })).accepted).toBe(true)
  expect(ready(app).state.gameState.civilization).toBeUndefined()
  let refresh = () => {}
  const dispatchPlayer = async (command: CanonicalPlayerCommand) => {
    const result = await dispatch(app, command)
    refresh()
    if (!result.accepted) return { status: 'rejected' as const, kind: 'transition' as const, code: result.code, reason: result.reason ?? result.code, stale: false, stateRevision: result.revision, activationRevision: { session: ready(app).revision.session, state: result.revision } }
    return { status: 'accepted' as const, kind: 'transition' as const, changed: result.changed, stateRevision: result.revision, activationRevision: { session: ready(app).revision.session, state: result.revision } }
  }
  const mounted = render(surface(app, 'simulations', dispatchPlayer))
  expect(screen.getByRole('progressbar', { name: /^Gathering/ })).toBeTruthy()
  expect(mounted.container.querySelectorAll('.civilization-activity')).toHaveLength(1)
  expect(screen.getByRole('progressbar', {name:'Next Catalyst'}).getAttribute('value')).toBe('0.6')
  expect(screen.queryByRole('radio')).toBeNull()
  expect(app.advanceActive(400000).accepted).toBe(true)
  expect((await dispatch(app,{kind:'civilization.unlock-hunting'})).accepted).toBe(true)
  expect(app.advanceActive(9000000).accepted).toBe(true)
  mounted.rerender(surface(app, 'simulations', dispatchPlayer))
  refresh = () => mounted.rerender(surface(app, 'simulations', dispatchPlayer))
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Build tent'})))
  expect(mounted.container.querySelectorAll('.civilization-activity')).toHaveLength(4)
  expect(ready(app).state.gameState.challenges?.galvanizers).toBe(1n)
  expect(ready(app).state.gameState.civilization?.awardedCatalystMilestoneIds).toHaveLength(1)
  expect(screen.queryByRole('button', {name:/Buy|Claim/})).toBeNull()
  expect(screen.getByText('Fracture boost +0%')).toBeTruthy()
  expect(app.frontendSnapshot('skills').phase).toBe('ready')
  mounted.rerender(surface(app, 'skills', dispatchPlayer)); refresh = () => mounted.rerender(surface(app, 'skills', dispatchPlayer))
  await waitFor(() => expect(mounted.container.querySelector('button.skill-tree-node[data-skill-id="startHereTree"]')).not.toBeNull())
  fireEvent.click(mounted.container.querySelector('button.skill-tree-node[data-skill-id="startHereTree"]')!)
  fireEvent.click(screen.getByRole('button', { name: /^Fracture/ }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Spend 1 Catalyst' })) })
  const after = (ready(app).state as CanonicalRuntimeState).gameState
  expect(after.challenges).toMatchObject({ galvanizers: 0n, galvanizedSkillIds: ['startHereTree'] })
  expect(screen.getByText('Fractured: +5% overall simulation speed. Bonuses are additive.')).toBeTruthy()
  expect(validateCanonicalGameState(after)).toEqual({ valid: true, errors: [] })
  const reopened = factory(repo); await reopened.start()
  expect(ready(reopened).state.gameState.challenges).toEqual(after.challenges)
  expect(ready(reopened).state.gameState.civilization).toEqual(after.civilization)
})

test('failed durable housing purchase preserves stocks and retry saves population', async () => {
  const repo=seed(),app=factory(repo);await app.start();app.advanceActive(400000);await dispatch(app,{kind:'civilization.unlock-hunting'});app.advanceActive(9000000)
  const before=ready(app).state.gameState.civilization
  repo.failNext=true
  expect((await dispatch(app,{kind:'civilization.buy-housing',building:'tent'})).accepted).toBe(false)
  expect(ready(app).state.gameState.civilization).toEqual(before)
  expect((await dispatch(app,{kind:'civilization.buy-housing',building:'tent'})).accepted).toBe(true)
  const reopened=factory(repo);await reopened.start()
  expect(ready(reopened).state.gameState.civilization?.workers).toBe(5n)
})

test('large Stored Time spend matches active advancement, charges once and awards exactly once', async () => {
  const repo = seed(); const app = factory(repo); await app.start()
  const active = factory(seed()); await active.start(); expect(active.advanceActive(640000).accepted).toBe(true)
  const beforeCommits = repo.commits
  const result = await app.commitStoredTime(envelope(app), 640)
  expect(result).toMatchObject({ committed: true, consumedSeconds: 640, remainingSeconds: 0 })
  expect(repo.commits).toBe(beforeCommits + 1)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9360, 6)
  const stored = ready(app).state.gameState.civilization!
  const played = ready(active).state.gameState.civilization!
  expect(stored.resources).toEqual(played.resources)
  for (const id of Object.keys(stored.activities)) {
    expect(stored.activities[id].completions).toBe(played.activities[id].completions)
    expect(stored.activities[id].progress).toBeCloseTo(played.activities[id].progress, 6)
  }
  expect(stored.awardedCatalystMilestoneIds).toEqual([])
  expect(ready(app).state.gameState.challenges?.galvanizers).toBe(0n)
  const reopened = factory(repo); await reopened.start()
  expect(ready(reopened).state.gameState.civilization).toEqual(stored)
})


test('interrupted Stored Time candidates credit nothing; repeated successful spends conserve progress and bank', async () => {
  const repo = seed(); const app = factory(repo); await app.start()
  const before = ready(app).state.gameState
  let polls = 0
  const cancelled = await app.commitStoredTime(envelope(app), 640, () => ++polls > 4)
  expect(cancelled).toMatchObject({ committed: false, consumedSeconds: 0, remainingSeconds: 640 })
  expect(ready(app).state.gameState.civilization).toEqual(before.civilization)
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBe(10000)
  expect(await app.commitStoredTime(envelope(app), 320)).toMatchObject({ committed: true, consumedSeconds: 320 })
  expect(await app.commitStoredTime(envelope(app), 320)).toMatchObject({ committed: true, consumedSeconds: 320 })
  expect(ready(app).state.gameState.timeline.storedTimeAvailableSeconds).toBeCloseTo(9360, 6)
  const one = factory(seed()); await one.start(); one.advanceActive(640000)
  expect(ready(app).state.gameState.civilization!.resources).toEqual(ready(one).state.gameState.civilization!.resources)
  for (const id of Object.keys(ready(one).state.gameState.civilization!.activities)) {
    expect(ready(app).state.gameState.civilization!.activities[id].completions).toBe(ready(one).state.gameState.civilization!.activities[id].completions)
    expect(ready(app).state.gameState.civilization!.activities[id].progress).toBeCloseTo(ready(one).state.gameState.civilization!.activities[id].progress, 6)
  }
})


test('manual purchases, automatic jobs, resource labels and population goals use the authoritative application',async()=>{
 const repo=seed(),app=factory(repo);await app.start();app.advanceActive(7200000)
 let refresh=()=>{}
 const mounted=render(surface(app,'simulations',async(command)=>{const result=await dispatch(app,command);refresh();if(!result.accepted)throw Error(result.reason);return {status:'accepted',kind:'transition',changed:result.changed,stateRevision:result.revision,activationRevision:{session:ready(app).revision.session,state:result.revision}}}))
 refresh=()=>mounted.rerender(surface(app,'simulations',async command=>{const result=await dispatch(app,command);refresh();if(!result.accepted)throw Error(result.reason);return {status:'accepted',kind:'transition',changed:result.changed,stateRevision:result.revision,activationRevision:{session:ready(app).revision.session,state:result.revision}}}))
 expect(screen.queryByRole('radio')).toBeNull()
 expect(screen.queryByRole('combobox',{name:'Food production priority'})).toBeNull()
 const beforeUnlock=ready(app).state.gameState.civilization!
 repo.failNext=true
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Unlock Hunting'})))
 expect(ready(app).state.gameState.civilization).toEqual(beforeUnlock)
 await waitFor(()=>expect((screen.getByRole('button',{name:'Unlock Hunting'}) as HTMLButtonElement).disabled).toBe(false))
 expect(screen.queryByRole('radio')).toBeNull()
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Unlock Hunting'})))
 await waitFor(()=>expect(ready(app).state.gameState.civilization!.resources.tools).toBe(beforeUnlock.resources.tools-1n))
 expect(screen.queryByRole('button',{name:'Unlock Hunting'})).toBeNull()
 await act(async()=>{app.advanceActive(7200000);refresh()})
 expect(screen.queryByText('Expeditions & Trade')).toBeNull()
 expect(screen.getByRole('button',{name:'Forager details'}).getAttribute('aria-expanded')).toBe('false')
 expect(screen.getByRole('progressbar', {name:'Next Catalyst'}).getAttribute('aria-valuetext')).toBe('Population 3 / 5')
 expect(screen.getByRole('term',{name:'Tents'})).toBeTruthy()
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Build tent'})))
 expect(ready(app).state.gameState.civilization!.workers).toBe(5n)
 expect(screen.getByRole('progressbar', {name:'Next Catalyst'}).getAttribute('aria-valuetext')).toBe('Population 5 / 10')
 await act(async()=>fireEvent.click(screen.getByRole('radio',{name:'Prioritize: Hunting'})))
 await waitFor(()=>expect((screen.getByRole('radio',{name:'Prioritize: Hunting'}) as HTMLInputElement).checked).toBe(true))
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Forager details'})))
 expect(screen.getByText('Leather')).toBeTruthy()
 const reopened=factory(repo);await reopened.start()
 expect(ready(reopened).state.gameState.civilization!.workers).toBe(5n)
 expect(ready(reopened).state.gameState.civilization!.priority).toBe('hunting')
})

test.each(['forager', 'farming'] as const)('%s bars animate published work while keeping real progress accessible', async era => {
  const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation)
  const original = HTMLElement.prototype.animate
  HTMLElement.prototype.animate = animate
  try {
    const app = factory(era==='farming'?matureSeed():seed()); await app.start()
    if (era === 'farming') {
      app.advanceActive(7043000)
      expect((await dispatch(app, { kind: 'civilization.enter-farming' })).accepted).toBe(true)
      for (let n = 0; n < 2_000 && ready(app).state.gameState.civilization!.farming!.phase === 'settling-forager'; n++) app.advanceActive(1000)
      expect(ready(app).state.gameState.civilization!.farming!.phase).toBe('farming')
    }
    app.advanceActive(1000)
    const view = (gameSpeed = 1, almostFinished = false) => {
      const snapshot = app.frontendSnapshot('simulations')
      if (snapshot.phase !== 'ready') throw Error(snapshot.phase)
      const civilization = snapshot.gameplay.progression.civilization!
      const nearEnd = era === 'forager'
        ? { ...civilization, activities: { ...civilization.activities, gathering: { ...civilization.activities.gathering, progress: civilizationCycle(civilization, 0).seconds - .0001 } } }
        : { ...civilization, farming: { ...civilization.farming!, jobs: { ...civilization.farming!.jobs, food: { ...civilization.farming!.jobs.food, remainingWork: .0001 } } } }
      const gameplay = almostFinished ? { ...snapshot.gameplay, progression: { ...snapshot.gameplay.progression, civilization: nearEnd } } : snapshot.gameplay
      return <IntlProvider locale="en" messages={{}}><CivilizationSurface gameplay={gameplay} locale="en" gameSpeed={gameSpeed} dispatchPlayer={async () => { throw Error('No dispatch') }} /></IntlProvider>
    }
    const mounted = render(view())
    app.advanceActive(era === 'farming' ? 1000 : 100)
    mounted.rerender(view())
    expect(animate).toHaveBeenCalled()
    const progress = screen.getByRole('progressbar', { name: era === 'farming' ? 'Fields' : 'Gathering' }) as HTMLProgressElement
    const c = ready(app).state.gameState.civilization!
    const actual = era === 'farming' ? c.farming!.jobs.food.work - c.farming!.jobs.food.remainingWork : c.activities.gathering.progress
    expect(progress.value).toBeCloseTo(actual)
    const calls = animate.mock.calls.length
    mounted.rerender(view())
    expect(animate).toHaveBeenCalledTimes(calls)
    if(era==='farming'){
      const cycle=c.farming!.jobs.food.cycle
      const fieldCalls=()=>animate.mock.contexts.filter(element=>element instanceof HTMLElement&&element.closest('[data-activity-id]')?.getAttribute('data-activity-id')==='fields').length
      const before=fieldCalls()
      expect(app.advanceActive(40000).accepted).toBe(true)
      const next=ready(app).state.gameState.civilization!.farming!.jobs.food
      expect(next.cycle).toBeGreaterThan(cycle!)
      expect(next.work-next.remainingWork).toBeGreaterThan(actual)
      mounted.rerender(view())
      // A newer paid cycle can have MORE progress than the previous publication.
      // Its identity, rather than backward movement, must reset interpolation.
      expect(fieldCalls()).toBe(before)
      expect(progress.value).toBeCloseTo(next.work-next.remainingWork)
    }
    mounted.rerender(view(1, true))
    const row = mounted.container.querySelector(`[data-activity-id="${era === 'farming' ? 'fields' : 'gathering'}"]`)!
    // A nearly finished slow job is still slow: frequency uses the entire
    // paid receipt, not its tiny remaining time.
    expect(row.querySelector('.civilization-cycle')?.getAttribute('data-presentation')).toBe('cycle')
    expect(row.querySelector('.civilization-job-timer')?.textContent).toBe('0.00s')
    mounted.rerender(view(1000))
    expect(row.querySelector('.civilization-cycle')?.getAttribute('data-presentation')).toBe('solid')
    const current=ready(app).state.gameState.civilization!
    expect(progress.value).toBeCloseTo(era==='farming'?current.farming!.jobs.food.work-current.farming!.jobs.food.remainingWork:actual)
  } finally {
    HTMLElement.prototype.animate = original
  }
})

test('switching the mounted Forager surface to Farming cancels old fills and starts with real Farming work', async () => {
  const animations: { cancel: ReturnType<typeof vi.fn> }[] = []
  const original = HTMLElement.prototype.animate
  HTMLElement.prototype.animate = () => {
    const animation = { cancel: vi.fn() }; animations.push(animation)
    return animation as unknown as Animation
  }
  try {
    const repo = matureSeed(), app = factory(repo); await app.start(); app.advanceActive(1000)
    const view = () => {
      const snapshot = app.frontendSnapshot('simulations')
      if (snapshot.phase !== 'ready') throw Error(snapshot.phase)
      return <IntlProvider locale="en" messages={{}}><CivilizationSurface gameplay={snapshot.gameplay} locale="en" gameSpeed={1} dispatchPlayer={async () => { throw Error('No dispatch') }} /></IntlProvider>
    }
    const mounted = render(view())
    app.advanceActive(100); mounted.rerender(view())
    expect(animations.length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Begin Farming era' })).toBeTruthy()
    expect(screen.queryByRole('progressbar', { name: 'Next Catalyst' })).toBeNull()
    const oldAnimations = [...animations]
    const oldFill = mounted.container.querySelector('.civilization-cycle-fill')!
    const before = ready(app).state.gameState, commits = repo.commits
    repo.failNext = true
    expect((await dispatch(app, { kind: 'civilization.enter-farming' })).accepted).toBe(false)
    expect(ready(app).state.gameState).toEqual(before)
    expect(repo.commits).toBe(commits)
    expect((await dispatch(app, { kind: 'civilization.enter-farming' })).accepted).toBe(true)
    const entered = ready(app).state.gameState
    expect(entered.civilization!.farming!.phase).toBe('farming')
    expect(entered.civilization!.farming!.elapsedSeconds).toBe(0)
    expect(entered.timeline).toEqual(before.timeline)
    expect(entered.civilization!.elapsedSeconds).toBe(before.civilization!.elapsedSeconds)
    expect(hydrateGameState(await repo.loadCurrent()).state.civilization).toEqual(entered.civilization)
    expect((await dispatch(app, { kind: 'civilization.enter-farming' })).accepted).toBe(false)
    expect(ready(app).state.gameState).toEqual(entered)
    expect(repo.commits).toBe(commits + 1)
    mounted.rerender(view())
    expect(oldFill.isConnected).toBe(false)
    for (const animation of oldAnimations) expect(animation.cancel).toHaveBeenCalledOnce()
    expect(ready(app).state.gameState.civilization!.farming!.phase).toBe('farming')
    app.advanceActive(1000); mounted.rerender(view())
    const job = ready(app).state.gameState.civilization!.farming!.jobs.food
    const progress = screen.getByRole('progressbar', { name: 'Fields' }) as HTMLProgressElement
    expect(progress.value).toBeCloseTo(job.work - job.remainingWork)
    expect(progress.max).toBe(job.work)
    expect(screen.queryByRole('progressbar', { name: 'Gathering' })).toBeNull()
  } finally {
    cleanup(); HTMLElement.prototype.animate = original
  }
})


test('Chieftain purchase and on-off control persist through the application; settings only show seasons',async()=>{
 const repo=matureSeed(),app=factory(repo);await app.start();app.advanceActive(600000)
 let refresh=()=>{}
 const send=async(command:CanonicalPlayerCommand)=>{
  const result=await dispatch(app,command);refresh()
  if(!result.accepted)throw Error(result.reason)
  return {status:'accepted' as const,kind:'transition' as const,changed:result.changed,stateRevision:result.revision,activationRevision:{session:ready(app).revision.session,state:result.revision}}
 }
 const mounted=render(surface(app,'simulations',send));refresh=()=>mounted.rerender(surface(app,'simulations',send))
 const before=ready(app).state.gameState.civilization!
 repo.failNext=true
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Unlock Leadership'})))
 await waitFor(()=>expect((screen.getByRole('button',{name:'Unlock Leadership'}) as HTMLButtonElement).disabled).toBe(false))
 expect(ready(app).state.gameState.civilization).toEqual(before)
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Unlock Leadership'})))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Leadership automation'}).getAttribute('aria-pressed')).toBe('true'))
 expect(ready(app).state.gameState.civilization!.workers).toBe(before.workers)
 expect((screen.getByRole('radio',{name:'Prioritize: Gathering'}) as HTMLInputElement).disabled).toBe(true)
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Leadership automation'})))
 await waitFor(()=>expect((screen.getByRole('radio',{name:'Prioritize: Gathering'}) as HTMLInputElement).disabled).toBe(false))
 await act(async()=>fireEvent.click(screen.getByRole('radio',{name:'Prioritize: Toolmaking'})))
 await waitFor(()=>expect(ready(app).state.gameState.civilization!.craftPriority).toBe('toolmaking'))
 await act(async()=>fireEvent.click(screen.getByRole('radio',{name:'Prioritize: Hideworking'})))
 await waitFor(()=>expect(ready(app).state.gameState.civilization!.craftPriority).toBe('hideworking'))
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Forager details'})))
 expect(screen.queryByRole('combobox',{name:'Food production priority'})).toBeNull()
 expect(screen.queryByText(/Provisioning workers share their time/)).toBeNull()
 const reopened=factory(repo);await reopened.start()
 expect(ready(reopened).state.gameState.civilization!.chieftain?.enabled).toBe(false)
 expect(ready(reopened).state.gameState.civilization!.craftPriority).toBe('hideworking')
})
