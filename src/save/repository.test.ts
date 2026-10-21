import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { PreparedSave } from './prepare'
import { PortableSaveRepository, type LegacySaveCandidate, type SaveStorageAdapter } from './repository'
import { deserializeWebSave, serializeWebSave } from './serialization'
import { hydrateGameState } from '../game-state/mapping'
import { advanceFarming } from '../simulation/farming'
import type { CivilizationState, LegacyFarmingState, PreferredFarmingState } from '../game-state/types'

class MemoryStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  candidates: readonly LegacySaveCandidate[] = []
  replacements: Array<[string, string]> = []
  copies: Array<[string, string]> = []
  failAt: 'write' | 'read-temporary' | 'copy' | 'replace' | null = null
  corruptTemporaryRead = false

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    if (path === '/current.tmp' && this.failAt === 'read-temporary') {
      throw new Error('temporary verification read failed')
    }
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    if (path === '/current.tmp' && this.corruptTemporaryRead) return '{'
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    if (this.failAt === 'write') throw new Error('temporary write failed')
    this.files.set(path, contents)
  }

  async replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    if (this.failAt === 'replace') throw new Error('atomic replace failed')
    this.replacements.push([temporaryPath, destinationPath])
    this.files.set(destinationPath, await this.readText(temporaryPath))
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    if (this.failAt === 'copy') throw new Error('backup copy failed')
    this.copies.push([sourcePath, destinationPath])
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return this.candidates
  }
}

describe('portable transactional save repository', () => {

  test.each([
    ['farming-v1-opening.idleds.txt', 1],
    ['farming-v1-damaged-paid-repair.idleds.txt', 1],
    ['farming-v1-damaged-paid-repair.idleds.txt', 2],
    ['farming-v1-damaged-paid-repair.idleds.txt', 3],
  ] as const)('converts %s v%i to land and food while retaining its owned village and rewards', async (file, version) => {
    const decoded = deserializeWebSave(readFileSync(new URL(`../../qa/fixtures/${file}`, import.meta.url), 'utf8'))
    const old = decoded.civilization as unknown as CivilizationState
    const oldFarming = { ...old.farming!, version } as unknown as LegacyFarmingState
    if (version === 3) {
      for (const key of ['inheritedFoodPerMinute', 'inheritedMaterialsPerMinute', 'transferredWorkers', 'transferredEquippedWorkers', 'continuous']) delete (oldFarming as unknown as Record<string, unknown>)[key]
    }
    decoded.civilization = { ...old, farming: oldFarming }
    const original = serializeWebSave(decoded)
    const storage = new MemoryStorage()
    storage.files.set('/current', original)
    const repository = new PortableSaveRepository(storage, {
      current: '/current', temporary: '/current.tmp', legacyRecovery: '/legacy',
    }, () => { throw Error('A current Web save must not use the Unity decoder.') })
    const migrated = (await repository.loadCurrent())!
    const state = migrated.copyValidatedState()
    const civilization = state.civilization as unknown as CivilizationState
    const farming = civilization.farming!
    expect(storage.files.get('/current')).toBe(original)
    expect(farming).toMatchObject({ version: 9, phase: 'farming' })
    expect(farming.legacyVillage).toEqual(oldFarming)
    expect(farming.houses).toBe(oldFarming.homesBuilt + 1)
    expect(farming.granaries).toBeGreaterThanOrEqual(oldFarming.granaries)
    expect(farming.elapsedSeconds).toBe(oldFarming.elapsedSeconds + oldFarming.tickRemainder)
    expect(farming.awardedCatalystIds).toEqual(oldFarming.awardedCatalystIds)
    // Retired Goods return their base Materials; paid inputs and elapsed work
    // survive conversion without needing the old scheduler to keep running.
    const refunds = Object.values(oldFarming.jobs).reduce((total, job) => ({
      food: total.food + (job.inputs.food ?? 0),
      materials: total.materials + (job.inputs.materials ?? 0) + 2 * (job.inputs.goods ?? 0),
      tools: total.tools + (job.inputs.tools ?? 0),
      work: total.work + job.work - job.remainingWork,
    }), { food: 0, materials: 0, tools: 0, work: 0 })
    expect(farming.resources).toEqual({
      food: oldFarming.resources.food + refunds.food,
      materials: oldFarming.resources.materials + 2 * oldFarming.resources.goods + refunds.materials,
      tools: oldFarming.resources.tools + refunds.tools,
    })
    expect(farming.legacyWorkCredit).toBe(refunds.work)
    expect(state.infinityChallengeData).toMatchObject(decoded.infinityChallengeData as object)
    expect(civilization.awardedCatalystMilestoneIds).toEqual(old.awardedCatalystMilestoneIds)
    expect(civilization.workers).toBe(3n)
    expect(Object.values(civilization.resources).every(value => value === 0n)).toBe(true)
    expect(Object.values(civilization.activities).every(job => !job.active && job.completions === 0n && job.workers === 0n)).toBe(true)
    for (const key of ['inheritedFoodPerMinute', 'inheritedMaterialsPerMinute', 'transferredWorkers', 'transferredEquippedWorkers']) {
      expect(farming).not.toHaveProperty(key)
    }
    await repository.commit(migrated)
    expect((await repository.loadCurrent())!.copyValidatedState().civilization).toEqual(civilization)
    const session = hydrateGameState(migrated)
    const running = advanceFarming(session.state, 3.125)
    await repository.commit(session.prepare(running))
    const resumed = hydrateGameState((await repository.loadCurrent())!).state
    expect(resumed.civilization).toEqual(running.civilization)
  })

  test.each([['farming-v4-assigned.idsw', 4], ['farming-v5-automatic.idsw', 5], ['farming-v6-camps.idsw', 6], ['farming-v7-preferences.idsw', 7], ['farming-v8-seasonal.idsw', 8]] as const)('migrates %s without losing paid work, resources or reward history', async (file, version) => {
    const decoded = deserializeWebSave(readFileSync(new URL(`../../qa/fixtures/${file}`, import.meta.url), 'utf8'))
    const previous = (decoded.civilization as { farming: import('../game-state/types').AssignedFarmingState }).farming
    const storage = new MemoryStorage()
    const original = serializeWebSave(decoded)
    storage.files.set('/current', original)
    const repository = new PortableSaveRepository(storage, { current: '/current', temporary: '/current.tmp', legacyRecovery: '/legacy' }, () => { throw Error('Unexpected legacy decoder') })
    const migrated = (await repository.loadCurrent())!
    const current = (migrated.copyValidatedState().civilization as unknown as CivilizationState).farming!
    expect(storage.files.get('/current')).toBe(original)
    expect(version === 4 ? current.previousVillage : version === 5 ? current.previousAutomaticVillage : version === 6 ? current.previousManagedVillage : version === 7 ? current.previousPreferredVillage : current.previousSeasonalVillage).toEqual(previous)
    if (version === 4) expect(current.fields).toBe(previous.barleyFields + previous.wheatFields)
    expect(current.loggingCamps * 8).toBeGreaterThanOrEqual(previous.assignments.woodland)
    expect(current.jobs).toEqual(previous.jobs)
    expect(current.resources).toEqual({ ...previous.resources,
      materials: previous.resources.materials + (version === 4 && previous.nets ? 120 : 0) + (version === 4 && previous.cattle ? 180 : 0),
      tools: previous.resources.tools + (version === 4 && previous.nets ? 12 : 0) + (version === 4 && previous.cattle ? 18 : 0),
    })
    expect(current.awardedCatalystIds).toEqual(previous.awardedCatalystIds)
    expect(current.population).toBe(previous.population)
    if (version === 7) {
      const preferred = previous as unknown as PreferredFarmingState
      expect(current).toMatchObject({ version: 9, desiredJobs: preferred.desiredJobs,
        growthProgress: preferred.growthProgress, hungerDebt: preferred.hungerDebt,
        disasterSeed: preferred.disasterSeed, naturalDeaths: preferred.naturalDeaths,
        starvationDeaths: preferred.starvationDeaths, disasterDeaths: 0 })
    }
    if (version === 8) expect(current.seasonProtection).toBe(0)
    await repository.commit(migrated)
    const session = hydrateGameState((await repository.loadCurrent())!)
    const running = advanceFarming(session.state, 3.125)
    await repository.commit(session.prepare(running))
    const reloaded = hydrateGameState((await repository.loadCurrent())!).state
    expect(reloaded.civilization).toEqual(running.civilization)
    if (version === 7) expect(running.civilization!.farming!.disasterDeaths).toBeGreaterThan(0)
    if (version === 8) expect(running.civilization!.farming!.seasonProtection).toBeGreaterThan(0)
    if (version === 6 || version === 7 || version === 8) {
      // Restoring a published checkpoint must carry partial recovery and the
      // random event stream, rather than rerolling events or resetting clocks.
      const continued = advanceFarming(running, 6000)
      expect(advanceFarming(reloaded, 6000).civilization).toEqual(continued.civilization)
      if (version === 7) {
        // A paused, already-paid cycle and a newly completed clearing cycle
        // must still share the same clock after publication reorders save keys.
        await repository.commit(session.prepare(continued))
        const paidReload = hydrateGameState((await repository.loadCurrent())!).state
        expect(paidReload.civilization!.farming!.jobs.workshop).toEqual(previous.jobs.workshop)
        expect(advanceFarming(paidReload, 1.125).civilization).toEqual(advanceFarming(continued, 1.125).civilization)
      }
    }
  })

  test.each([
    ['write', 'temporary write failed'],
    ['read-temporary', 'temporary verification read failed'],
    ['copy', 'backup copy failed'],
    ['replace', 'atomic replace failed'],
  ] as const)(
    'preserves the current save when %s fails',
    async (failAt, message) => {
      const storage = new MemoryStorage()
      const current = PreparedSave.fromDecoded({
        saveVersion: 12,
        checkpointMarker: 'current',
      })
      const candidate = PreparedSave.fromDecoded({
        saveVersion: 12,
        checkpointMarker: 'candidate',
      })
      const currentBytes = serializeWebSave(current.copyValidatedState())
      storage.files.set('/current', currentBytes)
      storage.failAt = failAt
      const repository = new PortableSaveRepository(
        storage,
        {
          current: '/current',
          temporary: '/current.tmp',
          legacyRecovery: '/recovery/original-idb1.txt',
        },
        () => ({ saveVersion: 12 }),
      )

      await expect(repository.commit(candidate)).rejects.toThrow(message)
      expect(storage.files.get('/current')).toBe(currentBytes)
    },
  )

  test('does not replace current when temporary verification is corrupt', async () => {
    const storage = new MemoryStorage()
    const current = PreparedSave.fromDecoded({
      saveVersion: 12,
      checkpointMarker: 'current',
    })
    const currentBytes = serializeWebSave(current.copyValidatedState())
    storage.files.set('/current', currentBytes)
    storage.corruptTemporaryRead = true
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(
      repository.commit(
        PreparedSave.fromDecoded({
          saveVersion: 12,
          checkpointMarker: 'candidate',
        }),
      ),
    ).rejects.toThrow('Temporary save verification failed')
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(currentBytes)
  })

  test('recovers the newest valid Web backup before considering Unity candidates', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', '{')
    storage.files.set('/current.backup.1', 'also invalid')
    storage.files.set(
      '/current.backup.2',
      serializeWebSave({ saveVersion: 12, slot: 'recovered' }),
    )
    storage.files.set('/legacy', 'legacy')
    storage.candidates = [
      { id: 'legacy', sourcePath: '/legacy', text: 'legacy' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12, slot: 'legacy' }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'recovered-backup',
      sourcePath: '/current.backup.2',
    })
    expect(
      (await repository.loadCurrent())?.copyValidatedState().slot,
    ).toBe('recovered')
    expect(storage.copies).toEqual([
      ['/current', '/recovery/original-idb1.txt'],
    ])
    expect(storage.replacements).toEqual([['/current.tmp', '/current']])
  })

  test('does not silently start fresh when every Web backup is invalid', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current.backup.1', 'invalid backup')
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'current-invalid',
    })
    expect(storage.files.has('/current')).toBe(false)
    expect(storage.files.get('/current.backup.1')).toBe('invalid backup')
  })

  test('stops fallback when the current save has a future schema', async () => {
    const storage = new MemoryStorage()
    storage.files.set('/current', serializeWebSave({ saveVersion: 23 }))
    storage.files.set('/legacy', 'good')
    storage.candidates = [
      { id: 'legacy', sourcePath: '/legacy', text: 'good' },
    ]
    const repository = new PortableSaveRepository(
      storage,
      {
        current: '/current',
        temporary: '/current.tmp',
        legacyRecovery: '/recovery/original-idb1.txt',
      },
      () => ({ saveVersion: 12 }),
    )

    await expect(repository.migrateLegacyOnFirstLaunch()).resolves.toMatchObject({
      status: 'unsupported-future-version',
      source: 'current',
    })
    expect(storage.copies).toEqual([])
    expect(storage.replacements).toEqual([])
    expect(storage.files.get('/current')).toBe(serializeWebSave({ saveVersion: 23 }))
  })
})
