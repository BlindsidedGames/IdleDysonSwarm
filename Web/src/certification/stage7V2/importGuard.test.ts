import { readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'

const WEB_ROOT = resolve(import.meta.dirname, '../../..')
const SOURCE_ROOT = resolve(WEB_ROOT, 'src')
const CERTIFICATION_ROOT = 'src/certification/stage7V2/'
const CERTIFICATION_HARNESS = 'src/certification/stage7V2Harness.ts'
const INSPECTION_OWNERS = new Set([
  'src/inspection/v2GameRuntime.ts',
  'src/inspection/v2InspectionMain.tsx',
])
const PRODUCTION_COMPOSITION = 'src/productionHostComposition.ts'
const V2_PRODUCTION_COMPOSITIONS = new Set([
  'src/browser/productionBrowserCompositionV2.ts',
  'src/native/productionNativeCompositionV2.ts',
])
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]s|[jt]sx)$/u

describe('Stage 7 V2 certification import guard', () => {
  test('keeps dormant certification modules out of every production root', () => {
    const violations: string[] = []
    for (const absolutePath of sourceFiles(SOURCE_ROOT)) {
      const importer = normalizedRelative(absolutePath)
      if (allowedImporter(importer)) continue
      const source = readFileSync(absolutePath, 'utf8')
      for (const specifier of moduleSpecifiers(source, importer)) {
        if (targetsCertification(importer, specifier)) {
          if (allowedProductionClaim(importer, specifier)) continue
          violations.push(`${importer} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  test('detects alias, namespace, re-export, dynamic, require, import-equals, and suffix bypasses', () => {
    const samples = [
      `import { Stage7V2CertificationRepository as Repo } from './certification/stage7V2/repository'`,
      `import * as dormant from './certification/stage7V2/index.js'`,
      `export { Stage7V2CertificationRepository } from './certification/stage7V2/repository.ts?raw'`,
      `export * from './certification/stage7V2/index.ts#fragment'`,
      `void import(\`./certification/stage7V2/index.mjs\`)`,
      `require('./certification/stage7V2/index.cjs')`,
      `import dormant = require('./certification/stage7V2/index.cts')`,
      `import('@certification/stage7V2/index.jsx')`,
      `import { Stage7V2WorkerLauncher } from './certification/stage7V2Harness.ts?stale'`,
    ]
    for (const source of samples) {
      const claims = moduleSpecifiers(source, 'src/hostile.tsx')
        .filter((specifier) => targetsCertification('src/hostile.tsx', specifier))
      expect(claims.length, source).toBeGreaterThan(0)
    }
  })

  test('allows only the exact certification harness and owning modules/tests', () => {
    expect(allowedImporter(CERTIFICATION_HARNESS)).toBe(true)
    expect(allowedImporter('src/certification/stage7V2/repository.test.ts')).toBe(true)
    expect(allowedImporter('src/other/stage7V2Harness.ts')).toBe(false)
    expect(allowedImporter('src/main.tsx')).toBe(false)
    expect(allowedProductionClaim(
      PRODUCTION_COMPOSITION,
      './certification/stage7V2/access',
    )).toBe(true)
    expect(allowedProductionClaim(
      PRODUCTION_COMPOSITION,
      './certification/stage7V2/repository',
    )).toBe(false)
  })
})

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory()
      ? sourceFiles(path)
      : SOURCE_EXTENSION.test(entry.name) ? [path] : []
  })
}

function allowedProductionClaim(importer: string, specifier: string): boolean {
  const clean = specifier.split(/[?#]/u, 1)[0]!.replaceAll('\\', '/')
    .replace(/\.(?:[cm]?[jt]s|[jt]sx)$/u, '')
  if (importer === PRODUCTION_COMPOSITION) {
    return clean === './certification/stage7V2/access'
  }
  if (!V2_PRODUCTION_COMPOSITIONS.has(importer)) return false
  return clean.endsWith('/certification/stage7V2/certificationHost') ||
    clean.endsWith('/certification/stage7V2/writerLease')
}

function normalizedRelative(path: string): string {
  return relative(WEB_ROOT, path).replaceAll('\\', '/')
}

function allowedImporter(importer: string): boolean {
  return importer.startsWith(CERTIFICATION_ROOT) ||
    importer === CERTIFICATION_HARNESS ||
    INSPECTION_OWNERS.has(importer)
}

function targetsCertification(importer: string, specifier: string): boolean {
  const clean = specifier.split(/[?#]/u, 1)[0]!.replaceAll('\\', '/')
  if (clean.includes('certification/stage7V2')) return true
  if (!clean.startsWith('.')) return false
  const importerAbsolute = resolve(WEB_ROOT, importer)
  const target = normalizedRelative(resolve(dirname(importerAbsolute), clean))
    .replace(/\.(?:[cm]?[jt]s|[jt]sx)$/u, '')
  return target === 'src/certification/stage7V2' ||
    target.startsWith('src/certification/stage7V2/') ||
    target === 'src/certification/stage7V2Harness'
}

function moduleSpecifiers(source: string, path: string): readonly string[] {
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    /\.[cm]?[jt]sx$/u.test(path) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const result: string[] = []
  const add = (node: ts.Expression | undefined): void => {
    if (node !== undefined && ts.isStringLiteralLike(node)) result.push(node.text)
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier)
    } else if (ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression)
    } else if (ts.isCallExpression(node) && node.arguments.length === 1 &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      add(node.arguments[0])
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return result
}
