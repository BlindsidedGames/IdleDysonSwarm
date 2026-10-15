import { useContext, useId, useState, useSyncExternalStore } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { GameModeControllerContext } from './GameModeControllerContext'
import type { GameModeController } from '../../../modes/modeController'
import { Button } from '../../components'
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
  return <div className="game-mode-switch">
    {expanded && <section id={id} className="game-mode-switch__options" aria-label={intl.formatMessage(messages.modes, { mode: label(active) })}>
      <p>{intl.formatMessage(messages.separate)}</p>
      <Button fullWidth disabled={busy} onClick={() => void act(() => controller.switchTo(target))}>
        {intl.formatMessage(snapshot.manifest?.saves[target] ? messages.continue : messages.start, { mode: label(target) })}
      </Button>
      {active === 'classic' && (snapshot.manifest?.saves.modern
        ? <p>{intl.formatMessage(messages.conflict)}</p>
        : confirming ? <div className="game-mode-switch__confirmation">
          <p>{intl.formatMessage(messages.oneWay)}</p>
          <Button fullWidth disabled={busy} onClick={() => void act(() => controller.migrateClassic())}>{intl.formatMessage(messages.confirm)}</Button>
          <Button fullWidth disabled={busy} onClick={() => setConfirming(false)}>{intl.formatMessage(messages.cancel)}</Button>
        </div> : <Button fullWidth disabled={busy} onClick={() => setConfirming(true)}>{intl.formatMessage(messages.migrate)}</Button>)}
      {failed && <p role="alert">{intl.formatMessage(messages.failed)}</p>}
      {snapshot.phase === 'blocked' && <Button fullWidth onClick={() => void act(() => controller.start())}>{intl.formatMessage(messages.continue, { mode: label(active) })}</Button>}
    </section>}
    <Button fullWidth aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      disabled={busy} onClick={() => { setExpanded(value => !value); setConfirming(false) }}>
      {intl.formatMessage(messages.modes, { mode: label(active) })}
    </Button>
  </div>
}

export function HostGameModeSwitch() {
  const controller = useContext(GameModeControllerContext)
  return controller ? <GameModeSwitch controller={controller} /> : null
}
