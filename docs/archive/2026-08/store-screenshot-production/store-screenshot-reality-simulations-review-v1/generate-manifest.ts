import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const profiles = ['iphone', 'ipad', 'android-phone', 'android-tablet'] as const
const files = ['statistics-current.png', 'reality-decode-the-anomaly.png', 'simulations-rebuild-civilization.png']
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')
const outputs = Object.fromEntries(profiles.map((profile) => [profile, files.map((file) => ({ file: `${profile}/${file}`, sha256: sha(resolve(root, profile, file)) }))]))
const evidence = {
  reality: JSON.parse(readFileSync(resolve(root, 'fixtures/mature-reality-review.json'), 'utf8')),
  simulations: JSON.parse(readFileSync(resolve(root, 'fixtures/populated-simulations-review.json'), 'utf8')),
}
writeFileSync(resolve(root, 'manifest.json'), `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit: '9577c5af2817ae573a3b5fdfd9aab69fcd033c4d',
  sourceBranchObserved: 'codex/skill-preset-independence',
  sourceWorkingTreeDirty: true,
  sourceWorkingTreeDiffSha256: '98e836745f4feaeccf4f0ede86b3852af98b5fcf5734467c197f82200a789af2',
  sourceCheckoutNote: 'The shared checkout already contained unrelated in-progress Skill Preset work while this review was captured. This task did not modify repository files.',
  repositorySourceChanged: false,
  uploaded: false,
  purpose: 'Non-destructive Statistics replacement review only; package v1 is unchanged.',
  candidates: {
    statistics: { headline: 'WATCH THE NUMBERS EXPLODE', source: 'store-screenshot-package-v1 approved current slide' },
    reality: { headline: 'DECODE THE ANOMALY', fixture: 'mature-reality-review', fixtureSha256: evidence.reality.saveSha256 },
    simulations: { headline: 'REBUILD CIVILIZATION', fixture: 'populated-simulations-review', fixtureSha256: evidence.simulations.saveSha256 },
  },
  profiles: {
    iphone: { viewport: '430x932@3', final: '1320x2868' },
    ipad: { viewport: '1024x768@2', final: '2732x2048' },
    'android-phone': { viewport: '470x812@2', final: '1080x1920' },
    'android-tablet': { viewport: '1280x640@1.5', final: '1920x1080' },
  },
  outputs,
  comparisons: Object.fromEntries(profiles.map((profile) => [`comparison-${profile}.png`, sha(resolve(root, `comparison-${profile}.png`))])),
  derivationEvidence: {
    reality: 'fixtures/mature-reality-review.json',
    simulations: 'fixtures/populated-simulations-review.json',
  },
  scripts: ['derive-review-fixtures.ts', 'capture.ts', 'compose.ts', 'generate-manifest.ts', 'qa.ts'],
}, null, 2)}\n`)
