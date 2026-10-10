// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import type { SaveRepository } from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { formatWholeGameNumber } from '../ui/i18n/formatters'
import { CIVILIZATION_ACTIVITIES, civilizationCycle, civilizationActivityInputs } from '../simulation/civilization'
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
  expect(screen.getByRole('progressbar', {name:'Next Catalyst'}).getAttribute('value')).toBe('0')
  expect(app.advanceActive(9000000).accepted).toBe(true)
  mounted.rerender(surface(app, 'simulations', dispatchPlayer))
  refresh = () => mounted.rerender(surface(app, 'simulations', dispatchPlayer))
  expect(mounted.container.querySelectorAll('.civilization-activity')).toHaveLength(9)
  expect(ready(app).state.gameState.challenges?.galvanizers).toBe(7n)
  expect(ready(app).state.gameState.civilization?.awardedCatalystMilestoneIds).toHaveLength(7)
  expect(screen.queryByRole('button', {name:/Buy|Claim/})).toBeNull()
  expect(screen.getByText('Fracture boost +0%')).toBeTruthy()
  expect(app.frontendSnapshot('skills').phase).toBe('ready')
  mounted.rerender(surface(app, 'skills', dispatchPlayer)); refresh = () => mounted.rerender(surface(app, 'skills', dispatchPlayer))
  await waitFor(() => expect(mounted.container.querySelector('button.skill-tree-node[data-skill-id="startHereTree"]')).not.toBeNull())
  fireEvent.click(mounted.container.querySelector('button.skill-tree-node[data-skill-id="startHereTree"]')!)
  fireEvent.click(screen.getByRole('button', { name: /^Fracture/ }))
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Spend 1 Catalyst' })) })
  const after = (ready(app).state as CanonicalRuntimeState).gameState
  expect(after.challenges).toMatchObject({ galvanizers: 6n, galvanizedSkillIds: ['startHereTree'] })
  expect(screen.getByText('Fractured: +5% overall simulation speed. Bonuses are additive.')).toBeTruthy()
  expect(validateCanonicalGameState(after)).toEqual({ valid: true, errors: [] })
  const reopened = factory(repo); await reopened.start()
  expect(ready(reopened).state.gameState.challenges).toEqual(after.challenges)
  expect(ready(reopened).state.gameState.civilization).toEqual(after.civilization)
})

test('failed durable focus change preserves progress and retry saves selected weights', async () => {
  const repo=seed(),app=factory(repo);await app.start();app.advanceActive(9000000)
  const before=ready(app).state.gameState.civilization
  repo.failNext=true
  expect((await dispatch(app,{kind:'civilization.set-focus',focus:'settlement'})).accepted).toBe(false)
  expect(ready(app).state.gameState.civilization).toEqual(before)
  expect((await dispatch(app,{kind:'civilization.set-focus',focus:'settlement'})).accepted).toBe(true)
  const reopened=factory(repo);await reopened.start()
  expect(ready(reopened).state.gameState.civilization?.focus).toBe('settlement')
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
  expect(stored.awardedCatalystMilestoneIds).toEqual(['forager-catalyst-1'])
  expect(ready(app).state.gameState.challenges?.galvanizers).toBe(1n)
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


test('automatic gear and paid cycles persist with no manual equipment purchase surface',async()=>{
 const repo=seed(),app=factory(repo);await app.start();expect(app.advanceActive(9000000).accepted).toBe(true)
 expect((await dispatch(app,{kind:'civilization.set-focus',focus:'settlement'})).accepted).toBe(true)
 const c=ready(app).state.gameState.civilization!
 expect(c.equippedWorkers).toBeGreaterThan(0n);expect(c.equippedWorkers).toBeLessThanOrEqual(c.workers/4n)
 const mounted=render(surface(app,'simulations',async(command)=>{if(command.kind==='civilization.equip-worker')throw Error('No manual purchase expected');const result=await dispatch(app,command);if(!result.accepted)throw Error(result.reason);return {status:'accepted' as const,kind:'transition' as const,changed:result.changed,stateRevision:result.revision,activationRevision:{session:ready(app).revision.session,state:result.revision}}}))
 fireEvent.click(screen.getByRole('button',{name:'Forager details'}));fireEvent.click(mounted.container.querySelector('.civilization-workforce > summary')!)
 expect(screen.queryByRole('button',{name:/Equip/})).toBeNull();expect(screen.getByText(/Every simulation minute/)).toBeTruthy()
 const reopened=factory(repo);await reopened.start();expect(ready(reopened).state.gameState.civilization).toEqual(c)
})

test('era focus stays exposed, distribution matches current crews, and locked requirements use the upward dock',async()=>{
 const repo=seed(),app=factory(repo);await app.start()
 let refresh=()=>{}
 const dispatchPlayer=async(command:CanonicalPlayerCommand)=>{
  const result=await dispatch(app,command);refresh()
  if(!result.accepted)throw Error(result.reason)
  return {status:'accepted' as const,kind:'transition' as const,changed:result.changed,stateRevision:result.revision,activationRevision:{session:ready(app).revision.session,state:result.revision}}
 }
 const mounted=render(surface(app,'simulations',dispatchPlayer));refresh=()=>mounted.rerender(surface(app,'simulations',dispatchPlayer))
 expect(screen.queryByRole('combobox')).toBeNull()
 const options=screen.getByRole('radiogroup',{name:'Workforce focus'})
 expect(options.querySelectorAll('button')).toHaveLength(4)
 const catalystSummary = mounted.container.querySelector('.civilization-catalyst-summary')!
 expect(catalystSummary.textContent).toContain('Next Catalyst')
 expect(catalystSummary.textContent).not.toContain('First hunt')
 expect(catalystSummary.querySelector('bdi')).toBeNull()
 expect(screen.getByRole('radio',{name:'Balanced'}).getAttribute('aria-checked')).toBe('true')
 expect(mounted.container.querySelectorAll('.civilization-path')).toHaveLength(1)
 expect(mounted.container.querySelector('[data-locked-activity]')).toBeNull()
 const settings=screen.getByRole('button',{name:'Forager details'})
 expect(settings.getAttribute('aria-expanded')).toBe('false')
 fireEvent.click(settings)
 expect(settings.getAttribute('aria-expanded')).toBe('true')
 expect(mounted.container.querySelector('.civilization-goal-details')).toBeNull()
 const expandedCopy = mounted.container.querySelector('.civilization-control-panel .ui-progress-controls-panel__body')!.textContent!
 expect(expandedCopy).not.toContain('First hunt')
 expect(expandedCopy).not.toContain('Awarded automatically')
 const tool=mounted.container.querySelector('[data-locked-activity="toolmaking"]')!
 expect(tool.textContent).toContain('Gathering: 0 / 2')
 expect(tool.querySelector('details,summary,button')).toBeNull()
 fireEvent.click(settings)
 expect(mounted.container.querySelector('[data-locked-activity]')).toBeNull()
 app.advanceActive(9000000);refresh()
 await act(async()=>{fireEvent.click(screen.getByRole('radio',{name:'Growth'}))})
 expect(screen.getByRole('radio',{name:'Growth'}).getAttribute('aria-checked')).toBe('true')
 expect(options.querySelectorAll('[aria-checked="true"]')).toHaveLength(1)
 expect(screen.getByRole('radio',{name:'Growth'}).tabIndex).toBe(0)
 expect(screen.getByRole('radio',{name:'Balanced'}).tabIndex).toBe(-1)
 await waitFor(()=>expect(screen.getByRole('radio',{name:'Growth'}).hasAttribute('disabled')).toBe(false))
 await act(async()=>{fireEvent.keyDown(screen.getByRole('radio',{name:'Growth'}),{key:'ArrowDown'})})
 expect(screen.getByRole('radio',{name:'Travel'}).getAttribute('aria-checked')).toBe('true')
 expect(document.activeElement).toBe(screen.getByRole('radio',{name:'Travel'}))
 await waitFor(()=>expect(screen.getByRole('radio',{name:'Travel'}).hasAttribute('disabled')).toBe(false))
 await act(async()=>{fireEvent.keyDown(screen.getByRole('radio',{name:'Travel'}),{key:'Home'})})
 expect(screen.getByRole('radio',{name:'Balanced'}).getAttribute('aria-checked')).toBe('true')
 expect(options.querySelectorAll('[aria-checked="true"]')).toHaveLength(1)
 const c=ready(app).state.gameState.civilization!
 fireEvent.click(settings)
 const distribution=mounted.container.querySelectorAll('[data-workforce-section]')
 expect([...distribution].reduce((sum,row)=>sum+BigInt(row.querySelector('dd')!.textContent!.replaceAll(',','')),0n)).toBe(c.workers)
 expect(ready(app).state.gameState.challenges!.galvanizers).toBe(7n)
})

 test('following-era fixture renders the retained Forager economy as one output source', async () => {
  const app = factory(seed()); await app.start(); app.advanceActive(9000000)
  const snapshot = app.frontendSnapshot('simulations'); if(snapshot.phase !== 'ready') throw Error(snapshot.phase)
  const mounted = render(<IntlProvider locale="en" messages={{}}><CivilizationSurface gameplay={snapshot.gameplay} locale="en" gameSpeed={1} activeEraId="synthetic-following-era" dispatchPlayer={async () => { throw Error('Fixture must not dispatch') }} /></IntlProvider>)
  expect(mounted.container.querySelectorAll('.civilization-retained-generator')).toHaveLength(1)
  expect(mounted.container.querySelector('.civilization-retained-generator')?.getAttribute('data-feeds-era')).toBe('synthetic-following-era')
  expect(mounted.container.querySelectorAll('.civilization-balances > div')).toHaveLength(8)
  expect(mounted.container.querySelector('.civilization-activity')).toBeNull()
  expect(mounted.container.querySelector('[data-focus]')).toBeNull()
  expect(ready(app).state.gameState.civilization?.awardedCatalystMilestoneIds).toHaveLength(7)
 })

 test('collapsed rows expose actual crews, every numeric start cost, paid reservations and shortages', async () => {
  const app = factory(seed()); await app.start(); app.advanceActive(9000000)
  const snapshot = app.frontendSnapshot('simulations'); if(snapshot.phase !== 'ready') throw Error(snapshot.phase)
  const c = ready(app).state.gameState.civilization!
  const view = (gameplay = snapshot.gameplay) => <IntlProvider locale="en" messages={{}}><CivilizationSurface gameplay={gameplay} locale="en" gameSpeed={1} dispatchPlayer={async () => { throw Error('No dispatch') }} /></IntlProvider>
  const mounted = render(view())
  for(const [index, definition] of CIVILIZATION_ACTIVITIES.entries()) {
   if(definition.retired)continue
   const row = mounted.container.querySelector(`[data-activity-id="${definition.id}"]`)!
   expect(row.querySelector('.civilization-job-title bdi')?.textContent?.replaceAll(',','')).toBe(String(c.activities[definition.id].workers))
   const costs = civilizationActivityInputs(c,index)
   const header = row.querySelector('.civilization-job-header')!
   expect(header.querySelector('.civilization-job-title')).not.toBeNull()
   expect(header.querySelector('.civilization-job-recipe')).not.toBeNull()
   expect(header.querySelector('.civilization-recipe-arrow')?.textContent).toBe(Object.keys(costs).length ? '▶' : undefined)
   expect(row.querySelectorAll('.civilization-start-cost [data-symbol]')).toHaveLength(Object.keys(costs).length)
   for(const [id,qty] of Object.entries(costs)) expect(row.querySelector(`.civilization-start-cost [data-symbol="${id}"]`)?.parentElement?.querySelector('bdi')?.textContent).toBe(formatWholeGameNumber('en',qty!))
   expect(row.querySelector('.civilization-start-cost')?.getAttribute('data-reserved')).toBe(String(c.activities[definition.id].active))
   const cycle=civilizationCycle(c,index),outputs={...cycle.outputs,...(cycle.populationDelta>0n?{worker:cycle.populationDelta}:{})}
   expect(row.querySelectorAll('.civilization-output [data-symbol]')).toHaveLength(Object.keys(outputs).length)
   for(const [id,qty] of Object.entries(outputs)) expect(row.querySelector(`.civilization-output [data-symbol="${id}"]`)?.parentElement?.querySelector('bdi')?.textContent).toBe(formatWholeGameNumber('en',qty!))
   expect(row.querySelector('.civilization-start-cost')?.querySelector('svg:not([data-symbol])')).toBeNull()
  }
  const paidId = CIVILIZATION_ACTIVITIES.find((definition,index) => index > 0 && c.activities[definition.id].active)!.id
  const emptyStock = Object.fromEntries(Object.keys(c.resources).map(id => [id,0n])) as typeof c.resources
  mounted.rerender(view({...snapshot.gameplay,progression:{...snapshot.gameplay.progression,civilization:{...c,resources:emptyStock}}}))
  expect(mounted.container.querySelector(`[data-activity-id="${paidId}"] .civilization-start-cost [data-affordable="false"]`)).toBeNull()
  const starved = {...c, resources:Object.fromEntries(Object.keys(c.resources).map(id => [id,0n])) as typeof c.resources, activities:Object.fromEntries(Object.entries(c.activities).map(([id,job]) => [id,{...job,active:false,progress:0}]))}
  mounted.rerender(view({...snapshot.gameplay,progression:{...snapshot.gameplay.progression,civilization:starved}}))
  expect(mounted.container.querySelector('[data-activity-id="gathering"] .civilization-start-cost [data-symbol]')).toBeNull()
  expect(mounted.container.querySelector('[data-activity-id="campExpansion"] .civilization-start-cost [data-affordable="false"]')).not.toBeNull()
  expect(mounted.container.querySelector('[data-activity-id="campExpansion"] .civilization-job-timer')?.textContent).toBe('∞')
  expect(mounted.container.querySelector('[data-activity-id="campExpansion"] .civilization-job-timer')?.getAttribute('aria-label')).toContain('Waiting')
 })
