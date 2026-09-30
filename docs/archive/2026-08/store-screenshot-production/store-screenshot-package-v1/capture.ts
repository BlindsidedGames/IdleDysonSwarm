import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  delay,
  openChromiumPage,
  type ChromiumPage,
} from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/chromiumHarness.ts'
import { importSaveThroughSettings } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/browserFixtureImport.ts'

const repo = '/Users/matthewrushworth/Projects/Idle Dyson Swarm'
const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-package-v1'
const url = 'http://127.0.0.1:5176/play/'
const manifest = JSON.parse(readFileSync(resolve(repo, 'test/fixtures/progression/fixture-manifest.json'), 'utf8')) as {
  fixtures: Array<{ id: string; file: string; saveSha256: string }>
}

const scenes = [
  { id: '01-late-bots', fixture: 'mature-infinity', route: 'bots' },
  { id: '02-skills', fixture: 'maximum-skills-4-points', route: 'skills' },
  { id: '03-infinity', fixture: 'mature-infinity', route: 'infinity' },
  { id: '04-quantum', fixture: 'late-quantum', route: 'quantum' },
  { id: '05-statistics', fixture: 'late-quantum', route: 'statistics' },
  { id: '06-avocato', fixture: 'late-quantum', route: 'avocato' },
  { id: '07-research', fixture: 'mature-infinity', route: 'research' },
  { id: '08-story', fixture: 'late-quantum', route: 'story' },
] as const

const profiles = [
  { id: 'iphone', width: 430, height: 932, deviceScaleFactor: 3, scenes: [scenes[1], ...scenes.slice(3)] },
  { id: 'ipad', width: 1366, height: 1024, deviceScaleFactor: 2, scenes: [scenes[1], ...scenes.slice(3)] },
  { id: 'android-phone', width: 470, height: 812, deviceScaleFactor: 2, scenes },
  { id: 'android-tablet', width: 1280, height: 640, deviceScaleFactor: 1.5, scenes },
  { id: 'steam', width: 1920, height: 1080, deviceScaleFactor: 1, scenes },
] as const

const requestedProfiles = new Set((process.env.IDS_STORE_CAPTURE_PROFILES ?? '').split(',').map((value) => value.trim()).filter(Boolean))
const requestedScenes = new Set((process.env.IDS_STORE_CAPTURE_SCENES ?? '').split(',').map((value) => value.trim()).filter(Boolean))

async function waitForCondition(page: ChromiumPage, expression: string, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(50)
  }
  throw new Error(`Timed out waiting for ${expression}`)
}

async function positionScene(page: ChromiumPage, route: string, profile: string) {
  if (route === 'bots') {
    await page.evaluate(`(() => {
      document.querySelector('.mega-structure-region')?.scrollIntoView({ block: 'start' })
      const scroller = document.querySelector('.dyson-shell__facility-region')
      if (scroller instanceof HTMLElement) scroller.scrollTop = scroller.scrollHeight
      globalThis.scrollTo(0, document.documentElement.scrollHeight)
    })()`)
    if (profile === 'android-phone') {
      const target = await page.evaluate<{ x: number; y: number }>(`(() => {
        const scroller = document.querySelector('.dyson-shell__facility-region')
        if (!(scroller instanceof HTMLElement)) return { x: 235, y: 360 }
        const rect = scroller.getBoundingClientRect()
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      })()`)
      await page.cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel', x: target.x, y: target.y, deltaX: 0, deltaY: 720,
      })
    }
  }
  if (route === 'simulations') {
    await page.evaluate(`(() => {
      const control = document.querySelector('.simulation-category--foundational .ui-collapsible-section__trigger')
      if (control instanceof HTMLButtonElement && control.getAttribute('aria-expanded') !== 'true') control.click()
    })()`)
    await delay(300)
  }
  if (route === 'research') {
    await page.evaluate(`(() => {
      const scroller = document.querySelector('.dyson-shell__facility-region')
      if (scroller instanceof HTMLElement) scroller.scrollTop = Math.min(scroller.scrollHeight, scroller.clientHeight * 0.7)
    })()`)
  }
  await delay(500)
}

async function captureProfile(profile: (typeof profiles)[number]) {
  const output = resolve(root, 'raw', profile.id)
  mkdirSync(output, { recursive: true })
  const page = await openChromiumPage({
    id: profile.id,
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: profile.deviceScaleFactor,
    cpuThrottleRate: 1,
  }, url)
  try {
    await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const realSetInterval = globalThis.setInterval.bind(globalThis)
        const realSetTimeout = globalThis.setTimeout.bind(globalThis)
        globalThis.__idsStoreCaptureSetInterval = realSetInterval
        globalThis.__idsStoreCaptureSetTimeout = realSetTimeout
        globalThis.setInterval = () => 1
        globalThis.setTimeout = (callback, delay, ...args) =>
          Number(delay) === 33 ? 1 : realSetTimeout(callback, delay, ...args)
      })()`,
    })
    await page.navigate(url)
    for (const scene of profile.scenes.filter((candidate) => requestedScenes.size === 0 || requestedScenes.has(candidate.id))) {
      const certifiedEntry = manifest.fixtures.find((candidate) => candidate.id === scene.fixture)
      const derivedFixturePath = resolve(root, 'fixtures/maximum-skills-4-points.idsweb1.txt')
      const saveText = scene.fixture === 'maximum-skills-4-points'
        ? readFileSync(derivedFixturePath, 'utf8')
        : certifiedEntry
          ? readFileSync(resolve(repo, 'test/fixtures/progression', certifiedEntry.file), 'utf8')
          : (() => { throw new Error(`Missing fixture ${scene.fixture}`) })()
      const saveSha256 = scene.fixture === 'maximum-skills-4-points'
        ? createHash('sha256').update(saveText).digest('hex')
        : certifiedEntry!.saveSha256
      await page.evaluate(`(() => {
        if (!globalThis.__idsStoreCaptureRealDate) globalThis.__idsStoreCaptureRealDate = Date
        const RealDate = globalThis.__idsStoreCaptureRealDate
        const frozen = RealDate.parse('2026-08-19T00:00:00.000Z')
        globalThis.Date = class extends RealDate {
          constructor(...args) { super(...(args.length === 0 ? [frozen] : args)) }
          static now() { return frozen }
        }
      })()`)
      await importSaveThroughSettings(page, { saveText, saveSha256 })
      const navigationRoute = scene.route === 'avocato' ? 'reality' : scene.route
      await page.evaluate(`document.querySelector('[data-navigation-id=${JSON.stringify(navigationRoute)}] .dyson-navigation__link')?.click()`)
      await waitForCondition(page, `document.querySelector('.lazy-surface-pending') === null`)
      if (scene.route === 'avocato') {
        await waitForCondition(page, `document.querySelector('.reality-avocato-entry button') !== null`)
        await page.evaluate(`document.querySelector('.reality-avocato-entry button')?.click()`)
        await waitForCondition(page, `document.querySelector('.avocato-surface') !== null`)
      }
      await positionScene(page, scene.route, profile.id)
      const evidence = await page.evaluate(`(() => ({
        profile: ${JSON.stringify(profile.id)},
        fixture: ${JSON.stringify(scene.fixture)},
        fixtureSha256: ${JSON.stringify(saveSha256)},
        route: ${JSON.stringify(scene.route)},
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        routeTheme: document.querySelector('.dyson-shell')?.getAttribute('data-route-theme') ?? null,
        title: document.title,
        text: document.body.innerText.slice(0, 12000),
      }))()`)
      writeFileSync(resolve(output, `${scene.id}.json`), JSON.stringify(evidence, null, 2) + '\n')
      const capture = await page.cdp.send<{ data: string }>('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: false, fromSurface: true,
      })
      writeFileSync(resolve(output, `${scene.id}.png`), Buffer.from(capture.data, 'base64'))
      process.stdout.write(`${profile.id}/${scene.id}\n`)
    }
  } finally {
    await page.close()
  }
}

async function main() {
  for (const profile of profiles) {
    if (requestedProfiles.size === 0 || requestedProfiles.has(profile.id)) await captureProfile(profile)
  }
}

void main()
