import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { createServer } from 'vite'
import { routeCanonicalGameCommand } from '../../src/application/canonicalGameCommands'
import { cloneCanonicalGameStateV2 } from '../../src/game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../../src/game-state/mappingV2'
import { hydrateGameState } from '../../src/game-state/mapping'
import type { CanonicalGameStateV1 } from '../../src/game-state/types'
import type { CanonicalGameStateV2 } from '../../src/game-state/typesV2'
import type { V2GameRuntimeRepository } from '../../src/inspection/v2GameRuntime'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  restoreGameDecimal,
} from '../../src/math/gameDecimal'
import { prepareIdb1Save } from '../../src/save/prepare'
import { decodeSchema13WebSave, encodeSchema13WebSave } from '../../src/save/schema13'
import type { Schema13PlatformState } from '../../src/save/schema13'
import { deserializeWebSave, serializeWebSave } from '../../src/save/serialization'
import {
  commitV2DysonFacilityPurchase,
  quoteV2DysonFacilityPurchase,
} from '../../src/simulation/dysonV2Commands'
import {
  commitInfinityShopPurchaseV2,
  quoteInfinityShopPurchaseV2,
} from '../../src/simulation/infinityShopV2'
import {
  commitV2ResearchPurchase,
  quoteV2ResearchPurchase,
} from '../../src/simulation/researchV2'
import { purchaseCanonicalSkillV2 } from '../../src/simulation/skillTransactionsV2'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixtureText = readFileSync(
  resolve(webRoot, 'test', 'fixtures', 'schema-08-canonical-idb1-main-save.txt'),
  'utf8',
)
const prepared = prepareIdb1Save(fixtureText).prepared
const hydrated = hydrateGameState(prepared)
const migrated = migratePreparedSaveToV2(
  prepared,
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const decimal = gameDecimalFromCanonicalString

const v1 = fundedV1(hydrated.state)
const v2 = fundedV2(migrated.state)
const runtimeV2 = migrated.runtime
const workerShapedSchema13Source = restoreTransferredGameDecimals(
  structuredClone({
    savedAtUtc: '2026-08-12T00:00:00.000Z',
    state: v2,
    runtime: runtimeV2,
  }),
)
deepFreeze(workerShapedSchema13Source)
const v1Options = Object.freeze({
  runtimeCarriers: Object.freeze({
    compatibilityTuning: hydrated.compatibilityTuning,
    skillEffectEvaluationSnapshot: hydrated.skillEffectEvaluationSnapshot,
    storedTimeCheater: false,
    selectedSkillPresetSlot: 1 as const,
  }),
  runtimeEvaluation: Object.freeze({
    evaluate: () => Object.freeze({
      accepted: true as const,
      snapshot: hydrated.skillEffectEvaluationSnapshot,
    }),
  }),
})

const scenarios = [
  scenario('assembly-line',
    () => routeCanonicalGameCommand(v1, {
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    }, v1Options),
    () => {
      const quote = quoteV2DysonFacilityPurchase(v2, 7, 'assembly_lines', 'buy-1', false)
      return commitV2DysonFacilityPurchase(quote, v2, 7)
    }),
  scenario('research-science-boost',
    () => routeCanonicalGameCommand(v1, {
      kind: 'research.purchase',
      researchId: 'research.science_boost',
    }, v1Options),
    () => {
      const quote = quoteV2ResearchPurchase(
        v2,
        runtimeV2,
        7,
        'research.science_boost',
        'buy-1',
        false,
      )
      return commitV2ResearchPurchase(quote, v2, runtimeV2, 7)
    }),
  scenario('skill-start-here',
    () => routeCanonicalGameCommand(v1, {
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    }, v1Options),
    () => purchaseCanonicalSkillV2(v2, 'startHereTree')),
  scenario('infinity-secret',
    () => routeCanonicalGameCommand(v1, {
      kind: 'infinity.purchase-shop-item',
      itemId: 'secret',
    }, v1Options),
    () => {
      const quote = quoteInfinityShopPurchaseV2(v2, 7, 'secret')
      return commitInfinityShopPurchaseV2(quote, v2, 7)
    }),
]

const codecScenarios = [
  codecScenario(
    'schema12-save-codec',
    () => serializeWebSave(prepared.copyValidatedState()),
    (encoded) => deserializeWebSave(encoded),
  ),
  codecScenario(
    'schema13-save-codec',
    () => encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-12T00:00:00.000Z',
      state: v2,
      runtime: runtimeV2,
    })),
    (encoded) => decodeSchema13WebSave(encoded),
  ),
  codecScenario(
    'schema13-save-codec-worker-shaped',
    () => encodeSchema13WebSave(workerShapedSchema13Source),
    (encoded) => decodeSchema13WebSave(encoded),
  ),
]
const activatedRuntime = await measureActivatedRuntimeFacade()

const report = Object.freeze({
  kind: 'break-infinity-command-comparison',
  capturedAtUtc: new Date().toISOString(),
  node: process.version,
  sampleCount: 40,
  warmupCount: 5,
  scenarios,
  codecScenarios,
  activatedRuntime,
  coverage: Object.freeze({
    baseline: 'pre-migration V1 canonical command authority and schema-12 codec',
    activated: 'V2 canonical command authorities and schema-13 codec used by /play/',
    directlyCompared: Object.freeze([
      'assembly-line purchase',
      'research purchase',
      'skill purchase',
      'Infinity shop purchase',
      'portable save encode/decode',
      'activated V2 runtime facade command plus projection',
      'activated V2 runtime facade checkpoint and fresh-controller reload',
    ]),
    gaps: Object.freeze([
      'This Node report does not measure React rendering or browser input latency on /play/.',
      'The facade checkpoint/reload comparison uses an in-memory repository; IndexedDB, writer-lease, service-worker, React, and network startup costs still require the production-browser harness.',
      'The V2 Tinker authority is ported and unit-tested, but comparative pointer-to-presentation timing still requires the production browser gesture harness.',
      'Active and Stored-Time worker throughput remain covered by their dedicated browser/worker reports rather than this command microbenchmark.',
    ]),
  }),
})
const outputPath = resolve(
  webRoot,
  'output',
  'migration-benchmark',
  'command-comparison.json',
)
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
for (const item of report.scenarios) {
  console.log(
    `${item.id}: V1 ${item.v1.medianMilliseconds.toFixed(3)} ms median / ` +
    `${item.v1.p95Milliseconds.toFixed(3)} ms P95; V2 ` +
    `${item.v2.medianMilliseconds.toFixed(3)} ms median / ` +
    `${item.v2.p95Milliseconds.toFixed(3)} ms P95`,
  )
}
for (const item of report.codecScenarios) {
  console.log(
    `${item.id}: encode ${item.encode.medianMilliseconds.toFixed(3)} ms median / ` +
    `decode ${item.decode.medianMilliseconds.toFixed(3)} ms median`,
  )
}
console.log(
  `activated-v2-runtime: command+projection ${activatedRuntime.commandAndProjection.medianMilliseconds.toFixed(3)} ms median; ` +
  `checkpoint ${activatedRuntime.checkpoint.medianMilliseconds.toFixed(3)} ms; ` +
  `fresh reload ${activatedRuntime.freshControllerReload.medianMilliseconds.toFixed(3)} ms`,
)
for (const gap of report.coverage.gaps) console.log(`GAP: ${gap}`)
console.log(`Wrote ${outputPath}`)

function scenario(
  id: string,
  runV1: () => unknown,
  runV2: () => unknown,
  sampleCount = 40,
) {
  assertAccepted(`${id}:v1`, runV1())
  assertAccepted(`${id}:v2`, runV2())
  return Object.freeze({
    id,
    v1: sample(runV1, sampleCount),
    v2: sample(runV2, sampleCount),
  })
}

function codecScenario(
  id: string,
  encode: () => string,
  decode: (encoded: string) => unknown,
) {
  const encoded = encode()
  decode(encoded)
  return Object.freeze({
    id,
    encodedBytes: Buffer.byteLength(encoded, 'utf8'),
    encode: sampleUnchecked(encode),
    decode: sampleUnchecked(() => decode(encoded)),
  })
}

function sample(run: () => unknown, count = 40) {
  for (let index = 0; index < 5; index += 1) assertAccepted('warmup', run())
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const started = performance.now()
    const result = run()
    const finished = performance.now()
    assertAccepted('sample', result)
    values.push(finished - started)
  }
  values.sort((left, right) => left - right)
  return Object.freeze({
    minimumMilliseconds: values[0]!,
    medianMilliseconds: percentile(values, 0.5),
    p95Milliseconds: percentile(values, 0.95),
    maximumMilliseconds: values.at(-1)!,
  })
}

function sampleUnchecked(run: () => unknown) {
  for (let index = 0; index < 5; index += 1) run()
  const values: number[] = []
  for (let index = 0; index < 40; index += 1) {
    const started = performance.now()
    run()
    values.push(performance.now() - started)
  }
  values.sort((left, right) => left - right)
  return Object.freeze({
    minimumMilliseconds: values[0]!,
    medianMilliseconds: percentile(values, 0.5),
    p95Milliseconds: percentile(values, 0.95),
    maximumMilliseconds: values.at(-1)!,
  })
}

async function measureActivatedRuntimeFacade() {
  installRuntimeDocumentProbe()
  const server = await createServer({
    root: webRoot,
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  const loaded = await server.ssrLoadModule('/src/inspection/v2GameRuntime.ts') as {
    readonly createV2GameRuntimeController:
      typeof import('../../src/inspection/v2GameRuntime')['createV2GameRuntimeController']
  }
  const loadedCodec = await server.ssrLoadModule('/src/save/schema13.ts') as {
    readonly encodeSchema13WebSave: typeof encodeSchema13WebSave
    readonly decodeSchema13WebSave: typeof decodeSchema13WebSave
  }
  const createV2GameRuntimeController = loaded.createV2GameRuntimeController
  const repository = createBenchmarkRuntimeRepository(
    encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-12T00:00:00.000Z', state: v2, runtime: runtimeV2,
    })),
    loadedCodec.encodeSchema13WebSave,
    loadedCodec.decodeSchema13WebSave,
  )
  const lifecycle = Object.freeze({
    currentPhase: () => 'background' as const,
    subscribe: () => () => undefined,
  })
  try {
    const controller = createV2GameRuntimeController({ repository, lifecycle })
    const started = await controller.runtime.start()
    if (started.phase !== 'ready') {
      throw new Error(`Activated V2 runtime did not start: ${JSON.stringify(started)}`)
    }
    const buyOne = await controller.runtime.dispatchPlayer({
      kind: 'dyson.set-buy-mode',
      buyMode: 'buy-1',
    })
    if (buyOne.status !== 'accepted') {
      throw new Error('Activated V2 runtime could not select Buy 1.')
    }
    const commandAndProjection = await sampleAsync(async () => {
      const result = await controller.runtime.dispatchPlayer({
        kind: 'dyson.purchase-basic-facility',
        facilityId: 'assembly_lines',
      })
      if (result.status !== 'accepted') {
        throw new Error(`Activated V2 assembly command failed: ${JSON.stringify(result)}`)
      }
      controller.runtime.snapshot()
    }, 12)
    const checkpoint = await sampleAsync(async () => {
      if (!(await controller.runtime.requestCheckpoint())) {
        throw new Error('Activated V2 checkpoint failed.')
      }
    }, 12)
    await controller.runtime.shutdown()
    const freshControllerReload = await sampleAsync(async () => {
      const fresh = createV2GameRuntimeController({ repository, lifecycle })
      const status = await fresh.runtime.start()
      if (status.phase !== 'ready') throw new Error('Fresh V2 controller did not reload.')
      fresh.runtime.snapshot()
      await fresh.runtime.shutdown()
    }, 8)
    return Object.freeze({
      repository: 'in-memory production-shaped V2 repository',
      commandAndProjection,
      checkpoint,
      freshControllerReload,
    })
  } finally {
    await server.close()
  }
}

async function sampleAsync(run: () => Promise<void>, count: number) {
  await run()
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    const started = performance.now()
    await run()
    values.push(performance.now() - started)
  }
  values.sort((left, right) => left - right)
  return Object.freeze({
    minimumMilliseconds: values[0]!,
    medianMilliseconds: percentile(values, 0.5),
    p95Milliseconds: percentile(values, 0.95),
    maximumMilliseconds: values.at(-1)!,
  })
}

function installRuntimeDocumentProbe(): void {
  if (typeof document !== 'undefined') return
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: Object.freeze({
      documentElement: Object.freeze({ dataset: {} as Record<string, string> }),
    }),
  })
}

function createBenchmarkRuntimeRepository(
  initialText: string,
  encode: typeof encodeSchema13WebSave,
  decode: typeof decodeSchema13WebSave,
): V2GameRuntimeRepository {
  const platform = Object.freeze({
    debugOptions: false,
    debugEverEnabled: false,
    cheater: false,
    unlockAllTabs: false,
  }) satisfies Readonly<Schema13PlatformState>
  let revision = 7
  let text = initialText
  return Object.freeze({
    recoverNewestValid: async () => Object.freeze({
      save: decode(text),
      platform,
      revision,
    }),
    checkpointPrepared: async (source, _platform, nextRevision) => {
      text = encode(source)
      revision = nextRevision
    },
    importPortable: async () => { throw new Error('Benchmark import is not used.') },
    exportPortable: async () => text,
    exportRetainedImport: async () => null,
    cleanup: async () => { throw new Error('Benchmark cleanup is not used.') },
  })
}

function percentile(values: readonly number[], percentileValue: number): number {
  return values[Math.min(values.length - 1, Math.ceil(values.length * percentileValue) - 1)]!
}

function assertAccepted(label: string, result: unknown): void {
  if (typeof result !== 'object' || result === null) {
    throw new Error(`${label} returned no result.`)
  }
  const record = result as Readonly<Record<string, unknown>>
  if (record.accepted === false) {
    throw new Error(`${label} was rejected: ${String(record.code ?? record.reason)}`)
  }
  if ('transition' in record && typeof record.transition === 'object' && record.transition !== null) {
    const transition = record.transition as Readonly<Record<string, unknown>>
    if (transition.accepted === false) {
      throw new Error(`${label} transition was rejected: ${String(transition.code)}`)
    }
  }
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function restoreTransferredGameDecimals<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  const names = Object.getOwnPropertyNames(value).sort()
  if (
    names.length === 2 && names[0] === 'exponent' && names[1] === 'mantissa' &&
    typeof (value as { mantissa?: unknown }).mantissa === 'number' &&
    typeof (value as { exponent?: unknown }).exponent === 'number'
  ) {
    return restoreGameDecimal(value) as T
  }
  for (const key of Object.keys(value)) {
    const record = value as Record<string, unknown>
    record[key] = restoreTransferredGameDecimals(record[key])
  }
  return value
}

function fundedV1(source: CanonicalGameStateV1): CanonicalGameStateV1 {
  const startHere = source.skills.byId.startHereTree
  if (startHere === undefined) throw new Error('The V1 Skill fixture is incomplete.')
  return {
    ...source,
    dyson: {
      ...source.dyson,
      money: 1e100,
      science: 1e100,
    },
    infinity: {
      ...source.infinity,
      points: 1_000n,
      spentPoints: 0n,
      secretsOfTheUniverse: 0n,
    },
    skills: {
      ...source.skills,
      points: 1_000n,
      byId: {
        ...source.skills.byId,
        startHereTree: { ...startHere, owned: false, level: 0 },
      },
    },
  }
}

function fundedV2(source: CanonicalGameStateV2): CanonicalGameStateV2 {
  const startHere = source.skills.byId.startHereTree
  if (startHere === undefined) throw new Error('The V2 Skill fixture is incomplete.')
  return cloneCanonicalGameStateV2({
    ...source,
    dyson: {
      ...source.dyson,
      money: decimal('1e100'),
      science: decimal('1e100'),
    },
    infinity: {
      ...source.infinity,
      availablePoints: gameDecimalFromNumber(1_000),
      allocatedPoints: gameDecimalFromNumber(0),
      secretsOfTheUniverse: 0n,
    },
    skills: {
      ...source.skills,
      points: 1_000n,
      byId: {
        ...source.skills.byId,
        startHereTree: { ...startHere, owned: false, level: 0n },
      },
    },
  })
}
