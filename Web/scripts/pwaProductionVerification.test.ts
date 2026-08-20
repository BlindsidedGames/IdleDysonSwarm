import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  assertCleanPwaVerificationCandidate,
  assertPwaVerificationCandidateUnchanged,
  PWA_PRODUCTION_VERIFICATION_SCHEMA_VERSION,
  resolvePwaVerificationEvidencePath,
} from './pwaProductionVerification'

describe('PWA production verification candidate', () => {
  test('uses the revision-aware evidence schema', () => {
    expect(PWA_PRODUCTION_VERIFICATION_SCHEMA_VERSION).toBe(2)
  })

  test('accepts only a clean revision-bound candidate', () => {
    expect(() => assertCleanPwaVerificationCandidate({
      revision: 'abc123',
      workingTreeDirty: false,
    })).not.toThrow()
    expect(() => assertCleanPwaVerificationCandidate({
      revision: 'abc123',
      workingTreeDirty: true,
    })).toThrow('requires a clean working tree')
  })

  test('rejects a candidate changed during verification', () => {
    const expected = { revision: 'abc123', workingTreeDirty: false }
    expect(() => assertPwaVerificationCandidateUnchanged(
      expected,
      expected,
    )).not.toThrow()
    expect(() => assertPwaVerificationCandidateUnchanged(expected, {
      revision: 'def456',
      workingTreeDirty: false,
    })).toThrow('changed revision')
    expect(() => assertPwaVerificationCandidateUnchanged(expected, {
      revision: 'abc123',
      workingTreeDirty: true,
    })).toThrow('requires a clean working tree')
  })

  test('confines custom evidence to an ignored JSON path', () => {
    const webRoot = process.cwd()
    expect(resolvePwaVerificationEvidencePath(
      webRoot,
      'output/performance/pwa-candidate.json',
    )).toMatch(/[\\/]output[\\/]performance[\\/]pwa-candidate\.json$/)
    expect(resolvePwaVerificationEvidencePath(webRoot, undefined)).toMatch(
      /[\\/]docs[\\/]archive[\\/]2026-08[\\/]pwa-production-verification-2026-08-19\.json$/,
    )
    for (const invalid of [
      '',
      '   ',
      'package.json',
      '../outside.json',
      'output',
      'output/report.txt',
      'output/../package.json',
      resolve(webRoot, 'output', 'absolute.json'),
    ]) {
      expect(() => resolvePwaVerificationEvidencePath(
        webRoot,
        invalid,
      )).toThrow('PWA verification output')
    }
  })
})
