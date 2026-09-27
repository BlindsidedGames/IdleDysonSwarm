import { useEffect, useRef, useState } from 'react'

export const PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE = 'UI-SKILL-CONFIRMATION-CANCELLED'

/** Shares pending/error feedback for a surface's batch of settings commands. */
export function usePlayerSettingsCommands<Command>(
  dispatch: (command: Command) => Promise<{ readonly status: string; readonly code?: string }>,
) {
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)
  const cancelledTrigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (settingPending || cancelledTrigger.current === null) return
    const trigger = cancelledTrigger.current
    cancelledTrigger.current = null
    if (trigger.isConnected && trigger.closest('[inert]') === null) trigger.focus({ preventScroll: true })
  }, [settingPending])

  const applySettings = async (commands: readonly Command[]): Promise<void> => {
    if (settingPending) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSettingPending(true)
    setSettingFailed(false)
    try {
      const results = await Promise.all(commands.map((command) => dispatch(command)))
      const cancelled = (result: typeof results[number]) => result.status === 'failed' &&
        result.code === PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE
      if (results.some(cancelled)) cancelledTrigger.current = trigger
      setSettingFailed(results.some((result) => result.status !== 'accepted' && !cancelled(result)))
    } catch {
      setSettingFailed(true)
    } finally {
      setSettingPending(false)
    }
  }

  const applySetting = (command: Command): Promise<void> => applySettings([command])

  return { settingPending, settingFailed, applySetting }
}
