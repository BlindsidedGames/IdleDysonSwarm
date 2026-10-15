import { defineMessages, type MessageDescriptor } from 'react-intl'

/**
 * Startup-shell messages are kept in the shared startup catalog because they
 * are needed before destination-specific UI chunks can load.
 */
export const startupShellMessages = defineMessages({
  appName: {
    id: 'startup-shell.app-name',
    defaultMessage: 'Idle Dyson Swarm',
    description:
      'Game name shown as the top-level heading in the browser startup shell.',
  },
  nativeStarting: {
    id: 'startup-shell.native.starting',
    defaultMessage: 'Starting your swarm…',
    description: 'Short status shown in the branded native startup loader.',
  },
  nativeStartingSlow: {
    id: 'startup-shell.native.starting-slow',
    defaultMessage: 'Still loading your progress…',
    description: 'Friendly delayed status shown when native startup is slow.',
  },
  nativeSaving: {
    id: 'startup-shell.native.saving',
    defaultMessage: 'Saving your progress…',
    description: 'Status shown while a native host is shutting down safely.',
  },
  idleTitle: {
    id: 'startup-shell.state.idle.title',
    defaultMessage: 'Ready to start',
    description:
      'Heading shown before the browser game startup process begins.',
  },
  idleBody: {
    id: 'startup-shell.state.idle.body',
    defaultMessage:
      'Start when you are ready. Your saved progress is not changed by this screen.',
    description:
      'Explanation shown before the browser game startup process begins.',
  },
  startingTitle: {
    id: 'startup-shell.state.starting.title',
    defaultMessage: 'Starting the game',
    description:
      'Heading shown while browser game ownership and saved progress are being prepared.',
  },
  startingBody: {
    id: 'startup-shell.state.starting.body',
    defaultMessage:
      'Checking this browser and preparing your saved progress.',
    description:
      'Explanation shown while the browser game startup process is in progress.',
  },
  writerBlockedTitle: {
    id: 'startup-shell.state.writer-blocked.title',
    defaultMessage: 'Another tab is using this game',
    description:
      'Heading shown when another browser tab or window owns write access.',
  },
  writerBlockedBody: {
    id: 'startup-shell.state.writer-blocked.body',
    defaultMessage:
      'Another browser context is holding the writable game session. Use this tab to continue here and stop the other context from writing progress.',
    description:
      'Recovery guidance shown when another browser context owns write access.',
  },
  applicationBlockedTitle: {
    id: 'startup-shell.state.application-blocked.title',
    defaultMessage: 'This browser cannot start the game',
    description:
      'Heading shown when required browser capabilities are unavailable.',
  },
  applicationBlockedBody: {
    id: 'startup-shell.state.application-blocked.body',
    defaultMessage:
      'A required browser feature is unavailable. Your existing progress has not been changed.',
    description:
      'Explanation shown when required browser capabilities are unavailable.',
  },
  recoveryTitle: {
    id: 'startup-shell.state.recovery.title',
    defaultMessage: 'Saved progress needs attention',
    description:
      'Heading shown when startup requires a player-directed recovery choice.',
  },
  recoveryBody: {
    id: 'startup-shell.state.recovery.body',
    defaultMessage:
      'The game did not replace the saved progress it could not safely open. Import another save to continue. If that import cannot be used, its retained recovery data can then be exported for support.',
    description:
      'Recovery explanation that promises export only after an attempted import has been retained.',
  },
  readyPlaceholderTitle: {
    id: 'startup-shell.state.ready-placeholder.title',
    defaultMessage: 'Game ready',
    description:
      'Temporary heading shown after startup succeeds but before the gameplay UI is connected.',
  },
  readyPlaceholderBody: {
    id: 'startup-shell.state.ready-placeholder.body',
    defaultMessage:
      'Startup completed. The gameplay surface will appear here.',
    description:
      'Temporary explanation shown after startup succeeds but before gameplay UI is connected.',
  },
  ownershipLostTitle: {
    id: 'startup-shell.state.ownership-lost.title',
    defaultMessage: 'This tab stopped writing progress',
    description:
      'Heading shown after this browser tab loses canonical writer ownership.',
  },
  ownershipLostBody: {
    id: 'startup-shell.state.ownership-lost.body',
    defaultMessage:
      'Game activity stopped to protect your progress because another tab or window became active.',
    description:
      'Safety explanation shown after this browser tab loses canonical writer ownership.',
  },
  stoppingTitle: {
    id: 'startup-shell.state.stopping.title',
    defaultMessage: 'Stopping safely',
    description:
      'Heading shown while the browser game is completing its stop sequence.',
  },
  stoppingBody: {
    id: 'startup-shell.state.stopping.body',
    defaultMessage:
      'Finishing the current operation and releasing this tab.',
    description:
      'Explanation shown while the browser game is completing its stop sequence.',
  },
  errorTitle: {
    id: 'startup-shell.state.error.title',
    defaultMessage: 'The game could not start',
    description:
      'Heading shown when the controlled startup process reports an error.',
  },
  errorBody: {
    id: 'startup-shell.state.error.body',
    defaultMessage:
      'Startup stopped without replacing your existing progress.',
    description:
      'Safety explanation shown when the controlled startup process reports an error.',
  },
  boundaryTitle: {
    id: 'startup-shell.boundary.title',
    defaultMessage: 'The display stopped unexpectedly',
    description:
      'Heading shown by the top-level local render-error boundary.',
  },
  boundaryBody: {
    id: 'startup-shell.boundary.body',
    defaultMessage:
      'The game display stopped. No automatic retry or progress change was attempted. Reload this page when you are ready.',
    description:
      'Safety explanation shown by the top-level local render-error boundary.',
  },
  diagnosticsSummary: {
    id: 'startup-shell.diagnostics.summary',
    defaultMessage: 'Local diagnostic details',
    description:
      'Expandable summary label for locally redacted technical diagnostics.',
  },
  diagnosticsLabel: {
    id: 'startup-shell.diagnostics.label',
    defaultMessage: 'Redacted local diagnostic report',
    description:
      'Accessible label for a locally redacted technical diagnostic report.',
  },
  startAction: {
    id: 'startup-shell.action.start',
    defaultMessage: 'Start game',
    description: 'Button label that requests browser game startup.',
  },
  checkAgainAction: {
    id: 'startup-shell.action.check-again',
    defaultMessage: 'Check again',
    description:
      'Button label that requests another ownership or capability check.',
  },
  backupRecoveredNotice: {
    id: 'startup-shell.notice.backup-recovered',
    defaultMessage:
      'Your current save could not be opened. The newest verified backup was restored.',
    description:
      'Player-facing notice shown after startup restores a verified Web backup.',
  },
  useThisTabAction: {
    id: 'startup-shell.action.use-this-tab',
    defaultMessage: 'Use this tab',
    description:
      'Button label that deliberately transfers writable game ownership to the current browser tab.',
  },
  retryAction: {
    id: 'startup-shell.action.retry',
    defaultMessage: 'Try startup again',
    description:
      'Button label that explicitly requests another controlled startup attempt.',
  },
  reloadAction: {
    id: 'startup-shell.action.reload',
    defaultMessage: 'Reload safely',
    description:
      'Button label that requests a verified checkpoint and orderly browser reload after a render failure.',
  },
  importAction: {
    id: 'startup-shell.action.import',
    defaultMessage: 'Import a save',
    description:
      'Button label that requests the existing safe save-import flow.',
  },
  importTextLabel: {
    id: 'startup-shell.import.text-label',
    defaultMessage: 'Save text',
    description:
      'Visible label for the optional manual save-text recovery field.',
  },
  importTextHelp: {
    id: 'startup-shell.import.text-help',
    defaultMessage:
      'Paste an exported Idle Dyson Swarm save string. It is checked before your current browser progress can be replaced.',
    description:
      'Safety guidance for the optional manual save-text recovery field.',
  },
  exportRecoveryAction: {
    id: 'startup-shell.action.export-recovery',
    defaultMessage: 'Export recovery data',
    description:
      'Button label that requests a local recovery-data export.',
  },
  copyOriginalAction: {
    id: 'startup-shell.action.copy-original',
    defaultMessage: 'Copy Original',
    description:
      'Button label that copies the retained original save text without changing it.',
  },
  startFreshAction: {
    id: 'startup-shell.action.start-fresh',
    defaultMessage: 'Start Fresh',
    description:
      'Button label that starts a new Web save while retaining the original Unity source.',
  },
  importOverwriteConfirmation: {
    id: 'startup-shell.import.overwrite-confirmation',
    defaultMessage:
      'Import this save and replace the current browser profile? A recovery copy is retained before replacement.',
    description:
      'Confirmation shown before the player explicitly approves replacing the isolated browser profile with an imported save.',
  },
  importPending: {
    id: 'startup-shell.operation.import-pending',
    defaultMessage: 'Importing the selected save…',
    description:
      'Polite status announced while a player-approved save import is pending.',
  },
  importSucceeded: {
    id: 'startup-shell.operation.import-succeeded',
    defaultMessage: 'Save imported successfully.',
    description:
      'Polite confirmation after a player-approved save import succeeds.',
  },
  importFailed: {
    id: 'startup-shell.operation.import-failed',
    defaultMessage:
      'The save could not be imported. Your existing progress was not replaced.',
    description:
      'Assertive, privacy-safe failure status after a save import fails.',
  },
  exportPending: {
    id: 'startup-shell.operation.export-pending',
    defaultMessage: 'Preparing recovery data…',
    description:
      'Polite status while retained recovery data is being exported.',
  },
  exportSucceeded: {
    id: 'startup-shell.operation.export-succeeded',
    defaultMessage: 'Recovery data exported.',
    description:
      'Polite confirmation after retained recovery data is exported.',
  },
  exportFailed: {
    id: 'startup-shell.operation.export-failed',
    defaultMessage:
      'Recovery data could not be exported from this tab.',
    description:
      'Assertive, privacy-safe failure status after recovery export fails.',
  },
  reloadPending: {
    id: 'startup-shell.operation.reload-pending',
    defaultMessage: 'Releasing this tab before reloading…',
    description:
      'Polite status while the runtime releases ownership before a requested reload.',
  },
  reloadCompleted: {
    id: 'startup-shell.operation.reload-completed',
    defaultMessage: 'Reload requested.',
    description:
      'Polite confirmation when a requested reload has been handed to the browser.',
  },
  reloadFailed: {
    id: 'startup-shell.operation.reload-failed',
    defaultMessage:
      'This tab could not reload safely. Your progress was not reset.',
    description:
      'Assertive, privacy-safe failure status after safe reload preparation fails.',
  },
} as const satisfies Record<string, MessageDescriptor>)

export type StartupShellMessageName = keyof typeof startupShellMessages
export type StartupShellMessageId =
  (typeof startupShellMessages)[StartupShellMessageName]['id']
