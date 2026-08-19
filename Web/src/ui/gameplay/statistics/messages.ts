import { defineMessages } from 'react-intl'

export const statisticsMessages = defineMessages({
  region: {
    id: 'statistics.region',
    defaultMessage: 'Statistics',
    description: 'Accessible name for the Statistics route.',
  },
  trackingNotice: {
    id: 'statistics.tracking-notice',
    defaultMessage:
      'Statistics have been tracked since this feature was added.',
    description:
      'Explains that historical saves only contain statistics recorded by the new tracker.',
  },
  trackedTime: {
    id: 'statistics.tracked-time',
    defaultMessage: 'Tracked simulation time',
    description: 'Label for total canonical simulated time tracked.',
  },
  lifetime: {
    id: 'statistics.scope.lifetime',
    defaultMessage: 'Lifetime',
    description: 'Statistics accumulated across the entire save.',
  },
  currentQuantumRun: {
    id: 'statistics.scope.quantum-run',
    defaultMessage: 'Current Quantum run',
    description: 'Statistics accumulated since the latest Quantum Leap.',
  },
  none: {
    id: 'statistics.none',
    defaultMessage: 'None',
    description: 'Empty state for a reached statistics group with no recorded activity.',
  },
  infinity: {
    id: 'statistics.group.infinity',
    defaultMessage: 'Infinity',
    description: 'Heading for Infinity statistics.',
  },
  simulations: {
    id: 'statistics.group.simulations',
    defaultMessage: 'Simulations',
    description: 'Heading for Simulation reset statistics.',
  },
  reality: {
    id: 'statistics.group.reality',
    defaultMessage: 'Reality',
    description: 'Heading for Reality statistics.',
  },
  simulatedTime: {
    id: 'statistics.metric.simulated-time',
    defaultMessage: 'Simulated time',
    description: 'Amount of game simulation time processed.',
  },
  capacityStallTime: {
    id: 'statistics.metric.capacity-stall-time',
    defaultMessage: 'Reality capacity stalled',
    description: 'Time Reality workers spent blocked at capacity.',
  },
  totalInfinities: {
    id: 'statistics.metric.total-infinities',
    defaultMessage: 'Infinities',
    description: 'Combined count of ordinary and Break Infinity resets.',
  },
  meteorResets: {
    id: 'statistics.metric.meteor-resets',
    defaultMessage: 'Meteor resets',
    description: 'Dream resets caused by the Meteor simulation.',
  },
  aiResets: {
    id: 'statistics.metric.ai-resets',
    defaultMessage: 'Artificial Intelligence resets',
    description: 'Dream resets caused by the Artificial Intelligence simulation.',
  },
  globalWarmingResets: {
    id: 'statistics.metric.global-warming-resets',
    defaultMessage: 'Global Warming resets',
    description: 'Dream resets caused by the Global Warming simulation.',
  },
  blackHoleResets: {
    id: 'statistics.metric.black-hole-resets',
    defaultMessage: 'Black Hole resets',
    description: 'Dream resets caused by the Black Hole simulation.',
  },
  strangeMatter: {
    id: 'statistics.metric.strange-matter',
    defaultMessage: 'Strange Matter earned',
    description: 'Total Strange Matter earned from Simulation resets.',
  },
  realityWorkers: {
    id: 'statistics.metric.reality-workers',
    defaultMessage: 'Reality workers created',
    description: 'Total Reality workers created.',
  },
  automaticInfluence: {
    id: 'statistics.metric.automatic-influence',
    defaultMessage: 'Influence gathered automatically',
    description: 'Influence gathered by Reality automation.',
  },
  manualInfluence: {
    id: 'statistics.metric.manual-influence',
    defaultMessage: 'Influence gathered manually',
    description: 'Influence gathered by the player.',
  },
  recentActivity: {
    id: 'statistics.recent-activity',
    defaultMessage: 'Recent activity',
    description: 'Heading for rolling canonical statistics windows.',
  },
  lastHour: {
    id: 'statistics.window.last-hour',
    defaultMessage: 'Last 60 minutes',
    description: 'Title for the minute-bucket statistics horizon.',
  },
  lastDay: {
    id: 'statistics.window.last-day',
    defaultMessage: 'Last 24 hours',
    description: 'Title for the half-hour-bucket statistics horizon.',
  },
  lastThirtyDays: {
    id: 'statistics.window.last-thirty-days',
    defaultMessage: 'Last 30 days',
    description: 'Title for the daily-bucket statistics horizon.',
  },
  infinityResets: {
    id: 'statistics.metric.infinity-resets',
    defaultMessage: 'Infinity resets',
    description: 'Combined ordinary and Break Infinity reset count.',
  },
  infinityPoints: {
    id: 'statistics.metric.infinity-points',
    defaultMessage: 'Infinity Points earned',
    description: 'Combined Infinity Point rewards.',
  },
  dreamResets: {
    id: 'statistics.metric.dream-resets',
    defaultMessage: 'Simulation resets',
    description: 'Combined Simulation reset count.',
  },
  lastCompletedCycle: {
    id: 'statistics.last-cycle',
    defaultMessage: 'Last completed cycle',
    description: 'Heading for the most recent Infinity or Simulation cycle.',
  },
  noCompletedCycle: {
    id: 'statistics.last-cycle.empty',
    defaultMessage: 'No completed cycle has been recorded yet.',
    description: 'Empty state before the first tracked cycle.',
  },
  cycleType: {
    id: 'statistics.last-cycle.type',
    defaultMessage: 'Cycle type',
    description: 'Label for the last completed cycle type.',
  },
  cycleOrdinaryInfinity: {
    id: 'statistics.last-cycle.ordinary-infinity',
    defaultMessage: 'Ordinary Infinity',
    description: 'Ordinary Infinity cycle type.',
  },
  cycleBreakInfinity: {
    id: 'statistics.last-cycle.break-infinity',
    defaultMessage: 'Break Infinity',
    description: 'Break Infinity cycle type.',
  },
  cycleSimulationReset: {
    id: 'statistics.last-cycle.simulation-reset',
    defaultMessage: 'Simulation reset',
    description: 'Simulation reset cycle type.',
  },
  cycleDuration: {
    id: 'statistics.last-cycle.duration',
    defaultMessage: 'Duration',
    description: 'Duration of the last completed cycle.',
  },
  cycleReward: {
    id: 'statistics.last-cycle.reward',
    defaultMessage: 'Reward',
    description: 'Reward from the last completed cycle.',
  },
  resetCause: {
    id: 'statistics.last-cycle.reset-cause',
    defaultMessage: 'Reset cause',
    description: 'Simulation reset cause attached to the last cycle.',
  },
  causeMeteor: {
    id: 'statistics.cause.meteor',
    defaultMessage: 'Meteor',
    description: 'Meteor Simulation reset cause.',
  },
  causeArtificialIntelligence: {
    id: 'statistics.cause.artificial-intelligence',
    defaultMessage: 'Artificial Intelligence',
    description: 'Artificial Intelligence Simulation reset cause.',
  },
  causeGlobalWarming: {
    id: 'statistics.cause.global-warming',
    defaultMessage: 'Global Warming',
    description: 'Global Warming Simulation reset cause.',
  },
  causeBlackHole: {
    id: 'statistics.cause.black-hole',
    defaultMessage: 'Black Hole',
    description: 'Black Hole Simulation reset cause.',
  },
})
