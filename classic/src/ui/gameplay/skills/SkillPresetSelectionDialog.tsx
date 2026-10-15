import { useIntl } from 'react-intl'
import { Button } from '../../components'
import { SkillDetailsDialog } from './SkillDetailsDialog'
import { iconByFileName, type SkillPresentationNode } from './skillPresentation'
import { skillMessages as messages } from './messages'
interface SkillPresetSelectionDialogProps {
  readonly presetName: string
  readonly retainedSkillIds: readonly string[]
  readonly blockedSkillIds: readonly string[]
  readonly nodeById: ReadonlyMap<string, SkillPresentationNode>
  readonly pending: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => Promise<void>
}
export function AffectedSkillList({
  skillIds,
  nodeById,
  label,
}: {
  readonly skillIds: readonly string[]
  readonly nodeById: ReadonlyMap<string, SkillPresentationNode>
  readonly label: string
}) {
  return (
    <ul className="skill-details__affected-skills" aria-label={label}>
      {skillIds.map((skillId) => {
        const affectedNode = nodeById.get(skillId)
        return (
          <li key={skillId}>
            {affectedNode && (
              <img
                src={iconByFileName.get(
                  affectedNode.icon.fileName,
                )}
                alt=""
              />
            )}
            <span>{affectedNode?.displayName ?? skillId}</span>
          </li>
        )
      })}
    </ul>
  )
}
export function SkillPresetSelectionDialog({
  presetName,
  retainedSkillIds,
  blockedSkillIds,
  nodeById,
  pending,
  onCancel,
  onConfirm,
}: SkillPresetSelectionDialogProps) {
  const intl = useIntl()

  return (
    <SkillDetailsDialog
      title={intl.formatMessage(messages.switchPresetConflictTitle, {
        name: presetName,
      })}
      closeLabel={intl.formatMessage(messages.close)}
      palette="normal"
      className="skill-reset-dialog"
      onClose={onCancel}
    >
      <p className="skill-reset-dialog__description">
        {intl.formatMessage(messages.switchPresetConflictWarning)}
      </p>
      <section className="skill-reset-dialog__group">
        <h3>{intl.formatMessage(messages.retainedSkillsHeading)}</h3>
        <AffectedSkillList
          skillIds={retainedSkillIds}
          nodeById={nodeById}
          label={intl.formatMessage(messages.retainedSkillsHeading)}
        />
      </section>
      <section className="skill-reset-dialog__group">
        <h3>{intl.formatMessage(messages.blockedSkillsHeading)}</h3>
        <AffectedSkillList
          skillIds={blockedSkillIds}
          nodeById={nodeById}
          label={intl.formatMessage(messages.blockedSkillsHeading)}
        />
      </section>
      <div className="skill-reset-dialog__actions">
        <Button onClick={onCancel} disabled={pending}>
          {intl.formatMessage(messages.cancel)}
        </Button>
        <Button
          variant="primary"
          state={pending ? 'pending' : 'idle'}
          onClick={() => void onConfirm()}
        >
          {intl.formatMessage(messages.switchAnyway)}
        </Button>
      </div>
    </SkillDetailsDialog>
  )
}
