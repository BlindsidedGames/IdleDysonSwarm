import { readdirSync, readFileSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, test } from 'vitest'

import { issueInfinityRewardAuthorityV2ForApplication } from './infinityRewardAuthorityV2'

const RAW_REGISTRAR = 'registerInfinityRewardAuthorityV2ForApplication'
const RAW_WORKER_REGISTRAR = 'registerInfinityRewardAuthorityV2ForWorker'
const TIMER_WORKER_REGISTRAR =
  'registerCanonicalTimerAggregationAuthorityV2ForWorker'
const QUANTUM_EPOCH_REGISTRAR =
  'registerCanonicalQuantumEpochAuthorityV2ForWorker'
const PREPARED_SKILL_PLAN_INHERITOR =
  'inheritPreparedDysonV2SkillPlanForFastV2'
const PREPARED_SKILL_PLAN_AUTHORITY_REGISTRAR =
  'registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2'
const RESET_CLAIMS = new Set([
  'prepareInfinityBoundaryEvaluationV2ForReset',
  'consumeInfinityBoundaryEvaluationV2ForReset',
  'quoteNextInfinityBoundaryV2ForReset',
  'registerPreparedInfinityBoundaryAuthorityV2ForStoredTime',
  'quotePreparedInfinityResetBoundaryV2',
  'preparePreparedInfinityBoundaryEvaluationV2ForReset',
  'quoteNextPreparedInfinityBoundaryV2ForReset',
])
const PREPARED_INFINITY_RESET_CLAIMS = new Set([
  'registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime',
  'registerCanonicalPreparedInfinityResetAuthorityV2ForEventModel',
  'quotePreparedCanonicalInfinityResetV2',
  'commitPreparedCanonicalInfinityResetV2',
])
const OWNER_ISSUER = 'issueInfinityRewardAuthorityV2ForApplication'
const OWNER_PATH = 'src/application/infinityRewardAuthorityV2.ts'
const OWNER_CONSUMERS = new Set([
  'src/browser/productionBrowserCompositionV2.ts',
  'src/certification/stage7V2/nativeCertificationEntry.tsx',
  'src/inspection/v2GameRuntime.ts',
  'src/inspection/v2InspectionMain.tsx',
  'src/native/productionNativeCompositionV2.ts',
])
const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs',
])
const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage'])

type ProtectedModule = 'economy' | 'owner' | 'event' | 'derivation' | 'reset' | null

function protectedModule(specifier: string): ProtectedModule {
  const normalized = specifier.replaceAll('\\', '/').split(/[?#]/u, 1)[0]!
  if (/(?:^|\/)infinityEconomyV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'economy'
  if (/(?:^|\/)infinityRewardAuthorityV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'owner'
  if (/(?:^|\/)canonicalEventTimeModelV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'event'
  if (/(?:^|\/)dysonV2Derivation(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'derivation'
  if (/(?:^|\/)canonicalInfinityResetV2(?:\.[cm]?[jt]sx?)?$/u.test(normalized)) return 'reset'
  return null
}

function isAllowed(path: string, module: Exclude<ProtectedModule, null>, symbol: string): boolean {
  if (module === 'economy' && symbol === RAW_REGISTRAR) return path === OWNER_PATH
  if (module === 'economy' && symbol === RAW_WORKER_REGISTRAR) {
    return path === 'src/workers/storedTimeV2/storedTimeWorkerEngineV2.ts' ||
      path.endsWith('.test.ts')
  }
  if (
    module === 'event' &&
    (symbol === TIMER_WORKER_REGISTRAR || symbol === QUANTUM_EPOCH_REGISTRAR)
  ) {
    return path === 'src/workers/storedTimeV2/storedTimeWorkerEngineV2.ts' ||
      path.endsWith('.test.ts')
  }
  if (
    module === 'derivation' &&
    (symbol === PREPARED_SKILL_PLAN_INHERITOR ||
      symbol === PREPARED_SKILL_PLAN_AUTHORITY_REGISTRAR)
  ) {
    return path === 'src/simulation/canonicalEventTimeModelV2.ts' ||
      path.endsWith('.test.ts')
  }
  if (module === 'economy' && RESET_CLAIMS.has(symbol)) {
    return path === 'src/simulation/canonicalInfinityResetV2.ts' || path.endsWith('.test.ts')
  }
  if (module === 'reset' && PREPARED_INFINITY_RESET_CLAIMS.has(symbol)) {
    return path === 'src/workers/storedTimeV2/storedTimeJobAuthorityV2.ts' ||
      (
        path === 'src/simulation/canonicalEventTimeModelV2.ts' &&
        (symbol === 'registerCanonicalPreparedInfinityResetAuthorityV2ForEventModel' ||
          symbol === 'quotePreparedCanonicalInfinityResetV2')
      ) ||
      path.endsWith('.test.ts')
  }
  if (module === 'owner' && symbol === OWNER_ISSUER) {
    return path.endsWith('.test.ts') || OWNER_CONSUMERS.has(path)
  }
  return true
}

function scanAuthorityImports(path: string, source: string): readonly string[] {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const violations: string[] = []
  const forbidDynamicModule = (module: Exclude<ProtectedModule, null>): boolean =>
    module === 'economy'
      ? path !== OWNER_PATH
      : module === 'event'
        ? path !== 'src/workers/storedTimeV2/storedTimeWorkerEngineV2.ts' &&
          !path.endsWith('.test.ts')
        : module === 'derivation'
          ? path !== 'src/simulation/canonicalEventTimeModelV2.ts' &&
            !path.endsWith('.test.ts')
        : module === 'reset'
          ? path !== 'src/workers/storedTimeV2/storedTimeJobAuthorityV2.ts' &&
            !path.endsWith('.test.ts')
          : !path.endsWith('.test.ts')
  const inspectBindings = (
    module: Exclude<ProtectedModule, null>,
    bindings: ts.NamedImportBindings | undefined,
  ): void => {
    if (bindings === undefined) return
    if (ts.isNamespaceImport(bindings)) {
      if (forbidDynamicModule(module)) {
        violations.push(`${path}:protected-namespace-import`)
      }
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
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
        if (module !== null && (isDynamicImport || isRequire) && forbidDynamicModule(module)) {
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

describe('Infinity reward authority boundary', () => {
  test('issues only descriptor-captured receiver-local entitlement values', () => {
    const issued = issueInfinityRewardAuthorityV2ForApplication(
      Object.freeze({ doubleInfinityPoints: true }),
    )
    expect(issued.permanentDoubleIp).toBe(true)
    expect(() => issueInfinityRewardAuthorityV2ForApplication(
      Object.freeze({ doubleInfinityPoints: 'yes' }) as never,
    )).toThrow(/one boolean data field/u)
  })

  test('enforces the dormant owner and raw registrar import boundary', () => {
    expect(repositoryAuthorityViolations()).toEqual([])
  }, 15_000)

  test('detects every static, re-exported, and dynamic authority bypass', () => {
    for (const [path, source] of [
      ['src/hostile.js', `import { registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime as forge } from './canonicalInfinityResetV2.js?x#y'`],
      ['src/hostile.jsx', `import * as reset from './canonicalInfinityResetV2.jsx'; reset['commitPreparedCanonicalInfinityResetV2'](a,b,c,d,e)`],
      ['src/hostile.mjs', `export { quotePreparedCanonicalInfinityResetV2 } from './canonicalInfinityResetV2.mjs#x'`],
      ['src/hostile.cjs', `const reset = require('./canonicalInfinityResetV2.cjs?x')`],
      ['src/hostile.tsx', `void import('./canonicalInfinityResetV2.tsx#x')`],
      ['src/hostile.mts', `import reset = require('./canonicalInfinityResetV2.mts')`],
      ['src/hostile.cts', 'void import(`./canonicalInfinityResetV2.cts`)'],
    ] as const) {
      expect(scanAuthorityImports(path, source)).not.toEqual([])
    }
    expect(scanAuthorityImports(
      'src/simulation/worker-alias.ts',
      `import { registerInfinityRewardAuthorityV2ForWorker as forge } from './infinityEconomyV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/worker-reexport.ts',
      `export { registerInfinityRewardAuthorityV2ForWorker } from './infinityEconomyV2.js?worker'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/timer-worker-alias.ts',
      `import { registerCanonicalTimerAggregationAuthorityV2ForWorker as forge } from './canonicalEventTimeModelV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/timer-worker-reexport.ts',
      `export { registerCanonicalTimerAggregationAuthorityV2ForWorker } from './canonicalEventTimeModelV2.js?worker'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/quantum-epoch-alias.ts',
      `import { registerCanonicalQuantumEpochAuthorityV2ForWorker as forge } from './canonicalEventTimeModelV2.ts#worker'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/quantum-epoch-reexport.ts',
      `export { registerCanonicalQuantumEpochAuthorityV2ForWorker } from './canonicalEventTimeModelV2.js?worker'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-alias.ts',
      `import { inheritPreparedDysonV2SkillPlanForFastV2 as forge } from './dysonV2Derivation'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-reexport.ts',
      `export { inheritPreparedDysonV2SkillPlanForFastV2 } from './dysonV2Derivation.js?worker'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-authority.ts',
      `import { registerPreparedDysonV2SkillPlanInheritanceAuthorityForEventV2 as forge } from './dysonV2Derivation'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-namespace.ts',
      `import * as derivation from './dysonV2Derivation'; derivation.inheritPreparedDysonV2SkillPlanForFastV2(a, b)`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-dynamic.ts',
      `const derivation = await import('./dysonV2Derivation.js?worker')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-template.ts',
      'const derivation = await import(`./dysonV2Derivation.js`)',
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-require.ts',
      `const derivation = require('./dysonV2Derivation.ts#worker')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/skill-plan-import-equals.ts',
      `import derivation = require('./dysonV2Derivation')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/alias.ts',
      `import { registerInfinityRewardAuthorityV2ForApplication as forge } from './infinityEconomyV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/namespace.ts',
      `import * as infinity from './infinityEconomyV2'; infinity['registerInfinityRewardAuthorityV2ForApplication'](true)`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/direct-owner.ts',
      `import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/reexport.ts',
      `export { registerInfinityRewardAuthorityV2ForApplication as forge } from './infinityEconomyV2?raw'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/dynamic.ts',
      `const authority = await import('./infinityEconomyV2#runtime')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/commonjs.ts',
      `const authority = require('./infinityEconomyV2.ts?runtime')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/import-equals.ts',
      `import authority = require('./infinityEconomyV2')`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/js-resolution.ts',
      `export { registerInfinityRewardAuthorityV2ForApplication } from './infinityEconomyV2.js'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/claim-bypass.ts',
      `import { prepareInfinityBoundaryEvaluationV2ForReset } from './infinityEconomyV2'`,
    )).toHaveLength(1)
    expect(scanAuthorityImports(
      'src/simulation/template-import.ts',
      'const authority = await import(`./infinityEconomyV2.js`)',
    )).toHaveLength(1)
  })
})
