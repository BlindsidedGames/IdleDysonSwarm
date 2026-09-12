import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import ts from 'typescript'
import {
  stripMessageAuthoringMetadata,
  stripMessageAuthoringMetadataPlugin,
} from './stripMessageAuthoringMetadata'

function descriptorIds(source: string): string[] {
  const ids: string[] = []
  const file = ts.createSourceFile('messages.ts', source, ts.ScriptTarget.Latest, true)
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) &&
      node.name.text === 'id' && ts.isStringLiteral(node.initializer)
    ) ids.push(node.initializer.text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return ids
}

test('metadata stripping preserves message names and unrelated or dynamic object values', () => {
  const source = `
    const messages = defineMessages({
      description: { id: 'message.description', defaultMessage: 'Fallback', description: 'Translator note' },
      defaultMessage: { id: 'message.fallback', defaultMessage: 'Other fallback' },
    });
    const ordinary = { description: 'Ordinary description', defaultMessage: 'Ordinary value' };
    const dynamic = { id: getId(), defaultMessage: dynamicFallback };
  `
  const transformed = stripMessageAuthoringMetadata(source)
  expect(descriptorIds(transformed)).toEqual(descriptorIds(source))
  expect(transformed).toMatch(/description:\s*\{\s*id: ['"]message.description['"]/)
  expect(transformed).toMatch(/defaultMessage:\s*\{\s*id: ['"]message.fallback['"]/)
  expect(transformed).not.toContain('Translator note')
  expect(transformed).not.toContain('Other fallback')
  expect(transformed).toContain('Ordinary description')
  expect(transformed).toContain('Ordinary value')
  expect(transformed).toContain('defaultMessage: dynamicFallback')
})

test('newly included message modules retain every ID and have all production catalog entries', async () => {
  const plugin = stripMessageAuthoringMetadataPlugin()
  const transform = plugin.transform
  if (typeof transform !== 'function') throw new Error('Expected callable transform hook.')
  const locales = ['en', 'fr', 'de', 'es-419', 'pt-BR', 'zh-CN', 'ru', 'ja', 'en-XA', 'ar-XB']
  for (const file of ['src/pwa/messages.ts', 'src/ui/gameplay/infinity/challengeMessages.ts']) {
    const url = new URL(`../${file}`, import.meta.url)
    const source = readFileSync(url, 'utf8')
    const result = await Reflect.apply(transform, {}, [source, url.pathname])
    const code = typeof result === 'string' ? result : result?.code
    expect(typeof code).toBe('string')
    expect(descriptorIds(code!)).toEqual(descriptorIds(source))
    expect(code).not.toContain('defaultMessage:')
    for (const locale of locales) {
      const catalog = JSON.parse(readFileSync(
        new URL(`../src/ui/i18n/catalogs/compiled/${locale}.json`, import.meta.url),
        'utf8',
      )) as Record<string, unknown>
      for (const id of descriptorIds(source)) expect(catalog, `${locale}: ${id}`).toHaveProperty(id)
    }
  }
  expect(await Reflect.apply(transform, {}, [
    'const data = { id: "ordinary", description: "keep me" };',
    '/project/src/simulation/messages.ts',
  ])).toBeNull()
})
