import { defineMessages } from 'react-intl'

export const skillMessages = defineMessages({
  region: {
    id: 'skills.region',
    defaultMessage: 'Skills',
    description: 'Accessible name for the Skills tab content region.',
  },
  points: {
    id: 'skills.points',
    defaultMessage: 'Skill Points: {value}',
    description: 'Current number of skill points available to spend.',
  },
  fragments: {
    id: 'skills.fragments',
    defaultMessage: 'Fragments: {value}',
    description: 'Current number of skill fragments owned by the player.',
  },
  fragmentsContext: {
    id: 'skills.fragments-context',
    defaultMessage: 'Fragments owned: {value} ({delta})',
    description: 'Skill fragment total and its recent change shown in skill details.',
  },
  search: {
    id: 'skills.search',
    defaultMessage: 'Search skills',
    description: 'Accessible label for the skill-tree search field.',
  },
  searchPlaceholder: {
    id: 'skills.search-placeholder',
    defaultMessage: 'Search the tree…',
    description: 'Placeholder inviting the player to search the skill tree.',
  },
  matches: {
    id: 'skills.matches',
    defaultMessage: '{count, plural, one {# match} other {# matches}}',
    description: 'Number of skill-tree search results.',
  },
  zoomIn: {
    id: 'skills.zoom-in',
    defaultMessage: 'Zoom in',
    description: 'Accessible label for increasing the skill-tree zoom level.',
  },
  zoomOut: {
    id: 'skills.zoom-out',
    defaultMessage: 'Zoom out',
    description: 'Accessible label for decreasing the skill-tree zoom level.',
  },
  centreTree: {
    id: 'skills.centre-tree',
    defaultMessage: 'Centre on starting skill',
    description: 'Accessible label for centring the view on the first skill.',
  },
  tree: {
    id: 'skills.tree',
    defaultMessage: 'Skill tree',
    description: 'Accessible name for the interactive skill-tree viewport.',
  },
  treeInstructions: {
    id: 'skills.tree-instructions',
    defaultMessage:
      'Drag to pan. Pinch or use the zoom controls to zoom. Search and press Enter to open the first matching skill.',
    description: 'Screen-reader instructions for navigating the interactive skill tree.',
  },
  settings: {
    id: 'skills.settings',
    defaultMessage: 'Skill presets and reset',
    description: 'Accessible label for opening skill preset and reset settings.',
  },
  close: {
    id: 'skills.close',
    defaultMessage: 'Close',
    description: 'Label for closing a Skills dialog.',
  },
  cost: {
    id: 'skills.cost',
    defaultMessage: 'Cost: {value} Skill Points',
    description: 'Skill-point cost displayed in the selected skill details.',
  },
  effect: {
    id: 'skills.effect',
    defaultMessage: 'Effect:',
    description: 'Label introducing the mechanical effect of a skill.',
  },
  owned: {
    id: 'skills.owned',
    defaultMessage: 'Owned',
    description: 'Status indicating that the player has assigned a skill.',
  },
  queued: {
    id: 'skills.queued',
    defaultMessage: 'Queued for automatic assignment',
    description: 'Status indicating that a skill is in the active automatic-assignment queue.',
  },
  requirementsProgress: {
    id: 'skills.requirements-progress',
    defaultMessage: 'Requirements: {complete}/{total} complete',
    description: 'Number of prerequisite skills completed for the selected skill.',
  },
  missingRequirements: {
    id: 'skills.missing-requirements',
    defaultMessage: 'Missing: {names}',
    description: 'Names of prerequisite skills that have not yet been assigned.',
  },
  exclusive: {
    id: 'skills.exclusive',
    defaultMessage: 'Exclusive with: {names}',
    description: 'Names of skills that cannot be owned with the selected skill.',
  },
  purchase: {
    id: 'skills.purchase',
    defaultMessage: 'Assign Skill',
    description: 'Button label for spending skill points to assign a skill.',
  },
  refund: {
    id: 'skills.refund',
    defaultMessage: 'Unassign Skill',
    description: 'Button label for refunding and unassigning an owned skill.',
  },
  unavailable: {
    id: 'skills.unavailable',
    defaultMessage: 'This action is not currently available.',
    description: 'Status shown when the selected skill cannot currently be changed.',
  },
  actionFailed: {
    id: 'skills.action-failed',
    defaultMessage: 'The skill was not changed. Try again.',
    description: 'Error shown when assigning or unassigning a skill fails.',
  },
  presets: {
    id: 'skills.presets',
    defaultMessage: 'Presets',
    description: 'Heading for the saved skill-assignment presets.',
  },
  loadPreset: {
    id: 'skills.load-preset',
    defaultMessage: 'Load {name}',
    description: 'Button label for activating a named skill preset.',
  },
  currentPreset: {
    id: 'skills.current-preset',
    defaultMessage: 'Current',
    description: 'Status marking the currently active skill preset.',
  },
  presetSummary: {
    id: 'skills.preset-summary',
    defaultMessage:
      '{count, plural, one {# queued skill} other {# queued skills}} · <workerValue>{workers}% Workers</workerValue> · <scientistValue>{scientists}% Scientists</scientistValue>',
    description: 'Summary of a preset queue and its worker versus scientist distribution.',
  },
  managePreset: {
    id: 'skills.manage-preset',
    defaultMessage: 'Manage {name}',
    description: 'Accessible label for opening management options for a named preset.',
  },
  managePresetTitle: {
    id: 'skills.manage-preset-title',
    defaultMessage: 'Manage {name}',
    description: 'Dialog title for managing a named skill preset.',
  },
  presetName: {
    id: 'skills.preset-name',
    defaultMessage: 'Preset name',
    description: 'Label for the editable skill preset name.',
  },
  presetColor: {
    id: 'skills.preset-color',
    defaultMessage: 'Preset color',
    description: 'Label for the selectable skill preset color.',
  },
  presetColorCyan: {
    id: 'skills.preset-color-cyan',
    defaultMessage: 'Cyan',
    description: 'Name of the cyan skill preset color.',
  },
  presetColorOrange: {
    id: 'skills.preset-color-orange',
    defaultMessage: 'Orange',
    description: 'Name of the orange skill preset color.',
  },
  presetColorGold: {
    id: 'skills.preset-color-gold',
    defaultMessage: 'Gold',
    description: 'Name of the gold skill preset color.',
  },
  presetColorRose: {
    id: 'skills.preset-color-rose',
    defaultMessage: 'Rose',
    description: 'Name of the rose-red skill preset color.',
  },
  presetColorPink: {
    id: 'skills.preset-color-pink',
    defaultMessage: 'Pink',
    description: 'Name of the pink skill preset color.',
  },
  rename: {
    id: 'skills.rename',
    defaultMessage: 'Rename',
    description: 'Button label for saving a new skill preset name.',
  },
  includedInPreset: {
    id: 'skills.included-in-preset',
    defaultMessage: 'Included in {name}',
    description: 'Toggle label indicating whether a skill belongs to the named preset.',
  },
  confirmPresetChange: {
    id: 'skills.confirm-preset-change',
    defaultMessage: 'Confirm preset change',
    description: 'Accessible heading for reviewing a skill preset change.',
  },
  includeDependencies: {
    id: 'skills.include-dependencies',
    defaultMessage: 'Also include these required skills:',
    description: 'Heading for prerequisite skills that will be added to a preset.',
  },
  removeDependants: {
    id: 'skills.remove-dependants',
    defaultMessage: 'Also remove these dependent skills:',
    description: 'Heading for dependent skills that will be removed from a preset.',
  },
  affectedSkills: {
    id: 'skills.affected-skills',
    defaultMessage: 'Skills affected by this change',
    description: 'Accessible label for the skills changed by a preset edit.',
  },
  confirm: {
    id: 'skills.confirm',
    defaultMessage: 'Confirm',
    description: 'Button label for confirming a pending skill preset change.',
  },
  cancel: {
    id: 'skills.cancel',
    defaultMessage: 'Cancel',
    description: 'Button label for cancelling a pending Skills action.',
  },
  presetChangeFailed: {
    id: 'skills.preset-change-failed',
    defaultMessage: 'The preset was not changed. Try again.',
    description: 'Error shown when a skill preset update fails.',
  },
  exportPreset: {
    id: 'skills.export-preset',
    defaultMessage: 'Export',
    description: 'Heading for exporting a skill preset.',
  },
  exportPresetHelp: {
    id: 'skills.export-preset-help',
    defaultMessage: 'Create a string you can save or share.',
    description: 'Explanation of the skill preset export operation.',
  },
  createExport: {
    id: 'skills.create-export',
    defaultMessage: 'Create export',
    description: 'Button label for generating a skill preset export string.',
  },
  exportText: {
    id: 'skills.export-text',
    defaultMessage: 'Preset export string',
    description: 'Label for the generated skill preset export string.',
  },
  copy: {
    id: 'skills.copy',
    defaultMessage: 'Copy',
    description: 'Button label for copying a skill preset export string.',
  },
  paste: {
    id: 'skills.paste',
    defaultMessage: 'Paste',
    description: 'Button label for pasting a skill preset import string.',
  },
  copied: {
    id: 'skills.copied',
    defaultMessage: 'Copied',
    description: 'Status confirming that a preset export string was copied.',
  },
  importPreset: {
    id: 'skills.import-preset',
    defaultMessage: 'Import',
    description: 'Heading for importing a skill preset.',
  },
  importPresetHelp: {
    id: 'skills.import-preset-help',
    defaultMessage: 'Paste a preset string and review it before replacing this preset.',
    description: 'Explanation of how to import and review a skill preset.',
  },
  importText: {
    id: 'skills.import-text',
    defaultMessage: 'Preset import string',
    description: 'Label for the skill preset import string field.',
  },
  importPlaceholder: {
    id: 'skills.import-placeholder',
    defaultMessage: 'Paste preset string',
    description: 'Placeholder inviting the player to paste a skill preset string.',
  },
  previewImport: {
    id: 'skills.preview-import',
    defaultMessage: 'Preview import',
    description: 'Button label for validating and previewing an imported preset.',
  },
  replacePreset: {
    id: 'skills.replace-preset',
    defaultMessage: 'Replace {name}?',
    description: 'Confirmation heading before replacing a named skill preset.',
  },
  confirmImport: {
    id: 'skills.confirm-import',
    defaultMessage: 'Replace preset',
    description: 'Button label for replacing a preset with the reviewed import.',
  },
  presetTransferFailed: {
    id: 'skills.preset-transfer-failed',
    defaultMessage: 'The preset string could not be processed. Check it and try again.',
    description: 'Error shown when a skill preset import or export string is invalid.',
  },
  nonRefundable: {
    id: 'skills.non-refundable',
    defaultMessage: 'Allow automatic assignment of non-refundable skills',
    description: 'Toggle allowing presets to assign skills that cannot be refunded.',
  },
  reset: {
    id: 'skills.reset',
    defaultMessage: 'Reset refundable skills',
    description: 'Button label for refunding every currently refundable skill.',
  },
  resetWarning: {
    id: 'skills.reset-warning',
    defaultMessage:
      'Refunds all currently refundable skills and clears automatic assignment.',
    description: 'Warning explaining the effects of resetting refundable skills.',
  },
})
