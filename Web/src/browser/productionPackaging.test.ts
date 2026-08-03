import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
} from '../../securityHeaders'

describe('production browser package', () => {
  test('excludes developer fixtures and source maps while retaining the exact CSP', async () => {
    const outputDirectory = mkdtempSync(
      join(tmpdir(), 'idle-dyson-swarm-package-'),
    )
    try {
      await build({
        configLoader: 'runner',
        configFile: resolve(
          import.meta.dirname,
          '../../vite.config.ts',
        ),
        logLevel: 'silent',
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
        },
      })

      const outputFiles = listFiles(outputDirectory)
      const outputRelativePaths = outputFiles.map((file) =>
        relative(outputDirectory, file).replaceAll('\\', '/'),
      )
      const developerFixtureRoots = [
        resolve(import.meta.dirname, '../../test/fixtures'),
        resolve(import.meta.dirname, '../../test/parity'),
        resolve(import.meta.dirname, '../parity'),
      ]
      const developerFixtureFiles =
        developerFixtureRoots.flatMap(listFiles)
      const outputText = outputFiles
        .filter((file) =>
          /\.(?:css|html|js|json|txt|webmanifest)$/.test(file),
        )
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n')

      expect(outputRelativePaths).not.toEqual([])
      expect(
        outputRelativePaths.some((file) =>
          /(?:^|\/)(?:fixtures?|parity)(?:\/|$)/i.test(file),
        ),
      ).toBe(false)
      expect(
        outputRelativePaths.some((file) => file.endsWith('.map')),
      ).toBe(false)
      expect(
        outputRelativePaths.some((file) => /\.test\.[cm]?[jt]sx?$/.test(file)),
      ).toBe(false)
      for (const fixtureFile of developerFixtureFiles) {
        expect(
          outputFiles.some(
            (file) => basename(file) === basename(fixtureFile),
          ),
        ).toBe(false)
        const fixturePrefix = readFileSync(fixtureFile, 'utf8').slice(
          0,
          512,
        )
        expect(outputText).not.toContain(fixturePrefix)
      }
      for (const marker of [
        '"sourcePath": "test/fixtures/',
        "'unity-golden-master' | 'save-characterization'",
        'The executor is intentionally injected',
      ]) {
        expect(outputText).not.toContain(marker)
      }

      expect(
        readFileSync(resolve(outputDirectory, '_headers'), 'utf8'),
      ).toBe(renderStaticSecurityHeaders('/play/*'))
      const html = readFileSync(
        resolve(outputDirectory, 'index.html'),
        'utf8',
      )
      const document = new JSDOM(html).window.document
      expect(
        document
          .querySelector(
            'meta[http-equiv="Content-Security-Policy"]',
          )
          ?.getAttribute('content'),
      ).toBe(HTML_CONTENT_SECURITY_POLICY)
      expect(
        document.querySelector('link[rel="manifest"]')
          ?.getAttribute('href'),
      ).toBe('/play/manifest.webmanifest')
      expect(
        document.querySelector('script[type="module"]')
          ?.getAttribute('src'),
      ).toMatch(/^\/play\/assets\/.+\.js$/)

      const pwaManifest = JSON.parse(readFileSync(
        resolve(outputDirectory, 'manifest.webmanifest'),
        'utf8',
      )) as {
        start_url: string
        scope: string
        display: string
        icons: readonly { src: string; sizes: string; purpose: string }[]
      }
      expect(pwaManifest).toMatchObject({
        start_url: '/play/',
        scope: '/play/',
        display: 'standalone',
      })
      expect(pwaManifest.icons).toEqual(expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]))
      for (const icon of pwaManifest.icons) {
        expect(icon.src.startsWith('/play/icons/')).toBe(true)
        expect(
          statSync(resolve(
            outputDirectory,
            icon.src.slice('/play/'.length),
          )).size,
        ).toBeGreaterThan(0)
      }

      const serviceWorker = readFileSync(
        resolve(outputDirectory, 'service-worker.js'),
        'utf8',
      )
      expect(serviceWorker).toContain('const SCOPE_PATH = "/play/"')
      expect(serviceWorker).toContain('fetch(request).catch')
      expect(serviceWorker).toContain('caches.match(APP_SHELL_URL)')
      expect(serviceWorker).toContain("event.data?.type === 'ACTIVATE_UPDATE'")
      expect(serviceWorker).not.toContain('caches.put')
      expect(serviceWorker).not.toMatch(/indexedDB|IDSWEB1|localStorage/)
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true })
    }
  })
})

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}
