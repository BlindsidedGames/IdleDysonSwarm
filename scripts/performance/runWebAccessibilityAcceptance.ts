import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  delay,
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
  type ViewportProfile,
} from './chromiumHarness'
import { importSaveThroughSettings } from './browserFixtureImport'
import { repositoryRunIdentity } from './reportArtifacts'
import { loadCheckedInProgressionMatrixFixtures } from '../support/progressionMatrixFixtures'

const webRoot = resolve(import.meta.dirname, '..', '..')
const fixture = loadCheckedInProgressionMatrixFixtures().find(
  (candidate) => candidate.id === 'fresh',
)
if (fixture === undefined) throw new Error('Fresh fixture missing.')
const profiles: readonly ViewportProfile[] = [
  { id: 'mobile-320x800', width: 320, height: 800, deviceScaleFactor: 2, cpuThrottleRate: 1 },
  { id: 'mobile-390x844', width: 390, height: 844, deviceScaleFactor: 2, cpuThrottleRate: 1 },
]
const preview = await startProductionPreview(webRoot, 4_223)
const measurements: unknown[] = []
const acceptanceIssues: string[] = []
try {
  for (const profile of profiles) {
    const page = await openChromiumPage(profile, preview.url)
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    await page.cdp.send('Runtime.enable')
    page.cdp.on<{ type?: string; args?: readonly { value?: unknown; description?: string }[] }>(
      'Runtime.consoleAPICalled',
      (event) => {
        if (event.type === 'error') {
          consoleErrors.push(event.args?.map((entry) => String(entry.value ?? entry.description ?? '')).join(' ') ?? '')
        }
      },
    )
    page.cdp.on<{ exceptionDetails?: { text?: string; exception?: { description?: string } } }>(
      'Runtime.exceptionThrown',
      (event) => pageErrors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Unknown exception'),
    )
    try {
      await page.cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
      await page.navigate(preview.url)
      await importSaveThroughSettings(page, fixture)
      const base = await layoutEvidence(page)
      const reducedMotion = await page.evaluate(`({
        requested: matchMedia('(prefers-reduced-motion: reduce)').matches,
        runningAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
      })`)
      const contrast = await page.evaluate(`(() => {
        const selectors = ['[data-resource="cash"] .ui-resource-value__value', '.tinker-surface__control', '[data-navigation-id="bots"] .dyson-navigation__link']
        const parse = (value) => (value.match(/[\\d.]+/g) ?? []).map(Number)
        const luminance = (rgb) => {
          const values = rgb.slice(0, 3).map((channel) => {
            const normalized = channel / 255
            return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
        }
        return selectors.map((selector) => {
          const element = document.querySelector(selector)
          if (!(element instanceof HTMLElement)) return { selector, missing: true }
          const foreground = parse(getComputedStyle(element).color)
          let backgroundElement = element
          let background = parse(getComputedStyle(backgroundElement).backgroundColor)
          while ((background[3] ?? 0) === 0 && backgroundElement.parentElement) {
            backgroundElement = backgroundElement.parentElement
            background = parse(getComputedStyle(backgroundElement).backgroundColor)
          }
          const lighter = Math.max(luminance(foreground), luminance(background))
          const darker = Math.min(luminance(foreground), luminance(background))
          return { selector, foreground, background, ratio: (lighter + 0.05) / (darker + 0.05) }
        })
      })()`)
      const dialog = await dialogEvidence(page)
      const rapidActivation = await rapidActivationEvidence(page)
      await page.evaluate(`document.documentElement.style.fontSize = '200%'`)
      await delay(100)
      const text200Percent = await layoutEvidence(page)
      await page.evaluate(`document.documentElement.style.fontSize = ''`)
      const measurement = {
        profile: profile.id,
        viewport: { width: profile.width, height: profile.height },
        base,
        reducedMotion,
        contrast,
        dialog,
        rapidActivation,
        text200Percent,
        zoom400PercentProxy: {
          method: '320 CSS pixel reflow proxy; headless CDP page scale does not reproduce browser chrome zoom',
          passed: profile.width !== 320 || base.horizontalOverflowPixels === 0,
        },
        consoleErrors,
        pageErrors,
      }
      const prefix = profile.id
      if (base.horizontalOverflowPixels !== 0) acceptanceIssues.push(`${prefix}: base document overflow`)
      if (base.clippedInteractiveTargets.length > 0) acceptanceIssues.push(`${prefix}: clipped base interactive targets (${base.clippedInteractiveTargets.length})`)
      if ((base.minimumVisibleTarget ?? 0) < 44) acceptanceIssues.push(`${prefix}: target below 44 CSS pixels (${base.smallestTarget?.tag ?? 'unknown'})`)
      if (!reducedMotion.requested || reducedMotion.runningAnimations !== 0) acceptanceIssues.push(`${prefix}: reduced motion still animates`)
      if (contrast.some((sample) => sample.missing || (sample.ratio ?? 0) < 4.5)) acceptanceIssues.push(`${prefix}: representative contrast failed`)
      if (Object.values(dialog).some((value) => value !== true)) acceptanceIssues.push(`${prefix}: dialog keyboard/focus/editability failed`)
      if (!rapidActivation.gestureReleased || rapidActivation.activePointers !== 0) acceptanceIssues.push(`${prefix}: touch gesture state leaked`)
      if (text200Percent.horizontalOverflowPixels !== 0) acceptanceIssues.push(`${prefix}: 200 percent text document overflow`)
      if (text200Percent.clippedInteractiveTargets.length > 0) acceptanceIssues.push(`${prefix}: clipped 200 percent interactive targets (${text200Percent.clippedInteractiveTargets.length})`)
      if (profile.width === 320 && base.horizontalOverflowPixels !== 0) acceptanceIssues.push(`${prefix}: 400 percent proxy failed`)
      if (consoleErrors.length > 0) acceptanceIssues.push(`${prefix}: console errors (${consoleErrors.length})`)
      if (pageErrors.length > 0) acceptanceIssues.push(`${prefix}: page errors (${pageErrors.length})`)
      measurements.push(measurement)
    } finally {
      await page.close()
    }
  }
} finally {
  await preview.stop()
}
const report = {
  schemaVersion: 1,
  scope: 'web-headless-browser-automation',
  fixture: { id: fixture.id, fingerprint: fixture.fingerprint, saveSha256: fixture.saveSha256 },
  runIdentity: repositoryRunIdentity(webRoot),
  limitations: [
    'Physical keyboard, screen reader announcements, and browser-chrome zoom remain manual checks.',
    'The 400 percent check uses the standards-equivalent 320 CSS pixel reflow proxy; it does not claim browser UI zoom was automated.',
    'Contrast samples cover representative opaque text/control pairs, not every painted pixel or image.',
    'Element-edge diagnostics include intentional clipping and scroll containers; manual visual reflow review remains required.',
  ],
  measurements,
  acceptanceIssues,
  passed: acceptanceIssues.length === 0,
}
const output = resolve(webRoot, 'output', 'performance', 'web-accessibility-acceptance.json')
mkdirSync(resolve(output, '..'), { recursive: true })
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
console.log(`Report: ${output}`)
if (!report.passed) process.exitCode = 1

async function layoutEvidence(page: ChromiumPage) {
  return page.evaluate(`(() => {
    const root = document.documentElement
    const overflowing = [...document.querySelectorAll('body *')].filter((element) => {
      if (!(element instanceof HTMLElement)) return false
      if (element.closest('[inert]') !== null) return false
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const rect = element.getBoundingClientRect()
      const intersectsViewport = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
      return intersectsViewport && (rect.left < -1 || rect.right > root.clientWidth + 1)
    }).slice(0, 20).map((element) => ({ tag: element.tagName, className: element.className }))
    const targets = [...document.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]):not([type="radio"])')]
      .filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0 && element.closest('[inert]') === null)
      .map((element) => ({
        element,
        size: Math.min(element.getBoundingClientRect().width, element.getBoundingClientRect().height),
      }))
    const smallestTarget = targets.sort((left, right) => left.size - right.size)[0]
    const clippedInteractiveTargets = targets
      .filter(({ element }) => {
        const rect = element.getBoundingClientRect()
        if (rect.left >= -1 && rect.right <= root.clientWidth + 1) return false
        let ancestor = element.parentElement
        while (ancestor !== null) {
          const overflowX = getComputedStyle(ancestor).overflowX
          if ((overflowX === 'auto' || overflowX === 'scroll') && ancestor.scrollWidth > ancestor.clientWidth) return false
          ancestor = ancestor.parentElement
        }
        return true
      })
      .map(({ element }) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          className: element.className,
          text: element.textContent?.trim().slice(0, 80),
          left: rect.left,
          right: rect.right,
          width: rect.width,
        }
      })
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      horizontalOverflowPixels: Math.max(0, root.scrollWidth - root.clientWidth),
      overflowing,
      clippedInteractiveTargets,
      minimumVisibleTarget: smallestTarget?.size ?? null,
      smallestTarget: smallestTarget === undefined ? null : {
        tag: smallestTarget.element.tagName,
        className: smallestTarget.element.className,
        text: smallestTarget.element.textContent?.trim().slice(0, 80),
      },
    }
  })()`)
}

async function dialogEvidence(page: ChromiumPage) {
  await page.evaluate(`(() => {
    const route = document.querySelector('[data-navigation-id="settings"] .dyson-navigation__link')
    if (!(route instanceof HTMLElement)) throw new Error('Settings route missing')
    route.click()
  })()`)
  await page.waitForSelector('.settings-surface', 30_000)
  await page.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === 'Import')
    if (!(button instanceof HTMLButtonElement)) throw new Error('Import trigger missing')
    button.focus()
  })()`)
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await page.waitForSelector('#settings-import-save-text', 30_000)
  const openedByKeyboard = await page.evaluate(`document.querySelector('.settings-surface__dialog') !== null`)
  let focusContained = true
  for (let count = 0; count < 6; count += 1) {
    await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    focusContained = focusContained && await page.evaluate(`document.activeElement?.closest('.settings-surface__dialog') !== null`)
  }
  await page.evaluate(`document.querySelector('#settings-import-save-text')?.focus()`)
  await page.cdp.send('Input.insertText', { text: 'editable-check' })
  const editable = await page.evaluate(`document.querySelector('#settings-import-save-text')?.value === 'editable-check'`)
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await page.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await delay(100)
  return page.evaluate(`({
    editable: ${JSON.stringify(editable)},
    openedByKeyboard: ${JSON.stringify(openedByKeyboard)},
    focusContained: ${JSON.stringify(focusContained)},
    closed: document.querySelector('.settings-surface__dialog') === null,
    focusRestored: document.activeElement instanceof HTMLButtonElement && document.activeElement.textContent?.trim() === 'Import',
  })`)
}

async function rapidActivationEvidence(page: ChromiumPage) {
  await page.evaluate(`document.querySelector('[data-navigation-id="bots"] .dyson-navigation__link')?.click()`)
  await page.waitForSelector('.tinker-surface__control', 30_000)
  await page.cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const center = await page.evaluate<{ x: number; y: number }>(`(() => {
    const target = document.querySelector('.tinker-surface__control')
    if (!(target instanceof HTMLElement)) throw new Error('Tinker target missing')
    const rect = target.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })()`)
  for (let count = 0; count < 8; count += 1) {
    await page.cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: center.x, y: center.y, id: count + 1, radiusX: 1, radiusY: 1, force: 1 }],
    })
    await page.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await delay(50)
  return page.evaluate(`({
    gestureReleased: document.querySelector('.tinker-surface__control')?.getAttribute('data-gesture-active') === 'false',
    activePointers: window.__idleDysonPerformance.readResources().activePointers,
  })`)
}
