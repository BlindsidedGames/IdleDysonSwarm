import { describe, expect, it } from 'vitest'
import {
  assertUniqueWikiAuthoredMessageIds,
  wikiLoreChapterBodyMessage,
  wikiLoreChapterTitleMessage,
  wikiPatchNoteMessage,
  type WikiLoreChapter,
  type WikiLoreSection,
  type WikiPatchNote,
} from './content'

describe('authored Wiki translation identifiers', () => {
  it('keeps lore translation IDs attached to their chapter when chapters are reordered or inserted', () => {
    const first: WikiLoreChapter = { id: 'chapter-1', title: 'Chapter 1', body: 'First chapter' }
    const second: WikiLoreChapter = { id: 'chapter-2', title: 'Chapter 2', body: 'Second chapter' }
    const inserted: WikiLoreChapter = { id: 'chapter-1-5', title: 'Chapter 1.5', body: 'Inserted chapter' }
    const section: WikiLoreSection = {
      id: 'existence',
      title: 'Existence',
      chapters: [first, second],
    }

    const before = new Map(section.chapters.map((chapter) => [chapter.body, wikiLoreChapterBodyMessage(section, chapter).id]))
    const reordered = [second, inserted, first]

    expect(wikiLoreChapterTitleMessage(section, reordered[0]).id).toBe('wiki.lore.existence.chapter.chapter-2.title')
    expect(wikiLoreChapterBodyMessage(section, reordered[0]).id).toBe(before.get(second.body))
    expect(wikiLoreChapterBodyMessage(section, reordered[2]).id).toBe(before.get(first.body))
    expect(wikiLoreChapterBodyMessage(section, inserted).id).toBe('wiki.lore.existence.chapter.chapter-1-5.body')
    expect(wikiLoreChapterTitleMessage(section, {
      ...first,
      title: 'The Beginning',
    }).id).toBe('wiki.lore.existence.chapter.chapter-1.title')
  })

  it('keeps archive translation IDs attached when entries are reordered or inserted', () => {
    const legacy: WikiPatchNote = { id: 'legacy-2-15-through-1-00', version: '2.15-2.16 through 1.00', notes: 'Legacy notes' }
    const overhaul: WikiPatchNote = { id: '2-18-7', version: '2.18.7', notes: 'Overhaul notes' }
    const inserted: WikiPatchNote = { id: '4-1-5', version: '4.1.5', notes: 'Current notes' }

    expect([overhaul, inserted, legacy].map(wikiPatchNoteMessage).map((message) => message.id)).toEqual([
      'wiki.patch-notes.archive.2-18-7',
      'wiki.patch-notes.archive.4-1-5',
      'wiki.patch-notes.archive.legacy-2-15-through-1-00',
    ])
  })

  it('rejects duplicate authored translation IDs before catalog merge', () => {
    expect(() => assertUniqueWikiAuthoredMessageIds([
      { id: 'wiki.duplicate', defaultMessage: 'First', description: 'First' },
      { id: 'wiki.duplicate', defaultMessage: 'Second', description: 'Second' },
    ])).toThrow('Duplicate authored Wiki translation ID: wiki.duplicate')
  })
})
