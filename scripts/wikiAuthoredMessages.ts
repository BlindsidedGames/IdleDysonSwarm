import {
  assertUniqueWikiAuthoredMessageIds,
  WIKI_LORE_SECTIONS,
  WIKI_PATCH_NOTES,
  wikiLoreChapterBodyMessage,
  wikiLoreChapterTitleMessage,
  wikiLoreSectionTitleMessage,
  wikiPatchNoteMessage,
  type WikiAuthoredMessage,
} from '../src/ui/gameplay/wiki/content.js'

/** The same runtime descriptors own extraction and build-time deduplication. */
export function collectWikiAuthoredMessages(): readonly WikiAuthoredMessage[] {
  const messages = [
    ...WIKI_PATCH_NOTES.map(wikiPatchNoteMessage),
    ...WIKI_LORE_SECTIONS.flatMap((section) => [
      wikiLoreSectionTitleMessage(section),
      ...section.chapters.flatMap((chapter) => [
        wikiLoreChapterTitleMessage(section, chapter),
        wikiLoreChapterBodyMessage(section, chapter),
      ]),
    ]),
  ]
  assertUniqueWikiAuthoredMessageIds(messages)
  return messages
}
