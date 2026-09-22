import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { hydrateGameState, dehydrateGameState } from '../src/game-state/mapping'
import { prepareIdb1Save } from '../src/save/prepare'
import { serializeWebSave } from '../src/save/serialization'
import { openChromiumPage, delay } from './performance/chromiumHarness'
import { importSaveThroughSettings } from './performance/browserFixtureImport'

// Run against a local preview. The harness owns a disposable profile and uses
// --use-mock-keychain on macOS; no existing player saves are touched.
const url = process.argv[2] ?? 'http://127.0.0.1:5190/play/'
const page = await openChromiumPage({
  id: 'tinker-input', width: 1280, height: 900,
  deviceScaleFactor: 1, cpuThrottleRate: 1,
}, url)
const pointer = async (type: 'pointerdown' | 'pointerup') => {
  const position = await page.evaluate<{ x: number; y: number }>(`(() => {
    const rect = document.querySelector('.tinker-surface__control').getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })()`)
  await page.cdp.send('Input.dispatchMouseEvent', {
    type: type === 'pointerdown' ? 'mousePressed' : 'mouseReleased',
    ...position, button: 'left', clickCount: 1,
  })
}
const clickNavigation = async (id: string) => {
  const position = await page.evaluate<{ x: number; y: number }>(`(() => {
    const rect = document.querySelector('[data-navigation-id="${id}"] .dyson-navigation__link').getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })()`)
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.cdp.send('Input.dispatchMouseEvent', { type, ...position, button: 'left', clickCount: 1 })
  }
}
const remaining = async () => page.evaluate<number>(
  `parseFloat(document.querySelector('.tinker-surface__time').textContent)`,
)
const assertElapsed = (before: number, after: number, seconds: number) => {
  assert.ok(Math.abs(before - after - seconds) < 0.4,
    `Expected ${seconds}s progression; observed ${before - after}s`)
}
try {
  await page.navigate(url)
  await page.waitForSelector('.tinker-surface__control:not(:disabled)')
  await delay(500)
  await pointer('pointerdown')
  await pointer('pointerup')
  await delay(500)
  const before = await remaining()
  await page.evaluate(`globalThis.__tinkerSpam = setInterval(() => {
    const control = document.querySelector('.tinker-surface__control')
    for (const type of ['pointerdown', 'pointerup']) control.dispatchEvent(
      new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0 }))
  }, 10)`)
  await delay(3000)
  const during = await remaining()
  await page.evaluate('clearInterval(globalThis.__tinkerSpam)')
  assertElapsed(before, during, 3)
  await delay(1000)
  assertElapsed(during, await remaining(), 1)

  const session = hydrateGameState(prepareIdb1Save(readFileSync(new URL(
    '../src/application/firstRun/generated/first-run-schema-12.idb1.txt', import.meta.url,
  ), 'utf8')).prepared)
  const state = session.state
  const saveText = serializeWebSave(dehydrateGameState(session, {
    ...state,
    skills: { ...state.skills, byId: { ...state.skills.byId,
      manualLabour: { ...state.skills.byId.manualLabour!, owned: true },
    } },
  }).copyValidatedState())
  await importSaveThroughSettings(page, {
    saveText, saveSha256: createHash('sha256').update(saveText).digest('hex'),
  })
  await page.waitForSelector('.tinker-surface__control:not(:disabled)')
  await delay(500)
  await pointer('pointerdown')
  await pointer('pointerup')
  await delay(600)
  assert.equal(await page.evaluate(`document.querySelector('.tinker-surface__hold-label')?.textContent?.trim()`), 'Long press to repeat...')
  await pointer('pointerdown')
  await delay(650)
  await pointer('pointerup')
  assert.equal(await page.evaluate(`document.querySelector('.tinker-surface__hold-label')?.textContent?.trim()`), 'Repeating')
  // Hold is intentionally latched after release, but navigation must stop it.
  await clickNavigation('research')
  await delay(200)
  await clickNavigation('bots')
  await page.waitForSelector('.tinker-surface__control:not(:disabled)')
  await delay(500)
  assert.equal(await page.evaluate(`document.querySelector('.tinker-surface__hold-label')?.textContent?.trim()`), 'Long press to repeat...')
  assert.equal(await page.evaluate(`document.querySelector('.tinker-surface__failure')?.textContent ?? ''`), '')
  console.log('Tinker input passed: 100 clicks/s preserves real-time progression; no catch-up burst; tap, hold latch, release and navigation cleanup work.')
} finally {
  await page.close()
}
