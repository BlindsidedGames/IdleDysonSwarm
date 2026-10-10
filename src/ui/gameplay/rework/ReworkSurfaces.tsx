import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useIntl } from 'react-intl'
import type { DeepReadonly } from '../../../core/contracts'
import type { FrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import { EMPTY_DISCOVERY } from '../../../simulation/discovery'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { Button } from '../../components'
import { DiscoverySurface } from '../discovery/DiscoverySurface'
import { discoveryMessages } from '../discovery/messages'
import { avocatoMessages } from '../quantum/messages'
import { reworkMessages as m } from './messages'
import './rework.css'

type Gameplay = DeepReadonly<FrontendGameplaySnapshot>
type Dispatch = (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>

export function ReworkMigrationNotice({ gameplay, dispatchPlayer }: { gameplay: Gameplay; dispatchPlayer: Dispatch }) {
  return gameplay.progression.meta.reworkMigrationChoice ? null : <ReworkMigrationDialog dispatchPlayer={dispatchPlayer} />
}

function ReworkMigrationDialog({ dispatchPlayer }: { dispatchPlayer: Dispatch }) {
  const intl = useIntl()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = useRef(false)
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const siblings = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdropRef.current)
      .map(element => ({ element, inert: element.hasAttribute('inert') }))
    for (const { element } of siblings) element.setAttribute('inert', '')
    dialogRef.current?.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return }
      if (event.key !== 'Tab') return
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      if (!buttons.length) { event.preventDefault(); return }
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (!dialogRef.current?.contains(document.activeElement) || document.activeElement === dialogRef.current ||
        (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      for (const { element, inert } of siblings) if (!inert) element.removeAttribute('inert')
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true })
    }
  }, [])
  const choose = async (choice: 'keep' | 'fresh') => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setFailed(false)
    try { setFailed((await dispatchPlayer({ kind: 'rework.choose-migration', choice })).status !== 'accepted') }
    catch { setFailed(true) }
    finally { busy.current = false; setPending(false) }
  }
  return createPortal(<div ref={backdropRef} className="rework-migration-backdrop">
  <section ref={dialogRef} className="rework-migration" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending} tabIndex={-1}>
    <h2 id={titleId}>{intl.formatMessage(m.progressionUpdate)}</h2>
    <p>{intl.formatMessage(m.migrationIntro)}</p>
    <p id={descriptionId}>{intl.formatMessage(m.migrationDescription)}</p>
    <div className="rework-actions">
        <Button disabled={pending} onClick={() => void choose('keep')}>{intl.formatMessage(m.keep)}</Button>
        <Button disabled={pending} onClick={() => void choose('fresh')}>{intl.formatMessage(m.fresh)}</Button>
    </div>
    {failed && <p role="alert">{intl.formatMessage(m.failed)}</p>}
  </section></div>, document.body)
}

export function ReworkTranscendenceSurface({ gameplay, locale, gameSpeed, onOpenStore }: {
  gameplay: Gameplay; locale: EnabledLocale; gameSpeed: number; onOpenStore: () => void
}) {
  const intl = useIntl()
  const state = gameplay.progression.discovery ?? EMPTY_DISCOVERY
  return <section className="rework-surface">
    {state.unlocked && gameplay.derived.discovery
      ? <DiscoverySurface gameSpeed={gameSpeed} state={state} effects={gameplay.derived.discovery} locale={locale} />
      : <article className="rework-card">
          <h2>{intl.formatMessage(discoveryMessages.unlock)}</h2>
          <div className="rework-actions"><Button onClick={onOpenStore}>{intl.formatMessage(avocatoMessages.region)}</Button></div>
        </article>}
  </section>
}
