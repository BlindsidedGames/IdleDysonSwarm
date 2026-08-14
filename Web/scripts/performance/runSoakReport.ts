import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { migratePreparedSaveToV2 } from '../../src/game-state/mappingV2'
import { prepareImportedSaveText } from '../../src/save/import'
import { createMatureSchema12WebFixtureFromSource } from '../../src/save/matureSchema12Fixture'
import { prepareIdb1Save } from '../../src/save/prepare'
import { encodeSchema13WebSave, type Schema13PresentationPreferences } from '../../src/save/schema13'
import { DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME, DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS } from '../../src/ui/runtime'
import {
  interactFor,
  openChromiumPage,
  startProductionPreview,
  warmFirstSlice,
  type ChromiumPage,
  type ViewportProfile,
} from './chromiumHarness'
import {
  createSoakReport,
  performanceReportExitCode,
  performanceReportText,
  type ResourceCounts,
  type SoakSnapshot,
} from './performanceReport'
import {
  hasFlag,
  integerArgument,
  writePerformanceReport,
} from './reportArtifacts'

const webRoot = resolve(import.meta.dirname, '..', '..')
const argumentsList = process.argv.slice(2)
const smoke = hasFlag(argumentsList, 'smoke')
const durationMilliseconds = integerArgument(
  argumentsList,
  'duration-ms',
  smoke ? 10_000 : 30 * 60 * 1_000,
)
const warmupMilliseconds = integerArgument(
  argumentsList,
  'warmup-ms',
  smoke ? 7_000 : 15_000,
)
const port = integerArgument(argumentsList, 'port', 4_174)
const profile: ViewportProfile = {
  id: 'soak-390x844',
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  cpuThrottleRate: 1,
}
const seedPath = resolve(webRoot, 'dist', 'performance-seed.html')
const routeSurfaces = Object.freeze([
  ['research', '.research-surface'], ['skills', '.skills-surface'],
  ['infinity', '.infinity-surface'], ['reality', '.reality-surface'],
  ['simulations', '.simulations-surface'], ['quantum', '.quantum-surface'],
  ['store', '.store-surface'], ['story', '.story-surface'],
  ['wiki', '.wiki-surface'], ['offline-time', '.offline-time-surface'],
  ['statistics', '.statistics-surface'], ['settings', '.settings-surface'],
  ['bots', '.basic-facility-region'],
] as const)

writeFileSync(seedPath, '<!doctype html><html><body>performance seed</body></html>\n')
const preview = await startProductionPreview(webRoot, port)
let page: ChromiumPage | undefined
try {
  page = await openChromiumPage(profile, preview.url)
  await seedMatureCheckpoint(page, preview.url)
  await page.navigate(preview.url)
  await page.waitForSelector('.dyson-shell', 15_000)
  await warmEveryRoute(page)
  await warmFirstSlice(page, warmupMilliseconds)
  const baseline = await collectSnapshot(page)
  const samples: SoakSnapshot[] = []
  const sampleWindowMilliseconds = smoke ? 2_500 : 5 * 60 * 1_000
  let remainingMilliseconds = durationMilliseconds
  let activations = 0
  while (remainingMilliseconds > 0) {
    const windowMilliseconds = Math.min(sampleWindowMilliseconds, remainingMilliseconds)
    activations += await interactFor(page, windowMilliseconds)
    remainingMilliseconds -= windowMilliseconds
    samples.push(await collectSnapshot(page))
  }
  if (activations === 0) {
    throw new Error('The soak produced no Tinker activations.')
  }
  await new Promise((resolvePromise) => {
    setTimeout(resolvePromise, 1_000)
  })
  const final = await collectSnapshot(page)
  const report = createSoakReport({
    mode: smoke ? 'smoke' : 'acceptance',
    createdAtUtc: new Date().toISOString(),
    environment: page.environment,
    durationMilliseconds,
    warmupMilliseconds,
    explicitGarbageCollections: 4,
    baseline,
    final,
    samples,
  })
  const paths = writePerformanceReport(
    webRoot,
    'first-slice-retained-heap',
    report,
  )
  console.log(performanceReportText(report))
  console.log(`JSON: ${paths.jsonPath}`)
  console.log(`Text: ${paths.textPath}`)
  process.exitCode = performanceReportExitCode(report)
} finally {
  await page?.close()
  await preview.stop()
  unlinkSync(seedPath)
}

async function seedMatureCheckpoint(page: ChromiumPage, baseUrl: string): Promise<void> {
  const observedAtUtc = '2026-08-14T00:00:00.000Z'
  const prepared = prepareIdb1Save(readFileSync(
    resolve(webRoot, 'src', 'application', 'firstRun', 'generated', 'first-run-schema-12.idb1.txt'),
    'utf8',
  )).prepared
  const mature = createMatureSchema12WebFixtureFromSource(prepared.copyValidatedState(), {
    debugOptions: true,
    debugEverEnabled: true,
    unlockAllTabs: true,
  })
  const migrated = migratePreparedSaveToV2(
    prepareImportedSaveText(mature, observedAtUtc),
    Object.freeze({ kind: 'trusted-same-device' }),
  )
  const preferences: Schema13PresentationPreferences = Object.freeze({
    globalMute:false,screensaverEnabled:true,hidePurchased:false,buyMax:true,
    numberFormatting:2,skillsBuyOnTap:true,frameRate:120,botsButtonToggle:true,
    researchbuttonToggle:true,skillsButtonToggle:true,skillsFirstRunDone:true,
    infinityButtonToggle:true,infinityFirstRunDone:true,realityButtonToggle:true,
    realityFirstRun:true,simulationsButtonToggle:true,prestigeButtonToggle:true,
    prestigeFirstRun:true,settingsButtonToggle:true,firstReality:true,
  })
  const checkpoint = JSON.stringify({
    format:'ids-web-production-v2-checkpoint-v1',revision:1,
    portableSave:encodeSchema13WebSave({savedAtUtc:observedAtUtc,state:migrated.state,runtime:migrated.runtime}),
    preferences,platform:{debugOptions:true,debugEverEnabled:true,cheater:false,unlockAllTabs:true},
  })
  await page.cdp.send('Page.navigate', { url: `${baseUrl}performance-seed.html` })
  await page.waitForSelector('body')
  await page.evaluate(`(async()=>{const db=await new Promise((ok,fail)=>{const r=indexedDB.open(${JSON.stringify(DEVELOPMENT_ONLY_BROWSER_DATABASE_NAME)},1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('files'))d.createObjectStore('files',{keyPath:'path'});if(!d.objectStoreNames.contains('legacy-candidates'))d.createObjectStore('legacy-candidates',{keyPath:'id'});if(!d.objectStoreNames.contains('metadata'))d.createObjectStore('metadata',{keyPath:'key'})};r.onerror=()=>fail(r.error);r.onsuccess=()=>ok(r.result)});await new Promise((ok,fail)=>{const t=db.transaction('files','readwrite');t.objectStore('files').put({path:${JSON.stringify(DEVELOPMENT_ONLY_BROWSER_SAVE_PATHS.current)},contents:${JSON.stringify(checkpoint)}});t.oncomplete=()=>ok();t.onerror=()=>fail(t.error);t.onabort=()=>fail(t.error)});db.close()})()`)
}

async function warmEveryRoute(page: ChromiumPage): Promise<void> {
  for (const [route, selector] of routeSurfaces) {
    const activated = await page.evaluate<boolean>(`(()=>{const b=document.querySelector('.dyson-navigation__item[data-navigation-id=${JSON.stringify(route)}] button');if(!(b instanceof HTMLButtonElement)||b.disabled)return false;b.click();return true})()`)
    if (!activated) throw new Error(`The mature soak seed could not open ${route}.`)
    await page.waitForSelector(selector, 15_000)
  }
}

async function collectSnapshot(
  activePage: ChromiumPage,
): Promise<SoakSnapshot> {
  await activePage.collectGarbage()
  await activePage.collectGarbage()
  const [
    heapUsedBytes,
    dom,
    liveDomNodes,
    instrumented,
    subscriptions,
  ] = await Promise.all([
    activePage.readHeapUsedBytes(),
    activePage.readDomCounters(),
    activePage.evaluate<number>('document.querySelectorAll("*").length'),
    activePage.readInstrumentedResourceCounts(),
    activePage.readCallbackSubscriptionCounts(),
  ])
  const resources: ResourceCounts = {
    ...dom,
    liveDomNodes,
    ...instrumented,
    ...subscriptions,
  }
  return {
    heapUsedBytes,
    resources,
  }
}
