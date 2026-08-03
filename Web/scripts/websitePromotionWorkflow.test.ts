import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, test } from 'vitest'

interface WorkflowStep {
  readonly name?: string
  readonly uses?: string
  readonly run?: string
  readonly with?: Record<string, unknown>
}

describe('website promotion workflow', () => {
  test('keeps untrusted dispatch inputs out of shell source and retains the pinned package', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '../../.github/workflows/promote-web-pwa.yml'),
      'utf8',
    )
    const workflow = parse(source) as {
      readonly jobs: {
        readonly 'website-pull-request': {
          readonly env: Record<string, string>
          readonly steps: readonly WorkflowStep[]
        }
      }
    }
    const job = workflow.jobs['website-pull-request']
    const shellSource = job.steps
      .map((step) => step.run ?? '')
      .join('\n')

    expect(job.env).toMatchObject({
      RELEASE_ID: '${{ inputs.release_id }}',
      WEBSITE_REF: '${{ inputs.website_ref }}',
    })
    expect(shellSource).not.toContain('${{ inputs.')
    expect(shellSource).toContain('[[ "$RELEASE_ID" =~ ^[0-9]{10}$ ]]')
    expect(shellSource).toContain('[[ "$WEBSITE_REF" =~ ^[0-9a-fA-F]{40}$ ]]')

    const upload = job.steps.find(
      (step) => step.name === 'Retain the pinned promotion package',
    )
    expect(upload).toMatchObject({
      uses: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
      with: {
        path: '${{ steps.package.outputs.path }}',
        'if-no-files-found': 'error',
        'retention-days': 1,
      },
    })
    expect(shellSource).not.toMatch(/\b(?:deploy|merge)\b/)
  })
})
