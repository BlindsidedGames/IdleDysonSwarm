import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  desktopDistributionFromBuildValue,
  MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS,
  resolveReleaseFooter,
} from './releaseFooter'
import {
  resolvePackagedReleaseIdentity,
} from '../../scripts/packaged-release-identity'

const source = Object.freeze({
  marketingVersion: '4.1.5',
  releaseCandidateId: '2026082904',
})

const overriddenNativeSource = resolvePackagedReleaseIdentity({
  schemaVersion: 1,
  marketingVersion: '4.1.5',
  defaultReleaseCandidateId: '2026082904',
  unityBuildFloor: 328,
}, 'native', '2026083007')

describe('release footer presentation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  test('uses mobile metadata that succeeds before the two-second deadline', async () => {
    vi.useFakeTimers()
    const result = resolveReleaseFooter({
      target: 'android',
      developmentBuild: false,
      source,
      metadata: {
        metadata: () => new Promise((resolve) => {
          globalThis.setTimeout(() => resolve({
            hostKind: 'mobile-native',
            applicationId: 'com.blindsidedgames.idledysonswarm',
            applicationVersion: '4.1.6',
            applicationBuild: '2026083001',
            supportsNativeFilesystemMigration: true,
          }), MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS - 1)
        }),
      },
    })

    await vi.advanceTimersByTimeAsync(
      MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS - 1,
    )
    await expect(result).resolves.toEqual({
      platform: 'Android',
      version: '4.1.6',
      build: '2026083001',
    })
  })

  test('continues with packaged metadata at the two-second deadline', async () => {
    vi.useFakeTimers()
    const failures: string[] = []
    const result = resolveReleaseFooter({
      target: 'ios',
      developmentBuild: false,
      source,
      metadata: { metadata: () => new Promise(() => undefined) },
      onMetadataLookupFailure: (failure) => failures.push(failure),
    })
    let settled = false
    void result.then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(
      MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS - 1,
    )
    expect(settled).toBe(false)
    expect(failures).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toEqual({
      platform: 'iOS',
      version: '4.1.5',
      build: '2608.29.04',
    })
    expect(failures).toEqual(['timeout'])
  })

  test('records rejection and formats the checked-in iOS fallback', async () => {
    const failures: string[] = []
    await expect(resolveReleaseFooter({
      target: 'ios',
      developmentBuild: false,
      source,
      metadata: {
        metadata: async () => {
          throw new Error('unavailable')
        },
      },
      onMetadataLookupFailure: (failure) => failures.push(failure),
    })).resolves.toEqual({
      platform: 'iOS',
      version: '4.1.5',
      build: '2608.29.04',
    })
    expect(failures).toEqual(['rejected'])
  })

  test('uses the embedded native override after metadata timeout', async () => {
    vi.useFakeTimers()
    const result = resolveReleaseFooter({
      target: 'android',
      developmentBuild: false,
      source: overriddenNativeSource,
      metadata: { metadata: () => new Promise(() => undefined) },
    })

    await vi.advanceTimersByTimeAsync(
      MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS,
    )
    await expect(result).resolves.toEqual({
      platform: 'Android',
      version: '4.1.5',
      build: '2026083007',
    })
  })

  test('uses the embedded native override after metadata rejection', async () => {
    await expect(resolveReleaseFooter({
      target: 'ios',
      developmentBuild: false,
      source: overriddenNativeSource,
      metadata: {
        metadata: async () => {
          throw new Error('unavailable')
        },
      },
    })).resolves.toEqual({
      platform: 'iOS',
      version: '4.1.5',
      build: '2608.30.07',
    })
  })

  test('ignores metadata that resolves after startup used the fallback', async () => {
    vi.useFakeTimers()
    let resolveMetadata: ((metadata: ReturnType<typeof mobileMetadata>) => void)
      | undefined
    const failures: string[] = []
    const result = resolveReleaseFooter({
      target: 'android',
      developmentBuild: false,
      source,
      metadata: {
        metadata: () => new Promise((resolve) => {
          resolveMetadata = resolve
        }),
      },
      onMetadataLookupFailure: (failure) => failures.push(failure),
    })

    await vi.advanceTimersByTimeAsync(
      MOBILE_RELEASE_METADATA_TIMEOUT_MILLISECONDS,
    )
    await expect(result).resolves.toEqual({
      platform: 'Android',
      version: '4.1.5',
      build: '2026082904',
    })
    resolveMetadata?.(mobileMetadata())
    await Promise.resolve()
    await expect(result).resolves.toEqual({
      platform: 'Android',
      version: '4.1.5',
      build: '2026082904',
    })
    expect(failures).toEqual(['timeout'])
  })
})

function mobileMetadata() {
  return {
    hostKind: 'mobile-native' as const,
    applicationId: 'com.blindsidedgames.idledysonswarm' as const,
    applicationVersion: '4.1.6',
    applicationBuild: '2026083001',
    supportsNativeFilesystemMigration: true,
  }
}

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
