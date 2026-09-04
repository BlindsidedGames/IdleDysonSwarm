import { defineMessages } from 'react-intl'

export const offlineTimeMessages = defineMessages({
  region: {
    id: 'offline-time.region',
    defaultMessage: 'Offline Time',
    description: 'Accessible name and heading for the stored Offline Time page.',
  },
  explanation: {
    id: 'offline-time.explanation',
    defaultMessage:
      'Offline Time is stored while you are away. Choose when to spend it to advance the game.',
    description: 'Explains that Offline Time is stored and spent manually.',
  },
  stored: {
    id: 'offline-time.stored',
    defaultMessage: 'Stored Offline Time',
    description: 'Heading for the available stored-time balance.',
  },
  capacity: {
    id: 'offline-time.capacity',
    defaultMessage: '{stored} of {capacity}',
    description: 'Stored Offline Time compared with its storage capacity.',
  },
  storageProgress: {
    id: 'offline-time.storage-progress',
    defaultMessage: 'Offline Time storage',
    description: 'Accessible label for the Offline Time storage progress bar.',
  },
  maximumStorage: {
    id: 'offline-time.maximum-storage',
    defaultMessage: 'Maximum storage reached',
    description: 'Status shown after the permanent Offline Time capacity ceiling is reached.',
  },
  doubleStorage: {
    id: 'offline-time.double-storage',
    defaultMessage: 'Double Storage',
    description: 'Button that consumes a full Offline Time bank to double its capacity.',
  },
  doubleStorageDescription: {
    id: 'offline-time.double-storage-description',
    defaultMessage: 'Consume the full bank to increase capacity to {capacity}.',
    description: 'Explains the Unity Offline Time capacity upgrade.',
  },
  spendHeading: {
    id: 'offline-time.spend-heading',
    defaultMessage: 'Spend Offline Time',
    description: 'Heading for stored-time spending controls.',
  },
  spendDescription: {
    id: 'offline-time.spend-description',
    defaultMessage: 'Choose how much time to simulate now.',
    description: 'Instruction for the stored-time amount selector.',
  },
  oneMinute: {
    id: 'offline-time.one-minute',
    defaultMessage: '1 minute',
    description: 'Quick selection for one minute of stored time.',
  },
  tenMinutes: {
    id: 'offline-time.ten-minutes',
    defaultMessage: '10 minutes',
    description: 'Quick selection for ten minutes of stored time.',
  },
  oneHour: {
    id: 'offline-time.one-hour',
    defaultMessage: '1 hour',
    description: 'Quick selection for one hour of stored time.',
  },
  all: {
    id: 'offline-time.all',
    defaultMessage: 'All',
    description: 'Quick selection for all stored time.',
  },
  spend: {
    id: 'offline-time.spend',
    defaultMessage: 'Spend {duration}',
    description: 'Button that starts a stored Offline Time simulation.',
  },
  spendAgain: {
    id: 'offline-time.spend-again',
    defaultMessage: 'Spend Again: {duration}',
    description: 'Repeats the most recently successful stored Offline Time spend.',
  },
  confirmSpend: {
    id: 'offline-time.confirm-spend',
    defaultMessage: 'Tap again to confirm',
    description: 'Unity-style confirmation text before spending stored Offline Time.',
  },
  cancelConfirmation: {
    id: 'offline-time.cancel-confirmation',
    defaultMessage: 'Cancel',
    description: 'Disarms a pending Stored Time spend confirmation.',
  },
  processing: {
    id: 'offline-time.processing',
    defaultMessage: 'Simulating…',
    description: 'Status while stored Offline Time is being processed.',
  },
  largeSpendDisclosure: {
    id: 'offline-time.large-spend-disclosure',
    defaultMessage: 'Simulation becomes less accurate at larger time steps.',
    description: 'Concise Stored Time accuracy disclosure.',
  },
  accuracyPreset: {
    id: 'offline-time.accuracy-preset',
    defaultMessage: 'Simulation accuracy',
    description: 'Label for the Stored Time accuracy preset selector.',
  },
  reducedAccuracy: {
    id: 'offline-time.summary.reduced-accuracy',
    defaultMessage: '{preset} (sped up)',
    description: 'Marks a Stored Time result whose update count was reduced with Speed Up.',
  },
  simulationUpdates: {
    id: 'offline-time.summary.simulation-updates',
    defaultMessage: 'Simulation updates',
    description: 'Actual number of authoritative game updates executed for a Stored Time spend.',
  },
  fastPreset: {
    id: 'offline-time.fast-preset',
    defaultMessage: 'Fast',
    description: 'Lowest-work Stored Time accuracy preset.',
  },
  balancedPreset: {
    id: 'offline-time.balanced-preset',
    defaultMessage: 'Balanced',
    description: 'Default Stored Time accuracy preset.',
  },
  accuratePreset: {
    id: 'offline-time.accurate-preset',
    defaultMessage: 'Accurate',
    description: 'Highest-work Stored Time accuracy preset.',
  },
  speedUp: {
    id: 'offline-time.speed-up',
    defaultMessage: 'Speed up',
    description: 'Reduces the remaining Stored Time accuracy budget.',
  },
  simulationProgress: {
    id: 'offline-time.simulation-progress',
    defaultMessage: 'Offline Time simulation progress',
    description: 'Accessible label for Stored Time job progress.',
  },
  processingHeading: {
    id: 'offline-time.processing-heading',
    defaultMessage: 'Processing Offline Time',
    description: 'Heading for the active Stored Time processing dialog.',
  },
  preparing: {
    id: 'offline-time.preparing',
    defaultMessage: 'Preparing simulation…',
    description: 'Status shown while a Stored Time job is being admitted or finalized.',
  },
  simulationComplete: {
    id: 'offline-time.simulation-complete',
    defaultMessage: 'Offline Time Complete',
    description: 'Heading and accessible name for the completed Stored Time summary.',
  },
  timeSimulated: {
    id: 'offline-time.time-simulated',
    defaultMessage: 'Time simulated',
    description: 'Completed Stored Time summary label for processed game time.',
  },
  timeRemaining: {
    id: 'offline-time.time-remaining',
    defaultMessage: 'Offline Time remaining',
    description: 'Completed Stored Time summary label for the remaining bank.',
  },
  infinityGroup: {
    id: 'offline-time.summary.group.infinity',
    defaultMessage: 'Infinity',
    description: 'Heading for Infinity results in the Stored Time completion summary.',
  },
  facilitiesGroup: {
    id: 'offline-time.summary.group.facilities',
    defaultMessage: 'Facilities gained',
    description: 'Heading for facility gains in the Stored Time completion summary.',
  },
  simulationsGroup: {
    id: 'offline-time.summary.group.simulations',
    defaultMessage: 'Simulations',
    description: 'Heading for Simulation results in the Stored Time completion summary.',
  },
  realityGroup: {
    id: 'offline-time.summary.group.reality',
    defaultMessage: 'Reality',
    description: 'Heading for Reality results in the Stored Time completion summary.',
  },
  infinityPointsGained: {
    id: 'offline-time.summary.infinity-points',
    defaultMessage: 'Infinity Points gained',
    description: 'Stored Time completion result for earned Infinity Points.',
  },
  infinitiesCompleted: {
    id: 'offline-time.summary.infinities',
    defaultMessage: 'Infinities completed',
    description: 'Stored Time completion result for Infinity resets.',
  },
  botsGained: {
    id: 'offline-time.summary.bots',
    defaultMessage: 'Bots gained',
    description: 'Stored Time completion result for net Bots gained without an Infinity.',
  },
  simulationResets: {
    id: 'offline-time.summary.simulation-resets',
    defaultMessage: 'Simulation resets',
    description: 'Stored Time completion result for Dream simulation resets.',
  },
  strangeMatterGained: {
    id: 'offline-time.summary.strange-matter',
    defaultMessage: 'Strange Matter gained',
    description: 'Stored Time completion result for Strange Matter.',
  },
  realityWorkersGained: {
    id: 'offline-time.summary.reality-workers',
    defaultMessage: 'Reality workers created',
    description: 'Stored Time completion result for Reality workers.',
  },
  influenceGained: {
    id: 'offline-time.summary.influence',
    defaultMessage: 'Influence gained',
    description: 'Stored Time completion result for automatic Influence.',
  },
  noMajorChanges: {
    id: 'offline-time.summary.no-major-changes',
    defaultMessage: 'No major progression changes.',
    description: 'Stored Time completion result when no tracked progression changed.',
  },
  closeSummary: {
    id: 'offline-time.close-summary',
    defaultMessage: 'Continue',
    description: 'Closes the completed Stored Time summary.',
  },
  progress: {
    id: 'offline-time.progress',
    defaultMessage: '{percent}% complete · about {eta} remaining',
    description: 'Progress and estimated remaining time for a Stored Time job.',
  },
  progressAnnouncement: {
    id: 'offline-time.progress-announcement',
    defaultMessage: '{percent}% complete',
    description: 'Coarsened screen-reader progress announcement for a Stored Time job.',
  },
  calculating: {
    id: 'offline-time.calculating',
    defaultMessage: 'calculating',
    description: 'Shown while a Stored Time job has insufficient data for an ETA.',
  },
  cancel: {
    id: 'offline-time.cancel',
    defaultMessage: 'Cancel simulation',
    description: 'Cancels the active Stored Time simulation without charging its bank.',
  },
  cancelling: {
    id: 'offline-time.cancelling',
    defaultMessage: 'Cancelling safely…',
    description: 'Status while a Stored Time worker is discarding its candidate.',
  },
  actionFailed: {
    id: 'offline-time.action-failed',
    defaultMessage: 'That action was not completed. Try again.',
    description: 'Failure feedback for Offline Time actions.',
  },
  appBackgrounded: {
    id: 'offline-time.app-backgrounded',
    defaultMessage: 'App was backgrounded processing cancelled',
    description: 'Stored Time cancellation feedback only when the app entered the background.',
  },
  errorCode: {
    id: 'offline-time.error-code',
    defaultMessage: '(Error code: {code})',
    description: 'Stable technical error code appended to Offline Time feedback for support.',
  },
  noStoredTime: {
    id: 'offline-time.no-stored-time',
    defaultMessage: 'Return after time away to build up this bank.',
    description: 'Empty-state guidance for the stored Offline Time bank.',
  },
  disabled: {
    id: 'offline-time.disabled',
    defaultMessage: 'Offline Time is disabled for this save.',
    description: 'Warning shown when Unity-style clock-cheat protection disables Offline Time.',
  },
})
