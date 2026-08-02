import { useState } from 'react'
import { useIntl, type MessageDescriptor } from 'react-intl'
import { formatNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { wikiMessages as messages } from './messages'
import { WIKI_LORE_SECTIONS, WIKI_PATCH_NOTES } from './content'
import {
  visibleWikiCategoryIds,
  type WikiCategoryId,
  type WikiProgression,
} from './wikiProjection'
import './wiki.css'

export interface WikiSurfaceProps {
  readonly locale: EnabledLocale
  readonly progression: WikiProgression
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
    id: 'other',
    title: messages.other,
    sections: [
      { title: messages.offlineTitle, body: messages.offline },
      { title: messages.easterEggTitle, body: messages.easterEgg },
    ],
  },
  { id: 'patch-notes', title: messages.patchNotes, sections: [] },
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
]

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

export function WikiSurface({ locale, progression }: WikiSurfaceProps) {
  const intl = useIntl()
  const visibleIds = visibleWikiCategoryIds(progression)
  const visibleCategories = baseCategories.filter((category) => visibleIds.includes(category.id))
  const [requestedCategory, setRequestedCategory] = useState<WikiCategoryId>('bots')
  const category = visibleCategories.find(({ id }) => id === requestedCategory) ?? visibleCategories[0]
  const panelId = `wiki-panel-${category.id}`

  return (
    <div className="wiki-surface">
      <header className="wiki-surface__summary">
        <div>
          <div className="wiki-surface__title" aria-hidden="true">
            {intl.formatMessage(messages.title)}
          </div>
          <p>{intl.formatMessage(messages.introduction)}</p>
        </div>
      </header>

      <div className="wiki-surface__layout">
        <nav className="wiki-surface__navigation" aria-label={intl.formatMessage(messages.topicNavigation)}>
          <h2>{intl.formatMessage(messages.topics)}</h2>
          <div className="wiki-surface__topic-list">
            {visibleCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-controls={item.id === category.id ? panelId : undefined}
                aria-current={item.id === category.id ? 'page' : undefined}
                onClick={() => setRequestedCategory(item.id)}
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

        <article id={panelId} className={`wiki-surface__article wiki-surface__article--${category.id}`} aria-labelledby={`${panelId}-title`}>
          <h2 id={`${panelId}-title`}>{intl.formatMessage(category.title)}</h2>
          {category.id === 'skills' ? (
            <>
              <WikiSections sections={category.sections} />
              <section className="wiki-surface__section">
                <h3>{intl.formatMessage(messages.goalsTitle)}</h3>
                <ol className="wiki-surface__goals">
                  {goalMessages.map((goal) => <li key={goal.id}>{intl.formatMessage(goal)}</li>)}
                </ol>
              </section>
            </>
          ) : category.id === 'secrets' ? (
            <SecretsArticle locale={locale} revealed={progression.secretsOfTheUniverse} />
          ) : category.id === 'patch-notes' ? (
            <PatchNotesArticle />
          ) : category.id === 'lore' ? (
            <LoreArticle />
          ) : (
            <WikiSections sections={category.sections} />
          )}
        </article>
      </div>
    </div>
  )
}

function PatchNotesArticle() {
  const intl = useIntl()

  return (
    <>
      <p className="wiki-surface__article-introduction">
        {intl.formatMessage(messages.patchNotesIntroduction)}
      </p>
      <div className="wiki-surface__long-form-list">
        {[...WIKI_PATCH_NOTES].reverse().map((entry) => (
          <section key={entry.version} className="wiki-surface__section">
            <h3>{entry.version}</h3>
            <p className="wiki-surface__authored-copy">{entry.notes}</p>
          </section>
        ))}
      </div>
    </>
  )
}

function LoreArticle() {
  const intl = useIntl()

  return (
    <>
      <p className="wiki-surface__article-introduction">
        {intl.formatMessage(messages.loreIntroduction)}
      </p>
      <div className="wiki-surface__lore">
        {WIKI_LORE_SECTIONS.map((section) => (
          <section key={section.title} className="wiki-surface__lore-section">
            <h3>{section.title}</h3>
            <div className="wiki-surface__lore-chapters">
              {section.chapters.map((chapter) => (
                <details key={chapter.title}>
                  <summary>{chapter.title}</summary>
                  <p className="wiki-surface__authored-copy">{chapter.body}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

function WikiSections({ sections }: { readonly sections: readonly WikiSection[] }) {
  const intl = useIntl()
  return sections.map((section) => (
    <section key={section.title.id} className="wiki-surface__section">
      <h3>{intl.formatMessage(section.title)}</h3>
      <p>{intl.formatMessage(section.body)}</p>
    </section>
  ))
}

function SecretsArticle({ locale, revealed }: { readonly locale: EnabledLocale; readonly revealed: bigint }) {
  const intl = useIntl()
  const count = Number(revealed > 27n ? 27n : revealed)
  const unlocked = secretEntries.slice(0, count)
  const meaning = formatMeaning(count)

  return (
    <>
      <section className="wiki-surface__section wiki-surface__secrets-summary">
        <h3>{intl.formatMessage(messages.secretsOverviewTitle)}</h3>
        <p>{intl.formatMessage(messages.secretsOverview, { revealed: formatNumber(locale, revealed, { maximumFractionDigits: 0 }) })}</p>
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

const MEANING = 'Love, Family, and Incrementals'
const SECRET_REVEAL_ORDER = [
  0, 1, 2, 3, 4,
  6, 7, 8, 9, 10, 11, 12,
  14, 15, 16,
  29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18,
] as const

function formatMeaning(revealed: number): string {
  const revealedIndexes = new Set<number>(
    SECRET_REVEAL_ORDER.slice(0, revealed),
  )
  return [...MEANING]
    .map((character, index) => (
      character === ' ' || revealedIndexes.has(index) ? character : '-'
    ))
    .join('')
}
