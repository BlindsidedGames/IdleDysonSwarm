import type { ChromiumPage } from './chromiumHarness'
import { delay } from './chromiumHarness'

export async function importSaveThroughSettings(
  page: ChromiumPage,
  fixture: {
    readonly saveText: string
    readonly saveSha256: string
  },
): Promise<void> {
  await page.evaluate(`(() => {
    globalThis.__idleDysonLastImportedSaveSha256 = undefined
    globalThis.__idleDysonLastImportResult = undefined
  })()`)
  await page.evaluate(`document.querySelector('[data-navigation-id="settings"] .dyson-navigation__link')?.click()`)
  await page.waitForSelector('.settings-surface', 30_000)
  await clickButton(page, 'Import')
  await page.waitForSelector('#settings-import-save-text', 30_000)
  await page.evaluate(`(() => {
    const textarea = document.querySelector('#settings-import-save-text')
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Import textarea missing')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, ${JSON.stringify(fixture.saveText)})
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await delay(100)
  await clickButton(page, 'Review Save', true)
  await page.waitForSelector('.settings-surface__import-preview', 30_000)
  await clickButton(page, 'Import', true)
  await waitForCondition(
    page,
    `(() => {
      const result = globalThis.__idleDysonLastImportResult
      if (result?.imported === false) {
        throw new Error('Import failed: ' + result.code + ': ' + result.reason)
      }
      const blocked = document.querySelector('.startup-shell')
      if (blocked !== null) {
        throw new Error('Import left the application blocked: ' + blocked.textContent?.trim())
      }
      return document.querySelector('.settings-surface__dialog') === null
    })()`,
    30_000,
  )
  const imported = await page.evaluate<{
    readonly sha256?: string
    readonly status: string
    readonly result?: {
      readonly imported: boolean
      readonly code: string
      readonly reason: string
    }
  }>(`({
    sha256: globalThis.__idleDysonLastImportedSaveSha256,
    status: document.querySelector('.settings-surface__status')?.textContent ?? '',
    result: globalThis.__idleDysonLastImportResult,
  })`)
  const hasPerformanceImportEvidence =
    imported.result !== undefined || imported.sha256 !== undefined
  if (
    imported.status !== 'Save imported successfully.' ||
    (hasPerformanceImportEvidence &&
      (imported.result?.imported !== true ||
        imported.sha256 !== fixture.saveSha256))
  ) {
    throw new Error(
      `Fixture import was not accepted. ${JSON.stringify(imported)}`,
    )
  }
  await page.evaluate(`document.querySelector('[data-navigation-id="bots"] .dyson-navigation__link')?.click()`)
  await page.waitForSelector('.dyson-shell__stage', 30_000)
}

async function clickButton(
  page: ChromiumPage,
  label: string,
  dialogOnly = false,
): Promise<void> {
  await page.evaluate(`(() => {
    const root = ${dialogOnly ? "document.querySelector('.settings-surface__dialog')" : 'document'}
    const button = root && [...root.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)})
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      throw new Error(${JSON.stringify(`${label} button unavailable`)})
    }
    button.click()
  })()`)
}

async function waitForCondition(
  page: ChromiumPage,
  expression: string,
  timeoutMilliseconds: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(50)
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}
