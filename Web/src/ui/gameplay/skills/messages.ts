import { defineMessages } from 'react-intl'

export const skillMessages = defineMessages({
  region: {
    id: 'skills.region',
    defaultMessage: 'Skills',
  },
  points: {
    id: 'skills.points',
    defaultMessage: 'Skill Points: {value}',
  },
  fragments: {
    id: 'skills.fragments',
    defaultMessage: 'Fragments: {value}',
  },
  fragmentsContext: {
    id: 'skills.fragments-context',
    defaultMessage: 'Fragments owned: {value} ({delta})',
  },
  search: {
    id: 'skills.search',
    defaultMessage: 'Search skills',
  },
  searchPlaceholder: {
    id: 'skills.search-placeholder',
    defaultMessage: 'Search the tree…',
  },
  matches: {
    id: 'skills.matches',
    defaultMessage: '{count, plural, one {# match} other {# matches}}',
  },
  zoomIn: {
    id: 'skills.zoom-in',
    defaultMessage: 'Zoom in',
  },
  zoomOut: {
    id: 'skills.zoom-out',
    defaultMessage: 'Zoom out',
  },
  centreTree: {
    id: 'skills.centre-tree',
    defaultMessage: 'Centre on starting skill',
  },
  tree: {
    id: 'skills.tree',
    defaultMessage: 'Skill tree',
  },
  treeInstructions: {
    id: 'skills.tree-instructions',
    defaultMessage:
      'Drag to pan. Pinch or use the zoom controls to zoom. Search and press Enter to open the first matching skill.',
  },
  settings: {
    id: 'skills.settings',
    defaultMessage: 'Skill presets and reset',
  },
  close: {
    id: 'skills.close',
    defaultMessage: 'Close',
  },
  cost: {
    id: 'skills.cost',
    defaultMessage: 'Cost: {value} Skill Points',
  },
  effect: {
    id: 'skills.effect',
    defaultMessage: 'Effect:',
  },
  owned: {
    id: 'skills.owned',
    defaultMessage: 'Owned',
  },
  queued: {
    id: 'skills.queued',
    defaultMessage: 'Queued for automatic assignment',
  },
  requirementsProgress: {
    id: 'skills.requirements-progress',
    defaultMessage: 'Requirements: {complete}/{total} complete',
  },
  missingRequirements: {
    id: 'skills.missing-requirements',
    defaultMessage: 'Missing: {names}',
  },
  exclusive: {
    id: 'skills.exclusive',
    defaultMessage: 'Exclusive with: {names}',
  },
  purchase: {
    id: 'skills.purchase',
    defaultMessage: 'Assign Skill',
  },
  refund: {
    id: 'skills.refund',
    defaultMessage: 'Unassign Skill',
  },
  unavailable: {
    id: 'skills.unavailable',
    defaultMessage: 'This action is not currently available.',
  },
  actionFailed: {
    id: 'skills.action-failed',
    defaultMessage: 'The skill was not changed. Try again.',
  },
  presets: {
    id: 'skills.presets',
    defaultMessage: 'Presets',
  },
  loadPreset: {
    id: 'skills.load-preset',
    defaultMessage: 'Load {name}',
  },
  currentPreset: {
    id: 'skills.current-preset',
    defaultMessage: 'Current',
  },
  presetSummary: {
    id: 'skills.preset-summary',
    defaultMessage:
      '{count, plural, one {# queued skill} other {# queued skills}} · <workerValue>{workers}% Workers</workerValue> · <scientistValue>{scientists}% Scientists</scientistValue>',
  },
  managePreset: {
    id: 'skills.manage-preset',
    defaultMessage: 'Manage {name}',
  },
  managePresetTitle: {
    id: 'skills.manage-preset-title',
    defaultMessage: 'Manage {name}',
  },
  presetName: {
    id: 'skills.preset-name',
    defaultMessage: 'Preset name',
  },
  rename: {
    id: 'skills.rename',
    defaultMessage: 'Rename',
  },
  includedInPreset: {
    id: 'skills.included-in-preset',
    defaultMessage: 'Included in {name}',
  },
  confirmPresetChange: {
    id: 'skills.confirm-preset-change',
    defaultMessage: 'Confirm preset change',
  },
  includeDependencies: {
    id: 'skills.include-dependencies',
    defaultMessage: 'Also include these required skills:',
  },
  removeDependants: {
    id: 'skills.remove-dependants',
    defaultMessage: 'Also remove these dependent skills:',
  },
  affectedSkills: {
    id: 'skills.affected-skills',
    defaultMessage: 'Skills affected by this change',
  },
  confirm: {
    id: 'skills.confirm',
    defaultMessage: 'Confirm',
  },
  cancel: {
    id: 'skills.cancel',
    defaultMessage: 'Cancel',
  },
  presetChangeFailed: {
    id: 'skills.preset-change-failed',
    defaultMessage: 'The preset was not changed. Try again.',
  },
  exportPreset: {
    id: 'skills.export-preset',
    defaultMessage: 'Export',
  },
  exportPresetHelp: {
    id: 'skills.export-preset-help',
    defaultMessage: 'Create a string you can save or share.',
  },
  createExport: {
    id: 'skills.create-export',
    defaultMessage: 'Create export',
  },
  exportText: {
    id: 'skills.export-text',
    defaultMessage: 'Preset export string',
  },
  copy: {
    id: 'skills.copy',
    defaultMessage: 'Copy',
  },
  paste: {
    id: 'skills.paste',
    defaultMessage: 'Paste',
  },
  copied: {
    id: 'skills.copied',
    defaultMessage: 'Copied',
  },
  importPreset: {
    id: 'skills.import-preset',
    defaultMessage: 'Import',
  },
  importPresetHelp: {
    id: 'skills.import-preset-help',
    defaultMessage: 'Paste a preset string and review it before replacing this preset.',
  },
  importText: {
    id: 'skills.import-text',
    defaultMessage: 'Preset import string',
  },
  importPlaceholder: {
    id: 'skills.import-placeholder',
    defaultMessage: 'Paste preset string',
  },
  previewImport: {
    id: 'skills.preview-import',
    defaultMessage: 'Preview import',
  },
  replacePreset: {
    id: 'skills.replace-preset',
    defaultMessage: 'Replace {name}?',
  },
  confirmImport: {
    id: 'skills.confirm-import',
    defaultMessage: 'Replace preset',
  },
  presetTransferFailed: {
    id: 'skills.preset-transfer-failed',
    defaultMessage: 'The preset string could not be processed. Check it and try again.',
  },
  nonRefundable: {
    id: 'skills.non-refundable',
    defaultMessage: 'Allow automatic assignment of non-refundable skills',
  },
  reset: {
    id: 'skills.reset',
    defaultMessage: 'Reset refundable skills',
  },
  resetWarning: {
    id: 'skills.reset-warning',
    defaultMessage:
      'Refunds all currently refundable skills and clears automatic assignment.',
  },
})
