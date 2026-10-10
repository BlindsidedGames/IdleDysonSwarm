// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import type { SaveRepository } from '../save/repository'
import type { PreparedSave } from '../save/prepare'
import type { CanonicalPlayerCommand } from './canonicalPlayerCommands'
import type { CanonicalGameApplicationFacade } from './canonicalGameApplication'
import type { FrontendApplicationSnapshot } from './frontendSnapshot'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import { dehydrateGameState, hydrateGameState } from '../game-state/mapping'
import { EMPTY_INFINITY_CHALLENGES } from '../simulation/infinityChallenges'
import { ordinaryInfinityBotThreshold } from '../simulation/infinityCycle'
import { validateCanonicalGameState } from '../game-state/validate'
import { SkillsSurface } from '../ui/gameplay/skills/SkillsSurface'

const prepared = createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-05T00:00:00Z' })
class MemoryRepository implements SaveRepository {
  current: PreparedSave
  constructor(current: PreparedSave) { this.current = current }
  async hasCurrent() { return true }
  async loadCurrent() { return this.current }
  async migrateLegacyOnFirstLaunch() { return { status: 'already-migrated' as const, save: this.current } }
  async commit(save: PreparedSave) { this.current = save; return save }
}
function ready(app: CanonicalGameApplicationFacade) {
  const snapshot = app.snapshot()
  if (snapshot.phase !== 'ready') throw Error(snapshot.phase)
  return snapshot
}
function envelope(app: CanonicalGameApplicationFacade) {
  const snapshot = ready(app)
  return { sessionRevision: snapshot.revision.session, expectedStateRevision: snapshot.revision.state }
}
async function command(app: CanonicalGameApplicationFacade, command: CanonicalPlayerCommand) {
  const result = await app.dispatchPlayer({ ...envelope(app), command })
  if (result.kind !== 'transition') throw Error('Expected player transition')
  expect(result.transition.accepted).toBe(true)
  return { status: 'accepted', kind: 'transition', changed: result.transition.accepted && result.transition.changed,
    stateRevision: result.transition.revision, activationRevision: { session: ready(app).revision.session, state: result.transition.revision },
  } as const
}
async function reachInfinity(app: CanonicalGameApplicationFacade) {
  // Bounded production precondition; the real Infinity reset still executes.
  const source = ready(app).state as CanonicalRuntimeState
  const seed: CanonicalRuntimeState = { ...source, gameState: { ...source.gameState,
    timeline: { ...source.gameState.timeline, infinityCycleSeconds: 10 },
    dyson: { ...source.gameState.dyson, bots: ordinaryInfinityBotThreshold(source.gameState.quantum.divisionsPurchased) },
  } }
  expect(validateCanonicalGameState(seed.gameState).valid).toBe(true)
  expect((await app.commitAwayReplacement(envelope(app), seed)).committed).toBe(true)
  await command(app, { kind: 'infinity.request-reset' })
}
function skills(app: CanonicalGameApplicationFacade) {
  const snapshot = app.frontendSnapshot('skills')
  if (snapshot.phase !== 'ready') throw Error(snapshot.phase)
  return snapshot
}
type ReadyFrontend = Extract<FrontendApplicationSnapshot, { phase: 'ready' }>
function mountSkills(app: CanonicalGameApplicationFacade, snapshot: ReadyFrontend) {
  const gameplay = snapshot.gameplay
  const challenges = gameplay.progression.challenges
  if (challenges === undefined) throw Error('Challenges unavailable')
  return render(<IntlProvider locale="en"><SkillsSurface
    locale="en" points={gameplay.resources.skills.points} fragments={gameplay.resources.skills.fragments}
    catalog={gameplay.previews.skills} presets={gameplay.progression.skills.presets}
    selectedPresetSlot={1} botDistribution={0} autoAssignNonRefundable={false}
    galvanizers={challenges.galvanizers}
    hasEarnedGalvanizer={challenges.hasEarnedGalvanizer}
    commandAvailability={{ purchase: true, refund: true, selectPreset: true, setPresetColor: true, setAutoAssignNonRefundable: true, reset: true }}
    showPresetApplicationNotifications={true} onShowPresetApplicationNotificationsChange={() => {}}
    dispatchPlayer={value => command(app, value)}
  /></IntlProvider>)
}
afterEach(cleanup)

// Catalyst acquisition is deferred. Load an already earned balance and exercise
// route-cache reuse through Infinity, the rendered spend and saved ownership.
test.each([false, true])('saved Catalysts remain spendable after Infinity when Skills was cached (later=%s)', async later => {
  const hydrated = hydrateGameState(prepared)
  const repo = new MemoryRepository(dehydrateGameState(hydrated, {
    ...hydrated.state,
    meta: { ...hydrated.state.meta, firstInfinityComplete: true },
    infinity: { ...hydrated.state.infinity, permanentSkillPoints: 1n },
    skills: { ...hydrated.state.skills, points: 1n },
    challenges: { ...EMPTY_INFINITY_CHALLENGES, hasEarnedGalvanizer: true, galvanizers: later ? 2n : 1n },
  }))
  const app = createProductionCanonicalApplicationFactory({ createFirstRunSave: () => prepared, readHostEntitlements: () => ({ permanentDoubleIp: false }) })(repo)
  await app.start()
  if (later) {
    await command(app, { kind: 'skill.purchase', skillId: 'startHereTree' })
    await command(app, { kind: 'skill.galvanize', skillId: 'startHereTree' })
    const spent = skills(app)
    expect(spent.gameplay.previews.skills.skills.find(s => s.skillId === 'startHereTree')).toMatchObject({ owned: true, galvanized: true, canGalvanize: false })
    expect(spent.gameplay.progression.challenges?.galvanizers).toBe(1n)
    mountSkills(app, spent)
    fireEvent.click(document.querySelector('button.skill-tree-node[data-skill-id="startHereTree"]')!)
    expect(screen.queryByRole('button', { name: /^Fracture/ })).toBeNull()
    cleanup()
  }
  const before = skills(app)
  app.frontendSnapshot('infinity')
  await reachInfinity(app)
  app.frontendSnapshot('infinity')
  const after = skills(app)
  expect(after.gameplay.resources.skills.points).toBe(before.gameplay.resources.skills.points)
  expect(after.gameplay.progression.challenges?.galvanizers).toBe(1n)
  expect(validateCanonicalGameState((ready(app).state as CanonicalRuntimeState).gameState).valid).toBe(true)
  const target = later ? 'manualLabour' : 'startHereTree'
  mountSkills(app, after)
  fireEvent.click(document.querySelector(`button.skill-tree-node[data-skill-id="${target}"]`)!)
  const button = screen.getByRole('button', { name: /^Fracture/ }) as HTMLButtonElement
  expect(button.disabled).toBe(false)
  fireEvent.click(button)
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Spend 1 Catalyst' })) })
  expect(ready(app).state.gameState.challenges?.galvanizedSkillIds).toContain(target)
  await app.checkpoint()
  const reopened = createProductionCanonicalApplicationFactory({ createFirstRunSave: () => prepared, readHostEntitlements: () => ({ permanentDoubleIp: false }) })(repo)
  await reopened.start()
  expect(skills(reopened).gameplay.previews.skills.skills.find(s => s.skillId === target)).toMatchObject({ galvanized: true, canGalvanize: false })
})
