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
      '{count, plural, one {# queued skill} other {# queued skills}} · {workers}% Workers',
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
