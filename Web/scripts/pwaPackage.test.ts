import { describe, expect, test } from 'vitest'
import { resolve } from 'node:path'
import type { Rollup } from 'vite'
import {
  assertPwaBasePath,
  assertPwaAudioPackageBudget,
  collectPwaPrecacheUrls,
  hashPwaPackage,
  renderPwaServiceWorker,
  PWA_AUDIO_PACKAGE_BUDGET_BYTES,
} from './pwaPackage'

describe('PWA build package', () => {
  test('keeps the explicit offline audio payload within its package budget', () => {
    const bytes = assertPwaAudioPackageBudget(resolve(import.meta.dirname, '../public'))
    expect(bytes).toBe(6_775_358)
    expect(bytes).toBeLessThanOrEqual(PWA_AUDIO_PACKAGE_BUDGET_BYTES)
  })
  test('pins the player package to the canonical /play/ base path', () => {
    expect(() => assertPwaBasePath('/play/')).not.toThrow()
    expect(() => assertPwaBasePath('/')).toThrow(
      'must be built at /play/',
    )
  })

  test('precaches emitted player assets without build metadata or headers', () => {
    const urls = collectPwaPrecacheUrls({
      'assets/app-123.js': output('assets/app-123.js'),
      'assets/app-123.css': output('assets/app-123.css'),
      'index.html': output('index.html'),
      '_headers': output('_headers'),
      '.vite/manifest.json': output('.vite/manifest.json'),
    } as unknown as Rollup.OutputBundle)

    expect(urls).toContain('/play/')
    expect(urls).toContain('/play/assets/app-123.js')
    expect(urls).toContain('/play/icons/pwa-icon-512.png')
    expect(urls).toContain('/play/audio/ids-soundtrack.m4a')
    expect(urls).toContain('/play/audio/button.ogg')
    expect(urls).toContain('/play/audio/button.wav')
    expect(urls).not.toContain('/play/index.html')
    expect(urls).not.toContain('/play/_headers')
    expect(urls).not.toContain('/play/.vite/manifest.json')
  })

  test('renders network-first navigation, a cached offline shell and explicit activation', () => {
    const source = renderPwaServiceWorker({
      basePath: '/play/',
      cacheVersion: 'release-42',
      precacheUrls: ['/play/', '/play/assets/app-123.js'],
    })

    expect(source).toContain("request.mode === 'navigate'")
    expect(source).toContain('fetch(request).catch')
    expect(source).toContain('caches.match(APP_SHELL_URL)')
    expect(source).toContain("event.data?.type === 'ACTIVATE_UPDATE'")
    expect(source).toContain('self.skipWaiting()')
    expect(source).toContain(
      "key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME",
    )
    expect(source).toContain('caches.delete(key)')
    expect(source).toContain('self.clients.claim()')
    expect(source).not.toContain('caches.put')
    expect(source).not.toMatch(/indexedDB|IDSWEB1|localStorage/)
  })

  test('changes the cache version when the generated application shell changes', () => {
    const publicDirectory = resolve(import.meta.dirname, '../public')
    const first = {
      'index.html': output('index.html', '<main>first</main>'),
      'assets/app.js': output('assets/app.js', 'same-app'),
    } as unknown as Rollup.OutputBundle
    const second = {
      'index.html': output('index.html', '<main>second</main>'),
      'assets/app.js': output('assets/app.js', 'same-app'),
    } as unknown as Rollup.OutputBundle

    expect(hashPwaPackage(first, publicDirectory)).not.toBe(
      hashPwaPackage(second, publicDirectory),
    )
  })
})

function output(fileName: string, source = '') {
  return {
    type: 'asset',
    fileName,
    names: [],
    originalFileNames: [],
    needsCodeReference: false,
    source,
  }
}
