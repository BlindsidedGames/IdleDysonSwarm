import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { build } from 'vite'
import { openChromiumPage, startProductionPreview } from './performance/chromiumHarness'

const webRoot = resolve(import.meta.dirname, '..')
const output = mkdtempSync(join(tmpdir(), 'ids-stage7-ui-'))
const port = 41_97

afterAll(() => rmSync(output, { recursive: true, force: true }))

describe('Stage 7 certification UI real browser', () => {
  test('persists policy and exposes host-projected cancel, retry, and reload actions without auto-start', async () => {
    await build({
      root: webRoot,
      configFile: resolve(webRoot, 'vite.stage7-certification-ui.config.ts'),
      logLevel: 'silent',
      build: { outDir: output, emptyOutDir: true },
    })
    const preview = await startProductionPreview(webRoot, port, output)
    const page = await openChromiumPage({
      id: 'stage7-certification-ui', width: 390, height: 844,
      deviceScaleFactor: 1, cpuThrottleRate: 1,
    }, preview.url, { disableGpu: true })
    try {
      await page.cdp.send('Page.navigate', {
        url: `${preview.url}play/worker-harness/stage7-certification-ui.html`,
      })
      await page.waitForSelector('[data-stage7-ui-ready="true"]', 15_000)
      expect(await page.evaluate<number>('window.stage7CertificationHarness.workerConstructions()')).toBe(0)
      expect(await page.evaluate<number>(`window.stage7CertificationHarness.actionCount('load-policy')`)).toBeGreaterThan(0)
      expect(await page.evaluate<string>(`document.querySelector('[role="note"]').textContent`)).toContain(
        'splitting the same Stored Time into multiple commands may produce different results',
      )

      await page.evaluate(`document.querySelector('input[value="stored-time-balanced-v1"]').click()`)
      expect(await page.evaluate<string>(`localStorage.getItem('stage7-ui-policy')`)).toBe('stored-time-balanced-v1')
      expect(await page.evaluate<boolean>(`document.querySelector('[role="note"]') === null`)).toBe(true)
      await page.cdp.send('Page.navigate', {
        url: `${preview.url}play/worker-harness/stage7-certification-ui.html?reload=1`,
      })
      await page.waitForSelector('[data-stage7-ui-ready="true"]', 15_000)
      expect(await page.evaluate<boolean>(`document.querySelector('input[value="stored-time-balanced-v1"]').checked`)).toBe(true)
      expect(await page.evaluate<boolean>(`document.querySelector('[role="note"]') === null`)).toBe(true)
      expect(await page.evaluate<number>('window.stage7CertificationHarness.workerConstructions()')).toBe(0)

      await page.evaluate('window.stage7CertificationHarness.showLongJob()')
      await page.waitForSelector('.stage7-certification__cancel', 5_000)
      expect(await page.evaluate<string>(`document.querySelector('.stage7-certification__refund-note').textContent`)).toContain('last durable checkpoint')
      expect(await page.evaluate<boolean>(`document.querySelector('.stage7-certification').getBoundingClientRect().width <= innerWidth`)).toBe(true)
      await page.evaluate(`document.querySelector('.stage7-certification__cancel').click()`)
      expect(await page.evaluate<number>(`window.stage7CertificationHarness.actionCount('cancel')`)).toBe(1)
      expect(await page.evaluate<string>(`document.querySelector('.stage7-certification__announcement').textContent`)).toContain('refunded')

      await page.evaluate('window.stage7CertificationHarness.showRetryFailure()')
      await page.waitForSelector('button', 5_000)
      await page.evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Retry')).click()`)
      expect(await page.evaluate<number>(`window.stage7CertificationHarness.actionCount('retry')`)).toBe(1)

      await page.evaluate('window.stage7CertificationHarness.showUpdateFailure()')
      await page.evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('Reload')).click()`)
      expect(await page.evaluate<number>(`window.stage7CertificationHarness.actionCount('reload')`)).toBe(1)

      await page.cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      })
      expect(await page.evaluate<string>(`getComputedStyle(document.querySelector('button')).transitionDuration`)).toBe('0s')
      expect(await page.evaluate<number>('window.stage7CertificationHarness.workerConstructions()')).toBe(0)
    } finally {
      await page.close()
      await preview.stop()
    }
  }, 90_000)
})
