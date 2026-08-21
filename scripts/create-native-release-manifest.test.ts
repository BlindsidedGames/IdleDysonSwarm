import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createNativeReleaseArtifactManifest,
  verifyNativeReleaseArtifactManifest,
} from './create-native-release-manifest'

describe('native release artifact manifest', () => {
  it('writes deterministic checksums without timestamps or credentials', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ids-release-manifest-'))
    const output = resolve(root, 'output')
    const artifact = resolve(output, 'idle-dyson-swarm.zip')
    await mkdir(output)
    await writeFile(artifact, 'release bytes', 'utf8')

    const manifest = await createNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      sourceDateEpoch: 1_785_696_000,
      platform: 'electron-windows',
      securityProfile: 'unsigned',
      outputDirectory: output,
      artifactPaths: [artifact],
    })

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      releaseCandidateId: '2026080301',
      platform: 'electron-windows',
      securityProfile: 'unsigned',
    })
    expect(manifest.artifacts).toEqual([
      {
        file: 'idle-dyson-swarm.zip',
        bytes: 13,
        sha256: 'ff7a5e6429d2c8511521e4abf41cd54a3e525ef4a1f24f8d1c67ede9d17874dd',
      },
    ])
    expect(await readFile(resolve(output, 'SHA256SUMS'), 'utf8')).toBe(
      'ff7a5e6429d2c8511521e4abf41cd54a3e525ef4a1f24f8d1c67ede9d17874dd  idle-dyson-swarm.zip\n',
    )
    const serialized = await readFile(resolve(output, 'manifest.json'), 'utf8')
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('generatedAt')

    await expect(verifyNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      platform: 'electron-windows',
      securityProfile: 'unsigned',
      outputDirectory: output,
      artifactExtension: 'zip',
      exactArtifactCount: 1,
    })).resolves.toEqual(manifest)
  })

  it('fails closed on weak provenance or an empty artifact set', async () => {
    await expect(createNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: 'short-sha',
      sourceDateEpoch: 0,
      platform: 'electron-windows',
      securityProfile: 'unsigned',
      outputDirectory: 'unused',
      artifactPaths: [],
    })).rejects.toThrow('sourceCommit')
  })

  it('rejects artifacts outside the output directory and reserved names', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ids-release-manifest-paths-'))
    const output = resolve(root, 'output')
    const outside = resolve(root, 'outside.ipa')
    await mkdir(output)
    await writeFile(outside, 'outside', 'utf8')
    await writeFile(resolve(output, 'manifest.json'), 'reserved', 'utf8')

    const request = {
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      sourceDateEpoch: 1_785_696_000,
      platform: 'ios',
      securityProfile: 'release-signed' as const,
      outputDirectory: output,
    }
    await expect(createNativeReleaseArtifactManifest({
      ...request,
      artifactPaths: [outside],
    })).rejects.toThrow('directly contained')
    await expect(createNativeReleaseArtifactManifest({
      ...request,
      artifactPaths: [resolve(output, 'manifest.json')],
    })).rejects.toThrow('reserved file name')
  })

  it('fails verification when provenance or artifact bytes change', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ids-release-manifest-verify-'))
    const output = resolve(root, 'output')
    const artifact = resolve(output, 'idle-dyson-swarm.ipa')
    await mkdir(output)
    await writeFile(artifact, 'signed ipa', 'utf8')
    await createNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      sourceDateEpoch: 1_785_696_000,
      platform: 'ios',
      securityProfile: 'release-signed',
      outputDirectory: output,
      artifactPaths: [artifact],
    })

    const verification = {
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      platform: 'ios',
      securityProfile: 'release-signed' as const,
      outputDirectory: output,
      artifactExtension: 'ipa',
      exactArtifactCount: 1,
    }
    await expect(verifyNativeReleaseArtifactManifest({
      ...verification,
      sourceCommit: '1123456789abcdef0123456789abcdef01234567',
    })).rejects.toThrow('sourceCommit')
    await writeFile(artifact, 'tampered ipa', 'utf8')
    await expect(verifyNativeReleaseArtifactManifest(verification))
      .rejects.toThrow('does not match its manifest')
  })

  it('rejects an extra unmanifested IPA in the downloaded directory', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'ids-release-manifest-extra-'))
    const output = resolve(root, 'output')
    const artifact = resolve(output, 'idle-dyson-swarm.ipa')
    await mkdir(output)
    await writeFile(artifact, 'signed ipa', 'utf8')
    await createNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      sourceDateEpoch: 1_785_696_000,
      platform: 'ios',
      securityProfile: 'release-signed',
      outputDirectory: output,
      artifactPaths: [artifact],
    })
    await writeFile(resolve(output, 'unexpected.ipa'), 'not manifested', 'utf8')

    await expect(verifyNativeReleaseArtifactManifest({
      releaseCandidateId: '2026080301',
      sourceCommit: '0123456789abcdef0123456789abcdef01234567',
      platform: 'ios',
      securityProfile: 'release-signed',
      outputDirectory: output,
      artifactExtension: 'ipa',
      exactArtifactCount: 1,
    })).rejects.toThrow('do not exactly match manifest.json')
  })
})
