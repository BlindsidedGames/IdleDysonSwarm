import { readdirSync, readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, test } from 'vitest'

import firstRunIdb1 from './firstRun/generated/first-run-schema-12.idb1.txt?raw'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { prepareIdb1Save } from '../save/prepare'
import { issueRealityStrangeMatterAccountV2ForApplication } from './realityStrangeMatterAuthorityV2'

const baseState = migratePreparedSaveToV2(
  prepareIdb1Save(firstRunIdb1).prepared,
  { kind: 'trusted-same-device' },
).state

const RAW_REGISTRAR = 'registerRealityStrangeMatterAccountV2ForOwner'
const RAW_EVENT_ADVANCER = 'advancePreparedRealityWorkersV2'
const RAW_STATISTICS_RECORDER = 'recordRealityStatisticsSegmentV2'
const OWNER_ISSUER = 'issueRealityStrangeMatterAccountV2ForApplication'
const OWNER_PATH = 'src/application/realityStrangeMatterAuthorityV2.ts'
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage'])

type ProtectedModule = 'reality' | 'statistics' | 'owner' | null

function protectedModule(specifier: string): ProtectedModule {
  const normalized = specifier.replaceAll('\\', '/').split(/[?#]/u, 1)[0]!
  if (/(?:^|\/)realityV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'reality'
  if (/(?:^|\/)realityStatisticsV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'statistics'
  if (/(?:^|\/)realityStrangeMatterAuthorityV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'owner'
  return null
}

function isAllowed(
  path: string,
  module: Exclude<ProtectedModule, null>,
  symbol: string,
): boolean {
  if (module === 'reality' && symbol === RAW_REGISTRAR) return path === OWNER_PATH
  if (module === 'reality' && symbol === RAW_EVENT_ADVANCER) {
    return path === 'src/simulation/canonicalEventTimeModelV2.ts' || path.endsWith('.test.ts')
  }
  if (module === 'statistics' && symbol === RAW_STATISTICS_RECORDER) {
    return path === 'src/simulation/canonicalEventTimeModelV2.ts' ||
      path === 'src/simulation/realityV2.ts' ||
      path.endsWith('.test.ts')
  }
  if (module === 'owner' && symbol === OWNER_ISSUER) {
    return path === 'src/application/dreamStrangeMatterAuthorityV2.ts' || path.endsWith('.test.ts')
  }
  return true
}

function scanAuthorityImports(path: string, source: string): readonly string[] {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const violations: string[] = []
  const forbidDynamicModule = (module: Exclude<ProtectedModule, null>): boolean =>
    module === 'reality'
      ? path !== OWNER_PATH
      : module === 'statistics'
        ? path !== 'src/simulation/canonicalEventTimeModelV2.ts' &&
          path !== 'src/simulation/realityV2.ts' &&
          !path.endsWith('.test.ts')
        : !path.endsWith('.test.ts')
  const inspectBindings = (
    module: Exclude<ProtectedModule, null>,
    bindings: ts.NamedImportBindings | undefined,
  ): void => {
    if (bindings === undefined) return
    if (ts.isNamespaceImport(bindings)) {
      if (forbidDynamicModule(module)) violations.push(`${path}:protected-namespace-import`)
      return
    }
    for (const element of bindings.elements) {
      const imported = (element.propertyName ?? element.name).text
      if (!isAllowed(path, module, imported)) violations.push(`${path}:${imported}`)
    }
  }
  const inspectExports = (
    module: Exclude<ProtectedModule, null>,
    clause: ts.NamedExportBindings | undefined,
  ): void => {
    if (clause === undefined || ts.isNamespaceExport(clause)) {
      if (forbidDynamicModule(module)) violations.push(`${path}:protected-re-export`)
      return
    }
    for (const element of clause.elements) {
      const imported = (element.propertyName ?? element.name).text
      if (!isAllowed(path, module, imported)) violations.push(`${path}:${imported}`)
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const module = protectedModule(node.moduleSpecifier.text)
      if (module !== null) inspectBindings(module, node.importClause?.namedBindings)
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      const module = protectedModule(node.moduleSpecifier.text)
      if (module !== null) inspectExports(module, node.exportClause)
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      const module = protectedModule(node.moduleReference.expression.text)
      if (module !== null && forbidDynamicModule(module)) {
        violations.push(`${path}:protected-import-equals`)
      }
    }
    if (ts.isCallExpression(node)) {
      const first = node.arguments[0]
      if (first !== undefined && ts.isStringLiteralLike(first)) {
        const module = protectedModule(first.text)
        const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
        const requireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require'
        if (module !== null && (dynamicImport || requireCall) && forbidDynamicModule(module)) {
          violations.push(`${path}:protected-dynamic-import`)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return violations
}

function repositoryAuthorityViolations(): readonly string[] {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const paths: string[] = []
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (CODE_EXTENSIONS.has(extname(path))) paths.push(path)
    }
  }
  visit(resolve(root, 'src'))
  return paths.flatMap((path) => scanAuthorityImports(
    relative(root, path).replaceAll('\\', '/'),
    readFileSync(path, 'utf8'),
  ))
}

describe('Reality Strange Matter account authority', () => {
  test('issues balance only from canonical Stage 6-owned state', () => {
    const account = issueRealityStrangeMatterAccountV2ForApplication(
      baseState,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 4 }),
    )
    expect(account).toMatchObject({
      kind: 'reality-strange-matter-account-v2',
      currencyPath: '$.dream.strangeMatter',
      accountId: 'stage6:dream.strangeMatter',
      revision: 4,
    })
    expect(account.balance).toEqual(baseState.dream.strangeMatter)
  })

  test('rejects accessor identity and state without invoking getters', () => {
    let getterCalls = 0
    const identity = Object.create(null)
    Object.defineProperty(identity, 'accountId', {
      enumerable: true,
      get() {
        getterCalls += 1
        return 'forged'
      },
    })
    expect(() => issueRealityStrangeMatterAccountV2ForApplication(
      baseState,
      identity,
    )).toThrow('closed object')

    const hostile = Object.create(null) as CanonicalGameStateV2
    Object.defineProperty(hostile, 'dream', {
      enumerable: true,
      get() {
        getterCalls += 1
        return baseState.dream
      },
    })
    expect(() => issueRealityStrangeMatterAccountV2ForApplication(
      hostile,
      Object.freeze({ accountId: 'forged', revision: 0 }),
    )).toThrow('invalid V2 state')
    expect(getterCalls).toBe(0)
  })

  test('closes the raw registrar and dormant owner issuer boundaries', () => {
    expect(repositoryAuthorityViolations()).toEqual([])
  })

  test('detects aliases, namespaces, re-exports, and dynamic bypasses', () => {
    expect(scanAuthorityImports(
      'src/ui/forge.tsx',
      `import { ${RAW_REGISTRAR} as forge } from '../simulation/realityV2.js'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/namespace.ts',
      `import * as reality from './realityV2'; reality['register' + 'RealityStrangeMatterAccountV2ForOwner']`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/reexport.ts',
      `export { ${RAW_REGISTRAR} } from './realityV2?raw'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/ui/reality.tsx',
      `import { ${RAW_EVENT_ADVANCER} as advance } from '../simulation/realityV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/ui/statistics.tsx',
      `import { ${RAW_STATISTICS_RECORDER} } from '../simulation/realityStatisticsV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/dynamic.ts',
      `const owner = await import('../application/realityStrangeMatterAuthorityV2#runtime')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/template.ts',
      'const owner = await import(`../application/realityStrangeMatterAuthorityV2.js`)',
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/commonjs.ts',
      `const owner = require('../application/realityStrangeMatterAuthorityV2')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/equals.ts',
      `import owner = require('../application/realityStrangeMatterAuthorityV2.ts')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/issuer.ts',
      `import { ${OWNER_ISSUER} } from '../application/realityStrangeMatterAuthorityV2'`,
    )).toHaveLength(1)
  })
})
