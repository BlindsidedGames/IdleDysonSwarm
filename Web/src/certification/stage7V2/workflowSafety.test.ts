import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const workflowPath = resolve(
  import.meta.dirname,
  '../../../../.github/workflows/stage7-device-certification.yml',
)

const forbidden = Object.freeze([
  'prepare-native-release-candidate',
  'promote-web-pwa',
  'wrangler',
  'itmstransporter',
  'fastlane',
  'testflight',
  'app store connect',
  'play console',
  'private-upload',
  'signed-packages',
  'bundlerelease',
  'assemblerelease',
  'secrets.',
] as const)

function assertCertificationWorkflowSafe(source: string): void {
  const normalized = source.toLowerCase()
  expect(normalized).toContain('permissions:\n  contents: read')
  expect(normalized).toContain('code_signing_allowed=no')
  for (const token of forbidden) expect(normalized).not.toContain(token)
  expect(normalized).not.toMatch(/^\s*environment:/mu)
}

describe('Stage 7 workflow release boundary', () => {
  test('permits only unsigned CI certification and read-only repository access', () => {
    assertCertificationWorkflowSafe(readFileSync(workflowPath, 'utf8'))
  })

  test.each(forbidden)('rejects forbidden release capability %s', (token) => {
    expect(() => assertCertificationWorkflowSafe([
      'permissions:',
      '  contents: read',
      'jobs:',
      '  ios:',
      '    steps:',
      '      - run: CODE_SIGNING_ALLOWED=NO true',
      `      - run: ${token}`,
    ].join('\n'))).toThrow()
  })

  test('rejects a protected environment', () => {
    expect(() => assertCertificationWorkflowSafe([
      'permissions:',
      '  contents: read',
      'jobs:',
      '  ios:',
      '    environment: native-release-signing',
      '    steps:',
      '      - run: CODE_SIGNING_ALLOWED=NO true',
    ].join('\n'))).toThrow()
  })
})
