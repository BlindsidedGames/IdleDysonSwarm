import { useContext, useId, useState, useSyncExternalStore } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { GameModeControllerContext } from './GameModeControllerContext'
import type { GameModeController } from '../../../modes/modeController'
import './gameModeSwitch.css'

const messages = defineMessages({
  modes: { id: 'modes.switch', defaultMessage: 'Game mode: {mode}' },
  classic: { id: 'modes.classic', defaultMessage: 'Classic' },
  modern: { id: 'modes.modern', defaultMessage: 'Modern' },
  continue: { id: 'modes.continue', defaultMessage: 'Continue {mode}' },
  start: { id: 'modes.start', defaultMessage: 'Start {mode}' },
  separate: { id: 'modes.separate', defaultMessage: 'Each mode keeps a separate save.' },
  migrate: { id: 'modes.migrate', defaultMessage: 'Migrate Classic progress' },
  confirm: { id: 'modes.confirm', defaultMessage: 'Confirm migration' },
  cancel: { id: 'modes.cancel', defaultMessage: 'Cancel' },
  oneWay: { id: 'modes.oneWay', defaultMessage: 'Copy compatible Classic progress to Modern? Your Classic save stays available, including Classic-only progress. Modern progress cannot be converted back.' },
  conflict: { id: 'modes.conflict', defaultMessage: 'You already have a Modern save. Continue it to keep its progress.' },
  failed: { id: 'modes.failed', defaultMessage: 'The change could not be saved. Your last saved progress is preserved.' },
})

export function GameModeSwitch({ controller }: { controller: GameModeController }) {
  const intl = useIntl()
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [failed, setFailed] = useState(false)
  const id = useId()
  const active = snapshot.manifest?.active
  if (!active) return null
  const target = active === 'classic' ? 'modern' : 'classic'
  const label = (mode: 'classic' | 'modern') => intl.formatMessage(messages[mode])
  const busy = snapshot.phase === 'changing' || snapshot.phase === 'closed' || snapshot.phase === 'idle'
  const act = async (action: () => Promise<void>) => {
    setFailed(false)
    try { await action(); setConfirming(false); setExpanded(false) }
    catch { setFailed(true) }
  }
  return <div className="game-mode-switch dyson-navigation--drawer">
    {active === 'classic' && expanded && <section id={id} className="game-mode-switch__options" aria-label={intl.formatMessage(messages.modes, { mode: label(active) })}>
      <button type="button" className="dyson-navigation__link" disabled={busy} onClick={() => void act(() => controller.switchTo(target))}>
        {intl.formatMessage(snapshot.manifest?.saves[target] ? messages.continue : messages.start, { mode: label(target) })}
      </button>
      {active === 'classic' && !snapshot.manifest?.saves.modern && (confirming ? <div className="game-mode-switch__confirmation">
          <p>{intl.formatMessage(messages.oneWay)}</p>
          <button type="button" className="dyson-navigation__link" disabled={busy} onClick={() => void act(() => controller.migrateClassic())}>{intl.formatMessage(messages.confirm)}</button>
          <button type="button" className="dyson-navigation__link" disabled={busy} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</button>
        </div> : <button type="button" className="dyson-navigation__link" disabled={busy} onClick={() => setConfirming(true)}>{intl.formatMessage(messages.migrate)}</button>)}
      {snapshot.phase === 'blocked' && <button type="button" className="dyson-navigation__link" onClick={() => void act(() => controller.start())}>{intl.formatMessage(messages.continue, { mode: label(active) })}</button>}
    </section>}
    {failed && <p role="alert">{intl.formatMessage(messages.failed)}</p>}
    <button type="button" className="dyson-navigation__link"
      aria-label={intl.formatMessage(active === 'classic' ? messages.modes : messages.continue, { mode: label('classic') })}
      aria-expanded={active === 'classic' ? expanded : undefined} aria-controls={active === 'classic' && expanded ? id : undefined}
      disabled={busy} onClick={() => {
        if (active === 'modern') { void act(() => snapshot.phase === 'blocked' ? controller.start() : controller.switchTo('classic')); return }
        setExpanded(value => !value); setConfirming(false)
      }}>
      <span className="dyson-navigation__icon game-mode-switch__arrow" aria-hidden="true">↔</span>
      <span className="dyson-navigation__label">{label(active)}</span>
    </button>
  </div>
}

export function HostGameModeSwitch() {
  const controller = useContext(GameModeControllerContext)
  return controller ? <GameModeSwitch controller={controller} /> : null
}
