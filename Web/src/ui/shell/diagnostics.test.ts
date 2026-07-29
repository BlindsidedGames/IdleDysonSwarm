import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  classifyLocalError,
  createLocalDiagnosticReport,
  formatLocalDiagnosticReport,
  type LocalDiagnosticReport,
  type LocalErrorKind,
} from './diagnostics'

describe('local startup diagnostics', () => {
  it('keeps only allowlisted fields and never copies raw error detail', () => {
    const secret =
      'Bearer top-secret at C:\\Users\\player\\idle-save.txt'
    const error = new TypeError(secret)
    error.stack = `${secret}\nhttps://private.example/save`

    const report = createLocalDiagnosticReport(
      {
        phase: 'render-failure',
        code: 'render-failed',
        buildId: 'release-42',
        hostKind: 'static',
        locale: 'en-AU',
        saveSchemaVersion: 11,
        frontendRevision: 'abc123',
        canonicalRevision: 'def456',
      },
      classifyLocalError(error),
    )
    const formatted = formatLocalDiagnosticReport(report)

    expect(report).toEqual({
      phase: 'render-failure',
      code: 'render-failed',
      buildId: 'release-42',
      hostKind: 'static',
      locale: 'en-AU',
      saveSchemaVersion: 11,
      frontendRevision: 'abc123',
      canonicalRevision: 'def456',
      errorKind: 'TypeError',
    })
    expect(Object.isFrozen(report)).toBe(true)
    expect(formatted).not.toContain(secret)
    expect(formatted).not.toContain('private.example')
    expect(formatted).not.toContain('idle-save.txt')
  })

  it('redacts unsafe tokens and drops unsafe schema values', () => {
    const report = createLocalDiagnosticReport({
      phase: 'error',
      code: 'startup-failed',
      buildId: 'token=secret/path',
      locale: 'en AU',
      saveSchemaVersion: Number.POSITIVE_INFINITY,
    })

    expect(report).toMatchObject({
      buildId: '[redacted]',
      locale: '[redacted]',
    })
    expect(report).not.toHaveProperty('saveSchemaVersion')
    expect(
      createLocalDiagnosticReport(
        {
          phase: 'error',
          code: 'startup-failed',
        },
        'Authorization-secret' as LocalErrorKind,
      ),
    ).toHaveProperty('errorKind', 'Error')
  })

  it('sanitizes structurally forged reports again at the display boundary', () => {
    const forged = {
      phase: 'C:\\private\\save.txt',
      code: 'Bearer-secret',
      buildId: 'https://private.example/token',
      errorKind: 'Authorization-secret',
    } as unknown as LocalDiagnosticReport

    const formatted = formatLocalDiagnosticReport(forged)
    expect(formatted).toContain('"phase": "error"')
    expect(formatted).toContain('"code": "startup-failed"')
    expect(formatted).toContain('"buildId": "[redacted]"')
    expect(formatted).toContain('"errorKind": "Error"')
    expect(formatted).not.toContain('private.example')
    expect(formatted).not.toContain('Authorization-secret')
  })

  it('contains no telemetry or network transport', () => {
    const source = [
      'diagnostics.ts',
      'StartupErrorBoundary.tsx',
    ]
      .map((file) =>
        readFileSync(resolve(import.meta.dirname, file), 'utf8'),
      )
      .join('\n')

    expect(source).not.toMatch(
      /\b(fetch|sendBeacon|XMLHttpRequest|WebSocket)\b/,
    )
  })
})
