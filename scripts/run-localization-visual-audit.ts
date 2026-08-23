import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  loadCheckedInProgressionMatrixFixtures,
  type ProgressionMatrixFixture,
} from '../test/support/progressionMatrixFixtures'
import {
  delay,
  openChromiumPage,
  startProductionPreview,
  type ChromiumPage,
  type ViewportProfile,
} from './performance/chromiumHarness'
import { importSaveThroughSettings } from './performance/browserFixtureImport'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(root, 'output', 'localization-audit')
const screenshotDirectory = resolve(outputDirectory, 'screenshots')
const locales = ['fr', 'de', 'es-419', 'pt-BR', 'zh-CN', 'ru', 'ja'] as const
const localeFilter = argumentValue('--locale=')
const fixtureFilter = argumentValue('--fixture=')
const profileFilter = argumentValue('--profile=')
const previewPort = profileFilter === 'mobile-390x844'
  ? 4_194
  : profileFilter === 'compact-landscape-844x390'
    ? 4_195
    : 4_193
const profiles: readonly ViewportProfile[] = [
  { id: 'desktop-1365x900', width: 1_365, height: 900, deviceScaleFactor: 1, cpuThrottleRate: 1 },
  { id: 'mobile-390x844', width: 390, height: 844, deviceScaleFactor: 2, cpuThrottleRate: 1 },
  { id: 'compact-landscape-844x390', width: 844, height: 390, deviceScaleFactor: 2, cpuThrottleRate: 1 },
]
const routeReadySelectors: Readonly<Record<string, string>> = {
  bots: '.dyson-shell__stage',
  research: '.research-surface',
  skills: '.skills-surface',
  infinity: '.infinity-surface',
  reality: '.reality-surface',
  simulations: '.simulations-surface',
  quantum: '.quantum-surface',
  avocato: '.avocato-surface',
  story: '.story-surface',
  wiki: '.wiki-surface',
  'offline-time': '.offline-time-surface',
  statistics: '.statistics-surface',
  settings: '.settings-surface',
  store: '.store-surface',
  debug: '.debug-surface',
}
const screenshotFixtures = new Set(['fresh', 'maximum-skills'])
const sourceCatalog = JSON.parse(readFileSync(
  resolve(root, 'src/ui/i18n/catalogs/source/en.json'),
  'utf8',
)) as Readonly<Record<string, { readonly defaultMessage: string }>>
const englishCandidatesByLocale = Object.fromEntries(locales.map((locale) => {
  const translated = JSON.parse(readFileSync(
    resolve(root, `src/ui/i18n/catalogs/translations/${locale}.json`),
    'utf8',
  )) as Readonly<Record<string, string>>
  return [locale, Object.entries(sourceCatalog)
    .filter(([id, message]) => translated[id] !== message.defaultMessage)
    .map(([, message]) => message.defaultMessage.trim())
    .filter((message) =>
      message.length >= 24 &&
      !/[<{]/.test(message) &&
      !message.includes('\n'),
    )]
})) as Readonly<Record<(typeof locales)[number], readonly string[]>>

mkdirSync(screenshotDirectory, { recursive: true })
const preview = await startProductionPreview(root, previewPort, 'dist')
const results: unknown[] = []
try {
  for (const profile of profiles.filter((entry) => !profileFilter || entry.id === profileFilter)) {
    for (const fixture of loadCheckedInProgressionMatrixFixtures().filter((entry) => !fixtureFilter || entry.id === fixtureFilter)) {
      console.error(`[localization] ${profile.id} / ${fixture.id}`)
      const page = await openChromiumPage(profile, preview.url)
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
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
        (event) => pageErrors.push(event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text ?? 'Unknown page exception'),
      )
      try {
        await page.navigate(preview.url)
        await page.waitForSelector('.dyson-shell', 30_000)
        await importSaveThroughSettings(page, fixture)
        for (const locale of locales.filter((entry) => !localeFilter || entry === localeFilter)) {
          const consoleStart = consoleErrors.length
          const pageStart = pageErrors.length
          await page.evaluate(`localStorage.setItem('idle-dyson-swarm.presentation-locale', ${JSON.stringify(locale)})`)
          // The shared performance harness waits for the Tinker control, but
          // some valid progression fixtures intentionally do not render it.
          // A localization reload only needs the application shell.
          await page.cdp.send('Page.navigate', { url: preview.url })
          await page.waitForSelector('.dyson-shell', 30_000)
          await waitForCondition(page, `document.documentElement.dataset.locale === ${JSON.stringify(locale)}`, 30_000)
          const optionalRoutes = await page.evaluate<string[]>(`['store', 'debug'].filter((route) => document.querySelector('[data-navigation-id="' + route + '"] .dyson-navigation__link') !== null)`)
          const routes = [...fixture.reachableRoutes, ...optionalRoutes.filter((route) => !fixture.reachableRoutes.includes(route as never))]
          for (const route of routes) {
            console.error(`[localization] ${profile.id} / ${fixture.id} / ${locale} / ${route}`)
            await activateRoute(page, route)
            await delay(100)
            await recordInspection(page, profile, fixture, locale, route)
            if (route === 'wiki') {
              await inspectWikiVariants(page, profile, fixture, locale)
            }
            if (route === 'settings') {
              await inspectSettingsDialogVariants(page, profile, fixture, locale)
            }
          }
          const localizedConsoleErrors = consoleErrors.slice(consoleStart)
          const localizedPageErrors = pageErrors.slice(pageStart)
          if (localizedConsoleErrors.length > 0 || localizedPageErrors.length > 0) {
            results.push({
              status: 'runtime-errors',
              profile: profile.id,
              fixture: fixture.id,
              locale,
              consoleErrors: localizedConsoleErrors,
              pageErrors: localizedPageErrors,
            })
          }
        }
      } catch (error) {
        results.push({
          status: 'blocked',
          profile: profile.id,
          fixture: fixture.id,
          reason: error instanceof Error ? error.stack ?? error.message : String(error),
          consoleErrors,
          pageErrors,
        })
      } finally {
        await page.close()
      }
    }
  }
} finally {
  await preview.stop()
}

const failures = results.filter((entry) => {
  const candidate = entry as {
    readonly status?: string
    readonly horizontalOverflowPixels?: number
    readonly clippedText?: readonly unknown[]
    readonly overflowingElements?: readonly unknown[]
    readonly replacementCharacters?: readonly unknown[]
    readonly emptyInteractiveNames?: readonly unknown[]
    readonly rawIcuTokens?: readonly unknown[]
    readonly englishLeakage?: readonly unknown[]
    readonly localeDocumentValid?: boolean
  }
  return candidate.status !== 'inspected' || inspectionHasFailure(candidate)
})
const report = {
  schemaVersion: 1,
  locales,
  profiles: profiles.map(({ id, width, height }) => ({ id, width, height })),
  fixtures: loadCheckedInProgressionMatrixFixtures().map(({ id, reachableRoutes }) => ({ id, reachableRoutes })),
  inspectedRouteCount: results.filter((entry) => (entry as { status?: string }).status === 'inspected').length,
  failureCount: failures.length,
  failures,
  results,
}
const reportName = profileFilter
  ? `report.${profileFilter}.json`
  : 'report.json'
writeFileSync(resolve(outputDirectory, reportName), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ inspectedRouteCount: report.inspectedRouteCount, failureCount: report.failureCount }, null, 2))
if (failures.length > 0) process.exitCode = 1

async function recordInspection(
  page: ChromiumPage,
  profile: ViewportProfile,
  fixture: ProgressionMatrixFixture,
  locale: (typeof locales)[number],
  route: string,
): Promise<void> {
  const inspection = await inspectRoute(page, locale)
  let screenshot: string | null = null
  if (screenshotFixtures.has(fixture.id) || inspectionHasFailure(inspection)) {
    screenshot = `${profile.id}--${fixture.id}--${locale}--${route}.png`
    const capture = await page.cdp.send<{ data: string }>('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    })
    writeFileSync(
      resolve(screenshotDirectory, screenshot),
      Buffer.from(capture.data, 'base64'),
    )
  }
  results.push({
    status: 'inspected',
    profile: profile.id,
    viewport: { width: profile.width, height: profile.height },
    fixture: fixture.id,
    locale,
    route,
    screenshot,
    ...inspection,
  })
}

function inspectionHasFailure(candidate: {
  readonly horizontalOverflowPixels?: number
  readonly overflowingElements?: readonly unknown[]
  readonly clippedText?: readonly unknown[]
  readonly replacementCharacters?: readonly unknown[]
  readonly emptyInteractiveNames?: readonly unknown[]
  readonly rawIcuTokens?: readonly unknown[]
  readonly englishLeakage?: readonly unknown[]
  readonly localeDocumentValid?: boolean
}): boolean {
  return (candidate.horizontalOverflowPixels ?? 0) > 0 ||
    (candidate.overflowingElements?.length ?? 0) > 0 ||
    (candidate.clippedText?.length ?? 0) > 0 ||
    (candidate.replacementCharacters?.length ?? 0) > 0 ||
    (candidate.emptyInteractiveNames?.length ?? 0) > 0 ||
    (candidate.rawIcuTokens?.length ?? 0) > 0 ||
    (candidate.englishLeakage?.length ?? 0) > 0 ||
    candidate.localeDocumentValid === false
}

async function inspectWikiVariants(
  page: ChromiumPage,
  profile: ViewportProfile,
  fixture: ProgressionMatrixFixture,
  locale: (typeof locales)[number],
): Promise<void> {
  const categories = await page.evaluate<string[]>(`[...document.querySelectorAll('.wiki-surface__mobile-topic-control option')].map((option) => option.value)`)
  for (const category of categories) {
    await page.evaluate(`(() => {
      const select = document.querySelector('.wiki-surface__mobile-topic-control select')
      if (!(select instanceof HTMLSelectElement)) throw new Error('Wiki topic selector missing')
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
      setter?.call(select, ${JSON.stringify(category)})
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })()`)
    await page.waitForSelector(`.wiki-surface__article--${category}`, 30_000)
    if (category === 'lore') {
      await page.evaluate(`[...document.querySelectorAll('.wiki-surface__lore details')].forEach((details) => { details.open = true })`)
    }
    await delay(50)
    await recordInspection(
      page,
      profile,
      fixture,
      locale,
      `wiki-${category}`,
    )
  }
}

async function inspectSettingsDialogVariants(
  page: ChromiumPage,
  profile: ViewportProfile,
  fixture: ProgressionMatrixFixture,
  locale: (typeof locales)[number],
): Promise<void> {
  for (const [index, name] of [['0', 'import'], ['1', 'export'], ['2', 'reset']] as const) {
    await page.evaluate(`(() => {
      const button = document.querySelectorAll('.settings-surface__save-actions button')[${index}]
      if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Settings ${name} action unavailable')
      button.click()
    })()`)
    await page.waitForSelector('.settings-surface__dialog', 30_000)
    await recordInspection(
      page,
      profile,
      fixture,
      locale,
      `settings-${name}-dialog`,
    )
    await waitForCondition(
      page,
      `document.querySelector('.settings-surface__dialog-actions button:not(:disabled)') !== null`,
      30_000,
    )
    await page.evaluate(`(() => {
      const close = document.querySelector('.settings-surface__dialog-actions button:not(:disabled)')
      if (!(close instanceof HTMLButtonElement)) throw new Error('Settings dialog close action missing')
      close.click()
    })()`)
    await waitForCondition(page, `document.querySelector('.settings-surface__dialog') === null`, 30_000)
  }
}

async function inspectRoute(
  page: ChromiumPage,
  locale: (typeof locales)[number],
) {
  return page.evaluate<{
    readonly documentLanguage: string
    readonly locale: string
    readonly localeFont: string
    readonly localeDocumentValid: boolean
    readonly horizontalOverflowPixels: number
    readonly overflowingElements: readonly string[]
    readonly clippedText: readonly { selector: string; text: string; excessWidth: number; excessHeight: number }[]
    readonly replacementCharacters: readonly string[]
    readonly emptyInteractiveNames: readonly string[]
    readonly rawIcuTokens: readonly string[]
    readonly englishLeakage: readonly string[]
  }>(`(() => {
    const root = document.documentElement
    const visible = (element) => {
      for (let current = element; current instanceof HTMLElement; current = current.parentElement) {
        const style = getComputedStyle(current)
        const rect = current.getBoundingClientRect()
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0 || rect.width <= 1 || rect.height <= 1) return false
      }
      return true
    }
    const selector = (element) => element.tagName.toLowerCase() +
      (element.id ? '#' + element.id : '') +
      (element.classList.length ? '.' + [...element.classList].slice(0, 3).join('.') : '')
    const overflowingElements = [...document.querySelectorAll('body *')]
      .filter((element) =>
        visible(element) &&
        element.children.length === 0 &&
        element.textContent?.trim() &&
        !element.closest('.dyson-swarm-visual') &&
        !element.closest('.skill-tree-viewport') &&
        element.getBoundingClientRect().right > root.clientWidth + 1,
      )
      .slice(0, 30)
      .map((element) => selector(element) + ': ' + element.textContent.trim().slice(0, 120))
    const clippedText = [...document.querySelectorAll('body *')]
      .filter((element) => {
        if (!visible(element) || !element.textContent?.trim() || element.children.length > 0) return false
        const style = getComputedStyle(element)
        if (['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflowY)) return false
        const clipsX = ['hidden', 'clip'].includes(style.overflowX) && element.scrollWidth > element.clientWidth + 1
        const clipsY = ['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1
        return clipsX || clipsY
      })
      .slice(0, 50)
      .map((element) => ({
        selector: selector(element),
        text: element.textContent.trim().slice(0, 160),
        excessWidth: Math.max(0, element.scrollWidth - element.clientWidth),
        excessHeight: Math.max(0, element.scrollHeight - element.clientHeight),
      }))
    const replacementCharacters = [...document.querySelectorAll('body *')]
      .filter((element) => element.children.length === 0 && visible(element) && element.textContent?.includes('\uFFFD'))
      .map((element) => selector(element) + ': ' + element.textContent.trim().slice(0, 160))
      .slice(0, 30)
    const emptyInteractiveNames = [...document.querySelectorAll('button, a, input, select, textarea')]
      .filter((element) => {
        if (!visible(element)) return false
        const labelledBy = element.getAttribute('aria-labelledby')
        const labelledText = labelledBy?.split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ') ?? ''
        const explicitLabel = element.id
          ? document.querySelector('label[for="' + CSS.escape(element.id) + '"]')?.textContent ?? ''
          : ''
        const wrappingLabel = element.closest('label')?.textContent ?? ''
        return !((element.getAttribute('aria-label') || labelledText || explicitLabel || wrappingLabel || element.textContent || element.getAttribute('title') || '').trim())
      })
      .map(selector)
      .slice(0, 30)
    const bodyText = document.body.innerText
    const rawIcuText = [...document.querySelectorAll('body *')]
      .filter((element) =>
        element.children.length === 0 &&
        visible(element) &&
        !element.closest('.reality-surface__designation'),
      )
      .map((element) => element.textContent ?? '')
      .join('\\n')
    const rawIcuTokens = rawIcuText.match(/[{][a-z][a-zA-Z0-9]*(?:[,}])/g) ?? []
    const englishLeakage = ${JSON.stringify(englishCandidatesByLocale[locale])}
      .filter((candidate) => bodyText.includes(candidate))
      .slice(0, 30)
    const expected = ${JSON.stringify({
      fr: { language: 'fr', font: 'latin' },
      de: { language: 'de', font: 'latin' },
      'es-419': { language: 'es-419', font: 'latin' },
      'pt-BR': { language: 'pt-BR', font: 'latin' },
      'zh-CN': { language: 'zh-Hans', font: 'cjk' },
      ru: { language: 'ru', font: 'latin' },
      ja: { language: 'ja', font: 'cjk' },
    })}[${JSON.stringify(locale)}]
    return {
      documentLanguage: root.lang,
      locale: root.dataset.locale ?? '',
      localeFont: root.dataset.localeFont ?? '',
      localeDocumentValid: root.dataset.locale === ${JSON.stringify(locale)} &&
        root.lang === expected.language && root.dataset.localeFont === expected.font,
      horizontalOverflowPixels: Math.max(0, root.scrollWidth - root.clientWidth),
      overflowingElements,
      clippedText,
      replacementCharacters,
      emptyInteractiveNames,
      rawIcuTokens,
      englishLeakage,
    }
  })()`)
}

async function activateRoute(page: ChromiumPage, route: string): Promise<void> {
  if (route === 'avocato') {
    await activateRoute(page, 'quantum')
    await page.evaluate(`(() => {
      const target = document.querySelector('[data-quantum-upgrade-id="Avocado"] button')
      if (!(target instanceof HTMLButtonElement) || target.disabled) throw new Error('Avocato route entry unavailable')
      target.click()
    })()`)
    await page.waitForSelector('.avocato-surface', 30_000)
    return
  }
  await page.evaluate(`(() => {
    const target = document.querySelector('[data-navigation-id=${JSON.stringify(route)}] .dyson-navigation__link')
    if (!(target instanceof HTMLElement) || target.matches(':disabled') || target.getAttribute('aria-disabled') === 'true') {
      throw new Error(${JSON.stringify(`Route ${route} unavailable`)})
    }
    target.click()
  })()`)
  await page.waitForSelector(routeReadySelectors[route] ?? '.dyson-shell', 30_000)
  await waitForCondition(page, `document.querySelector('.lazy-surface-pending') === null`, 30_000)
}

async function waitForCondition(page: ChromiumPage, expression: string, timeoutMilliseconds: number): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds
  while (Date.now() < deadline) {
    if (await page.evaluate<boolean>(expression)) return
    await delay(25)
  }
  throw new Error(`Timed out waiting for browser condition: ${expression}`)
}

function argumentValue(prefix: string): string | undefined {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}
