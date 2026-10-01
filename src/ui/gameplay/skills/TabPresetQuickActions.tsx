import { useState } from 'react'
import { useIntl } from 'react-intl'
import type { CanonicalSkillPresetSlot, SkillPresetState } from '../../../game-state/types'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { StatusFeedback } from '../../components'
import { PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE } from '../usePlayerSettingsCommands'
import { skillMessages as messages } from './messages'
import type { SkillPresetActions } from './SkillsSurface'
import { SkillPresetQuickActions } from './SkillPresetQuickActions'
import { SkillPresetSelectionDialog } from './SkillPresetSelectionDialog'
import { useSkillPresetSelection } from './useSkillPresetSelection'
import { useSkillPresentationNodes } from './skillPresentation'

export function TabPresetQuickActions({ presets, selectedSlot, disabled, discoveryUnlocked, presetActions, dispatchPlayer }: {
  readonly presets: readonly SkillPresetState[]
  readonly selectedSlot: CanonicalSkillPresetSlot
  readonly disabled: boolean
  readonly discoveryUnlocked: boolean
  readonly presetActions?: SkillPresetActions
  readonly dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>
}) {
  const intl = useIntl()
  const { nodeById } = useSkillPresentationNodes(discoveryUnlocked)
  const [failed, setFailed] = useState(false)
  const selection = useSkillPresetSelection({ presetActions, onFailure: () => setFailed(true),
    select: async command => {
      setFailed(false)
      const result = await dispatchPlayer(command)
      const accepted = result.status === 'accepted' && result.kind === 'transition'
      setFailed(!accepted && !(result.status === 'failed' && result.code === PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE))
      return accepted
    } })
  return <>
    <SkillPresetQuickActions presets={presets} selectedSlot={selectedSlot}
      disabled={disabled || selection.pending} onSelect={selection.request} />
    {selection.preview && <SkillPresetSelectionDialog
      presetName={presets[selection.preview.slot - 1].name}
      retainedSkillIds={selection.preview.retainedSkillIds}
      blockedSkillIds={selection.preview.blockedByRetainedSkillIds}
      nodeById={nodeById} pending={selection.pending} onCancel={selection.dismiss} onConfirm={selection.confirm} />}
    {failed && <StatusFeedback tone="error">{intl.formatMessage(messages.actionFailed)}</StatusFeedback>}
  </>
}
