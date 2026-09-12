import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { Plugin } from 'vite'
import { collectWikiAuthoredMessages } from './wikiAuthoredMessages.js'

interface SourceMessage {
  readonly defaultMessage: string
  readonly description: string
}

/**
 * Wiki carries these exact defaults in its existing lazy chunk. English uses
 * them without a missing-translation error because its defaultLocale is en.
 * Other locales and the complete checked-in authoring catalogs remain intact.
 */
export function omitDuplicatedEnglishWikiMessages(
  compiled: Readonly<Record<string, unknown>>,
  source: Readonly<Record<string, SourceMessage>>,
): Record<string, unknown> {
  const omitted = new Set<string>()
  for (const descriptor of collectWikiAuthoredMessages()) {
    if (
      source[descriptor.id]?.defaultMessage !== descriptor.defaultMessage ||
      source[descriptor.id]?.description !== descriptor.description
    ) {
      throw new Error(`Authored Wiki source descriptor changed: ${descriptor.id}`)
    }
    // All current authored entries are plain text. Argument/tag formatting
    // or escaped ICU text would require separate fallback-path review.
    const expected = [{ type: 0, value: descriptor.defaultMessage }]
    if (!isDeepStrictEqual(compiled[descriptor.id], expected)) {
      throw new Error(`Authored Wiki compiled message changed: ${descriptor.id}`)
    }
    omitted.add(descriptor.id)
  }
  return Object.fromEntries(
    Object.entries(compiled).filter(([id]) => !omitted.has(id)),
  )
}

export function omitDuplicatedEnglishWikiMessagesPlugin(): Plugin {
  let compiledPath = ''
  let sourcePath = ''
  return {
    name: 'idle-dyson-omit-duplicated-english-wiki-messages',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      compiledPath = resolve(config.root, 'src/ui/i18n/catalogs/compiled/en.json')
        .replaceAll('\\', '/')
      sourcePath = resolve(config.root, 'src/ui/i18n/catalogs/source/en.json')
    },
    transform(code, id) {
      if (id.replaceAll('\\', '/') !== compiledPath) return null
      const compiled = JSON.parse(code) as Record<string, unknown>
      const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, SourceMessage>
      return {
        code: JSON.stringify(omitDuplicatedEnglishWikiMessages(compiled, source)),
        map: null,
      }
    },
  }
}
