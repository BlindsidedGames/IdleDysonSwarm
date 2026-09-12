import { useState } from 'react'

/** Shares pending/error feedback for a surface's batch of settings commands. */
export function usePlayerSettingsCommands<Command>(
  dispatch: (command: Command) => Promise<{ readonly status: string }>,
) {
  const [settingPending, setSettingPending] = useState(false)
  const [settingFailed, setSettingFailed] = useState(false)

  const applySettings = async (commands: readonly Command[]): Promise<void> => {
    if (settingPending) return
    setSettingPending(true)
    setSettingFailed(false)
    try {
      const results = await Promise.all(commands.map((command) => dispatch(command)))
      setSettingFailed(results.some((result) => result.status !== 'accepted'))
    } catch {
      setSettingFailed(true)
    } finally {
      setSettingPending(false)
    }
  }

  const applySetting = (command: Command): Promise<void> => applySettings([command])

  return { settingPending, settingFailed, applySetting }
}
