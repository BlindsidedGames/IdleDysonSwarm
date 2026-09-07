import { defineMessages } from 'react-intl'

export const skillMessages = defineMessages({
  augmentsAssigned: { id: "skills.augments-assigned", defaultMessage: "Assigned augments: {complete}/{total}", description: "Owned optional augments out of the total available on a galvanized skill." },
  priorityRemove: { id: "skills.priority-remove", defaultMessage: "Remove {name} from preset", description: "Remove a queued skill and its dependent skills from the preset." },
  editPriority: { id: "skills.edit-priority", defaultMessage: "Edit priority", description: "Skill priority editor and subskill controls." },
  priorityTitle: { id: "skills.priority-title", defaultMessage: "Priority \u00b7 {name}", description: "Skill priority editor and subskill controls." },
  backToPresets: { id: "skills.back-to-presets", defaultMessage: "Back to presets", description: "Skill priority editor and subskill controls." },
  priorityEmpty: { id: "skills.priority-empty", defaultMessage: "No skills queued for spending.", description: "Skill priority editor and subskill controls." },
  permanentPresetHelp: { id: "skills.permanent-preset-help", defaultMessage: "Always active in every preset. These base skills spend no points.", description: "Skill priority editor and subskill controls." },
  subskillCost: { id: "skills.subskill-cost", defaultMessage: "1 Skill Point", description: "Skill priority editor and subskill controls." },
  priorityNonRefundable: { id: "skills.priority-non-refundable", defaultMessage: "Non-refundable", description: "Skill priority editor and subskill controls." },

  galvPowerTaste: { id: "skills.galvPowerTaste", defaultMessage: "Assembly Lines, AI Managers, Servers, Data Centers and Planets are 50% stronger.", description: "Effective skill benefit after galvanization." },
  galvPowerIndulging: { id: "skills.galvPowerIndulging", defaultMessage: "Assembly Lines, AI Managers, Servers, Data Centers and Planets are 100% stronger.", description: "Effective skill benefit after galvanization." },
  galvPowerAddiction: { id: "skills.galvPowerAddiction", defaultMessage: "Assembly Lines, AI Managers, Servers, Data Centers and Planets are 200% stronger.", description: "Effective skill benefit after galvanization." },
  galvAlgorithms: { id: "skills.galvAlgorithms", defaultMessage: "Servers, AI Managers and Assembly Lines are 3× stronger.", description: "Effective skill benefit after galvanization." },
  galvBurnout: { id: "skills.galvBurnout", defaultMessage: "Triple panel production.", description: "Effective skill benefit after galvanization." },
  galvColdFusion: { id: "skills.galvColdFusion", defaultMessage: "10× Science production.", description: "Effective skill benefit after galvanization." },
  galvCables: { id: "skills.galvCables", defaultMessage: "5× as many Data Centers from Pocket Dimensions.", description: "Effective skill benefit after galvanization." },
  galvEconomic: { id: "skills.galvEconomic", defaultMessage: "20× Cash production.", description: "Effective skill benefit after galvanization." },
  galvEndLine: { id: "skills.galvEndLine", defaultMessage: "5× Bot production from Assembly Lines.", description: "Effective skill benefit after galvanization." },
  galvFusion: { id: "skills.galvFusion", defaultMessage: "5× Panel production.", description: "Effective skill benefit after galvanization." },
  galvScientific: { id: "skills.galvScientific", defaultMessage: "20× Science production.", description: "Effective skill benefit after galvanization." },
  galvPrecursors: { id: "skills.galvPrecursors", defaultMessage: "Science multipliers also multiply Cash production, alongside existing Cash multipliers.", description: "Effective skill benefit after galvanization." },
  galvStellarDominance: { id: "skills.galvStellarDominance", defaultMessage: "10× Panel Lifetime while the normal Bot requirement is met, without the extra sacrifice cost or Cash penalty.", description: "Effective skill benefit after galvanization." },
  galvStellarObliteration: { id: "skills.galvStellarObliteration", defaultMessage: "Stellar Sacrifices Galaxies are 1000× better.", description: "Effective skill benefit after galvanization." },
  galvSupernova: { id: "skills.galvSupernova", defaultMessage: "Stellar Sacrifices Galaxies are 1000× better. All manual-purchase production bonuses remain active.", description: "Effective skill benefit after galvanization." },
  galvWorthy: { id: "skills.galvWorthy", defaultMessage: "Assembly Lines are 5× as effective.", description: "Effective skill benefit after galvanization." },
  galvSacrifices: { id: "skills.galvSacrifices", defaultMessage: "Create Planets each second equal to log10(Stellar Galaxies Engulfed)², without consuming or requiring Bots.", description: "Effective skill benefit after galvanization." },
  galvEnlightened: { id: "skills.galvEnlightened", defaultMessage: "Scientific Planets also produce Cash Boosts.", description: "Effective skill benefit after galvanization." },
  subskillInclude: { id: "skills.subskill-include", defaultMessage: "Include {name} in {preset}", description: "Accessible subskill preset checkbox label." },
  galvanized: { id: "skills.galvanized", defaultMessage: "Galvanized", description: "Galvanization skill details interface." },
  galvanizedPermanent: { id: "skills.galvanized-permanent", defaultMessage: "Galvanized \u00b7 permanently active", description: "Galvanization skill details interface." },
  galvanizedHelp: { id: "skills.galvanized-help", defaultMessage: "This base skill is permanently active and costs no Skill Points. Its penalties and exclusions are removed. Normal conditions and timer resets still apply.", description: "Galvanization skill details interface." },
  galvanizeAction: { id: "skills.galvanize-action", defaultMessage: "Galvanize \u00b7 {currency}", description: "Galvanization skill details interface." },
  galvanizeWarning: { id: "skills.galvanize-warning", defaultMessage: "Permanently galvanize {name} for 1 Galvanizer? Any Skill Points invested in this base skill are returned. This cannot be undone.", description: "Galvanization skill details interface." },
  confirmGalvanize: { id: "skills.confirm-galvanize", defaultMessage: "Spend 1 Galvanizer", description: "Galvanization skill details interface." },
  subskills: { id: "skills.subskills", defaultMessage: "Augments", description: "Galvanization skill details interface." },
  subskillsHelp: { id: "skills.subskills-help", defaultMessage: "Each costs 1 Skill Point; you can take all three. Checkboxes add them to the preset. Augments reset and refund normally.", description: "Galvanization skill details interface." },
  subskillLifetime: { id: "skills.subskill-lifetime", defaultMessage: "+5 seconds Panel Lifetime", description: "Galvanization skill details interface." },
  subskillDecay: { id: "skills.subskill-decay", defaultMessage: "Each decayed panel counts as 10", description: "Galvanization skill details interface." },
  subskillProduction: { id: "skills.subskill-production", defaultMessage: "2\u00d7 Cash and Science production", description: "Galvanization skill details interface." },
  subskillAssign: { id: "skills.subskill-assign", defaultMessage: "Assign {name} for 1 Skill Point", description: "Galvanization skill details interface." },
  subskillRefund: { id: "skills.subskill-refund", defaultMessage: "Refund {name} for 1 Skill Point", description: "Galvanization skill details interface." },
  subskillAssignShort: { id: "skills.subskill-assign-short", defaultMessage: "Assign", description: "Galvanization skill details interface." },
  subskillRefundShort: { id: "skills.subskill-refund-short", defaultMessage: "Refund", description: "Galvanization skill details interface." },
  spendingPriority: {
    id: 'skills.spending-priority',
    defaultMessage: 'Spending priority',
    description: 'Expandable ordered skill list inside each preset.',
  },
  spendingPriorityHelp: {
    id: 'skills.spending-priority-help',
    defaultMessage: 'Drag to reorder or use the arrows. Required skills are bought first. Points are saved until the next skill can be afforded.',
    description: 'Explains strict skill preset purchase priority.',
  },
  priorityMoveUp: {
    id: 'skills.priority-move-up',
    defaultMessage: 'Move {name} up',
    description: 'Accessible button label to raise a skill spending priority.',
  },
  priorityMoveDown: {
    id: 'skills.priority-move-down',
    defaultMessage: 'Move {name} down',
    description: 'Accessible button label to lower a skill spending priority.',
  },

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
  pointsLabel: {
    id: 'skills.points-label',
    defaultMessage: 'Skill Points',
    description: 'Screen-reader label for the compact Skill Points value.',
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
  clearSearch: {
    id: 'skills.clear-search',
    defaultMessage: 'Clear skill search',
    description: 'Accessible label for clearing the skill-tree search field.',
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
    defaultMessage: 'Requirements: {complete}/{total}',
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
  purchasePointImpact: {
    id: 'skills.purchase-point-impact',
    defaultMessage: 'Will cost {value} Skill Points',
    description:
      'Exact skill-point total that assigning the selected skill will spend.',
  },
  purchasePointAction: {
    id: 'skills.purchase-point-action',
    defaultMessage: 'Assign Skill. Will cost {value} Skill Points',
    description:
      'Accessible label for assigning a skill with its exact skill-point cost.',
  },
  refund: {
    id: 'skills.refund',
    defaultMessage: 'Unassign Skill',
    description: 'Button label for refunding and unassigning an owned skill.',
  },
  refundPointImpact: {
    id: 'skills.refund-point-impact',
    defaultMessage: 'Will refund {value} Skill Points',
    description:
      'Canonical total skill points returned when unassigning the selected skill and any affected dependants.',
  },
  refundPointAction: {
    id: 'skills.refund-point-action',
    defaultMessage: 'Unassign Skill. Will refund {value} Skill Points',
    description:
      'Accessible label for unassigning a skill with its canonical total skill-point refund.',
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
  switchPreset: {
    id: 'skills.switch-preset',
    defaultMessage: 'Switch to {name}',
    description: 'Accessible label for the compact skill preset switcher.',
  },
  switchPresetConflictTitle: {
    id: 'skills.switch-preset-conflict-title',
    defaultMessage: 'Switch to {name}?',
    description:
      'Confirmation title when retained skills block part of a target preset.',
  },
  switchPresetConflictWarning: {
    id: 'skills.switch-preset-conflict-warning',
    defaultMessage:
      'Some skills can’t be unassigned right now and block part of this preset. You can still switch and apply everything compatible.',
    description:
      'Warning before partially applying a preset around retained unrefundable skills.',
  },
  presetPartiallyAppliedTitle: {
    id: 'skills.preset-partially-applied-title',
    defaultMessage: '{name} is partially applied',
    description:
      'Persistent status title for a preset constrained by retained skills.',
  },
  presetPartiallyAppliedDetails: {
    id: 'skills.preset-partially-applied-details',
    defaultMessage:
      'Unrefundable skills could not be unassigned. These preset skills are blocked and remain queued for later.',
    description:
      'Persistent explanation above the named preset skills blocked by retained skills.',
  },
  dismiss: {
    id: 'skills.dismiss',
    defaultMessage: 'Dismiss',
    description: 'Button label for dismissing a preset application result.',
  },
  retainedSkillsHeading: {
    id: 'skills.retained-skills-heading',
    defaultMessage: 'Skills that will remain assigned',
    description:
      'Heading above unrefundable skills retained while changing presets.',
  },
  blockedSkillsHeading: {
    id: 'skills.blocked-skills-heading',
    defaultMessage: 'Preset skills blocked for now',
    description:
      'Heading above target preset skills blocked by retained ownership.',
  },
  switchAnyway: {
    id: 'skills.switch-anyway',
    defaultMessage: 'Switch anyway',
    description:
      'Button label for applying every compatible part of a conflicting preset.',
  },
  currentPreset: {
    id: 'skills.current-preset',
    defaultMessage: 'Current',
    description: 'Status marking the currently active skill preset.',
  },
  presetSummary: {
    id: 'skills.preset-summary',
    defaultMessage: '{count, plural, one {# queued skill} other {# queued skills}}',
    description: 'Queued-skill summary shown on its own line for one Skill preset.',
  },
  presetDistribution: {
    id: 'skills.preset-distribution',
    defaultMessage: '<workerValue>{workers}% Workers</workerValue> · <scientistValue>{scientists}% Scientists</scientistValue>',
    description: 'Worker and Scientist distribution shown beneath the queued-skill summary for one Skill preset.',
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
  confirmSkillChange: {
    id: 'skills.confirm-skill-change',
    defaultMessage: 'Confirm skill change',
    description:
      'Accessible heading for reviewing a cascading skill assignment or refund.',
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
  assignDependencies: {
    id: 'skills.assign-dependencies',
    defaultMessage: 'Also assign these required skills:',
    description:
      'Heading for prerequisite skills that will be assigned with the selected skill.',
  },
  unassignDependants: {
    id: 'skills.unassign-dependants',
    defaultMessage: 'Also unassign these dependent skills:',
    description:
      'Heading for dependent skills that will be unassigned with the selected skill.',
  },
  affectedSkills: {
    id: 'skills.affected-skills',
    defaultMessage: 'Skills affected by this change',
    description:
      'Accessible label for skills changed by a cascading Skills action.',
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
  impactSkillPoints: {
    id: 'skills.impact.skill-points',
    defaultMessage: 'Skill Points',
    description: 'Skill Points row label in a skill-change consequence preview.',
  },
  impactCashScience: {
    id: 'skills.impact.cash-science',
    defaultMessage: 'Cash & Science',
    description: 'Combined Cash and Science row label in a skill consequence preview.',
  },
  impactBots: {
    id: 'skills.impact.bots',
    defaultMessage: 'Bots',
    description: 'Bots row label in a skill consequence preview.',
  },
  impactEverything: {
    id: 'skills.impact.everything',
    defaultMessage: 'Everything',
    description: 'Everything multiplier row label in a skill consequence preview.',
  },
  impactTo: {
    id: 'skills.impact.to',
    defaultMessage: 'to',
    description: 'Screen-reader connector between before and after values.',
  },
  supernovaSuppressionQuote: {
    id: 'skills.supernova-suppression-quote',
    defaultMessage:
      'Supernova suppresses the complete manual-purchase layer: Avocados, both 50/100 milestones, Production Scaling, and every Swarm rate.',
    description:
      'Exact warning before purchasing Supernova.',
  },
  supernovaRestorationQuote: {
    id: 'skills.supernova-restoration-quote',
    defaultMessage:
      'Refunding Supernova restores the complete manual-purchase layer: Avocados, both 50/100 milestones, Production Scaling, and every Swarm rate.',
    description:
      'Exact warning before refunding Supernova.',
  },
  importLockedQueued: {
    id: 'skills.import-locked-queued',
    defaultMessage:
      '{count, plural, one {# locked skill will remain queued until its line unlocks.} other {# locked skills will remain queued until their lines unlock.}}',
    description:
      'Preset import warning explaining that gated skills stay queued without spending points.',
  },
  importRetainedConflict: {
    id: 'skills.import-retained-conflict',
    defaultMessage:
      '{retainedCount, plural, one {# unrefundable skill will remain assigned} other {# unrefundable skills will remain assigned}} and block {blockedCount, plural, one {# imported skill for now} other {# imported skills for now}}. The compatible part of the preset will still be applied.',
    description:
      'Preset import confirmation warning for conflicts with retained skills.',
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
  doubleClickToAssign: {
    id: 'skills.double-click-to-assign',
    defaultMessage: 'Double-click to assign skills',
    description:
      'Optional Skill Tree interaction that delays opening details so a double click or double tap can assign a skill.',
  },
  showPresetApplicationNotifications: {
    id: 'skills.show-preset-application-notifications',
    defaultMessage: 'Show partial preset application notifications',
    description:
      'Presentation preference controlling post-switch partial preset application notices.',
  },
  reset: {
    id: 'skills.reset',
    defaultMessage: 'Reset Skills',
    description: 'Button label for refunding every currently refundable skill.',
  },
  resetWarning: {
    id: 'skills.reset-warning',
    defaultMessage: 'Resets all refundable skills',
    description: 'Warning explaining the effects of resetting refundable skills.',
  },
  resetRefundedHeading: {
    id: 'skills.reset-refunded-heading',
    defaultMessage: 'Skills that will be refunded',
    description: 'Heading above refundable skills in the reset confirmation.',
  },
  resetRetainedHeading: {
    id: 'skills.reset-retained-heading',
    defaultMessage: 'Skills that won’t be refunded',
    description: 'Heading above retained skills in the reset confirmation.',
  },
  resetQueuedHeading: {
    id: 'skills.reset.queued-heading',
    defaultMessage: 'Removed from auto-assignment',
    description: 'Heading for queued skills cleared by a skill reset.',
  },
  none: {
    id: 'skills.none',
    defaultMessage: 'None',
    description: 'Empty state for a Skills reset confirmation list.',
  },
})
