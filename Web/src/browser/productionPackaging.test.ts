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
  CONTENT_SECURITY_POLICY,
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
} from '../../securityHeaders'

describe('production browser package', () => {
  test('excludes developer artifacts and emits CSP-compatible production assets', async () => {
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
      const document = new JSDOM(html, {
        url: 'http://localhost/',
      }).window.document
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

      const executableResource = html.indexOf('<script')
      const policyPosition = html.indexOf(
        'http-equiv="Content-Security-Policy"',
      )
      expect(policyPosition).toBeGreaterThanOrEqual(0)
      expect(policyPosition).toBeLessThan(executableResource)
      expect(document.querySelector('script:not([src])')).toBeNull()
      expect(document.querySelector('style')).toBeNull()

      const assetReferences = [
        ...Array.from(
          document.querySelectorAll<HTMLScriptElement>('script[src]'),
          (element) => element.src,
        ),
        ...Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel="stylesheet"][href]',
          ),
          (element) => element.href,
        ),
      ]
      expect(assetReferences.length).toBeGreaterThan(0)
      for (const reference of assetReferences) {
        expect(new URL(reference).origin).toBe('http://localhost')
      }

      const cssFiles = readdirSync(
        resolve(outputDirectory, 'assets'),
      ).filter((file) => file.endsWith('.css'))
      expect(cssFiles.length).toBeGreaterThan(0)
      for (const file of cssFiles) {
        const styles = readFileSync(
          resolve(outputDirectory, 'assets', file),
          'utf8',
        )
        const resourceUrls = Array.from(
          styles.matchAll(/url\(([^)]+)\)/g),
          (match) => match[1]?.replaceAll(/["']/g, '').trim() ?? '',
        )
        for (const resourceUrl of resourceUrls) {
          expect(
            resourceUrl.startsWith('data:') ||
              new URL(
                resourceUrl,
                'https://idle-dyson-swarm.invalid',
              ).origin === 'https://idle-dyson-swarm.invalid',
          ).toBe(true)
        }
      }

      const directives = parsePolicy(CONTENT_SECURITY_POLICY)
      expect(directives.get('script-src')).toEqual(["'self'"])
      expect(directives.get('style-src')).toEqual(["'self'"])
      expect(directives.get('font-src')).toEqual(["'self'"])
      expect(directives.get('connect-src')).toEqual(["'self'"])
      expect(directives.get('worker-src')).toEqual(["'self'"])
      expect(directives.get('manifest-src')).toEqual(["'self'"])
      expect(directives.get('img-src')).toEqual([
        "'self'",
        'data:',
      ])

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

function parsePolicy(
  policy: string,
): ReadonlyMap<string, readonly string[]> {
  return new Map(
    policy.split(';').map((directive) => {
      const [name = '', ...values] = directive.trim().split(/\s+/)
      return [name, values] as const
    }),
  )
}
