import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
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
    expect(urls).toContain('/play/bootstrap.css')
    expect(urls).toContain('/play/icons/pwa-icon-512.png')
    expect(
      urls.filter((url) => url === '/play/icons/pwa-icon-512.png'),
    ).toHaveLength(1)
    expect(urls).toContain('/play/audio/ids-soundtrack.m4a')
    expect(urls).toContain('/play/audio/button.ogg')
    expect(urls).toContain('/play/audio/button.wav')
    expect(urls).not.toContain('/play/index.html')
    expect(urls).not.toContain('/play/_headers')
    expect(urls).not.toContain('/play/.vite/manifest.json')
  })

  test('precaches every dependency needed by the static offline startup presentation', () => {
    const bootstrapDocument = new JSDOM(readFileSync(
      resolve(import.meta.dirname, '../index.html'),
      'utf8',
    )).window.document
    const bootstrapDependencies = Array.from(new Set(
      Array.from(
        bootstrapDocument.querySelectorAll<HTMLLinkElement | HTMLImageElement>(
          'link[href], #root img[src]',
        ),
        (element) => element.getAttribute('href') ?? element.getAttribute('src'),
      )
        .filter((url): url is string => url !== null)
        .map((url) => url.startsWith('/play/')
          ? url
          : `/play/${url.replace(/^\/+/, '')}`),
    ))
    const precacheUrls = collectPwaPrecacheUrls(
      {} as Rollup.OutputBundle,
    )
    const source = renderPwaServiceWorker({
      basePath: '/play/',
      cacheVersion: 'offline-bootstrap',
      precacheUrls,
    })

    expect(bootstrapDependencies).toContain('/play/bootstrap.css')
    expect(bootstrapDependencies).toContain('/play/icons/pwa-icon-512.png')
    for (const dependency of bootstrapDependencies) {
      expect(precacheUrls).toContain(dependency)
      expect(source).toContain(JSON.stringify(dependency))
    }
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

  test.each([
    'bootstrap.css',
    'icons/pwa-icon-512.png',
  ])('changes the cache version when %s changes', (changedFileName) => {
    const publicDirectory = resolve(import.meta.dirname, '../public')
    const bundle = {
      'index.html': output('index.html', '<main>same shell</main>'),
      'assets/app.js': output('assets/app.js', 'same app'),
    } as unknown as Rollup.OutputBundle
    const baseline = hashPwaPackage(bundle, publicDirectory)
    const changed = hashPwaPackage(
      bundle,
      publicDirectory,
      (absolutePath) => absolutePath === resolve(publicDirectory, changedFileName)
        ? new TextEncoder().encode('changed public asset')
        : readFileSync(absolutePath),
    )

    expect(changed).not.toBe(baseline)
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
