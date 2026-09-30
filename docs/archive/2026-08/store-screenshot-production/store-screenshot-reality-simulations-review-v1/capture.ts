import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { delay, openChromiumPage, type ChromiumPage } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/chromiumHarness.ts'
import { importSaveThroughSettings } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/browserFixtureImport.ts'

const repo = '/Users/matthewrushworth/Projects/Idle Dyson Swarm'
const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-reality-simulations-review-v1'
const url = 'http://127.0.0.1:5176/play/'
const frozenDate = '2026-08-19T00:00:00.000Z'

const scenes = [
  {
    id: 'reality',
    fixture: 'mature-reality-review',
    fixturePath: resolve(root, 'fixtures/mature-reality-review.idsweb1.txt'),
    route: 'reality',
  },
  {
    id: 'simulations',
    fixture: 'populated-simulations-review',
    fixturePath: resolve(root, 'fixtures/populated-simulations-review.idsweb1.txt'),
    route: 'simulations',
  },
] as const

const profiles = [
  { id: 'iphone', width: 430, height: 932, deviceScaleFactor: 3 },
  { id: 'ipad', width: 1024, height: 768, deviceScaleFactor: 2 },
  { id: 'android-phone', width: 470, height: 812, deviceScaleFactor: 2 },
  { id: 'android-tablet', width: 1280, height: 640, deviceScaleFactor: 1.5 },
] as const

async function waitForCondition(page: ChromiumPage, expression: string, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(50)
  }
  throw new Error(`Timed out waiting for ${expression}`)
}

async function positionScene(page: ChromiumPage, scene: (typeof scenes)[number]) {
  if (scene.route === 'reality') {
    for (const selector of [
      '.simulation-permanent-upgrades',
      '.simulation-permanent-upgrade-category',
      '.reality-upgrades',
      '.reality-upgrade-category--anomaly',
    ]) {
      await page.evaluate(`(() => {
        const section = document.querySelector(${JSON.stringify(selector)})
        if (!(section instanceof HTMLElement)) return false
        const heading = [...section.children].find((child) => child.classList.contains('ui-collapsible-section__heading'))
        const trigger = heading?.querySelector('.ui-collapsible-section__trigger')
        if (trigger instanceof HTMLButtonElement && trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
        return true
      })()`)
      await delay(250)
    }
    await page.evaluate(`(() => {
      const sections = [
        ...document.querySelectorAll('.simulation-permanent-upgrade-category'),
        ...document.querySelectorAll('.reality-upgrade-subcategory'),
      ]
      for (const section of sections) {
        const heading = [...section.children].find((child) => child.classList.contains('ui-collapsible-section__heading'))
        const trigger = heading?.querySelector('.ui-collapsible-section__trigger')
        if (trigger instanceof HTMLButtonElement && trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
      }
      return sections.length
    })()`)
    await delay(300)
    await page.evaluate(`(() => {
      const scroller = document.querySelector('.reality-surface__content')
      const target = document.querySelector('.reality-upgrade-category--anomaly')
      if (scroller instanceof HTMLElement && target instanceof HTMLElement) {
        const scrollerRect = scroller.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        scroller.scrollTop = Math.max(0, scroller.scrollTop + targetRect.top - scrollerRect.top - 8)
      }
    })()`)
  } else {
    await page.evaluate(`(() => {
      for (const group of document.querySelectorAll('.simulation-category')) {
        const trigger = group.querySelector(':scope > .ui-collapsible-section__heading .ui-collapsible-section__trigger')
        if (!(trigger instanceof HTMLButtonElement)) continue
        const shouldExpand = group.classList.contains('simulation-category--foundational')
        const expanded = trigger.getAttribute('aria-expanded') === 'true'
        if (shouldExpand !== expanded) trigger.click()
      }
      const scroller = document.querySelector('.simulations-surface__scroll-region')
      if (scroller instanceof HTMLElement) scroller.scrollTop = 0
    })()`)
  }
  await delay(700)
}

async function captureProfile(profile: (typeof profiles)[number]) {
  const output = resolve(root, 'raw', profile.id)
  mkdirSync(output, { recursive: true })
  const page = await openChromiumPage({ ...profile, cpuThrottleRate: 1 }, url)
  try {
    await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => {
        const realSetTimeout = globalThis.setTimeout.bind(globalThis)
        globalThis.setInterval = () => 1
        globalThis.setTimeout = (callback, delay, ...args) =>
          Number(delay) === 33 ? 1 : realSetTimeout(callback, delay, ...args)
      })()`,
    })
    await page.navigate(url)
    for (const scene of scenes) {
      const saveText = readFileSync(scene.fixturePath, 'utf8').trimEnd()
      const saveSha256 = createHash('sha256').update(saveText).digest('hex')
      await page.evaluate(`(() => {
        if (!globalThis.__idsStoreCaptureRealDate) globalThis.__idsStoreCaptureRealDate = Date
        const RealDate = globalThis.__idsStoreCaptureRealDate
        const frozen = RealDate.parse(${JSON.stringify(frozenDate)})
        globalThis.Date = class extends RealDate {
          constructor(...args) { super(...(args.length === 0 ? [frozen] : args)) }
          static now() { return frozen }
        }
      })()`)
      await importSaveThroughSettings(page, { saveText, saveSha256 })
      await page.evaluate(`document.querySelector('[data-navigation-id=${JSON.stringify(scene.route)}] .dyson-navigation__link')?.click()`)
      await waitForCondition(page, `document.querySelector('.lazy-surface-pending') === null`)
      await waitForCondition(page, `document.querySelector(${JSON.stringify(`.${scene.route}-surface`)}) !== null`)
      await positionScene(page, scene)
      const evidence = await page.evaluate(`(() => ({
        profile: ${JSON.stringify(profile.id)},
        fixture: ${JSON.stringify(scene.fixture)},
        fixtureSha256: ${JSON.stringify(saveSha256)},
        route: ${JSON.stringify(scene.route)},
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        routeTheme: document.querySelector('.dyson-shell')?.getAttribute('data-route-theme') ?? null,
        text: document.body.innerText.slice(0, 16000),
        undefinedPresentInRouteText: /undefined/i.test(document.querySelector('.${scene.route}-surface')?.textContent ?? ''),
        undefinedVisibleInViewport: [...document.querySelectorAll('.${scene.route}-surface *')].some((node) => {
          if (node.children.length > 0 || !/^undefined$/i.test(node.textContent?.trim() ?? '')) return false
          const rect = node.getBoundingClientRect()
          return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
        }),
        expandedGroups: [...document.querySelectorAll('.simulation-category .ui-collapsible-section__trigger')]
          .filter((node) => node.getAttribute('aria-expanded') === 'true')
          .map((node) => node.textContent?.trim()),
      }))()`)
      writeFileSync(resolve(output, `${scene.id}.json`), `${JSON.stringify(evidence, null, 2)}\n`)
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
  for (const profile of profiles) await captureProfile(profile)
}

void main()
