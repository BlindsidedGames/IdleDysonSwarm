import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { PortableSaveRepository, type SaveStorageAdapter } from '../save/repository'
import { decodeIdb1SaveRoot } from '../save/decodeIdb1'
import { validateCanonicalGameState } from '../game-state/validate'
import { selectGameplayVisibility } from './frontendSnapshot'
import { createProductionCanonicalApplicationFactory } from './productionApplicationFactory'
import { createUnityFirstRunPreparedSave } from './firstRun/unityFirstRunSave'
import type { CanonicalGameCommand } from './canonicalGameCommands'

// A checked-in, accounted pre-Discovery fixture; all ownership below is paid
// through production commands, including the complete prerequisite chain.
test('legal repeated tab conflicts deliver an ordered resolution and reintroduction between frontend frames', async () => {
  const files = new Map<string, string>([['/current', readFileSync(new URL('../../test/fixtures/progression-rework-idleds/mature-infinity.idleds.txt', import.meta.url), 'utf8')]])
  const storage: SaveStorageAdapter = {
    exists: async path => files.has(path),
    readText: async path => { const text = files.get(path); if (text === undefined) throw Error('Missing synthetic save'); return text },
    writeText: async (path, text) => { files.set(path, text) },
    copy: async (from, to) => { files.set(to, files.get(from)!) },
    replaceAtomically: async (from, to) => { files.set(to, files.get(from)!); files.delete(from) },
    discoverLegacyCandidates: async () => [],
  }
  const app = createProductionCanonicalApplicationFactory({
    createFirstRunSave: () => createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-11T00:00:00Z' }),
    readHostEntitlements: () => ({ permanentDoubleIp: false }),
  })(new PortableSaveRepository(storage, { current: '/current', temporary: '/temporary', legacyRecovery: '/legacy', backups: ['/backup'] }, decodeIdb1SaveRoot))
  const ready = () => { const snapshot = app.snapshot(); if (snapshot.phase !== 'ready') throw Error('Synthetic application is not ready'); return snapshot }
  const dispatch = async (command: CanonicalGameCommand) => {
    const snapshot = ready()
    expect(await app.dispatchPlayer({ sessionRevision: snapshot.revision.session, expectedStateRevision: snapshot.revision.state, command })).toMatchObject({ kind: 'transition', transition: { accepted: true } })
  }
  try {
    await app.start()
    for (let count = 0; count < 5; count++) await dispatch({ kind: 'infinity.purchase-shop-item', itemId: 'permanent-skill-point' })
    for (const skillId of ['startHereTree', 'planetsTree', 'serverTree', 'aiManagerTree', 'assemblyLineTree', 'parallelProcessing', 'dataCenterTree', 'pocketDimensions', 'scientificPlanets', 'shouldersOfGiants', 'shouldersOfPrecursors']) await dispatch({ kind: 'skill.purchase', skillId })
    const state = ready().state.gameState
    expect(validateCanonicalGameState(state).valid).toBe(true)
    expect(state.discovery?.unlocked).toBe(false)
    expect(selectGameplayVisibility(state)).toMatchObject({ allTabsUnlocked: false, skills: { routeUnlocked: true }, research: { routeUnlocked: true } })
    expect(state.infinity).toMatchObject({ points: 41n, spentPoints: 31n, permanentSkillPoints: 5n })
    await dispatch({ kind: 'skill.set-preset-assignment', slot: 2, skillIds: ['shouldersOfTheEnlightened'] })
    await dispatch({ kind: 'skill.set-tab-preset-automation', tab: 'bots', slot: 2 })
    await dispatch({ kind: 'skill.set-tab-preset-automation', tab: 'research', slot: 2 })
    for (const tab of ['bots', 'research', 'bots', 'research'] as const) await dispatch({ kind: 'skill.apply-tab-preset-automation', tab })
    expect(ready().state.presentationEvents.map(event => event.kind)).toEqual(Array(6).fill('skill-preset-conflict'))
    await dispatch({ kind: 'skill.set-preset-assignment', slot: 2, skillIds: ['shouldersOfPrecursors'] })
    await dispatch({ kind: 'skill.apply-tab-preset-automation', tab: 'bots' })
    await dispatch({ kind: 'skill.set-preset-assignment', slot: 2, skillIds: ['shouldersOfTheEnlightened'] })
    await dispatch({ kind: 'skill.apply-tab-preset-automation', tab: 'research' })
    const events = ready().state.presentationEvents
    expect(events.map(event => event.kind)).toEqual([...Array(6).fill('skill-preset-conflict'), 'skill-preset-conflict-resolved', 'skill-preset-conflict'])
    expect(events[6]).toMatchObject({ slot: 2, sequence: 7 })
    expect(events[7]).toMatchObject({ sequence: 8, application: { blockedByRetainedSkillIds: ['shouldersOfTheEnlightened'] } })
    app.acknowledgePresentationEvents(ready().revision.session, 8)
    expect(ready().state.presentationEvents).toEqual([])
  } finally { app.disposeStoredTimeJobRunner() }
})
