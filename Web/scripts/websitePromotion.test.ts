import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  mergeManagedHeaders,
  readWebsitePromotionConfig,
  validateWebsitePromotionManifest,
  verifyWebsitePromotionPackage,
  type WebsitePromotionManifest,
} from './websitePromotion'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

const markers = {
  managedHeadersStart: '# BEGIN IDLE DYSON SWARM WEB',
  managedHeadersEnd: '# END IDLE DYSON SWARM WEB',
} as const

describe('website promotion tooling', () => {
  test('adds a route-scoped managed header block without replacing website rules', () => {
    const merged = mergeManagedHeaders(
      '/api/*\n  Cache-Control: no-store\n',
      '/play/*\n  Content-Security-Policy: default-src \'self\'',
      markers,
    )

    expect(merged).toContain('/api/*')
    expect(merged).toContain(markers.managedHeadersStart)
    expect(merged).toContain('/play/*')
    expect(merged).toContain(markers.managedHeadersEnd)
  })

  test('replaces only the prior managed block on a later promotion', () => {
    const first = mergeManagedHeaders('', '/play/*\n  X-Test: old', markers)
    const second = mergeManagedHeaders(first, '/play/*\n  X-Test: new', markers)

    expect(second).not.toContain('X-Test: old')
    expect(second.match(/BEGIN IDLE DYSON SWARM WEB/g)).toHaveLength(1)
    expect(second).toContain('X-Test: new')
  })

  test('rejects a partially damaged managed block', () => {
    expect(() => mergeManagedHeaders(
      `${markers.managedHeadersStart}\n/play/*`,
      '/play/*',
      markers,
    )).toThrow('malformed managed PWA block')
  })

  test('rejects a tampered website header fragment before promotion', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ids-promotion-'))
    temporaryDirectories.push(directory)
    mkdirSync(join(directory, 'play'))
    writeFileSync(join(directory, 'play', 'index.html'), 'shell')
    writeFileSync(
      join(directory, 'website-headers.fragment'),
      '/play/*\n  X-Test: expected\n',
    )
    const manifest = manifestFor()
    writeFileSync(
      join(directory, 'website-headers.fragment'),
      '/play/*\n  X-Test: tampered\n',
    )

    expect(() => verifyWebsitePromotionPackage(
      directory,
      manifest,
    )).toThrow('website-headers.fragment')
  })

  test('rejects promotion metadata that drifts from release configuration', () => {
    const config = readWebsitePromotionConfig(resolve(
      import.meta.dirname,
      '../release/website-promotion.json',
    ))
    const manifest = manifestFor()

    expect(() => validateWebsitePromotionManifest(
      {
        ...manifest,
        canonicalUrl: 'https://example.invalid/play/',
      },
      config,
    )).toThrow('does not match release configuration')
  })
})

function manifestFor(): WebsitePromotionManifest {
  const play = 'shell'
  const headers = '/play/*\n  X-Test: expected\n'
  return {
    schemaVersion: 1,
    releaseId: '2026080201',
    canonicalUrl: 'https://ids.blindsidedgames.com/play/',
    source: {
      repository: 'BlindsidedGames/IdleDysonSwarm',
      commitSha: '1'.repeat(40),
    },
    website: {
      repository: 'BlindsidedGames/BlindsidedGames',
      pinnedCommitSha: '2'.repeat(40),
      baseBranch: 'main',
      destinationDirectory: 'public/play',
    },
    websiteHeaders: {
      path: 'website-headers.fragment',
      bytes: Buffer.byteLength(headers),
      sha256: sha(headers),
    },
    files: [{
      path: 'index.html',
      bytes: Buffer.byteLength(play),
      sha256: sha(play),
    }],
  }
}

function sha(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
