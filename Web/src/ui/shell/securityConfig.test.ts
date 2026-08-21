import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
    expect(html).toContain(
      'content="width=device-width, initial-scale=1.0, viewport-fit=cover"',
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
