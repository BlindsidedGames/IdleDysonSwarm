import { describe, expect, test, vi } from 'vitest'
import { PreparedSave } from './prepare'
import type {
  FirstLaunchMigrationResult,
  SaveCommitTarget,
  SaveRepository,
} from './repository'
import { RepositoryStartupSaveResolver } from './startupResolver'

function repositoryFor(
  result: FirstLaunchMigrationResult,
  committedSave?: PreparedSave,
): SaveRepository & { commit: ReturnType<typeof vi.fn> } {
  return {
    loadCurrent: vi.fn(),
    migrateLegacyOnFirstLaunch: vi.fn().mockResolvedValue(result),
    commit: vi
      .fn()
      .mockResolvedValue(committedSave ?? PreparedSave.fromDecoded({
        saveVersion: 12,
      })),
  }
}

describe('repository startup-save resolver', () => {
  test('publishes a healthy primary without rewriting it', async () => {
    const seeded = PreparedSave.fromDecoded({ saveVersion: 12 })
    const primary = PreparedSave.fromDecoded(seeded.copyValidatedState())
    const repository = repositoryFor({
      status: 'already-migrated',
      save: primary,
    })
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'ready',
      source: 'primary',
      save: primary,
    })
    expect(repository.commit).not.toHaveBeenCalled()
  })

  test.each([
    PreparedSave.fromDecoded({ saveVersion: 8 }),
    PreparedSave.fromDecoded({ saveVersion: 12, offlineTime: -1 }),
  ])('commits a migrated or repaired primary before ready', async (primary) => {
    const committed = PreparedSave.fromDecoded({
      saveVersion: 12,
      checkpointMarker: 'verified',
    })
    const repository = repositoryFor(
      { status: 'already-migrated', save: primary },
      committed,
    )
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
      'development',
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'ready',
      source: 'primary',
      save: committed,
    })
    expect(repository.commit).toHaveBeenCalledWith(primary, 'development')
  })

  test('returns a migrated legacy save only after the repository commit', async () => {
    const { prepared, migration } = PreparedSave.prepareDecoded({
      saveVersion: 8,
    })
    const repository = repositoryFor({
      status: 'migrated',
      source: { id: 'legacy', sourcePath: '/legacy', text: 'legacy' },
      migration,
      save: prepared,
    })
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'ready',
      source: 'recovered-legacy',
      save: prepared,
    })
    expect(repository.commit).not.toHaveBeenCalled()
  })

  test('identifies verified Web-backup recovery to the presentation layer', async () => {
    const recovered = PreparedSave.fromDecoded({
      saveVersion: 12,
      checkpointMarker: 'backup',
    })
    const repository = repositoryFor({
      status: 'recovered-backup',
      sourcePath: '/current.backup.1',
      save: recovered,
    })
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'ready',
      source: 'recovered-canonical',
      save: recovered,
    })
  })

  test('returns first-run only for the no-artifact repository outcome', async () => {
    const firstRun = PreparedSave.fromDecoded({
      saveVersion: 12,
      checkpointMarker: 'first-run',
    })
    const repository = repositoryFor({ status: 'no-legacy-save' })
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => firstRun,
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'first-run',
      save: firstRun,
    })
  })

  test.each([
    {
      result: {
        status: 'unsupported-future-version',
        source: 'current',
        error: 'future',
      } satisfies FirstLaunchMigrationResult,
      reason: 'unsupported-future-version',
    },
    {
      result: {
        status: 'current-invalid',
        error: 'invalid',
      } satisfies FirstLaunchMigrationResult,
      reason: 'all-candidates-invalid',
    },
    {
      result: {
        status: 'recovery-write-failed',
        source: { id: 'legacy', sourcePath: '/legacy', text: 'legacy' },
        error: 'write failed',
      } satisfies FirstLaunchMigrationResult,
      reason: 'recovery-write-failed',
    },
    {
      result: {
        status: 'recovery-write-failed',
        source: {
          id: 'web-backup',
          sourcePath: '/current.backup.1',
        },
        error: 'backup publication failed',
      } satisfies FirstLaunchMigrationResult,
      reason: 'recovery-write-failed',
    },
  ] as const)('maps $reason to a blocking outcome', async ({ result, reason }) => {
    const resolver = new RepositoryStartupSaveResolver(
      repositoryFor(result),
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
    )

    await expect(resolver.resolve()).resolves.toMatchObject({
      kind: 'blocked',
      reason,
    })
  })

  test('blocks when the repaired-primary commit fails', async () => {
    const primary = PreparedSave.fromDecoded({
      saveVersion: 12,
      offlineTime: -1,
    })
    const repository = repositoryFor({
      status: 'already-migrated',
      save: primary,
    })
    repository.commit.mockRejectedValue(new Error('atomic replace failed'))
    const resolver = new RepositoryStartupSaveResolver(
      repository,
      () => PreparedSave.fromDecoded({ saveVersion: 12 }),
      'canonical-player' satisfies SaveCommitTarget,
    )

    await expect(resolver.resolve()).resolves.toEqual({
      kind: 'blocked',
      reason: 'recovery-write-failed',
      error: 'atomic replace failed',
    })
  })
})
