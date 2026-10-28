import { describe, expect, it } from 'vitest'
import {
  renderAndroidReleaseVersion,
  renderAppleReleaseVersion,
  renderElectronReleaseVersion,
  resolveNativeReleaseMetadata,
  type NativeReleaseSource,
} from './sync-native-release'
import { validateReleaseMetadata } from '../hosts/electron/releaseMetadata.mjs'
import {
  resolvePackagedReleaseIdentity,
} from './packaged-release-identity'

const source: NativeReleaseSource = Object.freeze({
  schemaVersion: 1,
  marketingVersion: '4.0.0',
  defaultReleaseCandidateId: '2026080200',
  unityBuildFloor: 328,
})

describe('native release metadata', () => {
  it('maps one release candidate ID to every host format', () => {
    const metadata = resolveNativeReleaseMetadata(source)

    expect(metadata).toEqual({
      marketingVersion: '4.0.0',
      releaseCandidateId: '2026080200',
      androidVersionCode: 2026080200,
      appleBuildNumber: '2608.02.00',
    })
    expect(renderAndroidReleaseVersion(metadata)).toContain(
      'ext.idsReleaseCandidateId = 2026080200',
    )
    expect(renderAppleReleaseVersion(metadata)).toContain(
      'CURRENT_PROJECT_VERSION = 2608.02.00',
    )
    expect(validateReleaseMetadata(
      JSON.parse(renderElectronReleaseVersion(metadata)),
    )).toEqual({
      marketingVersion: '4.0.0',
      releaseCandidateId: '2026080200',
    })
  })

  it('renders an override as one Electron packaging and runtime identity', () => {
    const metadata = resolveNativeReleaseMetadata(source, '2026083007')
    const generated = JSON.parse(renderElectronReleaseVersion(metadata))

    expect(generated).toEqual({
      buildVersion: '2026083007',
      extraMetadata: {
        version: '4.0.0',
        buildVersion: '2026083007',
      },
    })
    expect(validateReleaseMetadata(generated)).toEqual({
      marketingVersion: '4.0.0',
      releaseCandidateId: '2026083007',
    })
  })

  it('embeds the effective override only in native renderer bundles', () => {
    expect(resolvePackagedReleaseIdentity(
      source,
      'native',
      '2026083007',
    )).toEqual({
      marketingVersion: '4.0.0',
      releaseCandidateId: '2026083007',
    })
    expect(resolvePackagedReleaseIdentity(
      source,
      'production',
      '2026083007',
    )).toEqual({
      marketingVersion: '4.0.0',
      releaseCandidateId: '2026080200',
    })
  })

  it.each([
    '328',
    '202608020',
    '2026023000',
    '2200010100',
    'not-a-build',
  ])('rejects unsafe release candidate ID %s', (candidate) => {
    expect(() => resolveNativeReleaseMetadata(source, candidate)).toThrow()
  })
})
