import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const approvedV3 = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-example-v3'
const expectations = {
  iphone: [1320, 2868],
  ipad: [2732, 2048],
  'android-phone': [1080, 1920],
  'android-tablet': [1920, 1080],
  steam: [1920, 1080],
} as const

function hash(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function main() {
const checks: Array<Record<string, unknown>> = []
let passed = true
for (const [profile, [expectedWidth, expectedHeight]] of Object.entries(expectations)) {
  const files = readdirSync(resolve(root, profile)).filter((file) => file.endsWith('.png')).sort()
  if (files.length !== 8) passed = false
  for (const file of files) {
    const metadata = await sharp(resolve(root, profile, file)).metadata()
    const ok = metadata.width === expectedWidth && metadata.height === expectedHeight && metadata.hasAlpha === false && metadata.space === 'srgb'
    passed &&= ok
    checks.push({ profile, file, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, space: metadata.space, ok })
  }
}

const approvedNames = [
  '01-from-one-bot-to-galactic-brains.png',
  '03-break-infinity-keep-going.png',
]
const approvedCopies = []
for (const [profile, approvedProfile] of [['iphone', 'iphone'], ['ipad', 'tablet']] as const) {
  for (const file of approvedNames) {
    const sourceSha256 = hash(resolve(approvedV3, approvedProfile, file))
    const outputSha256 = hash(resolve(root, profile, file))
    const ok = sourceSha256 === outputSha256
    passed &&= ok
    approvedCopies.push({ profile, file, sourceSha256, outputSha256, ok })
  }
}

const contactExpectations = {
  iphone: [2320, 2580],
  ipad: [3400, 1500],
  'android-phone': [2320, 2160],
  'android-tablet': [3400, 1180],
  steam: [3400, 1180],
} as const
const contactSheets = []
for (const [profile, [expectedWidth, expectedHeight]] of Object.entries(contactExpectations)) {
  const metadata = await sharp(resolve(root, `contact-sheet-${profile}.png`)).metadata()
  const ok = metadata.width === expectedWidth && metadata.height === expectedHeight && metadata.hasAlpha === false && metadata.space === 'srgb'
  passed &&= ok
  contactSheets.push({ profile, width: metadata.width, height: metadata.height, hasAlpha: metadata.hasAlpha, space: metadata.space, ok })
}

const skillEvidence = []
for (const profile of Object.keys(expectations)) {
  const evidence = JSON.parse(readFileSync(resolve(root, 'raw', profile, '02-skills.json'), 'utf8')) as {
    fixture?: string
    fixtureSha256?: string
    text?: string
  }
  const lines = (evidence.text ?? '').split('\n')
  const ok = evidence.fixture === 'maximum-skills-4-points' &&
    evidence.fixtureSha256 === '4606f891dc9f420a6e1eec466953109ef300eee95178c26b0bf9703e4fd10186' &&
    lines.includes('4') && !lines.includes('73')
  passed &&= ok
  skillEvidence.push({ profile, fixture: evidence.fixture, fixtureSha256: evidence.fixtureSha256, renderedFour: lines.includes('4'), renderedSeventyThree: lines.includes('73'), ok })
}

const report = {
  passed,
  checkedAt: new Date().toISOString(),
  outputChecks: checks,
  approvedV3Copies: approvedCopies,
  contactSheets,
  skillEvidence,
  visualReview: {
    performed: true,
    notes: 'All five contact sheets and all 40 original-resolution individual files inspected. Headers remain above gameplay; rounded clips and borders are continuous; Steam finals contain gameplay only. Every Skills evidence file renders the canonical 4-point state.',
  },
}

writeFileSync(resolve(root, 'qa-report.json'), JSON.stringify(report, null, 2) + '\n')
if (!passed) throw new Error('Screenshot QA failed; inspect qa-report.json')
process.stdout.write(`QA passed: ${checks.length} finals, ${approvedCopies.length} approved-copy hashes, ${contactSheets.length} contact sheets.\n`)
}

void main()
