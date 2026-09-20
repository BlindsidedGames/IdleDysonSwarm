import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useIntl } from 'react-intl'
import type { BotBoostState } from '../../../simulation/botBoost'
import { eligiblePromotions, nextPromotion, startPromotions, refreshPromotions, subscribePromotions, promotionSnapshot, type GamePromotion, type PromotionPlatform } from '../../../store/promotions'
import { FacilityDetailsDialog } from '../facilities/FacilityDetailsDialog'
import { boostMessages as messages } from './boostMessages'
import { storeMessages } from './messages'
import { useBotBoost } from './useBotBoost'
import '../facilities/facilities.css'

export interface BotBoostControls {
  readonly boost?: BotBoostState
  readonly owned: boolean
  readonly platform: PromotionPlatform
  readonly onClaim: () => Promise<boolean>
  readonly onSetEnabled: (enabled: boolean) => Promise<boolean>
  readonly openExternalUrl: (url: string) => Promise<void>
}

export function BotBoostPanel(props: BotBoostControls) {
  const intl = useIntl()
  useEffect(() => startPromotions(props.platform), [props.platform])
  useSyncExternalStore(subscribePromotions, promotionSnapshot, promotionSnapshot)
  const status = useBotBoost(props.boost, props.owned)
  const [promo, setPromo] = useState<GamePromotion>()
  const [browse, setBrowse] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const pending = useRef(false)
  const games = eligiblePromotions(props.platform, intl.locale)
  async function update(action: () => Promise<boolean>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try {
      const accepted = await action()
      setFailed(!accepted)
      if (accepted) setPromo(undefined)
    } catch { setFailed(true) }
    finally { pending.current = false; setBusy(false) }
  }
  function activate() {
    const selected = nextPromotion(props.platform, intl.locale)
    if (selected) setPromo(selected)
    else void update(props.onClaim)
  }
  function gameLink(game: GamePromotion) {
    return <button type="button" className="store-surface__secondary-action"
      onClick={() => { void props.openExternalUrl(game.links[props.platform]!).catch(() => setFailed(true)) }}>
      {intl.formatMessage(messages.play, { game: game.title })}
    </button>
  }
  return <>
    <section className="store-boost" aria-label={intl.formatMessage(messages.title)}>
      <div className="store-product-card">
        <div><h3>{intl.formatMessage(messages.title)}</h3>
          <p>{props.owned ? intl.formatMessage(messages.permanentDescription) : intl.formatMessage(messages.description)}</p>
          <p className="store-boost__status">{status.status}</p>
        </div>
        <button type="button" className={`store-surface__purchase-action${props.owned && !status.active ? ' store-surface__purchase-action--effect-disabled' : ''}`}
          disabled={busy || (!props.owned && !status.claimable)}
          aria-pressed={props.owned ? status.active : undefined}
          onClick={() => props.owned ? void update(() => props.onSetEnabled(!status.active)) : activate()}>
          {intl.formatMessage(props.owned ? status.active ? storeMessages.enabled : storeMessages.disabled
            : !status.claimable ? messages.wait : status.active ? messages.add : messages.activate)}
        </button>
      </div>
      {games.length > 0 && <button type="button" className="store-boost__browse" onClick={() => { refreshPromotions(); setBrowse(true) }}>{intl.formatMessage(messages.games)}</button>}
      {failed && <p role="alert">{intl.formatMessage(messages.failed)}</p>}
    </section>
    {promo && <FacilityDetailsDialog title={promo.title} closeLabel={intl.formatMessage(messages.close)} onClose={() => setPromo(undefined)}>
      <div className="store-promo">
        <PromotionBanner game={promo} /><p>{promo.description}</p>
        <p className="store-promo__label">{intl.formatMessage(messages.promotion)}</p>
        <div className="store-promo__actions">{gameLink(promo)}
          <button type="button" className="store-surface__purchase-action" disabled={busy || !status.claimable}
            onClick={() => void update(props.onClaim)}>{intl.formatMessage(messages.claim)}</button>
        </div>
        {failed && <p role="alert">{intl.formatMessage(messages.failed)}</p>}
      </div>
    </FacilityDetailsDialog>}
    {browse && <FacilityDetailsDialog title={intl.formatMessage(messages.games)} closeLabel={intl.formatMessage(messages.close)} onClose={() => setBrowse(false)}>
      <div className="store-promo">{games.map(game => <article key={game.id}><PromotionBanner game={game} lazy /><h3>{game.title}</h3><p>{game.description}</p>{gameLink(game)}</article>)}</div>
    </FacilityDetailsDialog>}
  </>
}

/** Each open card owns its URL so a refresh cannot revoke artwork beneath it. */
function PromotionBanner({ game, lazy = false }: { game: GamePromotion; lazy?: boolean }) {
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
    if (!game.image) { setUrl(undefined); return }
    const next = URL.createObjectURL(game.image)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [game.image])
  const source = failed ? undefined : url ?? game.fallbackImage
  return <div className="store-promo__banner" aria-hidden="true">
    {source && <img src={source} alt="" width={960} height={540} loading={lazy ? 'lazy' : 'eager'}
      onError={() => { if (url && game.fallbackImage) setUrl(undefined); else setFailed(true) }} />}
  </div>
}
