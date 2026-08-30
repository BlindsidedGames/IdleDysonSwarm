import { describe, expect, test } from 'vitest'
import {
  desktopDistributionFromBuildValue,
  resolveReleaseFooter,
} from './releaseFooter'

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
  ] as const)(
    'uses installed %s package metadata',
    async (target, platform, build) => {
      await expect(resolveReleaseFooter({
        target,
        developmentBuild: false,
        source,
        metadata: {
          metadata: async () => ({
            hostKind: 'mobile-native',
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

  test('labels local Electron development as Dev', async () => {
    await expect(resolveReleaseFooter({
      target: 'electron',
      developmentBuild: true,
      source,
      metadata: desktopMetadata(),
    })).resolves.toEqual({
      platform: 'Dev',
      version: '4.1.5',
      build: 'local',
    })
  })

  test('labels generic production Electron packages as Desktop', async () => {
    await expect(resolveReleaseFooter({
      target: 'electron',
      developmentBuild: false,
      source,
      metadata: desktopMetadata(),
      desktopDistribution: desktopDistributionFromBuildValue(undefined),
    })).resolves.toEqual({
      platform: 'Desktop',
      version: '4.1.6',
      build: '2026083001',
    })
  })

  test('labels Electron as Steam only for an explicit Steam build', async () => {
    await expect(resolveReleaseFooter({
      target: 'electron',
      developmentBuild: false,
      source,
      metadata: desktopMetadata(),
      desktopDistribution: desktopDistributionFromBuildValue('steam'),
    })).resolves.toEqual({
      platform: 'Steam',
      version: '4.1.6',
      build: '2026083001',
    })
  })

  test('rejects invalid desktop distribution build values', () => {
    expect(() => desktopDistributionFromBuildValue('store'))
      .toThrow('Desktop distribution must be desktop or steam.')
  })

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

function desktopMetadata() {
  return {
    metadata: async () => ({
      hostKind: 'desktop-native' as const,
      applicationId: 'com.blindsidedgames.idledysonswarm' as const,
      applicationVersion: '4.1.6',
      applicationBuild: '2026083001',
      supportsNativeFilesystemMigration: true,
    }),
  }
}
