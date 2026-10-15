import type { GameAudioService } from './contracts'

export function installSemanticAudioCues(
  documentObject: Document,
  audio: GameAudioService,
): () => void {
  const handle = (event: MouseEvent): void => {
    if (event.button !== 0 || event.defaultPrevented) return
    const target = event.target
    if (!(target instanceof Element)) return
    const action = target.closest<HTMLElement>(
      'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"]',
    )
    if (
      action === null ||
      action.dataset.audioCue === 'off' ||
      action.matches(':disabled, [aria-disabled="true"]')
    ) return
    void audio.semanticAction()
  }
  documentObject.addEventListener('click', handle, true)
  return () => documentObject.removeEventListener('click', handle, true)
}
