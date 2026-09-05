import { defineMessages } from 'react-intl'

export const settingsSurfaceMessages = defineMessages({
  achievementsAction: { id: 'settings.achievements.action', defaultMessage: 'Achievements', description: 'Opens the native platform achievement list and sign-in when needed.' },
  achievementsUnavailable: { id: 'settings.achievements.unavailable', defaultMessage: 'Achievements are unavailable. Check your game account and connection, then try again.', description: 'Native achievements could not open or sign-in was cancelled.' },
  languageTitle: {
    id: 'settings.language.title',
    defaultMessage: 'Language',
    description: 'Heading for the device-local game language preference.',
  },
  languageDescription: {
    id: 'settings.language.description',
    defaultMessage:
      'Follow this device’s preferred language or choose one for this game.',
    description:
      'Explains that language is a device-local presentation preference and can follow the device.',
  },
  languageLabel: {
    id: 'settings.language.label',
    defaultMessage: 'Game language',
    description: 'Accessible label for the game language select.',
  },
  languageSystem: {
    id: 'settings.language.system',
    defaultMessage: 'Use device language',
    description:
      'Language option that follows the ordered language preferences of the current device.',
  },
  languageEnglish: {
    id: 'settings.language.english',
    defaultMessage: 'English',
    description: 'Autonym for the English language option.',
  },
  languageFrench: {
    id: 'settings.language.french',
    defaultMessage: 'Français',
    description: 'Autonym for the French language option.',
  },
  languageGerman: {
    id: 'settings.language.german',
    defaultMessage: 'Deutsch',
    description: 'Autonym for the German language option.',
  },
  languageSpanishLatinAmerica: {
    id: 'settings.language.spanish-latin-america',
    defaultMessage: 'Español (Latinoamérica)',
    description: 'Autonym for the Latin American Spanish language option.',
  },
  languagePortugueseBrazil: {
    id: 'settings.language.portuguese-brazil',
    defaultMessage: 'Português (Brasil)',
    description: 'Autonym for the Brazilian Portuguese language option.',
  },
  languageChineseSimplified: {
    id: 'settings.language.chinese-simplified',
    defaultMessage: '简体中文',
    description: 'Autonym for the Simplified Chinese language option.',
  },
  languageRussian: {
    id: 'settings.language.russian',
    defaultMessage: 'Русский',
    description: 'Autonym for the Russian language option.',
  },
  languageJapanese: {
    id: 'settings.language.japanese',
    defaultMessage: '日本語',
    description: 'Autonym for the Japanese language option.',
  },
  numberNotationTitle: {
    id: 'settings.number-notation.title',
    defaultMessage: 'Number notation',
    description: 'Heading for the device-local number notation preference.',
  },
  numberNotationDescription: {
    id: 'settings.number-notation.description',
    defaultMessage: 'Choose how large game values are displayed.',
    description: 'Explains the scope of the number notation preference.',
  },
  numberNotationLabel: {
    id: 'settings.number-notation.label',
    defaultMessage: 'Large number notation',
    description: 'Accessible label for the number notation select.',
  },
  numberNotationMixed: {
    id: 'settings.number-notation.mixed',
    defaultMessage: 'Mixed',
    description:
      'Mixed notation option using Standard through Quintillion and Scientific above it.',
  },
  numberNotationStandard: {
    id: 'settings.number-notation.standard',
    defaultMessage: 'Standard',
    description: 'Standard suffix number notation option.',
  },
  numberNotationScientific: {
    id: 'settings.number-notation.scientific',
    defaultMessage: 'Scientific',
    description: 'Scientific number notation option.',
  },
  numberNotationEngineering: {
    id: 'settings.number-notation.engineering',
    defaultMessage: 'Engineering',
    description: 'Engineering number notation option.',
  },
  processingTitle: {
    id: 'settings.processing.title',
    defaultMessage: 'Game processing',
    description: 'Heading for active game processing preferences.',
  },
  processingDescription: {
    id: 'settings.processing.description',
    defaultMessage: 'Choose how often the game updates. Larger intervals use less processing power but reduce automation accuracy.',
    description: 'Explains the active update interval performance and accuracy tradeoff.',
  },
  processingInterval: {
    id: 'settings.processing.interval',
    defaultMessage: 'Update interval',
    description: 'Label for the active game update interval control.',
  },
  processingIntervalValue: {
    id: 'settings.processing.interval-value',
    defaultMessage: '{milliseconds} ms',
    description: 'Current active game update interval.',
  },
  audioTitle: {
    id: 'settings.audio.title',
    defaultMessage: 'Audio',
    description: 'Heading for game audio preferences.',
  },
  audioDescription: {
    id: 'settings.audio.description',
    defaultMessage: 'Adjust music and sound effects.',
    description: 'Explains the available audio controls.',
  },
  musicVolume: {
    id: 'settings.audio.music-volume',
    defaultMessage: 'Music volume',
    description: 'Label for the soundtrack volume control.',
  },
  effectsVolume: {
    id: 'settings.audio.effects-volume',
    defaultMessage: 'Effects volume',
    description: 'Label for the interface sound volume control.',
  },
  muteAudio: {
    id: 'settings.audio.mute',
    defaultMessage: 'Mute all audio',
    description: 'Label for the game audio mute control.',
  },
  moreByTitle: {
    id: 'settings.more-by.title',
    defaultMessage: 'More by Blindsided Games',
    description: 'Heading for the canonical developer area in Settings.',
  },
  moreByDescription: {
    id: 'settings.more-by.description',
    defaultMessage: 'Discover more games by Blindsided Games.',
    description: 'Description above the developer marketplace action.',
  },
  discordDescription: {
    id: 'settings.more-by.discord-description',
    defaultMessage: 'Share feedback, get help, and discuss strategies.',
    description: 'Description above the official Discord action.',
  },
  discordAction: {
    id: 'settings.more-by.discord-action',
    defaultMessage: 'Discord',
    description: 'Primary action opening the official game Discord community.',
  },
  appStoreAction: {
    id: 'settings.more-by.app-store-action',
    defaultMessage: 'App Store',
    description: 'Action opening the developer page in the Apple App Store.',
  },
  googlePlayAction: {
    id: 'settings.more-by.google-play-action',
    defaultMessage: 'Google Play',
    description: 'Action opening the developer page in Google Play.',
  },
  websiteAction: {
    id: 'settings.more-by.website-action',
    defaultMessage: 'Official Website',
    description: 'Action opening the Blindsided Games website.',
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
  navigationIncludeText: {
    id: 'settings.navigation.include-text',
    defaultMessage: 'Include text',
    description: 'Shows labels beneath every displayed bottom navigation icon.',
  },
  botsShortcut: {
    id: 'settings.navigation.bots',
    defaultMessage: 'Show Bots',
    description: 'Controls the Bots bottom navigation destination.',
  },
  researchShortcut: {
    id: 'settings.navigation.research',
    defaultMessage: 'Show Research',
    description: 'Controls the Research bottom navigation destination.',
  },
  skillsShortcut: {
    id: 'settings.navigation.skills',
    defaultMessage: 'Show Skills',
    description: 'Controls the Skills bottom navigation destination.',
  },
  infinityShortcut: {
    id: 'settings.navigation.infinity',
    defaultMessage: 'Show Infinity',
    description: 'Controls the Infinity bottom navigation destination.',
  },
  realityShortcut: {
    id: 'settings.navigation.reality',
    defaultMessage: 'Show Reality',
    description: 'Controls the Reality bottom navigation destination.',
  },
  simulationsShortcut: {
    id: 'settings.navigation.simulations',
    defaultMessage: 'Show Simulations',
    description: 'Controls the Simulations bottom navigation destination.',
  },
  quantumShortcut: {
    id: 'settings.navigation.quantum',
    defaultMessage: 'Show Quantum',
    description: 'Controls the Quantum bottom navigation destination.',
  },
  storeShortcut: {
    id: 'settings.navigation.store',
    defaultMessage: 'Show Store',
    description: 'Controls the Store bottom navigation destination.',
  },
  storyShortcut: {
    id: 'settings.navigation.story',
    defaultMessage: 'Show Story',
    description: 'Controls the Story bottom navigation destination.',
  },
  wikiShortcut: {
    id: 'settings.navigation.wiki',
    defaultMessage: 'Show Wiki',
    description: 'Controls the Wiki bottom navigation destination.',
  },
  statisticsShortcut: {
    id: 'settings.navigation.statistics',
    defaultMessage: 'Show Statistics',
    description: 'Controls the Statistics bottom navigation destination.',
  },
  offlineTimeShortcut: {
    id: 'settings.navigation.offline-time',
    defaultMessage: 'Show Stored Time',
    description: 'Controls the Stored Time bottom navigation destination.',
  },
  settingsShortcut: {
    id: 'settings.navigation.settings',
    defaultMessage: 'Show Settings',
    description: 'Controls the Settings bottom navigation destination.',
  },
  saveData: {
    id: 'settings.save-data.title',
    defaultMessage: 'Save Data',
    description: 'Heading for save management settings.',
  },
  saveDescription: {
    id: 'settings.save-data.description',
    defaultMessage: 'Progress is saved automatically.',
    description: 'Explains automatic local browser persistence.',
  },
  reset: {
    id: 'settings.save-data.reset',
    defaultMessage: 'Reset Save',
    description: 'Button that replaces current progress with a fresh save.',
  },
  importSave: {
    id: 'settings.save-data.import',
    defaultMessage: 'Import',
    description: 'Opens the save import dialog.',
  },
  importDialogTitle: {
    id: 'settings.save-data.import-dialog-title',
    defaultMessage: 'Import Save?',
    description: 'Save import confirmation dialog title.',
  },
  importDescription: {
    id: 'settings.save-data.import-description',
    defaultMessage:
      'Paste an exported save string or choose a save file. Importing replaces your current progress; the original is retained for recovery.',
    description: 'Explains save import sources and replacement behavior.',
  },
  importStringLabel: {
    id: 'settings.save-data.import-string-label',
    defaultMessage: 'Save string',
    description: 'Label for the pasted save string field.',
  },
  importStringPlaceholder: {
    id: 'settings.save-data.import-string-placeholder',
    defaultMessage: 'Paste your exported save string here',
    description: 'Placeholder for the pasted save string field.',
  },
  chooseFile: {
    id: 'settings.save-data.choose-file',
    defaultMessage: 'Choose File',
    description: 'Selects a save file as an alternative import source.',
  },
  importReview: {
    id: 'settings.save-data.import-review',
    defaultMessage: 'Review Save',
    description: 'Validates a supplied save and opens its progress preview.',
  },
  importReviewPending: {
    id: 'settings.save-data.import-review-pending',
    defaultMessage: 'Reviewing…',
    description: 'Pending save-preview button text.',
  },
  importPreviewTitle: {
    id: 'settings.save-data.import-preview-title',
    defaultMessage: 'Progress in this save',
    description: 'Heading for the validated save progress preview.',
  },
  infinityPoints: {
    id: 'settings.save-data.import-preview-infinity-points',
    defaultMessage: 'Infinity Points',
    description: 'Infinity Point balance in an imported save preview.',
  },
  quantumPoints: {
    id: 'settings.save-data.import-preview-quantum-points',
    defaultMessage: 'Quantum Points',
    description: 'Quantum Point balance in an imported save preview.',
  },
  skillPoints: {
    id: 'settings.save-data.import-preview-skill-points',
    defaultMessage: 'Skill Points',
    description: 'Skill Point balance in an imported save preview.',
  },
  importPreviewWarning: {
    id: 'settings.save-data.import-preview-warning',
    defaultMessage: 'Importing will replace your current progress.',
    description: 'Final warning below a validated save progress preview.',
  },
  importPreviewStoredTimeWarning: {
    id: 'settings.save-data.import-preview-stored-time-warning',
    defaultMessage:
      'Importing now will cancel the current Offline Time simulation without spending its Offline Time.',
    description:
      'Additional import confirmation warning while Stored Time processing is active.',
  },
  resetStoredTimeWarning: {
    id: 'settings.save-data.reset-stored-time-warning',
    defaultMessage:
      'Resetting now will cancel the current Offline Time simulation without spending its Offline Time.',
    description:
      'Additional reset confirmation warning while Stored Time processing is active.',
  },
  importPreviewFailed: {
    id: 'settings.save-data.import-preview-failed',
    defaultMessage: 'This save could not be read. Your current progress was kept.',
    description: 'Failure shown when a supplied save cannot be previewed.',
  },
  importPending: {
    id: 'settings.save-data.import-pending',
    defaultMessage: 'Importing…',
    description: 'Pending save-import button text.',
  },
  importSucceeded: {
    id: 'settings.save-data.import-succeeded',
    defaultMessage: 'Save imported successfully.',
    description: 'Successful save-import feedback.',
  },
  importFailed: {
    id: 'settings.save-data.import-failed',
    defaultMessage:
      'The save could not be imported. Your current progress was kept.',
    description: 'Failed save-import feedback.',
  },
  importCommittedRecovery: {
    id: 'settings.save-data.import-committed-recovery',
    defaultMessage:
      'The imported save was written, but the game could not reopen it. Reload to recover.',
    description:
      'Warns that import committed but post-commit session reconstruction failed.',
  },
  exportSave: {
    id: 'settings.save-data.export',
    defaultMessage: 'Export',
    description: 'Opens the save export dialog.',
  },
  exportDialogTitle: {
    id: 'settings.save-data.export-dialog-title',
    defaultMessage: 'Export Save',
    description: 'Save export dialog title.',
  },
  exportDescription: {
    id: 'settings.save-data.export-description',
    defaultMessage:
      'Keep a copy of this save somewhere safe.',
    description: 'Explains why to keep an exported save.',
  },
  exportPreStoredTime: {
    id: 'settings.save-data.export-pre-stored-time',
    defaultMessage:
      'Stored Time is still processing. This export is the complete save from immediately before that simulation began.',
    description:
      'Explains that an export captured during active Stored Time is the immutable pre-simulation save.',
  },
  exportStringLabel: {
    id: 'settings.save-data.export-string-label',
    defaultMessage: 'Save string',
    description: 'Label for the exported save string field.',
  },
  exportLoading: {
    id: 'settings.save-data.export-loading',
    defaultMessage: 'Preparing save string…',
    description: 'Placeholder while the export string is prepared.',
  },
  copyString: {
    id: 'settings.save-data.copy-string',
    defaultMessage: 'Copy String',
    description: 'Copies the exported save string to the clipboard.',
  },
  exportCopied: {
    id: 'settings.save-data.export-copied',
    defaultMessage: 'Save string copied.',
    description: 'Successful save-string clipboard feedback.',
  },
  downloadFile: {
    id: 'settings.save-data.download-file',
    defaultMessage: 'Save File',
    description: 'Downloads the exported save as a file.',
  },
  exportSucceeded: {
    id: 'settings.save-data.export-succeeded',
    defaultMessage: 'Save exported successfully.',
    description: 'Successful save-export feedback.',
  },
  exportFailed: {
    id: 'settings.save-data.export-failed',
    defaultMessage: 'The save could not be exported. Please try again.',
    description: 'Failed save-export feedback.',
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
  close: {
    id: 'settings.save-data.close',
    defaultMessage: 'Close',
    description: 'Closes a save transfer dialog.',
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
  developmentDebugTitle: {
    id: 'settings.development.debug.title',
    defaultMessage: 'Developer Options',
    description: 'Heading for the development-only debug access toggle.',
  },
  developmentDebugDescription: {
    id: 'settings.development.debug.description',
    defaultMessage:
      'Shows the Debug Options page without requiring the in-game purchase. Development builds only.',
    description: 'Explains the development-only debug access toggle.',
  },
  developmentDebugToggle: {
    id: 'settings.development.debug.toggle',
    defaultMessage: 'Enable Developer Options',
    description: 'Toggles Developer Options in a development build.',
  },
  developmentDebugFailed: {
    id: 'settings.development.debug.failed',
    defaultMessage: 'Developer Options could not be changed.',
    description: 'Failure feedback for the development-only debug toggle.',
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
