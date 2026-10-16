import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
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
import { GameModeControllerContext } from '../shell/GameModeControllerContext'
import './rework.css'

type Gameplay = DeepReadonly<FrontendGameplaySnapshot>
type Dispatch = (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>

export function ReworkMigrationNotice({ gameplay, dispatchPlayer }: { gameplay: Gameplay; dispatchPlayer: Dispatch }) {
  const modeController = useContext(GameModeControllerContext)
  const migrated = gameplay.progression.meta.reworkMigrationChoice !== undefined
  const [visible, setVisible] = useState(!migrated)
  useEffect(() => { if (!migrated) setVisible(true) }, [migrated])
  // Hosts without the separate Classic runtime keep the existing opt-in policy.
  // Automatic migration is safe only after the mode host has retained Classic.
  if (!modeController && migrated) return null
  return visible || !migrated ? <ReworkMigrationDialog dispatchPlayer={dispatchPlayer} migrated={migrated} onContinue={() => setVisible(false)} /> : null
}

function ReworkMigrationDialog({ dispatchPlayer, migrated, onContinue }: { dispatchPlayer: Dispatch; migrated: boolean; onContinue(): void }) {
  const intl = useIntl()
  const modeController = useContext(GameModeControllerContext)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = useRef(false)
  const started = useRef(false)
  const dialogRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const migrate = useCallback(async (choice: 'keep' | 'fresh' = 'fresh') => {
    if (busy.current) return
    busy.current = true; setPending(true); setFailed(false)
    try {
      const result = await dispatchPlayer({ kind: 'rework.choose-migration', choice })
      setFailed(result.status !== 'accepted')
    } catch { setFailed(true) }
    finally { busy.current = false; setPending(false) }
  }, [dispatchPlayer])
  useEffect(() => {
    if (modeController && !migrated && !started.current) { started.current = true; void migrate() }
  }, [modeController, migrated, migrate])
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
  const choose = async (destination: 'classic' | 'modern') => {
    if (busy.current) return
    if (destination === 'modern') {
      if (migrated) onContinue()
      else await migrate()
      return
    }
    busy.current = true
    setPending(true)
    setFailed(false)
    try {
      if (destination === 'classic') {
        if (!modeController) throw new Error('Classic mode is unavailable in this host.')
        await modeController.switchTo('classic')
      }
    }
    catch { setFailed(true) }
    finally { busy.current = false; setPending(false) }
  }
  return createPortal(<div ref={backdropRef} className="rework-migration-backdrop">
  <section ref={dialogRef} className="rework-migration" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending} tabIndex={-1}>
    <h2 id={titleId}>{intl.formatMessage(m.progressionUpdate)}</h2>
    <p>{intl.formatMessage(m.migrationIntro)}</p>
    <p id={descriptionId}>{intl.formatMessage(modeController ? m.automaticMigrationDescription : m.migrationDescription)}</p>
    {modeController && <p>{intl.formatMessage(m.separateSavesDescription)}</p>}
    <div className="rework-actions">
        {modeController ? <>
          <Button disabled={pending} onClick={() => void choose('classic')}>{intl.formatMessage(m.returnClassic)}</Button>
          <Button disabled={pending} onClick={() => void choose('modern')}>{intl.formatMessage(m.continueModern)}</Button>
        </> : <>
          <Button disabled={pending} onClick={() => void migrate('keep')}>{intl.formatMessage(m.keep)}</Button>
          <Button disabled={pending} onClick={() => void migrate('fresh')}>{intl.formatMessage(m.fresh)}</Button>
        </>}
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
