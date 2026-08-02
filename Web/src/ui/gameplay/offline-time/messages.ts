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
      'Offline Time is stored while you are away. Spend it to advance the whole game immediately. This storage is separate from Simulation Double Time.',
    description: 'Explains what stored Offline Time does and distinguishes it from Simulation Double Time.',
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
  selectedAmount: {
    id: 'offline-time.selected-amount',
    defaultMessage: 'Selected: {duration}',
    description: 'The selected stored-time spend duration.',
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
  processing: {
    id: 'offline-time.processing',
    defaultMessage: 'Simulating…',
    description: 'Status while stored Offline Time is being processed.',
  },
  spendSuccess: {
    id: 'offline-time.spend-success',
    defaultMessage: 'Advanced the game by {duration}.',
    description: 'Confirmation after stored Offline Time is successfully spent.',
  },
  actionFailed: {
    id: 'offline-time.action-failed',
    defaultMessage: 'That action was not completed. Try again.',
    description: 'Failure feedback for Offline Time actions.',
  },
  noStoredTime: {
    id: 'offline-time.no-stored-time',
    defaultMessage: 'Return after time away to build up this bank.',
    description: 'Empty-state guidance for the stored Offline Time bank.',
  },
  usageHeading: {
    id: 'offline-time.usage-heading',
    defaultMessage: 'Offline Time Used',
    description: 'Heading for per-Infinity stored-time usage statistics.',
  },
  currentInfinity: {
    id: 'offline-time.current-infinity',
    defaultMessage: 'Current Infinity',
    description: 'Label for Offline Time spent during the current Infinity.',
  },
  previousInfinity: {
    id: 'offline-time.previous-infinity',
    defaultMessage: 'Previous Infinity',
    description: 'Label for Offline Time spent during the previous Infinity.',
  },
  disabled: {
    id: 'offline-time.disabled',
    defaultMessage: 'Offline Time is disabled for this save.',
    description: 'Warning shown when Unity-style clock-cheat protection disables Offline Time.',
  },
})
