import type { GameModeController } from '../modeController'

/** Parent-owned recovery remains available after a failed child document has
 * been removed. Retrying reopens the durable selection through the same host. */
export function mountDevelopmentModeStatus(status: HTMLElement, host: {
  controller: GameModeController
  start(): Promise<void>
}) {
  const retry = document.createElement('button')
  retry.type = 'button'; retry.textContent = 'Retry saved development session'
  let starting = false
  const update = () => {
    const snapshot = host.controller.getSnapshot()
    status.replaceChildren(document.createTextNode(`Development scratch saves only · ${snapshot.manifest?.active ?? 'starting'} · ${snapshot.phase}${snapshot.error ? ' · ' + snapshot.error : ''} `), retry)
    retry.hidden = snapshot.phase !== 'blocked' && snapshot.phase !== 'idle'
    retry.disabled = starting || snapshot.phase === 'changing'
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
