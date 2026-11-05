import type { InfinityChallengeState } from '../../../game-state/types'
import type { MessageDescriptor } from 'react-intl'
import { challengeMessages as messages } from './challengeMessages'

export const challengePresentation = {
  'blank-slate': { name: messages.blankSlate, description: messages.description },
  'trial-and-error': { name: messages.trialAndError, description: messages.trialDescription },
  'no-science': { name: messages.noScience, description: messages.noScienceDescription },
  'short-circuit': { name: messages.shortCircuit, description: messages.shortCircuitDescription },
  'grounded': { name: messages.grounded, description: messages.groundedDescription },
  'built-by-hand': { name: messages.builtByHand, description: messages.builtByHandDescription },
  'hands-off': { name: messages.handsOff, description: messages.handsOffDescription },
  'commitment-issues': { name: messages.commitmentIssues, description: messages.commitmentIssuesDescription },
  'supply-shortage': { name: messages.supplyShortage, description: messages.supplyShortageDescription },
} as const satisfies Record<NonNullable<InfinityChallengeState['active']>, {
  readonly name: MessageDescriptor
  readonly description: MessageDescriptor
}>
