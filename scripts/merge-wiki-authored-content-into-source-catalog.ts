import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertUniqueWikiAuthoredMessageIds,
  WIKI_LORE_SECTIONS,
  WIKI_PATCH_NOTES,
  wikiLoreChapterBodyMessage,
  wikiLoreChapterTitleMessage,
  wikiLoreSectionTitleMessage,
  wikiPatchNoteMessage,
  type WikiAuthoredMessage,
} from '../src/ui/gameplay/wiki/content'

const root = resolve(import.meta.dirname, '..')
const path = resolve(root, 'src/ui/i18n/catalogs/source/en.json')
const check = process.argv.includes('--check')
const source = JSON.parse(readFileSync(path, 'utf8')) as Record<
  string,
  { readonly defaultMessage: string; readonly description: string }
>
const authored: WikiAuthoredMessage[] = [
  ...WIKI_PATCH_NOTES.map(wikiPatchNoteMessage),
  ...WIKI_LORE_SECTIONS.flatMap((section) => [
    wikiLoreSectionTitleMessage(section),
    ...section.chapters.flatMap((chapter) => [
      wikiLoreChapterTitleMessage(section, chapter),
      wikiLoreChapterBodyMessage(section, chapter),
    ]),
  ]),
]
assertUniqueWikiAuthoredMessageIds(authored)
for (const message of authored) {
  source[message.id] = {
    defaultMessage: message.defaultMessage,
    description: message.description,
  }
}
const serialized = `${JSON.stringify(
  Object.fromEntries(Object.entries(source).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )),
  null,
  2,
)}\n`
if (check) {
  if (readFileSync(path, 'utf8') !== serialized) {
    throw new Error('Authored Wiki content is missing or stale in the source catalog.')
  }
} else {
  writeFileSync(path, serialized)
}
console.log(`${authored.length} authored Wiki messages merged into the source catalog.`)
