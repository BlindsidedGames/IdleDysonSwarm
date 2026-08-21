import { useSyncExternalStore } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../ui/components'
import { pwaUpdateMessages as messages } from './messages'
import type { PwaUpdateController } from './serviceWorkerUpdate'
import './pwaUpdatePrompt.css'

export interface PwaUpdatePromptProps {
  readonly controller: PwaUpdateController
  readonly prepareForActivation: () => Promise<void>
}

export function PwaUpdatePrompt({
  controller,
  prepareForActivation,
}: PwaUpdatePromptProps) {
  const intl = useIntl()
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  )
  if (snapshot.phase === 'idle') return null
  const applying = snapshot.phase === 'applying'
  const failed = snapshot.phase === 'failed'

  return (
    <aside
      className="pwa-update-prompt"
      aria-labelledby="pwa-update-heading"
      aria-live="polite"
    >
      <div>
        <h2 id="pwa-update-heading">
          {intl.formatMessage(messages.title)}
        </h2>
        <p role={failed ? 'alert' : undefined}>
          {intl.formatMessage(
            failed
              ? messages.failed
              : applying
                ? messages.applying
                : messages.body,
          )}
        </p>
      </div>
      <Button
        variant="primary"
        state={applying ? 'pending' : failed ? 'failure' : 'idle'}
        disabled={applying}
        onClick={() => void controller.acceptUpdate(prepareForActivation)}
      >
        {intl.formatMessage(failed ? messages.retry : messages.accept)}
      </Button>
    </aside>
  )
}
