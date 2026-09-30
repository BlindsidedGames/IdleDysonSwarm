import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const profiles = ['iphone', 'ipad', 'android-phone', 'android-tablet', 'steam'] as const

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function inventory(directory: string) {
  const absolute = resolve(root, directory)
  return readdirSync(absolute)
    .filter((file) => statSync(resolve(absolute, file)).isFile())
    .sort()
    .map((file) => ({ file: `${directory}/${file}`, sha256: sha256(resolve(absolute, file)) }))
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit: 'e25694743506a1891c51d0259a1dddb84bf642de',
  repository: '/Users/matthewrushworth/Projects/Idle Dyson Swarm',
  officialGuidance: {
    apple: {
      url: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/',
      observed: '1 to 10 screenshots; JPEG/JPG/PNG; no alpha. Selected accepted targets: 1320x2868 iPhone portrait and 2732x2048 iPad landscape.',
    },
    googlePlay: {
      url: 'https://support.google.com/googleplay/android-developer/answer/9866151?hl=en',
      observed: 'Up to 8 screenshots per supported device type; JPEG or 24-bit PNG without alpha; 320px to 3840px general bounds. Games are highly recommended to provide at least three 9:16 or 16:9 screenshots at minimum 1080 resolution; tablet/Chromebook sections accept 4 or more 1080px to 7680px screenshots.',
    },
    steam: {
      url: 'https://partner.steamgames.com/doc/store/assets?l=english',
      observed: 'Screenshots are required; 16:9; minimum 1920x1080.',
    },
  },
  targets: {
    iphone: { count: 8, final: '1320x2868', orientation: 'portrait', presentation: 'approved v3 dedicated header and rounded frame' },
    ipad: { count: 8, final: '2732x2048', orientation: 'landscape', presentation: 'approved v3 dedicated header and rounded frame' },
    'android-phone': { count: 8, final: '1080x1920', orientation: 'portrait', presentation: 'dedicated header and rounded frame' },
    'android-tablet': { count: 8, final: '1920x1080', orientation: 'landscape', presentation: 'dedicated header and rounded frame' },
    steam: { count: 8, final: '1920x1080', orientation: 'landscape', presentation: 'unmodified gameplay presentation; no marketing wrapper' },
  },
  viewports: {
    iphone: { css: '430x932', dpr: 3, raw: '1290x2796' },
    ipad: { css: '1366x1024', dpr: 2, raw: '2732x2048' },
    'android-phone': { css: '470x812', dpr: 2, raw: '940x1624' },
    'android-tablet': { css: '1280x640', dpr: 1.5, raw: '1920x960' },
    steam: { css: '1920x1080', dpr: 1, raw: '1920x1080' },
  },
  fixtures: {
    'mature-infinity': '7757466ec7b55d505cfafff4c1b4b4a6ebae5daadd529602080a1e1eae902e63',
    'maximum-skills': '576febff052c4a23ff76afa894b8e7f9f039356a2a38dc3ecbe9d2ed5e46a552',
    'maximum-skills-4-points': '4606f891dc9f420a6e1eec466953109ef300eee95178c26b0bf9703e4fd10186',
    'late-quantum': '40ab29561a1826ff74a2dae9e5ac7cd0cf15ad82d75a9cca5f72f9122ccf3ff2',
  },
  mobileStory: [
    { number: 1, route: 'bots', fixture: 'mature-infinity', headline: 'FROM ONE BOT TO / GALACTIC BRAINS' },
    { number: 2, route: 'skills', fixture: 'maximum-skills-4-points', headline: 'CHOOSE YOUR PATH' },
    { number: 3, route: 'infinity', fixture: 'mature-infinity', headline: 'BREAK INFINITY. / KEEP GOING.' },
    { number: 4, route: 'quantum', fixture: 'late-quantum', headline: 'LEAP INTO / THE QUANTUM' },
    { number: 5, route: 'statistics', fixture: 'late-quantum', headline: 'WATCH THE NUMBERS / EXPLODE' },
    { number: 6, route: 'avocato', fixture: 'late-quantum', headline: 'MEET AVOCATO' },
    { number: 7, route: 'research', fixture: 'mature-infinity', headline: 'AUTOMATE THE / IMPOSSIBLE' },
    { number: 8, route: 'story', fixture: 'late-quantum', headline: 'UNLOCK A / STRANGE STORY' },
  ],
  steamOrder: [
    'skills', 'quantum', 'research', 'statistics', 'bots', 'infinity', 'avocato', 'story',
  ],
  captureMethod: {
    server: 'Vite loopback at http://127.0.0.1:5176/play/',
    browser: 'isolated temporary Chromium profiles through the repository CDP harness',
    fixtureImport: 'production Settings UI with SHA-256 verification; Skills uses the documented artifact-local canonical 4-point derivation',
    deterministicState: 'date frozen to 2026-08-19T00:00:00Z and 33ms active scheduler held before import',
    scripts: ['derive-skills-fixture.ts', 'capture.ts', 'compose.ts', 'generate-manifest.ts', 'qa.ts'],
  },
  rejectedCandidates: [
    { route: 'simulations', fixture: 'mature-simulations', reason: 'Current certified state rendered an empty era canvas, so it was not suitable for truthful marketing.' },
    { route: 'reality', fixture: 'mature-simulations', reason: 'Current certified state presented undefined/zero content and was rejected rather than marketed.' },
  ],
  outputs: Object.fromEntries(profiles.map((profile) => [profile, inventory(profile)])),
  contactSheets: profiles.map((profile) => {
    const path = resolve(root, `contact-sheet-${profile}.png`)
    return { file: relative(root, path), sha256: sha256(path) }
  }),
  repositorySourceChanged: false,
  uploaded: false,
}

writeFileSync(resolve(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
