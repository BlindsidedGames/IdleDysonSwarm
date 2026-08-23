import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import {
  ANDROID_KEY_ALIAS,
  ANDROID_KEYSTORE_PASSWORD_SERVICE,
  ANDROID_KEY_PASSWORD_SERVICE,
  createAndroidSigningEnvironment,
  parseLocalReleaseArguments,
} from './run-local-release'

const repositoryRoot = resolve(import.meta.dirname, '..')
const verificationWorkflowPath = resolve(
  repositoryRoot,
  '.github/workflows/verify-web-native.yml',
)

describe('local-first release workflow', () => {
  it('parses release inputs and rejects incomplete website commit pins', () => {
    expect(parseLocalReleaseArguments([
      '--release-id',
      '2026082402',
      '--website-ref',
      'a'.repeat(40),
      '--clean-install',
    ])).toEqual({
      releaseId: '2026082402',
      websiteRef: 'a'.repeat(40),
      cleanInstall: true,
      androidOnly: false,
    })
    expect(() => parseLocalReleaseArguments([
      '--website-ref',
      'main',
    ])).toThrow('complete 40-character Git commit SHA')
  })

  it('passes signing values to Gradle without command-line secrets', () => {
    const environment = createAndroidSigningEnvironment('store-secret', 'key-secret')
    expect(ANDROID_KEY_ALIAS).toBe('idledysonswarm')
    expect(ANDROID_KEYSTORE_PASSWORD_SERVICE).toContain('keystore-password')
    expect(ANDROID_KEY_PASSWORD_SERVICE).toContain('key-password')
    expect(environment).toMatchObject({
      ORG_GRADLE_PROJECT_IDS_ANDROID_KEYSTORE_PASSWORD: 'store-secret',
      ORG_GRADLE_PROJECT_IDS_ANDROID_KEY_ALIAS: 'idledysonswarm',
      ORG_GRADLE_PROJECT_IDS_ANDROID_KEY_PASSWORD: 'key-secret',
    })
    expect(readFileSync(resolve(repositoryRoot, 'scripts/run-local-release.ts'), 'utf8'))
      .not.toContain('-PIDS_ANDROID_KEYSTORE_PASSWORD')
  })

  it('keeps GitHub verification-only and credential-free', () => {
    const source = readFileSync(verificationWorkflowPath, 'utf8')
    const workflow = parse(source) as {
      readonly on: Record<string, unknown>
      readonly jobs: Record<string, { readonly steps: readonly Record<string, unknown>[] }>
    }
    expect(Object.keys(workflow.on).sort()).toEqual(['pull_request', 'push'])
    expect(source).not.toContain('secrets.')
    expect(source).not.toContain('workflow_dispatch')
    expect(source).not.toContain('bundleRelease')
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        const uses = typeof step.uses === 'string' ? step.uses : undefined
        if (uses !== undefined) expect(uses).toMatch(/@[0-9a-f]{40}$/)
      }
    }
  })

  it('removes GitHub signing, upload, and website-promotion processors', () => {
    expect(existsSync(resolve(
      repositoryRoot,
      '.github/workflows/prepare-native-release-candidate.yml',
    ))).toBe(false)
    expect(existsSync(resolve(
      repositoryRoot,
      '.github/workflows/promote-web-pwa.yml',
    ))).toBe(false)
  })

  it('keeps Android release builds fail-closed without local signing input', () => {
    const source = readFileSync(
      resolve(repositoryRoot, 'hosts/capacitor/android/app/build.gradle'),
      'utf8',
    ).replace(/\s+/g, ' ')
    expect(source).toContain('releaseBuildRequested && !releaseSigningConfigured')
    expect(source).toContain('Release signing was requested')
  })
})
