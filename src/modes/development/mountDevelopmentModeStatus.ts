import type { GameModeController } from '../modeController'
import type { ModeSaveActions } from '../../ui/gameplay/settings/modeSaveActions'

/** Parent-owned recovery remains available after a failed child document has
 * been removed. Retrying reopens the durable selection through the same host. */
export function mountDevelopmentModeStatus(status: HTMLElement, host: {
  controller: GameModeController
  start(): Promise<void>
}, saves?: ModeSaveActions, simulateCloud?: () => Promise<void>) {
  const retry = document.createElement('button')
  retry.type = 'button'; retry.textContent = 'Retry saved development session'
  let starting = false
  const recovery = document.createElement('button'), restart = document.createElement('button')
  recovery.type = 'button'; recovery.textContent = 'Recover mode saves'
  recovery.addEventListener('click', () => saves?.open('recovery', 'en'))
  restart.type = 'button'; restart.textContent = 'Restart saved development game'
  restart.addEventListener('click', () => { void host.controller.prepareRecovery().then(start).catch(() => undefined) })
  const cloud = document.createElement('button')
  cloud.type = 'button'; cloud.textContent = 'Simulate Cloud conflict'
  cloud.addEventListener('click', () => {
    cloud.disabled = true; cloud.setAttribute('aria-busy', 'true')
    void simulateCloud?.().catch(() => undefined).finally(() => { cloud.disabled = false; cloud.removeAttribute('aria-busy') })
  })
  const update = () => {
    const snapshot = host.controller.getSnapshot()
    status.replaceChildren(document.createTextNode(`Development scratch saves only · ${snapshot.manifest?.active ?? 'starting'} · ${snapshot.phase}${snapshot.error ? ' · ' + snapshot.error : ''} `), retry, ...(saves ? [restart, recovery] : []), ...(simulateCloud ? [cloud] : []))
    retry.hidden = snapshot.phase !== 'blocked' && snapshot.phase !== 'idle'
    retry.disabled = starting || snapshot.phase === 'changing'
    restart.disabled = snapshot.phase !== 'ready'
    cloud.disabled = snapshot.phase !== 'ready' || cloud.getAttribute('aria-busy') === 'true'
  }
  const start = async () => {
    if (starting) return
    starting = true; update()
    try { await host.start() }
    catch (error) { status.prepend(document.createTextNode(error instanceof Error ? error.message + ' ' : 'Development startup failed. ')); retry.hidden = false }
    finally { starting = false; retry.disabled = false }
  }
  retry.addEventListener('click', () => { void start() })
  const unsubscribe = host.controller.subscribe(update)
  update()
  return { start, dispose: () => { unsubscribe(); status.replaceChildren() } }
}
