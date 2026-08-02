import {
  useIntl,
  type MessageDescriptor,
} from 'react-intl'
import { useEffect, useState } from 'react'
import type {
  FrontendStoryChapterId,
  FrontendStoryDerivedFacts,
  FrontendStoryPassageId,
} from '../../../application/frontendSnapshot'
import {
  CollapsibleSection,
} from '../../components'
import { storyMessages as messages } from './messages'
import './story.css'

export interface StorySurfaceProps {
  readonly story: FrontendStoryDerivedFacts
}

interface StoryChapterDefinition {
  readonly id: FrontendStoryChapterId
  readonly title: MessageDescriptor
  readonly passages: readonly FrontendStoryPassageId[]
}

const CHAPTERS: readonly StoryChapterDefinition[] = [
  {
    id: 'chapter-1',
    title: messages.chapter1,
    passages: [
      'chapter-1-intro',
      'chapter-1-part-2',
      'chapter-1-part-3',
    ],
  },
  {
    id: 'chapter-2',
    title: messages.chapter2,
    passages: [
      'chapter-2-intro',
      'chapter-2-part-2',
      'chapter-2-part-3',
    ],
  },
  {
    id: 'chapter-3',
    title: messages.chapter3,
    passages: [
      'chapter-3-intro',
      'chapter-3-part-2',
    ],
  },
  {
    id: 'chapter-4',
    title: messages.chapter4,
    passages: [
      'chapter-4-intro',
      'chapter-4-part-2',
      'chapter-4-part-3',
      'chapter-4-part-4',
      'chapter-4-part-5',
      'chapter-4-part-6',
      'chapter-4-part-7',
      'chapter-4-part-8',
      'chapter-4-part-9',
      'chapter-4-part-10',
    ],
  },
  {
    id: 'chapter-5',
    title: messages.chapter5,
    passages: [
      'chapter-5-part-1',
      'chapter-5-part-2',
      'chapter-5-part-3',
      'chapter-5-part-4',
      'chapter-5-part-5',
    ],
  },
  {
    id: 'chapter-6',
    title: messages.chapter6,
    passages: [
      'chapter-6-translation',
      'chapter-6-speed',
      'chapter-6-complete',
    ],
  },
] as const

const PASSAGE_MESSAGES: Readonly<
  Record<FrontendStoryPassageId, MessageDescriptor>
> = {
  'chapter-1-intro': messages.chapter1Intro,
  'chapter-1-part-2': messages.chapter1Part2,
  'chapter-1-part-3': messages.chapter1Part3,
  'chapter-2-intro': messages.chapter2Intro,
  'chapter-2-part-2': messages.chapter2Part2,
  'chapter-2-part-3': messages.chapter2Part3,
  'chapter-3-intro': messages.chapter3Intro,
  'chapter-3-part-2': messages.chapter3Part2,
  'chapter-4-intro': messages.chapter4Intro,
  'chapter-4-part-2': messages.chapter4Part2,
  'chapter-4-part-3': messages.chapter4Part3,
  'chapter-4-part-4': messages.chapter4Part4,
  'chapter-4-part-5': messages.chapter4Part5,
  'chapter-4-part-6': messages.chapter4Part6,
  'chapter-4-part-7': messages.chapter4Part7,
  'chapter-4-part-8': messages.chapter4Part8,
  'chapter-4-part-9': messages.chapter4Part9,
  'chapter-4-part-10': messages.chapter4Part10,
  'chapter-5-part-1': messages.chapter5Part1,
  'chapter-5-part-2': messages.chapter5Part2,
  'chapter-5-part-3': messages.chapter5Part3,
  'chapter-5-part-4': messages.chapter5Part4,
  'chapter-5-part-5': messages.chapter5Part5,
  'chapter-6-translation': messages.chapter6Translation,
  'chapter-6-speed': messages.chapter6Speed,
  'chapter-6-complete': messages.chapter6Complete,
}

/**
 * Presents Unity's milestone-revealed story copy. The surface never derives
 * progression from balances: it renders only the chapter and passage ids in
 * the canonical StoryManager projection.
 */
export function StorySurface({
  story,
}: StorySurfaceProps) {
  const intl = useIntl()
  const visibleChapters = new Set(story.visibleChapterIds)
  const visiblePassages = new Set(story.visiblePassageIds)

  return (
    <div className="story-surface">
      <div className="story-surface__content">
        <header className="story-surface__summary">
          <div className="story-surface__title" aria-hidden="true">
            {intl.formatMessage(messages.region)}
          </div>
          <p>{intl.formatMessage(messages.introduction)}</p>
        </header>

        <div className="story-surface__chapters">
          {CHAPTERS.map((chapter) => {
            const passages = chapter.passages.filter((passageId) =>
              visiblePassages.has(passageId),
            )
            if (
              !visibleChapters.has(chapter.id) &&
              passages.length === 0
            ) {
              return null
            }
            return (
              <CollapsibleSection
                className={`story-chapter story-chapter--${chapter.id}`}
                contentClassName="story-chapter__content"
                defaultExpanded
                key={chapter.id}
                storageKey={`story.${chapter.id}`}
                title={intl.formatMessage(chapter.title)}
              >
                <ol className="story-chapter__passages">
                  {passages.map((passageId) => (
                    <li key={passageId}>
                      {passageId === 'chapter-3-part-2' ? (
                        <AlternatingAvocatoPassage />
                      ) : (
                        <p>{intl.formatMessage(PASSAGE_MESSAGES[passageId])}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AlternatingAvocatoPassage() {
  const intl = useIntl()
  const [staring, setStaring] = useState(false)

  useEffect(() => {
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const timer = window.setInterval(
      () => setStaring((current) => !current),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [])

  return (
    <p>
      {intl.formatMessage(
        staring ? messages.chapter3Part2Stare : messages.chapter3Part2,
      )}
    </p>
  )
}
