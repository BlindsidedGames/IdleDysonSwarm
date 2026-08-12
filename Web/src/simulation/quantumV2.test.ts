import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'
import ts from 'typescript'

import { getGameAssetsByKind } from '../game-data/catalog'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { gameDecimalFromCanonicalString, gameDecimalFromNumber, gameDecimalToCanonicalString } from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import {
  QUANTUM_V2_DEFINITIONS, QUANTUM_V2_GENERATED_KIND, QUANTUM_V2_UPGRADE_IDS,
  compileQuantumV2Catalog, validateQuantumV2CatalogIngress,
} from './quantumCatalogV2'
import { commitQuantumUpgradeV2, previewQuantumSectionsV2, quoteQuantumUpgradeV2 } from './quantumV2'

const baseState = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
).state

function stateWith(options: Readonly<{
  available?: string
  lifetime?: string
  divisions?: bigint
  secrets?: bigint
  sessionSecrets?: bigint
  influence?: string
  cash?: string
  science?: string
  unlocks?: Partial<CanonicalGameStateV2['quantum']['unlocks']>
}> = {}): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2({
    ...baseState,
    quantum: {
      ...baseState.quantum,
      availableShards: decimal(options.available ?? '0'),
      lifetimeEarnedShards: decimal(options.lifetime ?? options.available ?? '0'),
      divisionsPurchased: options.divisions ?? 0n,
      permanentSecrets: options.secrets ?? 0n,
      influenceSpeedBonus: decimal(options.influence ?? '0'),
      cashBonusLevels: decimal(options.cash ?? '0'),
      scienceBonusLevels: decimal(options.science ?? '0'),
      unlocks: { ...baseState.quantum.unlocks, ...options.unlocks },
    },
    infinity: {
      ...baseState.infinity,
      secretsOfTheUniverse: options.sessionSecrets ?? options.secrets ?? 0n,
    },
  })
}

function decimal(value: string) {
  return value.includes('e')
    ? gameDecimalFromCanonicalString(value)
    : gameDecimalFromNumber(Number(value))
}

describe('Quantum V2 generated catalog', () => {
  test('closes all 17 generated and 3 compatibility definitions with authored policies', () => {
    expect(QUANTUM_V2_UPGRADE_IDS).toHaveLength(20)
    expect(Object.keys(QUANTUM_V2_DEFINITIONS)).toEqual([...QUANTUM_V2_UPGRADE_IDS])
    expect(Object.values(QUANTUM_V2_DEFINITIONS).filter((entry) => entry.source === 'generated-unity-asset')).toHaveLength(17)
    expect(QUANTUM_V2_DEFINITIONS.DoubleIP).toMatchObject({ costScaling: 'flat', repeatable: false, maximumPurchases: 1n })
    expect(gameDecimalToCanonicalString(QUANTUM_V2_DEFINITIONS.DoubleIP.baseCost)).toBe('1e0')
    expect(QUANTUM_V2_DEFINITIONS.Division.maximumPurchases).toBe(19n)
    expect(QUANTUM_V2_DEFINITIONS.Secrets).toMatchObject({ maximumPurchases: 9n, unitsPerPurchase: 3n })
    expect(QUANTUM_V2_DEFINITIONS.InfluenceSpeed.unitsPerPurchase).toBe(4n)
    expect(QUANTUM_V2_DEFINITIONS.MatrioshkaBrains.source).toBe('unity-compatibility-fallback')
    expect(Object.isFrozen(QUANTUM_V2_DEFINITIONS)).toBe(true)
  })

  test('rejects duplicate, missing, extra, altered, accessor, and prototype-hostile ingress', () => {
    const genuine = getGameAssetsByKind(QUANTUM_V2_GENERATED_KIND)
    expect(validateQuantumV2CatalogIngress(genuine)).toBe(true)
    expect(validateQuantumV2CatalogIngress(genuine.slice(1))).toBe(false)
    expect(validateQuantumV2CatalogIngress([...genuine, genuine[0]!])).toBe(false)
    expect(validateQuantumV2CatalogIngress([genuine[0], genuine[0], ...genuine.slice(2)])).toBe(false)
    expect(validateQuantumV2CatalogIngress(genuine.map((asset, index) => index === 0 ? { ...asset, data: { ...asset.data, baseCost: 999 } } : asset))).toBe(false)
    expect(validateQuantumV2CatalogIngress(genuine.map((asset, index) => index === 0 ? { ...asset, data: { ...asset.data, costScaling: -0 } } : asset))).toBe(false)
    expect(validateQuantumV2CatalogIngress(genuine.map((asset, index) => index === 0 ? { ...asset, data: { ...asset.data, extra: 1 } } : asset))).toBe(false)
    let getters = 0
    const accessor = Object.defineProperty({}, 'id', { enumerable: true, get() { getters += 1; return 'Automation' } })
    expect(validateQuantumV2CatalogIngress([accessor, ...genuine.slice(1)])).toBe(false)
    expect(getters).toBe(0)
    const altered = [...genuine]
    Object.setPrototypeOf(altered, null)
    expect(validateQuantumV2CatalogIngress(altered)).toBe(false)
    expect(() => compileQuantumV2Catalog(altered)).toThrow()
    const nonEnumerable = genuine.map((asset, index) => index === 0
      ? Object.defineProperty({ kind: asset.kind, data: asset.data }, 'id', { value: asset.id, enumerable: false })
      : asset)
    expect(validateQuantumV2CatalogIngress(nonEnumerable)).toBe(false)
  })
})

describe('Quantum V2 quotes and commits', () => {
  test('debits one shard for DoubleIP and changes only its gameplay unlock', () => {
    const source = stateWith({ available: '1', lifetime: '9' })
    const quote = quoteQuantumUpgradeV2(source, 7, 'DoubleIP')
    expect(gameDecimalToCanonicalString(quote.quotedCost)).toBe('1e0')
    const result = commitQuantumUpgradeV2(quote, source, 7)
    expect(result).toMatchObject({ accepted: true, purchased: true, changed: true, revision: 8 })
    expect(gameDecimalToCanonicalString(result.state.quantum.availableShards)).toBe('0')
    expect(gameDecimalToCanonicalString(result.state.quantum.lifetimeEarnedShards)).toBe('9e0')
    expect(result.state.quantum.unlocks.doubleInfinityPoints).toBe(true)
    expect(source.quantum.unlocks.doubleInfinityPoints).toBe(false)
  })

  test('applies exact caps and Division exponential costs', () => {
    const division = stateWith({ available: '1048576', divisions: 18n })
    const divisionQuote = quoteQuantumUpgradeV2(division, 0, 'Division')
    expect(gameDecimalToCanonicalString(divisionQuote.quotedCost)).toBe('5.24288e5')
    const divided = commitQuantumUpgradeV2(divisionQuote, division, 0)
    expect(divided.state.quantum.divisionsPurchased).toBe(19n)
    expect(quoteQuantumUpgradeV2(divided.state, 1, 'Division').status).toBe('already-maxed')

    const secrets = stateWith({ available: '1', secrets: 24n, sessionSecrets: 0n })
    const secretQuote = quoteQuantumUpgradeV2(secrets, 4, 'Secrets')
    expect(secretQuote.status).toBe('ready')
    const secretResult = commitQuantumUpgradeV2(secretQuote, secrets, 4)
    expect(secretResult).toMatchObject({ accepted: true, purchased: true, changed: true, status: 'ready' })
    expect(secretResult.state.quantum.permanentSecrets).toBe(27n)
    expect(secretResult.state.infinity.secretsOfTheUniverse).toBe(3n)
    expect(quoteQuantumUpgradeV2(secretResult.state, 5, 'Secrets').status).toBe('already-maxed')

    for (const [permanent, session, expectedSession] of [[25n, 0n, 3n], [26n, 26n, 27n]] as const) {
      const partial = stateWith({ available: '1', secrets: permanent, sessionSecrets: session })
      const partialResult = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(partial, 0, 'Secrets'), partial, 0)
      expect(partialResult.accepted).toBe(true)
      expect(partialResult.state.quantum.permanentSecrets).toBe(27n)
      expect(partialResult.state.infinity.secretsOfTheUniverse).toBe(expectedSession)
      expect(gameDecimalToCanonicalString(partialResult.batches)).toBe('1e0')
    }
  })

  test('enforces sequential mega prerequisites', () => {
    const source = stateWith({ available: '100', unlocks: { breakTheLoop: true } })
    expect(quoteQuantumUpgradeV2(source, 0, 'BirchPlanets').status).toBe('prerequisites-not-met')
    const matrioshka = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 0, 'MatrioshkaBrains'), source, 0)
    expect(quoteQuantumUpgradeV2(matrioshka.state, 1, 'BirchPlanets').status).toBe('ready')
    expect(quoteQuantumUpgradeV2(matrioshka.state, 1, 'GalacticBrains').status).toBe('prerequisites-not-met')
  })

  test('reveals from lifetime shards without spending or purchase mutation', () => {
    const below = previewQuantumSectionsV2(stateWith({ available: '1000', lifetime: '2' }))
    expect(below.find((section) => section.id === 'skill-paths')?.revealed).toBe(false)
    const threshold = previewQuantumSectionsV2(stateWith({ lifetime: '20', unlocks: { breakTheLoop: true } }))
    expect(Object.fromEntries(threshold.map((section) => [section.id, section.revealed]))).toMatchObject({
      core: true, 'skill-paths': true, boosters: true, 'cosmic-structures': true, avocato: true,
    })
  })

  test('applies Automation cross-domain flags and Fragments never mutates the derived counter', () => {
    const source = stateWith({ available: '10' })
    const automated = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 1, 'Automation'), source, 1)
    expect(automated.state.quantum.unlocks.automation).toBe(true)
    expect(automated.state.infinity.automationUnlocked).toEqual({ research: true, bots: true })
    const fragments = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(automated.state, 2, 'Fragments'), automated.state, 2)
    expect(fragments.state.quantum.unlocks.fragments).toBe(true)
    expect(fragments.state.skills.fragments).toBe(source.skills.fragments)
  })

  test('maps every one-time upgrade to its closed V2 gameplay effect', () => {
    const cases = [
      ['BotMultitasking', 'botMultitasking'], ['DoubleIP', 'doubleInfinityPoints'],
      ['BreakTheLoop', 'breakTheLoop'], ['QuantumEntanglement', 'quantumEntanglement'],
      ['Fragments', 'fragments'], ['Purity', 'purity'], ['Terra', 'terra'],
      ['Power', 'power'], ['Paragade', 'paragade'], ['Stellar', 'stellar'],
      ['MatrioshkaBrains', 'matrioshkaBrains'], ['BirchPlanets', 'birchPlanets'],
      ['GalacticBrains', 'galacticBrains'],
    ] as const
    for (const [id, key] of cases) {
      const source = stateWith({
        available: '100',
        unlocks: id === 'BirchPlanets'
          ? { breakTheLoop: true, matrioshkaBrains: true }
          : id === 'GalacticBrains'
            ? { breakTheLoop: true, matrioshkaBrains: true, birchPlanets: true }
            : id === 'MatrioshkaBrains' ? { breakTheLoop: true } : {},
      })
      const result = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 0, id), source, 0)
      expect(result.accepted, id).toBe(true)
      expect(result.state.quantum.unlocks[key], id).toBe(true)
    }
    const avocado = stateWith({ available: '100' })
    expect(commitQuantumUpgradeV2(quoteQuantumUpgradeV2(avocado, 0, 'Avocado'), avocado, 0).state.avocado.unlocked).toBe(true)
  })

  test('allows bulk only for boosters and caps fixed Buy Max at 1000 batches', () => {
    const source = stateWith({ available: '100000' })
    expect(quoteQuantumUpgradeV2(source, 0, 'DoubleIP', 'buy-10').status).toBe('bulk-mode-forbidden')
    const quote = quoteQuantumUpgradeV2(source, 0, 'InfluenceSpeed', 'buy-max')
    expect(gameDecimalToCanonicalString(quote.batches)).toBe('1e3')
    const result = commitQuantumUpgradeV2(quote, source, 0)
    expect(gameDecimalToCanonicalString(result.batches)).toBe('1e3')
    expect(gameDecimalToCanonicalString(result.state.quantum.influenceSpeedBonus)).toBe('4e3')
    expect(gameDecimalToCanonicalString(result.state.quantum.availableShards)).toBe('9.9e4')
    const cash = stateWith({ available: '10' })
    expect(gameDecimalToCanonicalString(commitQuantumUpgradeV2(
      quoteQuantumUpgradeV2(cash, 0, 'CashBonus', 'buy-10'), cash, 0,
    ).batches)).toBe('1e1')
    expect(gameDecimalToCanonicalString(commitQuantumUpgradeV2(
      quoteQuantumUpgradeV2(stateWith({ available: '10' }), 0, 'CashBonus', 'buy-10'), stateWith({ available: '10' }), 0,
    ).state.quantum.cashBonusLevels)).toBe('1e1')
    const science = stateWith({ available: '10' })
    expect(gameDecimalToCanonicalString(commitQuantumUpgradeV2(
      quoteQuantumUpgradeV2(science, 0, 'ScienceBonus', 'buy-10'), science, 0,
    ).state.quantum.scienceBonusLevels)).toBe('1e1')
  })

  test('uses strict affordability for fixed quantities', () => {
    const source = stateWith({ available: '9' })
    expect(quoteQuantumUpgradeV2(source, 0, 'CashBonus', 'buy-10').status).toBe('insufficient-funds')
    expect(quoteQuantumUpgradeV2(stateWith({ available: '10' }), 0, 'CashBonus', 'buy-10').status).toBe('ready')
  })

  test('enforces the reveal graph as purchase authority', () => {
    expect(quoteQuantumUpgradeV2(stateWith({ available: '100', lifetime: '2' }), 0, 'Fragments').status).toBe('prerequisites-not-met')
    expect(quoteQuantumUpgradeV2(stateWith({ available: '100', lifetime: '5' }), 0, 'CashBonus').status).toBe('prerequisites-not-met')
    expect(quoteQuantumUpgradeV2(stateWith({ available: '100', lifetime: '19' }), 0, 'Avocado').status).toBe('prerequisites-not-met')
    expect(quoteQuantumUpgradeV2(stateWith({ available: '100' }), 0, 'MatrioshkaBrains').status).toBe('prerequisites-not-met')
  })

  test('preserves huge Decimal range and reports represented no-op deltas', () => {
    const source = stateWith({ available: '1e1000', cash: '1e1000' })
    const result = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 12, 'CashBonus'), source, 12)
    expect(result).toMatchObject({ accepted: true, purchased: false, changed: false, revision: 12 })
    expect(gameDecimalToCanonicalString(result.state.quantum.availableShards)).toBe('1e1000')
    expect(gameDecimalToCanonicalString(result.state.quantum.cashBonusLevels)).toBe('1e1000')
  })

  test('distinguishes both asymmetric represented-negligible outcomes', () => {
    const debitNoOp = stateWith({ available: '1e1000', cash: '0' })
    const credited = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(debitNoOp, 0, 'CashBonus'), debitNoOp, 0)
    expect(credited).toMatchObject({ accepted: true, purchased: true, changed: true, revision: 1 })
    expect(gameDecimalToCanonicalString(credited.debitedAmount)).toBe('0')
    expect(gameDecimalToCanonicalString(credited.state.quantum.cashBonusLevels)).toBe('1e0')

    const creditNoOp = stateWith({ available: '6', lifetime: '6', cash: '1e1000' })
    const debited = commitQuantumUpgradeV2(quoteQuantumUpgradeV2(creditNoOp, 0, 'CashBonus'), creditNoOp, 0)
    expect(debited).toMatchObject({ accepted: true, purchased: false, changed: true, revision: 1 })
    expect(gameDecimalToCanonicalString(debited.debitedAmount)).toBe('1e0')
    expect(gameDecimalToCanonicalString(debited.state.quantum.availableShards)).toBe('5e0')
  })

  test('rejects stale, replayed, forged, null, and accessor-backed quotes without touching getters', () => {
    const source = stateWith({ available: '10' })
    const quote = quoteQuantumUpgradeV2(source, 3, 'CashBonus')
    expect(commitQuantumUpgradeV2(quote, source, 4).status).toBe('stale-revision')
    expect(commitQuantumUpgradeV2(quote, source, 3).status).toBe('quote-rejected')
    let getters = 0
    const hostile = Object.defineProperty({}, 'sourceRevision', { get() { getters += 1; return 3 } })
    expect(() => commitQuantumUpgradeV2(hostile as never, source, 3)).not.toThrow()
    expect(commitQuantumUpgradeV2(hostile as never, source, 3).status).toBe('quote-rejected')
    expect(commitQuantumUpgradeV2(null as never, source, 3).status).toBe('quote-rejected')
    expect(getters).toBe(0)
  })

  test('fails closed on hostile state accessors and exhausted revisions', () => {
    let getters = 0
    const hostile = Object.defineProperty({}, 'quantum', { enumerable: true, get() { getters += 1; return {} } })
    expect(() => quoteQuantumUpgradeV2(hostile as never, 0, 'DoubleIP')).not.toThrow()
    expect(quoteQuantumUpgradeV2(hostile as never, 0, 'DoubleIP').status).toBe('invalid-state')
    expect(getters).toBe(0)
    const source = stateWith({ available: '1' })
    const quote = quoteQuantumUpgradeV2(source, Number.MAX_SAFE_INTEGER, 'DoubleIP')
    expect(commitQuantumUpgradeV2(quote, source, Number.MAX_SAFE_INTEGER).status).toBe('revision-exhausted')
    expect(quoteQuantumUpgradeV2(source, -0, 'DoubleIP').status).toBe('invalid-request')
    expect(commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 0, 'DoubleIP'), source, -0)).toMatchObject({
      status: 'state-mismatch', revision: 0,
    })
  })

  test('binds the complete cloned source snapshot, not only currency and output fields', () => {
    const source = stateWith({ available: '10', lifetime: '10' })
    const quote = quoteQuantumUpgradeV2(source, 8, 'CashBonus')
    const changedLifetime = stateWith({ available: '10', lifetime: '11' })
    expect(commitQuantumUpgradeV2(quote, changedLifetime, 8).status).toBe('state-mismatch')
    expect(commitQuantumUpgradeV2(quoteQuantumUpgradeV2(source, 8, 'CashBonus'), cloneCanonicalGameStateV2({
      ...source,
      statistics: { ...source.statistics, trackedSimulatedSeconds: source.statistics.trackedSimulatedSeconds + 1 },
    }), 8).status).toBe('state-mismatch')

    const mutable = { ...source }
    const mutableQuote = quoteQuantumUpgradeV2(mutable, 8, 'CashBonus')
    expect(commitQuantumUpgradeV2(mutableQuote, mutable, 8)).toMatchObject({ accepted: true, revision: 9 })
    const { meta, ...withoutMeta } = source
    const reordered = { ...withoutMeta, meta } as CanonicalGameStateV2
    const reorderedQuote = quoteQuantumUpgradeV2(reordered, 8, 'CashBonus')
    expect(commitQuantumUpgradeV2(reorderedQuote, reordered, 8)).toMatchObject({ accepted: true, revision: 9 })
  })

  test('keeps the dormant slice isolated from V1, save, event, worker, schema, UI, and application roots', () => {
    for (const name of ['quantumCatalogV2.ts', 'quantumV2.ts']) {
      const source = readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8')
      expect(source).not.toMatch(/quantumUpgrades|canonicalEventTime|workers\/|schema13|\/save\/|\/ui\/|\/application\//u)
    }

    const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
    const violations: string[] = []
    for (const path of sourceFiles(sourceRoot)) {
      const normalized = path.replaceAll('\\', '/')
      if (normalized.endsWith('.test.ts') || normalized.endsWith('/simulation/quantumV2.ts')) continue
      for (const specifier of moduleSpecifiers(readFileSync(path, 'utf8'), path)) {
        const isEventOwner = normalized.endsWith('/simulation/canonicalEventTimeModelV2.ts')
        const isAuthorityOwner = normalized.endsWith('/workers/storedTimeV2/storedTimeJobAuthorityV2.ts')
        const isProtocolOwner = normalized.endsWith('/workers/storedTimeV2/workerProtocolV2.ts')
        const isInspectionOwner = normalized.endsWith('/inspection/v2GameRuntime.ts')
        const isProjectionOwner = relative(sourceRoot, path).replaceAll('\\', '/') ===
          'inspection/frontendSnapshotV2.ts'
        if (
          isQuantumModuleSpecifier(specifier, 'quantumV2') &&
          !isEventOwner &&
          !isAuthorityOwner &&
          !isInspectionOwner &&
          !isProjectionOwner
        ) {
          violations.push(`${relative(sourceRoot, path)} -> ${specifier}`)
        }
        if (
          isQuantumModuleSpecifier(specifier, 'quantumCatalogV2') &&
          !normalized.endsWith('/simulation/quantumV2.ts') &&
          !isEventOwner &&
          !isProtocolOwner &&
          !isInspectionOwner &&
          !isProjectionOwner
        ) {
          violations.push(`${relative(sourceRoot, path)} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])

    for (const hostile of [
      `import q = require('./quantumV2')`, `import * as q from './quantumV2'`,
      `export { q } from './quantumV2/subpath'`, `export * from './quantumV2'`,
      `void import(\`./quantumV2\`)`, `void require('./quantumV2.js')`,
      `import q from './quantumV2.tsx?raw#fragment'`,
      `export * from './quantumV2.mjs?worker'`,
      `void require('./quantumV2.cjs#compat')`,
      `void import('./quantumV2.jsx?query')`,
    ]) {
      expect(moduleSpecifiers(hostile, 'hostile.ts').some((value) => isQuantumModuleSpecifier(value, 'quantumV2'))).toBe(true)
    }
    expect(moduleSpecifiers(`const quantumV2 = 'text only'`, 'control.ts')).toEqual([])
  })
})

function sourceFiles(root: string): readonly string[] {
  const result: string[] = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()!
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(entry.name)) result.push(path)
    }
  }
  return result
}

function moduleSpecifiers(source: string, path: string): readonly string[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, /\.[jt]sx$/u.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const result: string[] = []
  const add = (node: ts.Expression | undefined) => {
    if (node !== undefined && ts.isStringLiteralLike(node)) result.push(node.text)
  }
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier)
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression)
    else if (ts.isCallExpression(node) && node.arguments.length === 1 && (
      node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require')
    )) add(node.arguments[0])
    ts.forEachChild(node, visit)
  }
  visit(file)
  return result
}

function isQuantumModuleSpecifier(value: string, moduleName: 'quantumV2' | 'quantumCatalogV2'): boolean {
  const withoutSuffix = value.replace(/[?#].*$/u, '')
  return new RegExp(`(?:^|/)${moduleName}(?:\\.[cm]?[jt]sx?|/|$)`, 'u').test(withoutSuffix)
}
