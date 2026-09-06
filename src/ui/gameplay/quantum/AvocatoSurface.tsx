import { useRef, useState } from 'react'
import { useIntl, type MessageDescriptor } from 'react-intl'
import type {
  FrontendCanonicalResources,
  FrontendGameplayDerivedFacts,
  FrontendGameplayPreviews,
} from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { AvocadoFeedSource } from '../../../simulation/avocadoDomain'
import avocatoIcon from '../../assets/skill-icons/avocados.webp'
import { Button } from '../../components'
import { formatGameNumber, formatWholeGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { avocatoMessages as messages } from './messages'
import './quantum.css'

type AvocatoCommand = Extract<CanonicalPlayerCommand, { readonly kind: 'avocado.feed' | 'avocado.request-overflow-reset' }>

export interface AvocatoCommandAvailability {
  readonly feed: boolean
  readonly overflowReset: boolean
}

export interface AvocatoSurfaceProps {
  readonly locale: EnabledLocale
  /** The Quantum upgrade opens the feed economy. */
  readonly unlocked: boolean
  readonly resources: FrontendCanonicalResources['avocado']
  readonly spendable: {
    readonly infinityPoints: bigint
    readonly influence: number
    readonly strangeMatter: number
  }
  readonly derived: FrontendGameplayDerivedFacts['avocado']
  readonly previews: FrontendGameplayPreviews['avocado']
  readonly commandAvailability: AvocatoCommandAvailability
  readonly dispatchPlayer: (command: AvocatoCommand) => Promise<UiRuntimePlayerCommandResult>
}

const FEED_META: Readonly<Record<AvocadoFeedSource, { readonly title: MessageDescriptor; readonly resource: MessageDescriptor }>> = {
  'infinity-points': { title: messages.infinityMultiplier, resource: messages.resourceInfinityPoints },
  influence: { title: messages.influenceMultiplier, resource: messages.resourceInfluence },
  'strange-matter': { title: messages.strangeMatterMultiplier, resource: messages.resourceStrangeMatter },
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
          <span>{intl.formatMessage(messages.multiplier, { value: formatGameNumber(locale, derived.total) })}</span>
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

        </div>
          </>
        ) : null}

        <OverflowCard locale={locale} resources={resources} preview={previews.overflow}
          routeAvailable={commandAvailability.overflowReset} dispatchPlayer={dispatchPlayer} />

        <details className="avocato-developer-note">
          <summary>{intl.formatMessage(messages.developerNoteTitle)}</summary>
          <p>{intl.formatMessage(messages.developerNote)}</p>
        </details>
      </div>
    </div>
  )
}

function OverflowCard({ locale, resources, preview, routeAvailable, dispatchPlayer }: {
  readonly locale: EnabledLocale
  readonly resources: AvocatoSurfaceProps['resources']
  readonly preview: AvocatoSurfaceProps['previews']['overflow']
  readonly routeAvailable: boolean
  readonly dispatchPlayer: AvocatoSurfaceProps['dispatchPlayer']
}) {
  const intl = useIntl()
  const pendingRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const disabled = pending || !preview.eligible || !routeAvailable
  const reset = async () => {
    if (disabled || pendingRef.current) return
    pendingRef.current = true
    setPending(true)
    setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'avocado.request-overflow-reset' })
      setFailed(result.status !== 'accepted')
      if (result.status === 'accepted') setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }
  return (
    <article className="quantum-leap-card avocato-overflow-card">
      <div>
        <h2>{intl.formatMessage(messages.overflowPoints, { value: formatWholeGameNumber(locale, resources.overflowPoints) })}</h2>
        <p>{intl.formatMessage(preview.eligible ? messages.overflowReached : messages.overflowThreshold,
          { value: formatGameNumber(locale, preview.threshold) })}</p>
        <p>{intl.formatMessage(messages.overflowDescription)}</p>
        <p>{intl.formatMessage(messages.overflowFuture)}</p>
        {resources.overflowMultiplier > 0 && <p>{intl.formatMessage(messages.legacyOverflow,
          { value: formatGameNumber(locale, 1 + resources.overflowMultiplier) })}</p>}
      </div>
      {confirming ? (
        <div className="quantum-leap-card__confirm">
          <Button variant="primary" state={pending ? 'pending' : failed ? 'failure' : 'idle'}
            disabled={disabled} onClick={() => void reset()}>{intl.formatMessage(messages.overflowConfirm)}</Button>
          <Button disabled={pending} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.overflowCancel)}</Button>
        </div>
      ) : (
        <Button variant="primary" disabled={disabled} onClick={() => setConfirming(true)}>
          {intl.formatMessage(messages.overflowReset)}
        </Button>
      )}
      {failed && <p className="quantum-leap-card__feedback" role="alert">{intl.formatMessage(messages.overflowFailed)}</p>}
    </article>
  )
}

interface FeedCardProps {
  readonly locale: EnabledLocale
  readonly preview: FrontendGameplayPreviews['avocado']['feeds'][number]
  readonly invested: number
  readonly multiplier: number
  readonly resourceAvailable: number | bigint
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
        <strong>{intl.formatMessage(messages.multiplier, { value: formatGameNumber(locale, multiplier) })}</strong>
        <p>{intl.formatMessage(messages.invested, { value: formatGameNumber(locale, invested) })}</p>
        <p>{intl.formatMessage(messages.available, { value: formatGameNumber(locale, resourceAvailable) })}</p>
      </div>
      <Button
        variant="primary"
        state={pending ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={disabled}
        aria-label={intl.formatMessage(messages.feedAccessible, { resource: intl.formatMessage(meta.resource) })}
        onClick={() => void feed()}
      >
        {intl.formatMessage(messages.feed, { value: formatGameNumber(locale, preview.amount) })}
      </Button>
      {failed && <p className="avocato-feed-card__feedback" role="alert">{intl.formatMessage(messages.failed)}</p>}
    </article>
  )
}

function spendableValue(spendable: AvocatoSurfaceProps['spendable'], source: AvocadoFeedSource): number | bigint {
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
