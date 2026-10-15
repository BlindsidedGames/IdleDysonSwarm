import { useContext } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../../components'
import { ModeSaveActionsContext } from './modeSaveActions'
import { modeSaveMessages } from './modeSaveMessages'

export function HostModeSaveSettings() {
  const actions = useContext(ModeSaveActionsContext), intl = useIntl()
  if (!actions) return null
  return <section className="settings-surface__panel settings-surface__panel--save mode-save-settings">
    <div className="settings-surface__copy"><h2>{intl.formatMessage(modeSaveMessages.title)}</h2><p>{intl.formatMessage(modeSaveMessages.description)}</p></div>
    <div className="settings-surface__save-actions">
      {(['import', 'export', 'recovery'] as const).map(action => <Button key={action} onClick={() => actions.open(action, intl.locale)}>{intl.formatMessage(modeSaveMessages[action])}</Button>)}
    </div>
  </section>
}
