import { defineMessages } from 'react-intl'

export const infinityMessages = defineMessages({
  region: {
    id: 'infinity.region',
    defaultMessage: 'Infinity',
    description: 'Accessible name for the Unity Infinity route.',
  },
  pointsLabel: {
    id: 'infinity.points.label',
    defaultMessage: 'Infinity Points:',
    description:
      'Unity label preceding the available and parenthesized spent Infinity Point values.',
  },
  spentParenthetical: {
    id: 'infinity.points.spent-parenthetical',
    defaultMessage: '({value})',
    description:
      'Unity parenthesized spent Infinity Point value shown after available points.',
  },
  secretPhrase: {
    id: 'infinity.secret-phrase',
    defaultMessage: '{phrase}',
    description: 'Partially revealed Secret of the Universe phrase.',
  },
  secretPhraseFull: {
    id: 'infinity.secret-phrase.full',
    defaultMessage:
      'The meaning of life is: Love, Family, and Incrementals',
    description:
      'Full Secret of the Universe phrase; unrevealed letters are masked by the Infinity surface.',
  },
  ordinaryProgress: {
    id: 'infinity.progress.ordinary',
    defaultMessage: 'Progress to Infinity',
    description: 'Unity heading for ordinary Infinity progress.',
  },
  breakProgressAccessible: {
    id: 'infinity.progress.break-accessible',
    defaultMessage: 'Progress to {target} Infinity Points',
    description:
      'Accessible label for automatic Break Infinity target progress.',
  },
  progressPercent: {
    id: 'infinity.progress.percent',
    defaultMessage: '{value}%',
    description: 'Infinity progress as a percentage.',
  },
  botsUntilNextPoint: {
    id: 'infinity.progress.bots-until-next',
    defaultMessage: '{value} Bots till next Infinity Point',
    description: 'Canonical remaining bot count for the next Infinity Point.',
  },
  realityWarning: {
    id: 'infinity.progress.reality-warning',
    defaultMessage: 'Warning Reality Break imminent!',
    description: 'Unity warning near the first ordinary Infinity boundary.',
  },
  settings: {
    id: 'infinity.settings',
    defaultMessage: 'Infinity settings',
    description: 'Accessible label for the Infinity progress settings button.',
  },
  automaticReset: {
    id: 'infinity.automatic-reset',
    defaultMessage: 'Auto Infinity',
    description: 'Label for the automatic Infinity reset toggle.',
  },
  automaticResetOn: {
    id: 'infinity.automatic-reset.on',
    defaultMessage: 'On',
    description: 'Enabled state for automatic Infinity resets.',
  },
  automaticResetOff: {
    id: 'infinity.automatic-reset.off',
    defaultMessage: 'Off',
    description: 'Disabled state for automatic Infinity resets.',
  },
  automaticResetFailed: {
    id: 'infinity.automatic-reset.failed',
    defaultMessage: 'The Auto Infinity setting was not changed.',
    description: 'Failure feedback for a rejected Auto Infinity setting.',
  },
  manualReset: {
    id: 'infinity.manual-reset',
    defaultMessage: 'Infinity',
    description: 'Button that performs a ready manual Infinity reset.',
  },
  manualResetFailed: {
    id: 'infinity.manual-reset.failed',
    defaultMessage: 'Infinity is not ready yet.',
    description: 'Failure feedback for a rejected manual Infinity reset.',
  },
  breakTarget: {
    id: 'infinity.break-target',
    defaultMessage: 'Infinity Points before reset',
    description: 'Label for the Break Infinity reset target control.',
  },
  breakTargetValue: {
    id: 'infinity.break-target.value',
    defaultMessage: 'Target: {value} IP',
    description: 'Currently selected Break Infinity target.',
  },
  breakTargetFailed: {
    id: 'infinity.break-target.failed',
    defaultMessage: 'The Infinity target was not changed.',
    description: 'Failure feedback for a rejected Break Infinity target.',
  },
  secretTitle: {
    id: 'infinity.shop.secret.title',
    defaultMessage: 'Secret of the Universe',
    description: 'Unity Infinity secret upgrade title.',
  },
  secretDescription: {
    id: 'infinity.shop.secret.description',
    defaultMessage:
      'Through extreme concentration you peer through the fabric of reality and notice some strange writing.\n\nYou manage to reveal one of the letters..',
    description: 'Unity description for Secret of the Universe.',
  },
  permanentSkillPointTitle: {
    id: 'infinity.shop.permanent-skill-point.title',
    defaultMessage: 'Permanent Skill Point',
    description: 'Unity Infinity permanent Skill Point upgrade title.',
  },
  permanentSkillPointDescription: {
    id: 'infinity.shop.permanent-skill-point.description',
    defaultMessage:
      'Increase your skill points by 1\n\nYou can purchase up to 10 of these, just remember you also get skill points from goals.',
    description: 'Infinity permanent Skill Point upgrade description.',
  },
  researchAutomationTitle: {
    id: 'infinity.shop.research-automation.title',
    defaultMessage: 'Automate Research',
    description: 'Unity Infinity Research automation upgrade title.',
  },
  researchAutomationDescription: {
    id: 'infinity.shop.research-automation.description',
    defaultMessage:
      "If you could comprehend how this worked, you'd be the smartest person in this universe. It does however work. Brings the end of suffering.",
    description: 'Unity Research automation upgrade description.',
  },
  botAutomationTitle: {
    id: 'infinity.shop.bot-automation.title',
    defaultMessage: 'Automate Bots',
    description: 'Unity Infinity bot automation upgrade title.',
  },
  botAutomationDescription: {
    id: 'infinity.shop.bot-automation.description',
    defaultMessage:
      "You're a genius, you work out how this works. I may have created it but I hold no power here. Honestly though, good job.",
    description: 'Unity bot automation upgrade description.',
  },
  assemblyLinesTitle: {
    id: 'infinity.shop.assembly-lines.title',
    defaultMessage: 'Start with 10 Assembly Lines',
    description: 'Unity retained Assembly Lines upgrade title.',
  },
  assemblyLinesDescription: {
    id: 'infinity.shop.assembly-lines.description',
    defaultMessage:
      "Start with 10 extra manually purchased Assembly Lines. Also adds them now! This won't increase their price!",
    description: 'Unity retained Assembly Lines upgrade description.',
  },
  aiManagersTitle: {
    id: 'infinity.shop.ai-managers.title',
    defaultMessage: 'Start with 10 AI Managers',
    description: 'Unity retained AI Managers upgrade title.',
  },
  aiManagersDescription: {
    id: 'infinity.shop.ai-managers.description',
    defaultMessage:
      "As with assembly lines, this won't increase the price of AI Managers.\n\nBut it does require the previous Upgrade.",
    description: 'Unity retained AI Managers upgrade description.',
  },
  serversTitle: {
    id: 'infinity.shop.servers.title',
    defaultMessage: 'Start with 10 Servers',
    description: 'Unity retained Servers upgrade title.',
  },
  serversDescription: {
    id: 'infinity.shop.servers.description',
    defaultMessage:
      "As with assembly lines, this won't increase the price of Servers.\n\nBut it does require the previous Upgrade.",
    description: 'Unity retained Servers upgrade description.',
  },
  dataCentersTitle: {
    id: 'infinity.shop.data-centers.title',
    defaultMessage: 'Start with 10 Data Centers',
    description: 'Unity retained Data Centers upgrade title.',
  },
  dataCentersDescription: {
    id: 'infinity.shop.data-centers.description',
    defaultMessage:
      "As with assembly lines, this won't increase the price of Data Centers.\n\nBut it does require the previous Upgrade.",
    description: 'Unity retained Data Centers upgrade description.',
  },
  planetsTitle: {
    id: 'infinity.shop.planets.title',
    defaultMessage: 'Start with 10 Planets',
    description: 'Unity retained Planets upgrade title.',
  },
  planetsDescription: {
    id: 'infinity.shop.planets.description',
    defaultMessage:
      "As with assembly lines, this won't increase the price of Planets.\n\nBut it does require the previous Upgrade.",
    description: 'Unity retained Planets upgrade description.',
  },
  purchase: {
    id: 'infinity.shop.purchase',
    defaultMessage: 'Purchase',
    description: 'Infinity upgrade purchase button label.',
  },
  purchaseAccessible: {
    id: 'infinity.shop.purchase-accessible',
    defaultMessage: 'Purchase {name} for {cost} Infinity Points',
    description: 'Accessible Infinity upgrade purchase label.',
  },
  purchased: {
    id: 'infinity.shop.purchased',
    defaultMessage: 'Purchased',
    description: 'Completed Infinity upgrade button label.',
  },
  maximumReached: {
    id: 'infinity.shop.maximum-reached',
    defaultMessage: 'Maxed',
    description: 'Repeatable Infinity upgrade at its purchase limit.',
  },
  purchasedCount: {
    id: 'infinity.shop.purchased-count',
    defaultMessage: 'Purchased: {value}',
    description:
      'Unity count shown on repeatable Infinity upgrades after the first purchase.',
  },
  requires: {
    id: 'infinity.shop.requires',
    defaultMessage: 'Requires {name}',
    description: 'Unmet Infinity retained-facility prerequisite.',
  },
  purchasePending: {
    id: 'infinity.shop.purchase-pending',
    defaultMessage: 'Purchasing {name}.',
    description: 'Status while an Infinity upgrade purchase is pending.',
  },
  purchaseFailed: {
    id: 'infinity.shop.purchase-failed',
    defaultMessage: '{name} was not purchased.',
    description: 'Failure feedback for a rejected Infinity upgrade purchase.',
  },
  empty: {
    id: 'infinity.shop.empty',
    defaultMessage: 'No Infinity upgrades are currently available.',
    description: 'Safe empty state for the Infinity shop.',
  },
})
