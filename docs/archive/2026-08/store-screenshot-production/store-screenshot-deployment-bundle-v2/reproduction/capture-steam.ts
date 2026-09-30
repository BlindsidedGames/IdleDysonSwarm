import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { delay, openChromiumPage, type ChromiumPage } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/chromiumHarness.ts'
import { importSaveThroughSettings } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/performance/browserFixtureImport.ts'

const root = '/Users/matthewrushworth/.codex/visualizations/2026/08/29/01a04fb9-5e61-7270-a4e3-bed9639e4d48/store-screenshot-deployment-bundle-v2'
const url = 'http://127.0.0.1:5177/play/'
const frozenDate = '2026-08-19T00:00:00.000Z'

const scenes = [
  { id: 'simulations', fixture: 'populated-simulations-review', route: 'simulations' },
  { id: 'reality', fixture: 'mature-reality-review', route: 'reality' },
] as const

async function waitFor(page: ChromiumPage, expression: string, timeout = 30_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(50)
  }
  throw new Error(`Timed out: ${expression}`)
}

async function position(page: ChromiumPage, route: string) {
  if (route === 'simulations') {
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
  } else {
    for (const selector of ['.simulation-permanent-upgrades', '.simulation-permanent-upgrade-category', '.reality-upgrades', '.reality-upgrade-category--anomaly']) {
      await page.evaluate(`(() => {
        const section = document.querySelector(${JSON.stringify(selector)})
        if (!(section instanceof HTMLElement)) return
        const heading = [...section.children].find((child) => child.classList.contains('ui-collapsible-section__heading'))
        const trigger = heading?.querySelector('.ui-collapsible-section__trigger')
        if (trigger instanceof HTMLButtonElement && trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
      })()`)
      await delay(200)
    }
    await page.evaluate(`(() => {
      const sections = [...document.querySelectorAll('.simulation-permanent-upgrade-category'), ...document.querySelectorAll('.reality-upgrade-subcategory')]
      for (const section of sections) {
        const heading = [...section.children].find((child) => child.classList.contains('ui-collapsible-section__heading'))
        const trigger = heading?.querySelector('.ui-collapsible-section__trigger')
        if (trigger instanceof HTMLButtonElement && trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
      }
      const scroller = document.querySelector('.reality-surface__content')
      const target = document.querySelector('.reality-upgrade-category--anomaly')
      if (scroller instanceof HTMLElement && target instanceof HTMLElement) {
        const a = scroller.getBoundingClientRect(); const b = target.getBoundingClientRect()
        scroller.scrollTop = Math.max(0, scroller.scrollTop + b.top - a.top - 8)
      }
    })()`)
    await delay(500)
    await page.evaluate(`(() => {
      const scroller = document.querySelector('.reality-surface__content')
      const target = document.querySelector('.reality-upgrade-category--anomaly')
      if (scroller instanceof HTMLElement && target instanceof HTMLElement) {
        const a = scroller.getBoundingClientRect(); const b = target.getBoundingClientRect()
        scroller.scrollTop = Math.max(0, scroller.scrollTop + b.top - a.top - 8)
      }
    })()`)
  }
  await delay(900)
}

async function main() {
  const page = await openChromiumPage({ width: 1280, height: 720, deviceScaleFactor: 1.5, cpuThrottleRate: 1 }, url)
  try {
    await page.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      const realSetTimeout = globalThis.setTimeout.bind(globalThis)
      globalThis.setInterval = () => 1
      globalThis.setTimeout = (callback, delay, ...args) => Number(delay) === 33 ? 1 : realSetTimeout(callback, delay, ...args)
    })()` })
    await page.navigate(url)
    for (const scene of scenes) {
      const fixturePath = resolve(root, 'reproduction/fixtures', `${scene.fixture}.idsweb1.txt`)
      const saveText = readFileSync(fixturePath, 'utf8').trimEnd()
      const saveSha256 = createHash('sha256').update(saveText).digest('hex')
      await page.evaluate(`(() => {
        if (!globalThis.__idsStoreCaptureRealDate) globalThis.__idsStoreCaptureRealDate = Date
        const RealDate = globalThis.__idsStoreCaptureRealDate
        const frozen = RealDate.parse(${JSON.stringify(frozenDate)})
        globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [frozen])) } static now() { return frozen } }
      })()`)
      await importSaveThroughSettings(page, { saveText, saveSha256 })
      await page.evaluate(`document.querySelector('[data-navigation-id=${JSON.stringify(scene.route)}] .dyson-navigation__link')?.click()`)
      await waitFor(page, `document.querySelector('.lazy-surface-pending') === null`)
      await waitFor(page, `document.querySelector('.${scene.route}-surface') !== null`)
      await position(page, scene.route)
      const evidence = await page.evaluate(`(() => {
        const root = document.querySelector('.${scene.route}-surface')
        return {
          scene: ${JSON.stringify(scene.id)}, fixture: ${JSON.stringify(scene.fixture)}, fixtureSha256: ${JSON.stringify(saveSha256)},
          route: ${JSON.stringify(scene.route)}, frozenDate: ${JSON.stringify(frozenDate)},
          viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, outputWidth: Math.round(innerWidth * devicePixelRatio), outputHeight: Math.round(innerHeight * devicePixelRatio) },
          routeTheme: document.querySelector('.dyson-shell')?.getAttribute('data-route-theme') ?? null,
          undefinedVisibleInViewport: [...(root?.querySelectorAll('*') ?? [])].some((node) => {
            if (node.children.length > 0 || !/^undefined$/i.test(node.textContent?.trim() ?? '')) return false
            const r = node.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
          }),
          visibleText: document.body.innerText.slice(0, 20000),
        }
      })()`)
      writeFileSync(resolve(root, 'reproduction/evidence', `steam-${scene.id}.json`), `${JSON.stringify(evidence, null, 2)}\n`)
      const shot = await page.cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
      writeFileSync(resolve(root, 'reproduction/raw-steam', `${scene.id}.png`), Buffer.from(shot.data, 'base64'))
      process.stdout.write(`steam/${scene.id}\n`)
    }
  } finally { await page.close() }
}

void main()
