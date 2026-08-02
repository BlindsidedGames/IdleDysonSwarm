import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

interface WorkflowJob {
  readonly name?: string
  readonly if?: string
  readonly needs?: string | readonly string[]
  readonly environment?: string
  readonly 'runs-on': string
  readonly steps: readonly Record<string, unknown>[]
}

interface ReleaseWorkflow {
  readonly on: Record<string, unknown>
  readonly permissions: Record<string, string>
  readonly jobs: Record<string, WorkflowJob>
}

const repositoryRoot = resolve(import.meta.dirname, '../..')
const workflowPath = resolve(
  repositoryRoot,
  '.github/workflows/prepare-native-release-candidate.yml',
)
const verificationWorkflowPath = resolve(
  repositoryRoot,
  '.github/workflows/verify-web-native.yml',
)

describe('protected native release-candidate workflow', () => {
  it('is manual-only and defaults to package-only behavior', async () => {
    const workflow = await loadWorkflow()

    expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch'])
    const dispatch = workflow.on.workflow_dispatch as {
      readonly inputs: Record<string, Record<string, unknown>>
    }
    expect(dispatch.inputs.mode.default).toBe('package-only')
    expect(dispatch.inputs.mode.options).toEqual([
      'package-only',
      'signed-packages',
      'private-upload',
    ])
    expect(dispatch.inputs.confirm_private_upload.default).toBe(false)
    expect(dispatch.inputs.private_upload_destination.options).toEqual([
      'testflight',
    ])
    expect(workflow.permissions).toEqual({ contents: 'read', actions: 'read' })
  })

  it('uses only standard GitHub-hosted runners and one-day artifacts', async () => {
    const workflow = await loadWorkflow()
    const source = await readFile(workflowPath, 'utf8')
    const allowedRunners = new Set([
      'ubuntu-latest',
      'windows-latest',
      'macos-latest',
      '${{ matrix.runner }}',
    ])
    for (const job of Object.values(workflow.jobs)) {
      expect(allowedRunners).toContain(job['runs-on'])
      for (const step of job.steps) {
        const uses = typeof step.uses === 'string' ? step.uses : undefined
        if (uses !== undefined) {
          expect(uses).toMatch(/@[0-9a-f]{40}$/)
        }
        if (uses?.startsWith('actions/upload-artifact@')) {
          expect(step.with).toMatchObject({ 'retention-days': 1 })
        }
      }
    }
    expect(source).not.toMatch(/(?:4core|8core|16core|larger-runner|self-hosted)/i)
  })

  it('keeps Android wrappers executable and macOS packaging compatible with Bash 3.2', async () => {
    const [releaseSource, verificationSource] = await Promise.all([
      readFile(workflowPath, 'utf8'),
      readFile(verificationWorkflowPath, 'utf8'),
    ])

    expect(releaseSource.match(/chmod \+x hosts\/capacitor\/android\/gradlew/g)).toHaveLength(2)
    expect(verificationSource).toContain('chmod +x gradlew')
    expect(releaseSource).not.toContain('mapfile')
    expect(releaseSource).toContain('while IFS= read -r artifact; do')
  })

  it('keeps package jobs credential-free and protects every authority job', async () => {
    const workflow = await loadWorkflow()
    const source = await readFile(workflowPath, 'utf8')
    const packageJobs = [
      'web-package',
      'electron-package',
      'android-package',
      'ios-package',
    ]
    for (const id of packageJobs) {
      const jobSource = JSON.stringify(workflow.jobs[id])
      expect(workflow.jobs[id]?.environment).toBeUndefined()
      expect(jobSource).not.toContain('secrets.')
      expect(jobSource).toContain('create-native-release-manifest.ts')
    }

    for (const id of ['android-sign', 'ios-sign', 'macos-sign']) {
      expect(workflow.jobs[id]?.environment).toBe('native-release-signing')
    }
    expect(workflow.jobs['android-sign']?.if).toContain(
      "inputs.mode == 'signed-packages'",
    )
    expect(workflow.jobs['ios-sign']?.if).toContain(
      "inputs.mode != 'package-only'",
    )
    expect(workflow.jobs['macos-sign']?.if).toContain(
      "inputs.mode == 'signed-packages'",
    )
    expect(workflow.jobs['authorize-private-upload']?.environment).toBe(
      'private-release-uploads',
    )
    expect(workflow.jobs['testflight-upload']?.environment).toBe(
      'app-store-testflight',
    )
    expect(workflow.jobs['play-internal-upload']).toBeUndefined()
    expect(workflow.jobs['steam-private-beta-upload']).toBeUndefined()
    expect(workflow.jobs['testflight-upload']?.if).toContain(
      "inputs.private_upload_destination == 'testflight'",
    )
    expect(source).not.toContain('environment: production')
  })

  it('prepares dependencies before exposing protected signing material', async () => {
    const workflow = await loadWorkflow()
    const source = await readFile(workflowPath, 'utf8')

    for (const [jobId, preparationName, authorityName] of [
      ['android-sign', 'Prepare Android dependencies and native source without credentials', 'Reconstruct and verify protected Android signing identity'],
      ['ios-sign', 'Prepare iOS dependencies and native source without credentials', 'Install ephemeral signing identity'],
      ['macos-sign', 'Prepare macOS dependencies and Web runtime without credentials', 'Build signed and notarized macOS package'],
    ] as const) {
      const steps = workflow.jobs[jobId]?.steps ?? []
      const preparationIndex = steps.findIndex((step) => step.name === preparationName)
      const authorityIndex = steps.findIndex((step) => step.name === authorityName)
      expect(preparationIndex).toBeGreaterThan(-1)
      expect(authorityIndex).toBeGreaterThan(preparationIndex)
      expect(JSON.stringify(steps[preparationIndex])).toContain('npm ci')
      expect(JSON.stringify(steps[preparationIndex])).not.toContain('secrets.')
      expect(JSON.stringify(steps.slice(authorityIndex))).not.toContain('npm ci')
    }

    expect(source).toContain('IDS_ANDROID_KEYSTORE_BASE64')
    expect(source).toContain('IDS_ANDROID_KEYSTORE_CERT_SHA256')
    expect(source).toContain('keytool -list -v')
    expect(source).toContain('$RUNNER_TEMP/ids-upload.keystore')
    expect(source).not.toContain(
      '${{ github.workspace }}/Assets/KeyStore/idledysonswarm.keystore',
    )
  })

  it('verifies exactly one signed IPA before exposing upload credentials', async () => {
    const workflow = await loadWorkflow()
    const steps = workflow.jobs['testflight-upload']?.steps ?? []
    const verifyIndex = steps.findIndex(
      (step) => step.name === 'Verify exact signed iOS artifact provenance',
    )
    const credentialsIndex = steps.findIndex(
      (step) => step.name === 'Require protected App Store Connect inputs',
    )
    expect(verifyIndex).toBeGreaterThan(-1)
    expect(credentialsIndex).toBeGreaterThan(verifyIndex)
    const verification = JSON.stringify(steps[verifyIndex])
    expect(verification).toContain('--verify true')
    expect(verification).toContain('--source-sha')
    expect(verification).toContain('--release-id')
    expect(verification).toContain('--security-profile release-signed')
    expect(verification).toContain('--artifact-extension ipa')
    expect(verification).toContain('--exact-artifact-count 1')
    expect(verification).not.toContain('secrets.')
  })

  it('requires explicit unsigned Android intent while normal release builds fail closed', async () => {
    const [workflowSource, gradleSource] = await Promise.all([
      readFile(workflowPath, 'utf8'),
      readFile(
        resolve(
          repositoryRoot,
          'Web/hosts/capacitor/android/app/build.gradle',
        ),
        'utf8',
      ),
    ])

    expect(workflowSource).toContain('-PIDS_ALLOW_UNSIGNED_RELEASE=true')
    expect(gradleSource).toContain('unsignedReleaseExplicitlyAllowed')
    const normalizedGradle = gradleSource.replace(/\s+/g, ' ')
    expect(normalizedGradle).toContain(
      'releaseBuildRequested && !releaseSigningConfigured && !unsignedReleaseExplicitlyAllowed',
    )
    expect(gradleSource).toContain('Release signing was requested')
  })
})

async function loadWorkflow(): Promise<ReleaseWorkflow> {
  return parse(await readFile(workflowPath, 'utf8')) as ReleaseWorkflow
}
