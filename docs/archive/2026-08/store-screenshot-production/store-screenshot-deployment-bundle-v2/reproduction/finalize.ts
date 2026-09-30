import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/node_modules/sharp/dist/index.mjs'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-deployment-bundle-v2'
const approved = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const reviewed = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const profiles = ['iphone', 'ipad', 'android-phone', 'android-tablet', 'steam'] as const
const expected = { iphone: [1320,2868], ipad: [2732,2048], 'android-phone': [1080,1920], 'android-tablet': [1920,1080], steam: [1920,1080] } as const
const routeOrder = ['bots','skills','infinity','quantum','simulations','reality','research','story']
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

async function main() {
const images = [] as any[]
const checks = [] as any[]
for (const profile of profiles) {
  const files = readdirSync(resolve(root, profile)).filter((f) => f.endsWith('.png')).sort()
  for (let i = 0; i < files.length; i++) {
    const path = resolve(root, profile, files[i])
    const m = await sharp(path).metadata()
    const row = { profile, order: i + 1, route: routeOrder[i], file: `${profile}/${files[i]}`, sha256: sha(path), width: m.width, height: m.height, colorspace: m.space, channels: m.channels, hasAlpha: m.hasAlpha }
    images.push(row)
    checks.push({ ...row, pass: m.width === expected[profile][0] && m.height === expected[profile][1] && m.space === 'srgb' && m.hasAlpha === false })
  }
}

const sourceMatches = [] as any[]
for (const image of images) {
  let source: string | undefined
  if (image.profile !== 'steam') {
    if (image.order === 5) source = resolve(reviewed, image.profile, 'simulations-rebuild-civilization.png')
    else if (image.order === 6) source = resolve(reviewed, image.profile, 'reality-decode-the-anomaly.png')
    else source = resolve(approved, image.profile, image.file.split('/').pop()!)
  } else {
    const old = ['05-late-game-bots.png','01-skill-tree.png','06-infinity-shop.png','02-quantum-upgrades.png',null,null,'03-research-automation.png','08-story.png'][image.order - 1]
    if (old) source = resolve(approved, 'steam', old)
    else source = resolve(root, 'reproduction/raw-steam', image.order === 5 ? 'simulations.png' : 'reality.png')
  }
  sourceMatches.push({ file: image.file, source, exactShaMatch: source ? image.sha256 === sha(source) : false })
}

const packageQa = JSON.parse(readFileSync(resolve(root, 'reproduction/evidence/package-v1-qa-report.json'), 'utf8'))
const reviewQa = JSON.parse(readFileSync(resolve(root, 'reproduction/evidence/review-qa-report.json'), 'utf8'))
const steamEvidence = ['simulations','reality'].map((id) => JSON.parse(readFileSync(resolve(root, `reproduction/evidence/steam-${id}.json`), 'utf8')))
const contactSheets = await Promise.all(profiles.map(async (profile) => { const path = resolve(root, `contact-sheet-${profile}.png`); const m = await sharp(path).metadata(); return { file: `contact-sheet-${profile}.png`, sha256: sha(path), width: m.width, height: m.height, colorspace: m.space, hasAlpha: m.hasAlpha } }))
const skillEvidence = packageQa.skillEvidence.filter((x: any) => profiles.includes(x.profile))
const manifest = {
  generatedAt: new Date().toISOString(),
  title: 'Idle Dyson Swarm storefront deployment bundle v2',
  provenance: { frozenBuildHead: '9577c5af2817ae573a3b5fdfd9aab69fcd033c4d', branch: 'codex/skill-preset-independence', frozenBuildDirtyDiffSha256: 'd6ae9d7302be607c723395221064182b3bfd5603871e5e4df7aadd329502d280', finalObservedDirtyDiffSha256: 'cb7f20ae17299c6902ff56f7384a1b004224c29f7cb7bd6143eea8b1e299afe8', finalObservedStatusEntryCount: 43, note: 'Shared checkout contained unrelated concurrent edits. Only the two new Steam captures used the frozen external build; approved existing cards were copied byte-for-byte.' },
  orderedCopy: [
    ['Bots','FROM ONE BOT TO / GALACTIC BRAINS'],['Skills','CHOOSE YOUR PATH'],['Infinity','BREAK INFINITY. / KEEP GOING.'],['Quantum','LEAP INTO / THE QUANTUM'],['Simulations','REBUILD / CIVILIZATION'],['Reality','DECODE THE / ANOMALY'],['Research','AUTOMATE THE / IMPOSSIBLE'],['Story','UNLOCK A / STRANGE STORY'],
  ],
  derivations: {
    skills: { fixture: 'maximum-skills-4-points', sha256: '4606f891dc9f420a6e1eec466953109ef300eee95178c26b0bf9703e4fd10186', availablePoints: 4 },
    simulations: { sourceFixture: 'mature-simulations', sourceSha256: '775aa66227cd0639c3efb968856264fe99d4bd0493667ae328ea8f58663a18f0', derivedSha256: '16dc911ecedba3a961f39f1641a7c013e6839e0a3b90c6d99e2eeda544017b8f' },
    reality: { sourceFixture: 'mature-simulations', sourceSha256: '775aa66227cd0639c3efb968856264fe99d4bd0493667ae328ea8f58663a18f0', derivedSha256: 'f5044102dc0483eff727bc22dae6040025c723beafe14608e7c92311adaed13c' },
  },
  images, contactSheets, sourceMatches,
}
writeFileSync(resolve(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

const qa = {
  passed: checks.every((x) => x.pass) && profiles.every((p) => checks.filter((x) => x.profile === p).length === 8) && sourceMatches.every((x) => x.exactShaMatch) && skillEvidence.every((x: any) => x.ok && x.renderedFour && !x.renderedSeventyThree) && steamEvidence.every((x: any) => !x.undefinedVisibleInViewport) && reviewQa.passed,
  checkedAt: new Date().toISOString(), counts: Object.fromEntries(profiles.map((p) => [p, checks.filter((x) => x.profile === p).length])), outputChecks: checks, sourceMatches, skillEvidence,
  realityAndSimulations: { reviewedMobileQaPassed: reviewQa.passed, steamEvidence: steamEvidence.map((x: any) => ({ scene: x.scene, route: x.route, fixture: x.fixture, fixtureSha256: x.fixtureSha256, viewport: x.viewport, undefinedVisibleInViewport: x.undefinedVisibleInViewport })) },
  presentation: { mobile: 'All files are exact copies of approved/reviewed continuous rounded-frame cards; dedicated full-width header remains above gameplay.', steam: 'All files are exact copies of prior direct gameplay captures or direct CDP captures; no compositor was applied.' },
  visualInspection: { required: true, completedSeparatelyAtOriginalResolution: false },
}
writeFileSync(resolve(root, 'qa-report.json'), JSON.stringify(qa, null, 2) + '\n')
console.log(JSON.stringify({ passed: qa.passed, images: images.length, contacts: contactSheets.length }, null, 2))
}

void main()
