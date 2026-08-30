import { describe, expect, test } from 'vitest'
import { resolveReleaseFooter } from './releaseFooter'

const source = Object.freeze({
  marketingVersion: '4.1.5',
  releaseCandidateId: '2026082904',
})

describe('release footer presentation', () => {
  test('labels local browser builds as Dev', async () => {
    await expect(resolveReleaseFooter({
      target: 'browser',
      developmentBuild: true,
      source,
    })).resolves.toEqual({
      platform: 'Dev',
      version: '4.1.5',
      build: 'local',
    })
  })

  test('labels production browser builds as Website', async () => {
    await expect(resolveReleaseFooter({
      target: 'browser',
      developmentBuild: false,
      source,
    })).resolves.toEqual({
      platform: 'Website',
      version: '4.1.5',
      build: '2026082904',
    })
  })

  test.each([
    ['android', 'Android', '2026083001'],
    ['ios', 'iOS', '2608.30.01'],
    ['electron', 'Steam', '2026083001'],
  ] as const)(
    'uses installed %s package metadata',
    async (target, platform, build) => {
      await expect(resolveReleaseFooter({
        target,
        developmentBuild: false,
        source,
        metadata: {
          metadata: async () => ({
            hostKind: target === 'electron'
              ? 'desktop-native'
              : 'mobile-native',
            applicationId: 'com.blindsidedgames.idledysonswarm',
            applicationVersion: '4.1.6',
            applicationBuild: build,
            supportsNativeFilesystemMigration: true,
          }),
        },
      })).resolves.toEqual({
        platform,
        version: '4.1.6',
        build,
      })
    },
  )

  test('formats the checked-in iOS fallback without blocking startup', async () => {
    await expect(resolveReleaseFooter({
      target: 'ios',
      developmentBuild: false,
      source,
      metadata: {
        metadata: async () => {
          throw new Error('unavailable')
        },
      },
    })).resolves.toEqual({
      platform: 'iOS',
      version: '4.1.5',
      build: '2608.29.04',
    })
  })
})
