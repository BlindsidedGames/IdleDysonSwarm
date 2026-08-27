import { defineMessages } from 'react-intl'

export const tinkerMessages = defineMessages({
  title: {
    id: 'dyson.tinker.title',
    defaultMessage: 'Tinker in your garage',
    description:
      'Visible primary title for the Unity manual-creation action.',
  },
  action: {
    id: 'dyson.tinker.action',
    defaultMessage:
      'Manually put together a new bot from parts in your shed.',
    description:
      'Exact first sentence on the default Unity manual-creation panel.',
  },
  defaultDescription: {
    id: 'dyson.tinker.description.default',
    defaultMessage:
      'There has to be a better way of going about this...',
    description:
      'Exact second sentence on the default Unity manual-creation panel.',
  },
  freshSaveTip: {
    id: 'dyson.tinker.tip.fresh-save',
    defaultMessage:
      'Tip: The tinker panel goes away after you have 10 assembly lines and 1 manager (or any data center).',
    description:
      'Exact Unity fresh-save tip explaining when the Tinker panel disappears.',
  },
  holdToRepeat: {
    id: 'dyson.tinker.hold-to-repeat',
    defaultMessage: 'Long press to repeat...',
    description: 'Long-press gesture hint inside the Tinker progress bar.',
  },
  repeating: {
    id: 'dyson.tinker.repeating',
    defaultMessage: 'Repeating',
    description: 'Tinker progress-bar status while repeat remains active.',
  },
  manualLabourDescription: {
    id: 'dyson.tinker.description.manual-labour',
    defaultMessage:
      'Having nothing better to do you decide to set up some more assembly lines. Masterfully made you will produce <value>{count}</value>.',
    description:
      'Unity manual-creation copy when Manual Labour can create assembly lines.',
  },
  blockedManualLabourDescription: {
    id: 'dyson.tinker.description.manual-labour-blocked',
    defaultMessage:
      'You have the knowledge to automate assembly lines, but without an AI Manager you still have to tinker together bots. You will produce <value>{count}</value>. (Get 1 AI Manager to unlock assembly line tinkering.)',
    description:
      'Unity manual-creation copy when Manual Labour is owned but lacks an AI Manager.',
  },
  duration: {
    id: 'dyson.tinker.duration',
    defaultMessage: '{seconds}s',
    description:
      'Canonical Tinker time in seconds. seconds is already locale-formatted.',
  },
  progress: {
    id: 'dyson.tinker.progress',
    defaultMessage: 'Tinker progress',
    description:
      'Accessible label for the canonical Tinker progress bar.',
  },
  rejectedFailure: {
    id: 'dyson.tinker.failure.rejected',
    defaultMessage: 'Tinker could not be completed.',
    description:
      'Safe feedback when the canonical runtime rejects a Tinker command.',
  },
  runtimeFailure: {
    id: 'dyson.tinker.failure.runtime',
    defaultMessage: 'Tinker is temporarily unavailable.',
    description:
      'Safe feedback when the UI runtime cannot dispatch a Tinker command.',
  },
})
