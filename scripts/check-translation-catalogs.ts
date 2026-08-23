import { parse } from '@formatjs/icu-messageformat-parser'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface SourceMessage {
  readonly defaultMessage: string
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readJson<Record<string, SourceMessage>>(
  'src/ui/i18n/catalogs/source/en.json',
)

const COMMON_ENGLISH_WORDS = new Set([
  'account', 'after', 'all', 'and', 'are', 'before', 'browser', 'can',
  'cleared', 'create', 'data', 'device', 'each', 'email', 'enable', 'entered',
  'every', 'for', 'from', 'game', 'has', 'have', 'if', 'information', 'into',
  'is', 'language', 'lost', 'may', 'more', 'never', 'not', 'of', 'one',
  'only', 'payment', 'player', 'purchases', 'reach', 'restoration', 'restore',
  'stay', 'that', 'the', 'then', 'this', 'to', 'unfolds', 'unlocks', 'web',
  'were', 'when', 'with', 'you', 'your',
])

const supportedLocales = [
  'fr',
  'de',
  'es-419',
  'pt-BR',
  'zh-CN',
  'ru',
  'ja',
] as const
type SupportedLocale = (typeof supportedLocales)[number]

const requestedLocale = process.argv
  .find((argument) => argument.startsWith('--locale='))
  ?.slice('--locale='.length)
if (
  requestedLocale !== undefined &&
  !supportedLocales.includes(requestedLocale as SupportedLocale)
) {
  throw new Error(`Unsupported translation locale '${requestedLocale}'.`)
}
const localesToCheck: readonly SupportedLocale[] =
  requestedLocale === undefined
    ? supportedLocales
    : [requestedLocale as SupportedLocale]

for (const locale of localesToCheck) {
  const translationPath =
    `src/ui/i18n/catalogs/translations/${locale}.json`
  assertNoDuplicateTopLevelKeys(translationPath)
  const translation = readJson<Record<string, string>>(
    translationPath,
  )
  const sourceKeys = Object.keys(source).sort(compareText)
  const translationKeys = Object.keys(translation).sort(compareText)
  if (JSON.stringify(sourceKeys) !== JSON.stringify(translationKeys)) {
    const missing = sourceKeys.filter((key) => !(key in translation))
    const orphaned = translationKeys.filter((key) => !(key in source))
    throw new Error(
      `${locale} catalog key mismatch; missing=${missing.join(',')}; orphaned=${orphaned.join(',')}`,
    )
  }

  let unchanged = 0
  for (const id of sourceKeys) {
    const translated = translation[id]
    if (typeof translated !== 'string' || translated.trim() === '') {
      throw new Error(`${locale}:${id} must contain translated text.`)
    }
    const sourceArguments = messageArguments(source[id].defaultMessage)
    const translatedArguments = messageArguments(translated)
    if (
      JSON.stringify(sourceArguments) !==
      JSON.stringify(translatedArguments)
    ) {
      throw new Error(
        `${locale}:${id} changed ICU arguments from ${sourceArguments.join(',')} to ${translatedArguments.join(',')}.`,
      )
    }
    const sourceStructure = messageStructure(source[id].defaultMessage)
    const translatedStructure = messageStructure(translated)
    if (sourceStructure !== translatedStructure) {
      throw new Error(
        `${locale}:${id} changed ICU plural, select, tag, or formatter structure.`,
      )
    }
    if (
      id.startsWith('wiki.lore.') &&
      id.endsWith('.body') &&
      paragraphCount(translated) !==
        paragraphCount(source[id].defaultMessage)
    ) {
      throw new Error(
        `${locale}:${id} changed the authored lore paragraph count.`,
      )
    }
    if (
      id.startsWith('wiki.patch-notes.archive.') &&
      bulletCount(translated) !== bulletCount(source[id].defaultMessage)
    ) {
      throw new Error(
        `${locale}:${id} changed the archived patch-note bullet count.`,
      )
    }
    const leakedEnglish = englishLeakTokens(translated)
    if (leakedEnglish.length >= 2) {
      throw new Error(
        `${locale}:${id} contains probable hybrid English: ${leakedEnglish.join(', ')}.`,
      )
    }
    if (translated === source[id].defaultMessage) unchanged += 1
  }
  console.log(
    `${locale}: ${sourceKeys.length} complete messages; ${unchanged} deliberately or potentially unchanged strings require glossary review.`,
  )
}

function assertNoDuplicateTopLevelKeys(relativePath: string): void {
  const raw = readFileSync(resolve(root, relativePath), 'utf8')
  const counts = new Map<string, number>()
  for (const match of raw.matchAll(/^  "([^"\\]+)":/gm)) {
    const id = match[1]
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => `${id} (${count} definitions)`)
    .sort(compareText)
  if (duplicates.length > 0) {
    throw new Error(
      `${relativePath} contains duplicate top-level message IDs: ${duplicates.join(', ')}.`,
    )
  }
}

function englishLeakTokens(message: string): string[] {
  const literals: string[] = []
  const visit = (elements: readonly unknown[]): void => {
    for (const unknownElement of elements) {
      if (
        typeof unknownElement !== 'object' ||
        unknownElement === null
      ) {
        continue
      }
      const element = unknownElement as {
        readonly type?: number
        readonly value?: string
        readonly options?: Readonly<
          Record<string, { readonly value?: readonly unknown[] }>
        >
        readonly children?: readonly unknown[]
      }
      if (element.type === 0 && element.value) {
        literals.push(element.value)
      }
      for (const option of Object.values(element.options ?? {})) {
        visit(option.value ?? [])
      }
      visit(element.children ?? [])
    }
  }
  visit(parse(message, { captureLocation: false }))
  for (const segment of literals.join(' ')
    .split(/\n+|(?<=[.!?])\s+/)) {
    const leaked = [...new Set(
      segment
        .replace(/#[\p{L}\p{N}_-]+/gu, ' ')
        .toLocaleLowerCase('en')
        .match(/[a-z]+/g)
        ?.filter((word) => COMMON_ENGLISH_WORDS.has(word)) ?? [],
    )].sort(compareText)
    if (leaked.length >= 2) return leaked
  }
  return []
}

function messageStructure(message: string): string {
  const normalize = (elements: readonly unknown[]): readonly unknown[] =>
    elements.map((unknownElement) => {
      if (
        typeof unknownElement !== 'object' ||
        unknownElement === null
      ) {
        return typeof unknownElement
      }
      const element = unknownElement as {
        readonly type?: number
        readonly value?: string
        readonly style?: unknown
        readonly offset?: number
        readonly pluralType?: string
        readonly options?: Readonly<
          Record<string, { readonly value?: readonly unknown[] }>
        >
        readonly children?: readonly unknown[]
      }
      return {
        type: element.type,
        ...(element.type === 0 ? {} : { value: element.value }),
        style: element.style,
        offset: element.offset,
        pluralType: element.pluralType,
        options: Object.fromEntries(
          Object.entries(element.options ?? {})
            .sort(([left], [right]) => compareText(left, right))
            .map(([key, option]) => [
              key,
              normalize(option.value ?? []),
            ]),
        ),
        children: normalize(element.children ?? []),
      }
    })
  return JSON.stringify(
    normalize(parse(message, { captureLocation: false })),
  )
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(root, relativePath), 'utf8'),
  ) as T
}

function messageArguments(message: string): string[] {
  const values = new Set<string>()
  const visit = (elements: readonly unknown[]): void => {
    for (const unknownElement of elements) {
      if (
        typeof unknownElement !== 'object' ||
        unknownElement === null
      ) {
        continue
      }
      const element = unknownElement as {
        readonly type?: number
        readonly value?: string
        readonly options?: Readonly<
          Record<string, { readonly value?: readonly unknown[] }>
        >
        readonly children?: readonly unknown[]
      }
      if (
        element.type !== 0 &&
        typeof element.value === 'string'
      ) {
        values.add(element.value)
      }
      for (const option of Object.values(element.options ?? {})) {
        visit(option.value ?? [])
      }
      visit(element.children ?? [])
    }
  }
  visit(parse(message, { captureLocation: false }))
  return [...values].sort(compareText)
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function paragraphCount(message: string): number {
  return message.trim().split(/\n\s*\n/).length
}

function bulletCount(message: string): number {
  return message.match(/^\s*-/gm)?.length ?? 0
}
