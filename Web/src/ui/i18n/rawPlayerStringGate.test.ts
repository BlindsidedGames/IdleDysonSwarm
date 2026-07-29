import { readdirSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const HUMAN_FACING_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'description',
  'label',
  'message',
  'placeholder',
  'title',
  'valueText',
])

describe('player-facing source string gate', () => {
  it('rejects raw JSX text and direct human-facing string attributes', () => {
    const uiRoot = resolve(import.meta.dirname, '..')
    const violations = readdirSync(uiRoot, {
      recursive: true,
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isFile() &&
          extname(entry.name) === '.tsx' &&
          !entry.name.endsWith('.test.tsx'),
      )
      .flatMap((entry) => {
        const path = resolve(entry.parentPath, entry.name)
        return rawPlayerStringsFromFile(path)
      })

    expect(
      violations,
      'Player-facing text must use stable FormatJS descriptors. ' +
        'Player/imported data must flow through PlayerText.',
    ).toEqual([])
  })

  it('characterizes the raw string forms enforced by the gate', () => {
    const source = ts.createSourceFile(
      'fixture.tsx',
      '<button aria-label="Purchase">Purchase</button>',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(rawPlayerStrings(source)).toEqual([
      'fixture.tsx:1:9 raw aria-label text',
      'fixture.tsx:1:31 raw JSX text',
    ])
  })
})

function rawPlayerStringsFromFile(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return rawPlayerStrings(source)
}

function rawPlayerStrings(source: ts.SourceFile): string[] {
  const violations: string[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && node.getText(source).trim()) {
      violations.push(location(source, node, 'raw JSX text'))
    }
    if (
      ts.isJsxAttribute(node) &&
      HUMAN_FACING_ATTRIBUTES.has(node.name.getText(source)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      violations.push(
        location(source, node, `raw ${node.name.getText(source)} text`),
      )
    }
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression))
    ) {
      violations.push(location(source, node, 'raw JSX expression text'))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

function location(
  source: ts.SourceFile,
  node: ts.Node,
  detail: string,
): string {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source))
  return `${source.fileName}:${start.line + 1}:${start.character + 1} ${detail}`
}
