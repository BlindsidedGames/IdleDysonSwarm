import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import { createCanonicalRuntimePublicationV2 } from '../../src/application/canonicalRuntimeSessionV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../../src/application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../../src/game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../src/game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../../src/game-state/typesV2'
import {
  GAME_DECIMAL_EXPONENT_LIMIT,
  gameDecimalFromCanonicalString,
} from '../../src/math/gameDecimal'
import { prepareImportedSaveText } from '../../src/save/import'
import { createMatureSchema12WebFixtureFromSource } from '../../src/save/matureSchema12Fixture'
import { prepareIdb1Save } from '../../src/save/prepare'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
  type Schema13PresentationPreferences,
} from '../../src/save/schema13'
import { openChromiumPage, startProductionPreview, type ChromiumPage } from './chromiumHarness'
import { selectFrontendApplicationSnapshotV2 } from '../../src/inspection/frontendSnapshotV2'
import { createCanonicalTinkerRuntimeState } from '../../src/simulation/canonicalTinker'
import { integerArgument } from './reportArtifacts'

const webRoot = resolve(import.meta.dirname, '..', '..')
const argumentsList = process.argv.slice(2)
const port = integerArgument(argumentsList, 'port', 4_175)
const seedPath = resolve(webRoot, 'dist', 'performance-seed.html')
const databaseName = 'idle-dyson-swarm-web-development-v1'
const currentPath = '/development-only/development-only-default-profile/current.idsw'
const profileCases = Object.freeze([
  ...[300, 1_000, 5_000, 10_000, 20_000, 1_000_000].map((exponent) =>
    Object.freeze({ exponent, saturation: 'all-scalable' as const })),
  Object.freeze({
    exponent: GAME_DECIMAL_EXPONENT_LIMIT - 1,
    saturation: 'money-only' as const,
  }),
  Object.freeze({
    exponent: GAME_DECIMAL_EXPONENT_LIMIT - 1,
    saturation: 'all-scalable' as const,
  }),
])
const firstRunFixture = readFileSync(
  resolve(webRoot, 'src', 'application', 'firstRun', 'generated', 'first-run-schema-12.idb1.txt'),
  'utf8',
)
const source = prepareIdb1Save(firstRunFixture).prepared.copyValidatedState()
const matureSchema12 = createMatureSchema12WebFixtureFromSource(source, {
  debugOptions: true,
  debugEverEnabled: true,
  unlockAllTabs: true,
})
const migrated = migratePreparedSaveToV2(
  prepareImportedSaveText(matureSchema12, '2026-08-14T00:00:00.000Z'),
  Object.freeze({ kind: 'trusted-same-device' }),
)

const routes = Object.freeze([
  ['research', '.research-surface'],
  ['skills', '.skills-surface'],
  ['infinity', '.infinity-surface'],
  ['reality', '.reality-surface'],
  ['simulations', '.simulations-surface'],
  ['quantum', '.quantum-surface'],
  ['store', '.store-surface'],
  ['story', '.story-surface'],
  ['wiki', '.wiki-surface'],
  ['offline-time', '.offline-time-surface'],
  ['statistics', '.statistics-surface'],
  ['settings', '.settings-surface'],
] as const)

const preferences: Schema13PresentationPreferences = Object.freeze({
  globalMute: false,
  screensaverEnabled: true,
  hidePurchased: false,
  buyMax: true,
  numberFormatting: 2,
  skillsBuyOnTap: true,
  frameRate: 120,
  botsButtonToggle: true,
  researchbuttonToggle: true,
  skillsButtonToggle: true,
  skillsFirstRunDone: true,
  infinityButtonToggle: true,
  infinityFirstRunDone: true,
  realityButtonToggle: true,
  realityFirstRun: true,
  simulationsButtonToggle: true,
  prestigeButtonToggle: true,
  prestigeFirstRun: true,
  settingsButtonToggle: true,
  firstReality: true,
})

writeFileSync(seedPath, '<!doctype html><html><body>performance seed</body></html>\n')
const preview = await startProductionPreview(webRoot, port)
try {
  const profiles = []
  for (const profileCase of profileCases) {
    const { exponent, saturation } = profileCase
    const state = stateAtExponent(migrated.state, exponent, saturation)
    const sourceValue = Object.freeze({
      savedAtUtc: '2026-08-14T00:00:00.000Z',
      state,
      runtime: migrated.runtime,
    })
    const codec = measureCodec(sourceValue)
    const portableSave = encodeSchema13WebSave(sourceValue)
    const checkpoint = JSON.stringify({
      format: 'ids-web-production-v2-checkpoint-v1',
      revision: 1,
      portableSave,
      preferences,
      platform: {
        debugOptions: true,
        debugEverEnabled: true,
        cheater: false,
        unlockAllTabs: true,
      },
    })
    const page = await openChromiumPage({
      id: `large-number-${exponent}-${saturation}`,
      width: 1_440,
      height: 900,
      deviceScaleFactor: 1,
      cpuThrottleRate: 1,
    }, preview.url)
    try {
      await seed(page, preview.url, checkpoint)
      profiles.push(await profile(page, preview.url, exponent, saturation, codec, portableSave.length))
    } finally {
      await page.close()
    }
  }
  const overflow = measureOverflowBehavior()
  const report = Object.freeze({
    kind: 'game-decimal-large-number-range',
    createdAtUtc: new Date().toISOString(),
    exponentLimitExclusive: GAME_DECIMAL_EXPONENT_LIMIT,
    profiles,
    overflow,
    maximumProjectionByDomain: measureMaximumProjectionByDomain(),
  })
  const outputRoot = resolve(webRoot, 'output', 'performance')
  mkdirSync(outputRoot, { recursive: true })
  const outputPath = resolve(outputRoot, 'large-number-range.json')
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  console.log(`JSON: ${outputPath}`)
} finally {
  await preview.stop()
  unlinkSync(seedPath)
}

function stateAtExponent(
  baseline: Readonly<CanonicalGameStateV2>,
  exponent: number,
  saturation: 'money-only' | 'all-scalable' = 'all-scalable',
): CanonicalGameStateV2 {
  const high = gameDecimalFromCanonicalString(`1e${exponent}`)
  const lower = gameDecimalFromCanonicalString(`5e${Math.max(0, exponent - 1)}`)
  if (saturation === 'money-only') {
    return cloneCanonicalGameStateV2({
      ...baseline,
      dyson: { ...baseline.dyson, money: high },
    })
  }
  return cloneCanonicalGameStateV2({
    ...baseline,
    dyson: {
      ...baseline.dyson,
      money: high,
      science: lower,
      bots: high,
      workers: lower,
      researchers: lower,
      totalPanelsDecayed: lower,
    },
    infinity: {
      ...baseline.infinity,
      availablePoints: high,
      allocatedPoints: lower,
      breakTarget: high,
      lastPointsGained: lower,
    },
    reality: {
      ...baseline.reality,
      universeDesignationCount: high,
      influence: high,
    },
    quantum: {
      ...baseline.quantum,
      availableShards: high,
      lifetimeEarnedShards: high,
      influenceSpeedBonus: high,
      cashBonusLevels: high,
      scienceBonusLevels: high,
    },
  })
}

function measureCodec(sourceValue: Parameters<typeof encodeSchema13WebSave>[0]) {
  const encodeSamples = []
  const decodeSamples = []
  for (let index = 0; index < 12; index += 1) {
    const encodeStarted = performance.now()
    const encoded = encodeSchema13WebSave(sourceValue)
    encodeSamples.push(performance.now() - encodeStarted)
    const decodeStarted = performance.now()
    decodeSchema13WebSave(encoded)
    decodeSamples.push(performance.now() - decodeStarted)
  }
  return {
    encodeMedianMilliseconds: median(encodeSamples.slice(2)),
    decodeMedianMilliseconds: median(decodeSamples.slice(2)),
  }
}

async function seed(page: ChromiumPage, baseUrl: string, checkpoint: string) {
  await page.cdp.send('Page.navigate', { url: `${baseUrl}performance-seed.html` })
  await page.waitForSelector('body')
  await page.evaluate(`(async () => {
    const database = await new Promise((resolvePromise, rejectPromise) => {
      const request = indexedDB.open(${JSON.stringify(databaseName)}, 1)
      request.onupgradeneeded = () => {
        const value = request.result
        if (!value.objectStoreNames.contains('files')) value.createObjectStore('files', { keyPath: 'path' })
        if (!value.objectStoreNames.contains('legacy-candidates')) value.createObjectStore('legacy-candidates', { keyPath: 'id' })
        if (!value.objectStoreNames.contains('metadata')) value.createObjectStore('metadata', { keyPath: 'key' })
      }
      request.onerror = () => rejectPromise(request.error)
      request.onsuccess = () => resolvePromise(request.result)
    })
    await new Promise((resolvePromise, rejectPromise) => {
      const transaction = database.transaction('files', 'readwrite')
      transaction.objectStore('files').put({ path: ${JSON.stringify(currentPath)}, contents: ${JSON.stringify(checkpoint)} })
      transaction.oncomplete = () => resolvePromise(undefined)
      transaction.onerror = () => rejectPromise(transaction.error)
      transaction.onabort = () => rejectPromise(transaction.error)
    })
    database.close()
    return true
  })()`)
}

async function profile(
  page: ChromiumPage,
  baseUrl: string,
  exponent: number,
  saturation: 'money-only' | 'all-scalable',
  codec: Readonly<Record<string, number>>,
  encodedCharacters: number,
) {
  const started = performance.now()
  await page.cdp.send('Page.navigate', { url: baseUrl })
  try {
    await page.waitForSelector('.dyson-shell', 15_000)
  } catch (error) {
    return {
      exponent,
      saturation,
      status: 'startup-failed',
      encodedCharacters,
      codec,
      startupMilliseconds: performance.now() - started,
      diagnostic: await page.evaluate(`document.body.textContent?.replace(/\\s+/g, ' ').slice(0, 2000) ?? ''`),
      error: error instanceof Error ? error.message : String(error),
    }
  }
  const startupMilliseconds = performance.now() - started
  const displayedCash = await page.evaluate(
    `document.querySelector('.dyson-resource-header__item--cash .ui-resource-value__value bdi')?.textContent ?? null`,
  )
  const routeMilliseconds: Record<string, number | string> = {}
  for (const [route, selector] of routes) {
    const routeStarted = performance.now()
    try {
      const activated = await page.evaluate<boolean>(`(() => {
        const button = document.querySelector('.dyson-navigation__item[data-navigation-id=${JSON.stringify(route)}] button')
        if (!(button instanceof HTMLButtonElement) || button.disabled) return false
        button.click()
        return true
      })()`)
      if (!activated) throw new Error('route unavailable')
      await page.waitForSelector(selector, 15_000)
      routeMilliseconds[route] = performance.now() - routeStarted
    } catch (error) {
      routeMilliseconds[route] = `FAILED: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return {
    exponent,
    saturation,
    status: 'ready',
    encodedCharacters,
    codec,
    startupMilliseconds,
    displayedCash,
    routeMilliseconds,
    runtimeStatus: await page.evaluate(`Object.fromEntries(Object.entries(document.documentElement.dataset).filter(([key]) => key.startsWith('v2')))`) ,
  }
}

function measureOverflowBehavior() {
  const maximumExponent = GAME_DECIMAL_EXPONENT_LIMIT - 1
  const outcomes: Record<string, string> = {}
  for (const [id, operation] of [
    ['construct-maximum', () => gameDecimalFromCanonicalString(`1e${maximumExponent}`)],
    ['construct-limit', () => gameDecimalFromCanonicalString(`1e${GAME_DECIMAL_EXPONENT_LIMIT}`)],
    ['construct-negative-limit', () => gameDecimalFromCanonicalString(`1e-${GAME_DECIMAL_EXPONENT_LIMIT}`)],
  ] as const) {
    try {
      operation()
      outcomes[id] = 'accepted'
    } catch (error) {
      outcomes[id] = `${error instanceof Error ? error.name : 'Error'}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return outcomes
}

function measureMaximumProjectionByDomain() {
  const exponent = GAME_DECIMAL_EXPONENT_LIMIT - 1
  const high = gameDecimalFromCanonicalString(`1e${exponent}`)
  const lower = gameDecimalFromCanonicalString(`5e${exponent - 1}`)
  const outcomes: Record<string, string> = {}
  for (const domain of ['money', 'dyson', 'infinity', 'reality', 'quantum', 'combined'] as const) {
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: domain === 'money'
        ? { ...migrated.state.dyson, money: high }
        : domain === 'dyson' || domain === 'combined'
          ? { ...migrated.state.dyson, money: high, science: lower, bots: high, workers: lower, researchers: lower, totalPanelsDecayed: lower }
          : migrated.state.dyson,
      infinity: domain === 'infinity' || domain === 'combined'
        ? { ...migrated.state.infinity, availablePoints: high, allocatedPoints: lower, breakTarget: high, lastPointsGained: lower }
        : migrated.state.infinity,
      reality: domain === 'reality' || domain === 'combined'
        ? { ...migrated.state.reality, universeDesignationCount: high, influence: high }
        : migrated.state.reality,
      quantum: domain === 'quantum' || domain === 'combined'
        ? { ...migrated.state.quantum, availableShards: high, lifetimeEarnedShards: high, influenceSpeedBonus: high, cashBonusLevels: high, scienceBonusLevels: high }
        : migrated.state.quantum,
    })
    try {
      selectFrontendApplicationSnapshotV2(
        createCanonicalRuntimePublicationV2({ revision: 1, state, runtime: migrated.runtime }),
        { session: 1, state: 1, durable: 1 },
        'clean',
        'bots',
        createCanonicalTinkerRuntimeState(),
        issueInfinityRewardAuthorityV2ForApplication({ doubleInfinityPoints: false }),
      )
      outcomes[domain] = 'accepted'
    } catch (error) {
      outcomes[domain] = `${error instanceof Error ? error.name : 'Error'}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  return outcomes
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}
