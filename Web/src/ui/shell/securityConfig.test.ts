import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import {
  CONTENT_SECURITY_POLICY,
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
  SECURITY_HEADERS,
} from '../../../securityHeaders'

describe('browser security policy', () => {
  it('denies ambient origins, framing, objects, and unsafe script modes', () => {
    expect(CONTENT_SECURITY_POLICY).toContain(
      "default-src 'self'",
    )
    expect(CONTENT_SECURITY_POLICY).toContain(
      "frame-ancestors 'none'",
    )
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'")
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'none'")
    expect(CONTENT_SECURITY_POLICY).toContain(
      "connect-src 'self'",
    )
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-inline'")
    expect(CONTENT_SECURITY_POLICY).not.toContain("'unsafe-eval'")
    expect(CONTENT_SECURITY_POLICY).not.toMatch(
      /(?:^|[\s;])\*(?:[\s;]|$)/,
    )
  })

  it('emits defense-in-depth browser headers for static hosting', () => {
    expect(SECURITY_HEADERS).toMatchObject({
      'Content-Security-Policy': CONTENT_SECURITY_POLICY,
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    })
    const staticHeaders = renderStaticSecurityHeaders()
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(staticHeaders).toContain(`${name}: ${value}`)
    }
  })

  it('keeps the production HTML CSP strict without weakening development HMR', () => {
    const html = readFileSync(
      resolve(import.meta.dirname, '../../../index.html'),
      'utf8',
    )
    const config = readFileSync(
      resolve(import.meta.dirname, '../../../vite.config.ts'),
      'utf8',
    )
    expect(HTML_CONTENT_SECURITY_POLICY).not.toContain(
      "frame-ancestors 'none'",
    )
    expect(config).toContain('transformIndexHtml()')
    expect(config).toContain('HTML_CONTENT_SECURITY_POLICY')
    expect(config).toContain("injectTo: 'head-prepend'")
    expect(html).not.toContain('Content-Security-Policy')
    expect(html).toContain(
      '<meta name="referrer" content="no-referrer" />',
    )
  })

  it('emits headers during builds and applies them to local preview', () => {
    const config = readFileSync(
      resolve(import.meta.dirname, '../../../vite.config.ts'),
      'utf8',
    )
    expect(config).toContain(
      "name: 'idle-dyson-swarm-security-headers'",
    )
    expect(config).toContain('transformIndexHtml()')
    expect(config).toContain("renderStaticSecurityHeaders('/play/*')")
    expect(config).toContain('preview:')
    expect(config).toContain('headers: SECURITY_HEADERS')
    expect(config).toContain('sourcemap: false')
  })

  it('emits the exact policy and only CSP-compatible assets in a production build', async () => {
    const outputDirectory = mkdtempSync(
      join(tmpdir(), 'idle-dyson-swarm-security-'),
    )
    try {
      await build({
        configLoader: 'runner',
        configFile: resolve(
          import.meta.dirname,
          '../../../vite.config.ts',
        ),
        logLevel: 'silent',
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
        },
      })

      expect(
        readFileSync(
          resolve(outputDirectory, '_headers'),
          'utf8',
        ),
      ).toBe(renderStaticSecurityHeaders('/play/*'))

      const html = readFileSync(
        resolve(outputDirectory, 'index.html'),
        'utf8',
      )
      const document = new JSDOM(html, {
        url: 'http://localhost/',
      }).window.document
      const csp = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      )
      expect(csp?.getAttribute('content')).toBe(
        HTML_CONTENT_SECURITY_POLICY,
      )

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
          document.querySelectorAll<HTMLScriptElement>(
            'script[src]',
          ),
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
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true })
    }
  })
})

describe('startup shell resilient layout', () => {
  it('uses logical properties, RTL-safe alignment, and reduced-motion overrides', () => {
    const styles = readFileSync(
      resolve(import.meta.dirname, 'shell.css'),
      'utf8',
    )
    expect(styles).toContain('inline-size')
    expect(styles).toContain('padding-inline')
    expect(styles).toContain('text-align: start')
    expect(styles).not.toMatch(/\b(margin|padding|border)-(left|right)\b/)
    expect(styles).toContain(
      '@media (prefers-reduced-motion: reduce)',
    )
    expect(styles).toContain('transition-duration: 0ms')
  })
})

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
