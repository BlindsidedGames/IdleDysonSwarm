import { defineMessages } from 'react-intl'

export const settingsSurfaceMessages = defineMessages({
  moreByTitle: {
    id: 'settings.more-by.title',
    defaultMessage: 'More by Blind Sided Games',
    description: 'Heading for the canonical developer area in Settings.',
  },
  moreByDescription: {
    id: 'settings.more-by.description',
    defaultMessage:
      'Discover more games from the developer of Idle Dyson Swarm.',
    description: 'Description for the canonical developer area in Settings.',
  },
  visualizationTitle: {
    id: 'settings.visualization.title',
    defaultMessage: 'Visualization',
    description: 'Heading for the cosmic visualization preference.',
  },
  visualizationDescription: {
    id: 'settings.visualization.description',
    defaultMessage:
      'Show the evolving star, galaxy, and deep-field visualization above facilities.',
    description: 'Explains the cosmic visualization preference.',
  },
  visualizationToggle: {
    id: 'settings.visualization.toggle',
    defaultMessage: 'Show visualization',
    description: 'Toggles the cosmic progression visualization.',
  },
  navigationTitle: {
    id: 'settings.navigation.title',
    defaultMessage: 'Navigation Shortcuts',
    description: 'Heading for optional bottom navigation shortcuts.',
  },
  navigationDescription: {
    id: 'settings.navigation.description',
    defaultMessage:
      'Choose which optional pages appear in the bottom navigation. They remain available from the menu.',
    description: 'Explains optional bottom navigation shortcuts.',
  },
  storyShortcut: {
    id: 'settings.navigation.story',
    defaultMessage: 'Show Story shortcut',
    description: 'Controls the Story bottom navigation shortcut.',
  },
  wikiShortcut: {
    id: 'settings.navigation.wiki',
    defaultMessage: 'Show Wiki shortcut',
    description: 'Controls the Wiki bottom navigation shortcut.',
  },
  statisticsShortcut: {
    id: 'settings.navigation.statistics',
    defaultMessage: 'Show Statistics shortcut',
    description: 'Controls the Statistics bottom navigation shortcut.',
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
  developmentTitle: {
    id: 'settings.development.title',
    defaultMessage: 'Development Menu',
    description: 'Heading for development-only gameplay controls.',
  },
  developmentDescription: {
    id: 'settings.development.description',
    defaultMessage:
      'Sets the real saved bot count. Visual stages assume Bot Distribution is set to 100% Workers.',
    description:
      'Explains the real-state development progression presets.',
  },
  developmentPreset: {
    id: 'settings.development.preset',
    defaultMessage: 'Progression state',
    description: 'Label for the development progression preset selector.',
  },
  developmentApply: {
    id: 'settings.development.apply',
    defaultMessage: 'Apply Progression',
    description: 'Applies a development progression preset.',
  },
  developmentApplying: {
    id: 'settings.development.applying',
    defaultMessage: 'Applying…',
    description: 'Pending development progression button text.',
  },
  developmentSucceeded: {
    id: 'settings.development.succeeded',
    defaultMessage:
      'Bot count saved. Return to Bots to inspect the live simulation.',
    description: 'Successful development progression feedback.',
  },
  developmentRealitySucceeded: {
    id: 'settings.development.reality-succeeded',
    defaultMessage:
      'Reality unlocked. Open the Reality tab to inspect the live state.',
    description:
      'Successful Reality unlock development-state feedback.',
  },
  developmentFailed: {
    id: 'settings.development.failed',
    defaultMessage:
      'The development progression could not be applied.',
    description: 'Failed development progression feedback.',
  },
  developmentEarlySwarm: {
    id: 'settings.development.preset.early-swarm',
    defaultMessage: 'Early swarm — {bots} Bots',
    description: 'Early stellar swarm development preset.',
  },
  developmentMidSwarm: {
    id: 'settings.development.preset.mid-swarm',
    defaultMessage: 'Mid swarm — {bots} Bots',
    description: 'Mid stellar swarm development preset.',
  },
  developmentNearStar: {
    id: 'settings.development.preset.near-star',
    defaultMessage: 'Nearly surrounded star — {bots} Bots',
    description: 'Nearly completed stellar swarm development preset.',
  },
  developmentNewGalaxy: {
    id: 'settings.development.preset.new-galaxy',
    defaultMessage: 'New galaxy view — {bots} Bots',
    description: 'First galaxy view development preset.',
  },
  developmentYoungGalaxy: {
    id: 'settings.development.preset.young-galaxy',
    defaultMessage: 'Young harvested galaxy — {bots} Bots',
    description: 'Early galaxy harvesting development preset.',
  },
  developmentHalfGalaxy: {
    id: 'settings.development.preset.half-galaxy',
    defaultMessage: 'Half-harvested galaxy — {bots} Bots',
    description: 'Half galaxy harvesting development preset.',
  },
  developmentNearGalaxy: {
    id: 'settings.development.preset.near-galaxy',
    defaultMessage: 'Nearly harvested galaxy — {bots} Bots',
    description: 'Nearly completed galaxy development preset.',
  },
  developmentOneGalaxy: {
    id: 'settings.development.preset.one-galaxy',
    defaultMessage: 'First engulfed galaxy — {bots} Bots',
    description: 'First completed galaxy development preset.',
  },
  developmentGalaxyGroup: {
    id: 'settings.development.preset.galaxy-group',
    defaultMessage: 'Galaxy group — {bots} Bots',
    description: 'Multiple engulfed galaxies development preset.',
  },
  developmentFirstInfinity: {
    id: 'settings.development.preset.first-infinity',
    defaultMessage: 'First Infinity — {bots} Bots',
    description:
      'Development preset that reaches the first automatic Infinity reset.',
  },
  developmentRealityUnlocked: {
    id: 'settings.development.preset.reality-unlocked',
    defaultMessage: 'Reality unlocked — 27 Secrets',
    description:
      'Development preset that applies the canonical Reality unlock state.',
  },
})
