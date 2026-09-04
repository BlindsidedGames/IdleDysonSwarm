import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useIntl, type IntlShape, type MessageDescriptor } from 'react-intl'
import { formatGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { SECRET_REVEAL_ORDER } from '../secretRevealOrder'
import { wikiMessages as messages } from './messages'
import {
  WIKI_LORE_SECTIONS,
  WIKI_PATCH_NOTES,
  wikiLoreChapterBodyMessage,
  wikiLoreChapterTitleMessage,
  wikiLoreSectionTitleMessage,
  wikiPatchNoteMessage,
} from './content'
import {
  visibleWikiLoreSectionIds,
  visibleWikiCategoryIds,
  type WikiCategoryId,
  type WikiProgression,
} from './wikiProjection'
import './wiki.css'

export interface WikiSurfaceProps {
  readonly locale: EnabledLocale
  readonly progression: WikiProgression
  readonly initialCategory?: WikiCategoryId
  readonly onCategoryChange?: (category: WikiCategoryId) => void
}

interface WikiSection {
  readonly title: MessageDescriptor
  readonly body: MessageDescriptor
}

interface WikiCategory {
  readonly id: WikiCategoryId
  readonly title: MessageDescriptor
  readonly sections: readonly WikiSection[]
}

const baseCategories: readonly WikiCategory[] = [
  {
    id: 'bots',
    title: messages.bots,
    sections: [
      { title: messages.botsOverviewTitle, body: messages.botsOverview },
      { title: messages.panelsTitle, body: messages.panels },
      { title: messages.scaleTitle, body: messages.scale },
      { title: messages.milestonesTitle, body: messages.milestones },
    ],
  },
  {
    id: 'research',
    title: messages.research,
    sections: [
      { title: messages.researchOverviewTitle, body: messages.researchOverview },
    ],
  },
  {
    id: 'skills',
    title: messages.skills,
    sections: [
      { title: messages.skillsOverviewTitle, body: messages.skillsOverview },
      { title: messages.autoAssignTitle, body: messages.autoAssign },
    ],
  },
  {
    id: 'infinity',
    title: messages.infinity,
    sections: [
      { title: messages.infinityOverviewTitle, body: messages.infinityOverview },
      { title: messages.infinityScalingTitle, body: messages.infinityScaling },
      { title: messages.infinitySecretsTitle, body: messages.infinitySecrets },
    ],
  },
  {
    id: 'offline-time',
    title: messages.offlineTime,
    sections: [
      { title: messages.offlineTitle, body: messages.offlineEarning },
      { title: messages.offlineSpendingTitle, body: messages.offlineSpending },
      { title: messages.offlineProcessingTitle, body: messages.offlineProcessing },
      { title: messages.offlineAccuracyTitle, body: messages.offlineAccuracy },
      { title: messages.offlineResultsTitle, body: messages.offlineResults },
    ],
  },
  { id: 'lore', title: messages.lore, sections: [] },
  {
    id: 'reality',
    title: messages.reality,
    sections: [
      { title: messages.realityOverviewTitle, body: messages.realityOverview },
      { title: messages.realityOfflineTitle, body: messages.realityOffline },
      { title: messages.disastersTitle, body: messages.disasters },
      { title: messages.countermeasuresTitle, body: messages.countermeasures },
      { title: messages.anomalyTitle, body: messages.anomaly },
    ],
  },
  {
    id: 'quantum',
    title: messages.quantum,
    sections: [
      { title: messages.quantumOverviewTitle, body: messages.quantumOverview },
      { title: messages.quantumAdviceTitle, body: messages.quantumAdvice },
    ],
  },
  { id: 'secrets', title: messages.secrets, sections: [] },
  {
    id: 'other',
    title: messages.other,
    sections: [
      { title: messages.easterEggTitle, body: messages.easterEgg },
    ],
  },
  { id: 'patch-notes', title: messages.patchNotes, sections: [] },
]

const FLAT_CATEGORY_IDS = new Set<WikiCategoryId>([
  'bots',
  'research',
  'skills',
  'infinity',
])

const goalMessages = [
  messages.goal1,
  messages.goal2,
  messages.goal3,
  messages.goal4,
  messages.goal5,
  messages.goal6,
  messages.goal7,
  messages.goal8,
  messages.goal9,
  messages.goal10,
] as const

const version4PatchNoteMessages = [
  messages.patchNotesVersion4WebRelease,
  messages.patchNotesVersion4OfflineTime,
  messages.patchNotesVersion4Saves,
  messages.patchNotesVersion4Transfers,
  messages.patchNotesVersion4Pwa,
  messages.patchNotesVersion4Store,
  messages.patchNotesVersion4ResponsiveUi,
  messages.patchNotesVersion4Accessibility,
  messages.patchNotesVersion4Wiki,
  messages.patchNotesVersion4StoryAndStore,
  messages.patchNotesVersion4Statistics,
  messages.patchNotesVersion4SettingsAndDebug,
  messages.patchNotesVersion4InteractionFixes,
] as const

const version41PatchNoteMessages = [
  messages.patchNotesVersion41Audio,
  messages.patchNotesVersion41SkillEffects,
  messages.patchNotesVersion41SkillControls,
  messages.patchNotesVersion41MobileUi,
  messages.patchNotesVersion41Navigation,
  messages.patchNotesVersion41Settings,
  messages.patchNotesVersion41Store,
  messages.patchNotesVersion41ProgressPanels,
  messages.patchNotesVersion41Infinity,
  messages.patchNotesVersion41DysonVisualization,
  messages.patchNotesVersion41Statistics,
  messages.patchNotesVersion41StoredTime,
  messages.patchNotesVersion41Saves,
  messages.patchNotesVersion41Economy,
] as const

const version411PatchNoteMessages = [
  messages.patchNotesVersion411Overlays,
  messages.patchNotesVersion411CompactLayouts,
  messages.patchNotesVersion411SkillsAndTinker,
  messages.patchNotesVersion411MegaTeaser,
] as const

const version413PatchNoteMessages = [
  messages.patchNotesVersion413Details,
  messages.patchNotesVersion413Calculations,
  messages.patchNotesVersion413Cards,
  messages.patchNotesVersion413Tinker,
  messages.patchNotesVersion413Statistics,
] as const

const version414PatchNoteMessages = [
  messages.patchNotesVersion414StoredTime,
  messages.patchNotesVersion414SimulationResources,
] as const

const version417PatchNoteMessages = [
  messages.patchNotesVersion417Rounding,
  messages.patchNotesVersion417Scaling,
  messages.patchNotesVersion417Terra,
  messages.patchNotesVersion417Allocation,
  messages.patchNotesVersion417OfflineErrors,
  messages.patchNotesVersion417SaveFile,
  messages.patchNotesVersion417ResearchReset,
  messages.patchNotesVersion417RepeatableResearch,
] as const

const version416PatchNoteMessages = [
  messages.patchNotesVersion416Facilities,
  messages.patchNotesVersion416BotsSummary,
  messages.patchNotesVersion416SharedNotices,
  messages.patchNotesVersion416Disasters,
] as const

const version415PatchNoteMessages = [
  messages.patchNotesVersion415VisualSystem,
  messages.patchNotesVersion415ResponsiveLayouts,
  messages.patchNotesVersion415Facilities,
  messages.patchNotesVersion415Skills,
  messages.patchNotesVersion415PrestigeShops,
  messages.patchNotesVersion415SimulationsUi,
  messages.patchNotesVersion415SimulationBalance,
  messages.patchNotesVersion415SimulationFixes,
  messages.patchNotesVersion415Reality,
  messages.patchNotesVersion415Avocato,
  messages.patchNotesVersion415NumberInput,
  messages.patchNotesVersion415Persistence,
  messages.patchNotesVersion415SaveRecovery,
  messages.patchNotesVersion415StoreOwnership,
  messages.patchNotesVersion415ExtremeValues,
  messages.patchNotesVersion415Startup,
  messages.patchNotesVersion415OfflineConfirmation,
] as const

const version415September1PatchNoteMessages = [
  messages.patchNotesVersion415September1Community,
  messages.patchNotesVersion415September1OfflineCompletion,
  messages.patchNotesVersion415September1Compatibility,
] as const

const version412PatchNoteMessages = [
  messages.patchNotesVersion412Languages,
  messages.patchNotesVersion412Processing,
  messages.patchNotesVersion412OfflineControls,
  messages.patchNotesVersion412UpdateInterval,
  messages.patchNotesVersion412DoubleTime,
] as const

type SecretEffectMessage =
  | 'assemblyLineBoost'
  | 'aiManagerBoost'
  | 'serverBoost'
  | 'planetBoost'
  | 'cashMultiplier'
  | 'scienceMultiplier'
  | 'assemblyLineMultiplier'
  | 'aiManagerMultiplier'
  | 'serverMultiplier'
  | 'planetMultiplier'

interface SecretEntry {
  readonly letter: string
  readonly effect: SecretEffectMessage
  readonly change: string
}

const secretEntries: readonly SecretEntry[] = [
  { letter: 'L', effect: 'assemblyLineBoost', change: '3% → 6%' },
  { letter: 'O', effect: 'cashMultiplier', change: '×1 → ×2' },
  { letter: 'V', effect: 'serverBoost', change: '3% → 6%' },
  { letter: 'E', effect: 'assemblyLineBoost', change: '6% → 9%' },
  { letter: ',', effect: 'aiManagerBoost', change: '3% → 6%' },
  { letter: 'F', effect: 'scienceMultiplier', change: '×1 → ×2' },
  { letter: 'A', effect: 'planetBoost', change: '3% → 6%' },
  { letter: 'M', effect: 'cashMultiplier', change: '×2 → ×4' },
  { letter: 'I', effect: 'serverBoost', change: '6% → 9%' },
  { letter: 'L', effect: 'scienceMultiplier', change: '×2 → ×4' },
  { letter: 'Y', effect: 'scienceMultiplier', change: '×4 → ×6' },
  { letter: ',', effect: 'assemblyLineBoost', change: '9% → 12%' },
  { letter: 'A', effect: 'aiManagerBoost', change: '6% → 9%' },
  { letter: 'N', effect: 'planetBoost', change: '6% → 9%' },
  { letter: 'D', effect: 'scienceMultiplier', change: '×6 → ×8' },
  { letter: 'S', effect: 'assemblyLineMultiplier', change: '×1 → ×2' },
  { letter: 'L', effect: 'planetMultiplier', change: '×1 → ×2' },
  { letter: 'A', effect: 'planetMultiplier', change: '×2 → ×5' },
  { letter: 'T', effect: 'cashMultiplier', change: '×4 → ×6' },
  { letter: 'N', effect: 'serverMultiplier', change: '×1 → ×2' },
  { letter: 'E', effect: 'serverMultiplier', change: '×2 → ×3' },
  { letter: 'M', effect: 'scienceMultiplier', change: '×8 → ×10' },
  { letter: 'E', effect: 'assemblyLineMultiplier', change: '×2 → ×7' },
  { letter: 'R', effect: 'aiManagerMultiplier', change: '×1 → ×2.5' },
  { letter: 'C', effect: 'cashMultiplier', change: '×6 → ×8' },
  { letter: 'N', effect: 'aiManagerMultiplier', change: '×2.5 → ×3' },
  { letter: 'I', effect: 'aiManagerMultiplier', change: '×3 → ×42' },
]

export function WikiSurface({
  locale,
  progression,
  initialCategory = 'bots',
  onCategoryChange,
}: WikiSurfaceProps) {
  const intl = useIntl()
  const topicSelectId = useId()
  const articleRef = useRef<HTMLElement>(null)
  const visibleIds = visibleWikiCategoryIds(progression)
  const visibleCategories = baseCategories.filter((category) => visibleIds.includes(category.id))
  const [requestedCategory, setRequestedCategory] = useState<WikiCategoryId>(initialCategory)
  const category = visibleCategories.find(({ id }) => id === requestedCategory) ?? visibleCategories[0]
  const panelId = `wiki-panel-${category.id}`
  const selectCategory = (nextCategory: WikiCategoryId) => {
    setRequestedCategory(nextCategory)
    onCategoryChange?.(nextCategory)
  }

  useLayoutEffect(() => {
    if (articleRef.current !== null) articleRef.current.scrollTop = 0
  }, [category.id])

  return (
    <div className="wiki-surface">
      <header className="wiki-surface__summary">
        <div>
          <div className="wiki-surface__title" aria-hidden="true">
            {intl.formatMessage(messages.title)}
          </div>
        </div>
      </header>

      <div className="wiki-surface__layout">
        <nav className="wiki-surface__navigation" aria-label={intl.formatMessage(messages.topicNavigation)}>
          <h2>{intl.formatMessage(messages.topics)}</h2>
          <label
            className="wiki-surface__mobile-topic-control"
            htmlFor={topicSelectId}
          >
            <span>{intl.formatMessage(messages.topics)}</span>
            <select
              id={topicSelectId}
              value={category.id}
              onChange={(event) => {
                selectCategory(event.currentTarget.value as WikiCategoryId)
              }}
            >
              {visibleCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {intl.formatMessage(item.title)}
                </option>
              ))}
            </select>
          </label>
          <div className="wiki-surface__topic-list">
            {visibleCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-controls={item.id === category.id ? panelId : undefined}
                aria-current={item.id === category.id ? 'page' : undefined}
                onClick={() => selectCategory(item.id)}
              >
                <span>{intl.formatMessage(item.title)}</span>
                <span
                  className="wiki-surface__topic-chevron"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </nav>

        <article ref={articleRef} id={panelId} className={`wiki-surface__article wiki-surface__article--${category.id}`} aria-labelledby={`${panelId}-title`}>
          {category.id === 'lore' ? (
            <header className="wiki-surface__article-heading">
              <h2 id={`${panelId}-title`}>
                {intl.formatMessage(messages.loreArticleTitle)}
              </h2>
              <p>{intl.formatMessage(messages.loreIntroduction)}</p>
            </header>
          ) : (
            <h2 id={`${panelId}-title`}>
              {intl.formatMessage(category.title)}
            </h2>
          )}
          {category.id === 'skills' ? (
            <>
              <WikiSections
                flat
                onSelectCategory={selectCategory}
                sections={category.sections}
                visibleCategoryIds={visibleIds}
              />
              <section className="wiki-surface__section">
                <h3>{intl.formatMessage(messages.goalsTitle)}</h3>
                <ol className="wiki-surface__goals">
                  {goalMessages.map((goal) => (
                    <li key={goal.id}>
                      {formatWikiMessage(intl, goal, selectCategory, visibleIds)}
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : category.id === 'secrets' ? (
            <SecretsArticle locale={locale} revealed={progression.secretsOfTheUniverse} />
          ) : category.id === 'patch-notes' ? (
            <PatchNotesArticle />
          ) : category.id === 'lore' ? (
            <LoreArticle progression={progression} />
          ) : (
            <WikiSections
              flat={FLAT_CATEGORY_IDS.has(category.id)}
              onSelectCategory={selectCategory}
              sections={category.sections}
              visibleCategoryIds={visibleIds}
            />
          )}
        </article>
      </div>
    </div>
  )
}

function PatchNotesArticle() {
  const intl = useIntl()
  const previousNotes = WIKI_PATCH_NOTES
    .map((entry) => intl.formatMessage(wikiPatchNoteMessage(entry)))
    .reverse()
    .join('\n\n')

  return (
    <>
      <div className="wiki-surface__long-form-list">
        <section className="wiki-surface__section">
          <h3>{intl.formatMessage(messages.patchNotesMostRecent)}</h3>
          <h4>{intl.formatMessage(messages.patchNotesVersion417)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version417PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
        </section>
        <section className="wiki-surface__section">
          <h3>{intl.formatMessage(messages.patchNotesPrevious)}</h3>
          <h4>{intl.formatMessage(messages.patchNotesVersion416)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version416PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion415)}</h4>
          <h5>{intl.formatMessage(messages.patchNotesVersion415September1)}</h5>
          <ul className="wiki-surface__patch-note-list">
            {version415September1PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h5>{intl.formatMessage(messages.patchNotesVersion415Earlier)}</h5>
          <ul className="wiki-surface__patch-note-list">
            {version415PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion414)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version414PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion413)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version413PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion412)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version412PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion411)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version411PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion41)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version41PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
          <h4>{intl.formatMessage(messages.patchNotesVersion4)}</h4>
          <ul className="wiki-surface__patch-note-list">
            {version4PatchNoteMessages.map((message) => (
              <li key={message.id}>{intl.formatMessage(message)}</li>
            ))}
          </ul>
        </section>
        <section className="wiki-surface__section">
          <h3>{intl.formatMessage(messages.patchNotesEarlier)}</h3>
          <p className="wiki-surface__authored-copy">{previousNotes}</p>
        </section>
      </div>
    </>
  )
}

function LoreArticle({ progression }: { readonly progression: WikiProgression }) {
  const intl = useIntl()
  const visibleSectionIds = visibleWikiLoreSectionIds(progression)
  return (
    <div className="wiki-surface__lore">
      {WIKI_LORE_SECTIONS
        .filter((section) => visibleSectionIds.includes(section.id))
        .map((section) => (
          <section key={section.id} className="wiki-surface__lore-section">
            <h3>{intl.formatMessage(wikiLoreSectionTitleMessage(section))}</h3>
            <div className="wiki-surface__lore-chapters">
              {section.chapters.map((chapter) => (
                <details key={`${section.id}-${chapter.id}`}>
                  <summary>{intl.formatMessage(wikiLoreChapterTitleMessage(section, chapter))}</summary>
                  <p className="wiki-surface__authored-copy">
                    {intl.formatMessage(wikiLoreChapterBodyMessage(section, chapter))}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

function WikiSections({
  flat = false,
  onSelectCategory,
  sections,
  visibleCategoryIds,
}: {
  readonly flat?: boolean
  readonly onSelectCategory: (category: WikiCategoryId) => void
  readonly sections: readonly WikiSection[]
  readonly visibleCategoryIds: readonly WikiCategoryId[]
}) {
  const intl = useIntl()
  if (flat) {
    return (
      <div className="wiki-surface__section wiki-surface__copy">
        {sections.map((section) => (
          <p key={section.body.id}>
            {formatWikiMessage(
              intl,
              section.body,
              onSelectCategory,
              visibleCategoryIds,
            )}
          </p>
        ))}
      </div>
    )
  }
  return sections.map((section) => (
    <section key={section.title.id} className="wiki-surface__section">
      <h3>{intl.formatMessage(section.title)}</h3>
      <p>
        {formatWikiMessage(
          intl,
          section.body,
          onSelectCategory,
          visibleCategoryIds,
        )}
      </p>
    </section>
  ))
}

function formatWikiMessage(
  intl: IntlShape,
  message: MessageDescriptor,
  onSelectCategory: (category: WikiCategoryId) => void,
  visibleCategoryIds: readonly WikiCategoryId[],
): ReactNode {
  return intl.formatMessage(message, {
    bots: (chunks) => wikiTopicLink(chunks, 'bots', onSelectCategory, visibleCategoryIds),
    infinity: (chunks) => wikiTopicLink(chunks, 'infinity', onSelectCategory, visibleCategoryIds),
    quantum: (chunks) => wikiTopicLink(chunks, 'quantum', onSelectCategory, visibleCategoryIds),
    reality: (chunks) => wikiTopicLink(chunks, 'reality', onSelectCategory, visibleCategoryIds),
    skills: (chunks) => wikiTopicLink(chunks, 'skills', onSelectCategory, visibleCategoryIds),
    value: (chunks) => <span className="wiki-surface__value">{chunks}</span>,
  })
}

function wikiTopicLink(
  chunks: ReactNode,
  category: WikiCategoryId,
  onSelectCategory: (category: WikiCategoryId) => void,
  visibleCategoryIds: readonly WikiCategoryId[],
): ReactNode {
  if (!visibleCategoryIds.includes(category)) {
    return <span className="wiki-surface__value">{chunks}</span>
  }
  return (
    <button
      type="button"
      className="wiki-surface__topic-link"
      onClick={() => onSelectCategory(category)}
    >
      {chunks}
    </button>
  )
}

function SecretsArticle({ locale, revealed }: { readonly locale: EnabledLocale; readonly revealed: bigint }) {
  const intl = useIntl()
  const count = Number(revealed > 27n ? 27n : revealed)
  const unlocked = secretEntries.slice(0, count)
  const meaning = formatMeaning(
    intl.formatMessage(messages.meaningPhrase),
    count,
  )

  return (
    <>
      <section className="wiki-surface__section wiki-surface__secrets-summary">
        <h3>{intl.formatMessage(messages.secretsOverviewTitle)}</h3>
        <p>{intl.formatMessage(messages.secretsOverview, {
          revealed: formatGameNumber(locale, revealed, {
            wholeBelowHundred: true,
          }),
        })}</p>
        <strong>{intl.formatMessage(messages.meaningSoFar, { meaning })}</strong>
      </section>
      <ol className="wiki-surface__secret-list">
        {unlocked.map((entry, index) => (
          <li key={`${index}-${entry.letter}`}>
            <span className="wiki-surface__secret-letter" aria-hidden="true">{entry.letter}</span>
            <span>
              <strong>{intl.formatMessage(messages.secretLevel, { level: index + 1 })}</strong>
              <small>{intl.formatMessage(messages[entry.effect])}</small>
            </span>
            <span className="wiki-surface__secret-change">{entry.change}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

function formatMeaning(phrase: string, revealed: number): string {
  const characters = [...phrase]
  const usesCanonicalOrder = phrase === messages.meaningPhrase.defaultMessage
  const revealOrder = usesCanonicalOrder
    ? SECRET_REVEAL_ORDER
    : characters
        .map((character, index) => ({ character, index }))
        .filter(({ character }) => !/\s/u.test(character))
        .map(({ index }) => index)
  const revealCount = usesCanonicalOrder
    ? revealed
    : Math.ceil((revealed * revealOrder.length) / 27)
  const revealedIndexes = new Set<number>(
    revealOrder.slice(0, revealCount),
  )
  return characters
    .map((character, index) => (
      /\s/u.test(character) || revealedIndexes.has(index)
        ? character
        : '-'
    ))
    .join('')
}
