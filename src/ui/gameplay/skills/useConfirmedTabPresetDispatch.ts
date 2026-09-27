import { useCallback, useMemo } from 'react'
import type { CanonicalPlayerCommand } from '../../../application/canonicalPlayerCommands'
import type { SkillPresetState } from '../../../game-state/types'
import { includesNewNonRefundableSkillAssignment, type CanonicalSkillCatalogPreview } from '../../../simulation/canonicalSkillTransactions'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import { useSharedNonRefundableSkillConfirmation } from './nonRefundableSkillConfirmationContext'
import { PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE } from '../usePlayerSettingsCommands'

/** Interactive tab configuration can immediately apply a preset outside Skills. */
export function useConfirmedTabPresetDispatch({
  dispatchPlayer,
  autoAssignNonRefundable,
  presets,
  catalog,
  previewNonRefundableAssignment,
}: {
  readonly dispatchPlayer: (command: CanonicalPlayerCommand) => Promise<UiRuntimePlayerCommandResult>
  readonly autoAssignNonRefundable: boolean
  readonly presets: readonly SkillPresetState[]
  readonly catalog: CanonicalSkillCatalogPreview
  readonly previewNonRefundableAssignment?: (skillIds: readonly string[]) => boolean
}) {
  const requestConfirmation = useSharedNonRefundableSkillConfirmation()!
  const fallbackPreviews = useMemo(() => previewNonRefundableAssignment === undefined
    ? new Map(catalog.skills.map(skill => [skill.skillId, skill])) : null,
  [catalog.skills, previewNonRefundableAssignment])

  return useCallback(async (command: CanonicalPlayerCommand): Promise<UiRuntimePlayerCommandResult> => {
    if (command.kind === 'skill.set-tab-preset-automation' && command.slot !== 0 && autoAssignNonRefundable) {
      const skillIds = presets[command.slot - 1]?.skillIds ?? []
      let requiresConfirmation: boolean
      try {
        requiresConfirmation = previewNonRefundableAssignment === undefined
          ? includesNewNonRefundableSkillAssignment(skillIds, fallbackPreviews!)
          : previewNonRefundableAssignment(skillIds)
      } catch {
        return { status: 'failed', kind: 'runtime', code: 'UI-SKILL-CONFIRMATION-PREVIEW-FAILED',
          reason: 'The skill assignment could not be previewed.', retryable: false }
      }
      if (requiresConfirmation && !await requestConfirmation()) {
        return { status: 'failed', kind: 'runtime', code: PLAYER_SETTINGS_CONFIRMATION_CANCELLED_CODE,
          reason: 'The skill assignment was cancelled.', retryable: false }
      }
    }
    // Saved passive tab automation and priority reordering retain their existing behavior.
    return dispatchPlayer(command)
  }, [autoAssignNonRefundable, dispatchPlayer, fallbackPreviews, presets, previewNonRefundableAssignment, requestConfirmation])
}
