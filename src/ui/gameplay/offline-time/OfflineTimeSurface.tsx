import { useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import type { FrontendCanonicalResources, FrontendGameplayPreviews } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { DEFAULT_OFFLINE_BOOST } from '../../../simulation/offlineBoost'
import { Button } from '../../components'
import { formatGameDuration } from '../../i18n/formatters'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { offlineTimeMessages as messages } from './messages'
import './offlineTime.css'

type OfflineTimeCommand = Extract<CanonicalPlayerCommand, { readonly kind: 'time.upgrade-stored-capacity' | 'time.set-offline-boost-multiplier' }>
export interface OfflineTimeCommandAvailability { readonly upgradeStoredCapacity: boolean; readonly setOfflineBoost: boolean }
export interface OfflineTimeSurfaceProps {
  readonly locale: EnabledLocale
  readonly resources: FrontendCanonicalResources['time']
  readonly previews: FrontendGameplayPreviews['time']
  readonly storedTimeCheater: boolean
  readonly commandAvailability: OfflineTimeCommandAvailability
  readonly dispatchPlayer: (command: OfflineTimeCommand) => Promise<UiRuntimePlayerCommandResult>
}

export function OfflineTimeSurface({ locale, resources, previews, storedTimeCheater, commandAvailability, dispatchPlayer }: OfflineTimeSurfaceProps) {
  const intl = useIntl()
  const boost = resources.offlineBoost ?? DEFAULT_OFFLINE_BOOST
  const bank = resources.storedTimeAvailableSeconds
  const capacity = resources.storedTimeCapacitySeconds
  const fill = capacity > 0 ? Math.max(0, Math.min(1, bank / capacity)) : 0
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ratePending, setRatePending] = useState(false)
  const rateRequest = useRef(0)
  const disabled = pending || bank <= 0 || storedTimeCheater || !commandAvailability.setOfflineBoost
  const act = async (command: OfflineTimeCommand) => {
    if (pending) return
    setPending(true); setFailed(false)
    try { const result = await dispatchPlayer(command); setFailed(result.status !== 'accepted') }
    catch { setFailed(true) }
    finally { setPending(false) }
  }
  const select = async (multiplier: number) => {
    const request = ++rateRequest.current
    setRatePending(true); setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'time.set-offline-boost-multiplier', multiplier })
      if (request === rateRequest.current) setFailed(result.status !== 'accepted')
    } catch { if (request === rateRequest.current) setFailed(true) }
    finally { if (request === rateRequest.current) setRatePending(false) }
  }
  return <div className="offline-time-surface">
    <header className="offline-time-surface__header">
      <div className="offline-time-surface__title">{intl.formatMessage(messages.region)}</div>
    </header>
    <div className="offline-time-surface__scroll-region">
      {storedTimeCheater && <p className="offline-time-surface__warning">{intl.formatMessage(messages.disabled)}</p>}
      <article className="offline-time-card offline-time-card--storage">
        <div className="offline-time-card__heading"><h2>{intl.formatMessage(messages.boostStored)}</h2><strong>{formatGameDuration(locale, bank)}</strong></div>
        <div className="offline-time-storage-progress" role="progressbar" aria-label={intl.formatMessage(messages.storageProgress)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)}>
          <span aria-hidden="true" style={{ transform: `scaleX(${fill})` }} />
        </div>
        <div className="offline-time-max-storage"><span>{intl.formatMessage(messages.maxStorage)}</span><span>{formatGameDuration(locale, capacity)}</span></div>
        {bank <= 0 && <p className="offline-time-card__note">{intl.formatMessage(messages.noStoredTime)}</p>}
        <div className="offline-time-capacity-upgrade">
          <div className="offline-time-capacity-upgrade__copy">
            <p>{intl.formatMessage(messages.doubleStorageDescription)}</p>
            {previews.storedCapacity.code === 'maximum-reached'
              ? <p>{intl.formatMessage(messages.maximumStorage)}</p>
              : <dl className="offline-time-capacity-facts">
                  <div><dt>{intl.formatMessage(messages.capacityCost)}</dt><dd>{formatGameDuration(locale, capacity)}</dd></div>
                  <div><dt>{intl.formatMessage(messages.capacityResult)}</dt><dd>{formatGameDuration(locale, previews.storedCapacity.nextCapacitySeconds)}</dd></div>
                </dl>}
          </div>
          <Button variant="primary" disabled={pending || ratePending || boost.multiplier > 1 || !previews.storedCapacity.eligible || storedTimeCheater || !commandAvailability.upgradeStoredCapacity}
            onClick={() => void act({ kind: 'time.upgrade-stored-capacity' })}>{intl.formatMessage(previews.storedCapacity.code === 'maximum-reached' ? messages.capacityMaxed : messages.doubleStorage)}</Button>
        </div>
      </article>
      <article className="offline-time-card offline-time-card--boost">
        <div className="offline-time-card__heading">
          <h2 id="offline-boost-label">{intl.formatMessage(messages.boostSpeed)}</h2>
        </div>
        <div className="offline-time-boost-control">
          <output htmlFor="offline-boost-speed" aria-label={intl.formatMessage(messages.boostSpeed)}>{boost.multiplier === 1 ? intl.formatMessage(messages.boostRegular) : `${boost.multiplier}×`}</output>
          <input id="offline-boost-speed" type="range" min={1} max={42} step={1} value={boost.multiplier} disabled={disabled}
            aria-labelledby="offline-boost-label"
            aria-valuetext={boost.multiplier === 1 ? intl.formatMessage(messages.boostRegular) : `${boost.multiplier}×`}
            onChange={event => void select(event.currentTarget.valueAsNumber)} />
        </div>
        {boost.multiplier > 1 && <dl className="offline-time-boost-facts">
          <div><dt>{intl.formatMessage(messages.boostDrainLabel)}</dt><dd>{intl.formatMessage(messages.boostDrain, { seconds: boost.multiplier - 1 })}</dd></div>
          <div><dt>{intl.formatMessage(messages.boostDurationLabel)}</dt><dd>{formatGameDuration(locale, bank / (boost.multiplier - 1))}</dd></div>
        </dl>}
        <details className="offline-time-boost-details"><summary>{intl.formatMessage(messages.boostDetails)}</summary><p>{intl.formatMessage(messages.boostStack)}</p></details>
      </article>
      {failed && <p className="offline-time-feedback offline-time-feedback--failure" role="alert">{intl.formatMessage(messages.actionFailed)}</p>}
    </div>
  </div>
}
