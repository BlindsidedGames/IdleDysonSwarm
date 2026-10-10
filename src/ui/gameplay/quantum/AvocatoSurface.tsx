import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { DiscoveryPurchases } from '../discovery/DiscoveryPurchases'
import { EMPTY_DISCOVERY, type DiscoveryPurchase } from '../../../simulation/discovery'
import type { DiscoveryState } from '../../../game-state/types'
import type { FrontendCanonicalResources, FrontendGameplayPreviews } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { navigationAssets } from '../shell/navigationAssets'
import { Button, InlineImageSymbol } from '../../components'
import { formatGameNumber, formatWholeGameNumber } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { avocatoMessages as messages } from './messages'
import { reworkMessages } from '../rework/messages'
import './quantum.css'

type AvocatoCommand = Extract<CanonicalPlayerCommand, { readonly kind: 'avocado.request-overflow-reset' | 'discovery.purchase' }>

export interface AvocatoSurfaceProps {
  readonly discovery?: DiscoveryState
  readonly discoveryAvailable?: boolean
  readonly onDiscoveryUnlocked?: () => void
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['avocado']
  readonly previews: Pick<FrontendGameplayPreviews['avocado'], 'overflow'>
  readonly commandAvailability: { readonly overflowReset: boolean }
  readonly dispatchPlayer: (command: AvocatoCommand) => Promise<UiRuntimePlayerCommandResult>
}

export function AvocatoSurface({ locale, resources, previews, commandAvailability, dispatchPlayer, discovery = EMPTY_DISCOVERY, discoveryAvailable = false, onDiscoveryUnlocked }: AvocatoSurfaceProps) {
  const intl = useIntl()
  return <section className="avocato-surface" aria-label={intl.formatMessage(messages.region)}>
    <header className="avocato-surface__hero">
      <InlineImageSymbol className="avocato-surface__portrait" src={navigationAssets.avocato}
        label={intl.formatMessage(messages.iconAlt)} tint maskMode="luminance" />
      <h2 className="avocato-surface__title">{intl.formatMessage(messages.region)}</h2>
    </header>
    <div className="avocato-surface__content">
      <OverflowCard locale={locale} resources={resources} preview={previews.overflow}
        routeAvailable={commandAvailability.overflowReset} dispatchPlayer={dispatchPlayer} />
      <DiscoveryPurchases state={discovery} balance={resources.overflowPoints} available={discoveryAvailable} locale={locale}
        purchase={async (purchase: DiscoveryPurchase) => {
          const result = await dispatchPlayer({ kind: 'discovery.purchase', purchase })
          if (result.status === 'accepted' && purchase === 'unlock') onDiscoveryUnlocked?.()
          return result.status === 'accepted'
        }} />
    </div>
  </section>
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
        <h2 className="avocato-overflow-card__balance" aria-label={intl.formatMessage(messages.overflowPoints, { value: formatWholeGameNumber(locale, resources.overflowPoints) })}><InlineImageSymbol src={navigationAssets.transcendence} tint />{intl.formatMessage(reworkMessages.tpBalance, { value: formatWholeGameNumber(locale, resources.overflowPoints) })}</h2>
        <p>{intl.formatMessage(preview.eligible ? messages.overflowReached : messages.overflowThreshold,
          { value: formatGameNumber(locale, preview.threshold) })}</p>
        {confirming && <p>{intl.formatMessage(reworkMessages.transcendConfirmation)}</p>}

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
        <Button variant="primary" disabled={disabled} aria-label={intl.formatMessage(messages.overflowReset)} onClick={() => setConfirming(true)}>
          {intl.formatMessage(messages.overflowResetReward, { reward: <span className="avocato-overflow-card__reward"><InlineImageSymbol src={navigationAssets.transcendence} tint />{formatWholeGameNumber(locale, 1n)}</span> })}
        </Button>
      )}
      {failed && <p className="quantum-leap-card__feedback" role="alert">{intl.formatMessage(messages.overflowFailed)}</p>}
    </article>
  )
}
