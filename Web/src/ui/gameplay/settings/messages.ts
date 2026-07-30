import { defineMessages } from 'react-intl'

export const settingsSurfaceMessages = defineMessages({
  title: {
    id: 'settings.title',
    defaultMessage: 'Settings',
    description: 'Unity Settings route heading.',
  },
  saveData: {
    id: 'settings.save-data.title',
    defaultMessage: 'Save Data',
    description: 'Heading for save management settings.',
  },
  saveDescription: {
    id: 'settings.save-data.description',
    defaultMessage:
      'Your progress is saved automatically on this device.',
    description: 'Explains automatic local browser persistence.',
  },
  reset: {
    id: 'settings.save-data.reset',
    defaultMessage: 'Reset Save',
    description: 'Button that replaces current progress with a fresh save.',
  },
  resetConfirmation: {
    id: 'settings.save-data.reset-confirmation',
    defaultMessage:
      'Reset all progress and start again? This cannot be undone.',
    description: 'Destructive save reset confirmation.',
  },
  resetDialogTitle: {
    id: 'settings.save-data.reset-dialog-title',
    defaultMessage: 'Reset Save?',
    description: 'Destructive save reset dialog title.',
  },
  cancel: {
    id: 'settings.save-data.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancels a save reset.',
  },
  resetPending: {
    id: 'settings.save-data.reset-pending',
    defaultMessage: 'Resetting…',
    description: 'Pending reset-save button text.',
  },
  resetSucceeded: {
    id: 'settings.save-data.reset-succeeded',
    defaultMessage: 'Save reset. A fresh game has been created.',
    description: 'Successful reset-save feedback.',
  },
  resetFailed: {
    id: 'settings.save-data.reset-failed',
    defaultMessage:
      'The save could not be reset. Your current progress was kept.',
    description: 'Failed reset-save feedback.',
  },
  resetCommittedRecovery: {
    id: 'settings.save-data.reset-committed-recovery',
    defaultMessage:
      'The fresh save was written, but the game could not reopen it. Reload to recover.',
    description:
      'Warns that reset committed but post-commit session reconstruction failed.',
  },
})
