import { useRef, useState } from 'react'
import { useIntl, type MessageDescriptor } from 'react-intl'
import type {
  FrontendCanonicalResources,
  FrontendGameplayDerivedFacts,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { AvocadoFeedSource } from '../../../simulation/avocadoDomain'
import avocatoIcon from '../../assets/skill-icons/avocados.png'
import { Button } from '../../components'
import { formatGameNumber, formatNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { avocatoMessages as messages } from './messages'
import './quantum.css'

type AvocatoCommand = Extract<CanonicalPlayerCommand, { readonly kind: 'avocado.feed' }>

export interface AvocatoCommandAvailability {
  readonly feed: boolean
}

export interface AvocatoSurfaceProps {
  readonly locale: EnabledLocale
  /** The Quantum upgrade opens the feed economy. */
  readonly unlocked: boolean
  readonly resources: FrontendCanonicalResources['avocado']
  readonly spendable: {
    readonly infinityPoints: bigint
    readonly influence: bigint
    readonly strangeMatter: bigint
  }
  readonly derived: FrontendGameplayDerivedFacts['avocado']
  readonly previews: FrontendGameplayPreviews['avocado']
  readonly commandAvailability: AvocatoCommandAvailability
  readonly dispatchPlayer: (command: AvocatoCommand) => Promise<UiRuntimePlayerCommandResult>
}

const FEED_META: Readonly<Record<AvocadoFeedSource, { readonly title: MessageDescriptor; readonly resource: string }>> = {
  'infinity-points': { title: messages.infinityMultiplier, resource: 'Infinity Points' },
  influence: { title: messages.influenceMultiplier, resource: 'Influence' },
  'strange-matter': { title: messages.strangeMatterMultiplier, resource: 'Strange Matter' },
}

export function AvocatoSurface({ locale, unlocked, resources, spendable, derived, previews, commandAvailability, dispatchPlayer }: AvocatoSurfaceProps) {
  const intl = useIntl()
  return (
    <div className="avocato-surface">
      <header className="avocato-surface__hero">
        <img
          src={avocatoIcon}
          alt={intl.formatMessage(messages.iconAlt)}
        />
        <div>
          <div className="avocato-surface__title" aria-hidden="true">
            {intl.formatMessage(messages.region)}
          </div>
          <p>{intl.formatMessage(messages.greeting)}</p>
        </div>
      </header>

      <div className="avocato-surface__content">
        {unlocked ? (
          <>
        <section className="avocato-total" aria-label={intl.formatMessage(messages.totalBoost)}>
          <strong>{intl.formatMessage(messages.totalBoost)}</strong>
          <span>{intl.formatMessage(messages.multiplier, { value: formatNumber(locale, derived.total, { maximumSignificantDigits: 3 }) })}</span>
        </section>

        <div className="avocato-feed-grid">
          {previews.feeds.map((preview) => (
            <AvocatoFeedCard
              key={preview.source}
              locale={locale}
              preview={preview}
              invested={investedValue(resources, preview.source)}
              multiplier={multiplierValue(derived, preview.source)}
              resourceAvailable={spendableValue(spendable, preview.source)}
              routeAvailable={commandAvailability.feed}
              dispatchPlayer={dispatchPlayer}
            />
          ))}
          <article className="avocato-feed-card avocato-feed-card--overflow">
            <div><h2>{intl.formatMessage(messages.overflowMultiplier)}</h2><p>{intl.formatMessage(messages.invested, { value: formatGameNumber(locale, resources.overflowMultiplier) })}</p></div>
            <strong>{intl.formatMessage(messages.multiplier, { value: formatNumber(locale, derived.overflow, { maximumSignificantDigits: 3 }) })}</strong>
          </article>
        </div>
          </>
        ) : null}

        <details className="avocato-developer-note">
          <summary>{intl.formatMessage(messages.developerNoteTitle)}</summary>
          <p>{intl.formatMessage(messages.developerNote)}</p>
        </details>
      </div>
    </div>
  )
}

interface FeedCardProps {
  readonly locale: EnabledLocale
  readonly preview: FrontendGameplayPreviews['avocado']['feeds'][number]
  readonly invested: number
  readonly multiplier: number
  readonly resourceAvailable: bigint
  readonly routeAvailable: boolean
  readonly dispatchPlayer: AvocatoSurfaceProps['dispatchPlayer']
}

function AvocatoFeedCard({ locale, preview, invested, multiplier, resourceAvailable, routeAvailable, dispatchPlayer }: FeedCardProps) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const meta = FEED_META[preview.source]
  const disabled = pending || !preview.eligible || !routeAvailable

  const feed = async () => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'avocado.feed', source: preview.source })
      setFailed(result.status !== 'accepted')
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <article className="avocato-feed-card">
      <div>
        <h2>{intl.formatMessage(meta.title)}</h2>
        <strong>{intl.formatMessage(messages.multiplier, { value: formatNumber(locale, multiplier, { maximumSignificantDigits: 3 }) })}</strong>
        <p>{intl.formatMessage(messages.invested, { value: formatGameNumber(locale, invested) })}</p>
        <p>{intl.formatMessage(messages.available, { value: formatGameNumber(locale, resourceAvailable) })}</p>
      </div>
      <Button
        variant="primary"
        state={pending ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={disabled}
        aria-label={intl.formatMessage(messages.feedAccessible, { resource: meta.resource })}
        onClick={() => void feed()}
      >
        {intl.formatMessage(messages.feed, { value: formatGameNumber(locale, preview.amount) })}
      </Button>
      {failed && <p className="avocato-feed-card__feedback" role="alert">{intl.formatMessage(messages.failed)}</p>}
    </article>
  )
}

function spendableValue(spendable: AvocatoSurfaceProps['spendable'], source: AvocadoFeedSource): bigint {
  if (source === 'infinity-points') return spendable.infinityPoints
  if (source === 'influence') return spendable.influence
  return spendable.strangeMatter
}

function investedValue(resources: FrontendCanonicalResources['avocado'], source: AvocadoFeedSource): number {
  if (source === 'infinity-points') return resources.infinityPoints
  if (source === 'influence') return resources.influence
  return resources.strangeMatter
}

function multiplierValue(derived: FrontendGameplayDerivedFacts['avocado'], source: AvocadoFeedSource): number {
  if (source === 'infinity-points') return derived.infinityPoints
  if (source === 'influence') return derived.influence
  return derived.strangeMatter
}
