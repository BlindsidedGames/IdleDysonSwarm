import type { ReactNode } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components'
import { SkillDetailsDialog } from './SkillDetailsDialog'
import { skillMessages as messages } from './messages'
import { useNonRefundableSkillConfirmation } from './useNonRefundableSkillConfirmation'
import { NonRefundableSkillConfirmationContext } from './nonRefundableSkillConfirmationContext'
import './skills.css'

/** Keeps manual and tab/preset automation inside one device-local confirmation. */
export function NonRefundableSkillConfirmationProvider({ children }: { readonly children: ReactNode }) {
  const intl = useIntl()
  const { pending, requestConfirmation, resolveConfirmation } = useNonRefundableSkillConfirmation()
  return <NonRefundableSkillConfirmationContext.Provider value={requestConfirmation}>
    {children}
    {pending && <SkillDetailsDialog
      title={intl.formatMessage(messages.nonRefundableConfirmationTitle)}
      closeLabel={intl.formatMessage(messages.cancel)}
      palette="non-refundable"
      onClose={() => resolveConfirmation(false)}
    >
      <p>{intl.formatMessage(messages.nonRefundableConfirmationWarning)}</p>
      <div className="skill-reset-dialog__actions">
        <Button onClick={() => resolveConfirmation(false)}>{intl.formatMessage(messages.cancel)}</Button>
        <Button variant="primary" onClick={() => resolveConfirmation(true)}>{intl.formatMessage(messages.confirm)}</Button>
      </div>
    </SkillDetailsDialog>}
  </NonRefundableSkillConfirmationContext.Provider>
}
