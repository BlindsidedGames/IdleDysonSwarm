import { describe, expect, test } from 'vitest'
import {
  stripMessageAuthoringMetadata,
  stripMessageAuthoringMetadataPlugin,
} from './stripMessageAuthoringMetadata'

describe('stripMessageAuthoringMetadataPlugin', () => {
  test('keeps runtime message identity but removes catalog-duplicated authoring metadata', () => {
    const source = `
      import { defineMessages } from 'react-intl'
      export const messages = defineMessages({
        title: {
          id: 'example.title',
          defaultMessage: 'Example',
          description: 'Translator-only context.',
        },
      })
    `
    const output = stripMessageAuthoringMetadata(source)

    expect(output).toContain("id: 'example.title'")
    expect(output).not.toContain('defaultMessage')
    expect(output).not.toContain('Example')
    expect(output).not.toContain('description')
    expect(output).not.toContain('Translator-only context')
  })

  test('runs only for UI message modules', () => {
    const transform =
      stripMessageAuthoringMetadataPlugin().transform
    if (typeof transform !== 'function') {
      throw new Error('Expected a Vite transform hook.')
    }
    expect(
      transform.call(
        {} as never,
        'const value = { description: "durable" }',
        'C:/repo/src/application/model.ts',
        {} as never,
      ),
    ).toBeNull()
  })
})
