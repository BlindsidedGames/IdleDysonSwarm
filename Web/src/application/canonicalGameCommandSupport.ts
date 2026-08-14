import type { CanonicalGameCommandKind } from './canonicalGameCommands'

export interface CanonicalGameCommandSupport {
  readonly supported: boolean
  readonly authority: string
  readonly requires?: readonly (
    | 'compatibility-tuning'
    | 'quantum-leap-port'
    | 'runtime-evaluation-port'
    | 'selected-skill-preset-carrier'
    | 'stored-time-commit-first-runner'
    | 'stored-time-cheater-carrier'
  )[]
}

export const CANONICAL_GAME_COMMAND_SUPPORT = Object.freeze({
  'dyson.purchase-basic-facility': { supported: true, authority: 'tryPurchaseCanonicalBasicFacility', requires: ['runtime-evaluation-port'] },
  'dyson.purchase-mega-structure': { supported: true, authority: 'tryPurchaseCanonicalMegaStructure', requires: ['runtime-evaluation-port'] },
  'dyson.run-automation': { supported: true, authority: 'runCanonicalDysonAutomation', requires: ['runtime-evaluation-port'] },
  'dyson.set-buy-mode': { supported: true, authority: 'canonical Dyson buy-mode setting transaction' },
  'dyson.set-rounded-bulk-buy': { supported: true, authority: 'canonical Dyson rounded-bulk setting transaction' },
  'dyson.set-facility-automation': { supported: true, authority: 'canonical unlock-aware facility automation setting' },
  'dyson.set-bot-distribution': { supported: true, authority: 'canonical Unity-rounded bot-distribution setting', requires: ['selected-skill-preset-carrier', 'runtime-evaluation-port'] },
  'research.purchase': { supported: true, authority: 'purchaseCanonicalResearch', requires: ['compatibility-tuning', 'runtime-evaluation-port'] },
  'research.run-automation': { supported: true, authority: 'runResearchAutomationTick', requires: ['compatibility-tuning', 'runtime-evaluation-port'] },
  'research.set-buy-mode': { supported: true, authority: 'canonical research buy-mode setting transaction' },
  'research.set-rounded-bulk-buy': { supported: true, authority: 'canonical research rounded-bulk setting transaction' },
  'research.set-automation': { supported: true, authority: 'canonical unlock-aware research automation setting' },
  'skill.purchase': { supported: true, authority: 'purchaseCanonicalSkill', requires: ['runtime-evaluation-port'] },
  'skill.refund': { supported: true, authority: 'refundCanonicalSkill', requires: ['runtime-evaluation-port'] },
  'skill.set-auto-assignment': { supported: true, authority: 'canonical dependency-safe active assignment queue', requires: ['selected-skill-preset-carrier'] },
  'skill.set-preset-assignment': { supported: true, authority: 'canonical dependency-safe preset assignment queue' },
  'skill.set-preset-bot-distribution': { supported: true, authority: 'canonical preset bot-distribution setting' },
  'skill.rename-preset': { supported: true, authority: 'canonical preset-name setting' },
  'skill.set-preset-color': { supported: true, authority: 'canonical preset-color setting' },
  'skill.select-preset': { supported: true, authority: 'resetCanonicalSkills plus runCanonicalSkillAutoAssignment', requires: ['selected-skill-preset-carrier', 'runtime-evaluation-port'] },
  'skill.add-to-current-preset': { supported: true, authority: 'canonical dependency-closure preset queue transaction', requires: ['selected-skill-preset-carrier'] },
  'skill.remove-from-current-preset': { supported: true, authority: 'canonical queued-dependent cascade preset transaction', requires: ['selected-skill-preset-carrier'] },
  'skill.import-preset': { supported: true, authority: 'canonical validated Unity v1 preset import transaction', requires: ['selected-skill-preset-carrier', 'runtime-evaluation-port'] },
  'skill.set-tab-preset-automation': { supported: true, authority: 'canonical persisted tab preset automation setting', requires: ['selected-skill-preset-carrier', 'runtime-evaluation-port'] },
  'skill.apply-tab-preset-automation': { supported: true, authority: 'canonical tab-open preset selection transaction', requires: ['selected-skill-preset-carrier', 'runtime-evaluation-port'] },
  'skill.set-auto-assign-non-refundable': { supported: true, authority: 'canonical auto-assignment preference setting' },
  'skill.reset': { supported: true, authority: 'resetCanonicalSkills', requires: ['runtime-evaluation-port'] },
  'skill.run-auto-assignment': { supported: true, authority: 'runCanonicalSkillAutoAssignment', requires: ['runtime-evaluation-port'] },
  'dream.purchase-foundational': { supported: true, authority: 'purchaseDreamFoundationalInformation', requires: ['runtime-evaluation-port'] },
  'dream.purchase-space-age': { supported: true, authority: 'purchaseDreamSpaceAge', requires: ['runtime-evaluation-port'] },
  'dream.purchase-upgrade': { supported: true, authority: 'purchaseSimulationUpgrade', requires: ['runtime-evaluation-port'] },
  'dream.start-education': { supported: true, authority: 'startDreamEducation', requires: ['runtime-evaluation-port'] },
  'dream.request-reset': { supported: true, authority: 'applyCanonicalDreamReset', requires: ['runtime-evaluation-port'] },
  'dream.request-black-hole-reset': { supported: true, authority: 'applyCanonicalBlackHoleReset', requires: ['runtime-evaluation-port'] },
  'reality.purchase-upgrade': { supported: true, authority: 'purchaseRealityUpgrade', requires: ['runtime-evaluation-port'] },
  'reality.gather-influence': { supported: true, authority: 'gatherRealityInfluence', requires: ['runtime-evaluation-port'] },
  'quantum.purchase-upgrade': { supported: true, authority: 'purchaseQuantumUpgradeBulk', requires: ['runtime-evaluation-port'] },
  'quantum.request-leap': { supported: true, authority: 'injected canonical Quantum Leap event-model boundary', requires: ['quantum-leap-port', 'runtime-evaluation-port'] },
  'infinity.set-break-target': { supported: true, authority: 'canonical queued Break-target setting' },
  'infinity.purchase-shop-item': { supported: true, authority: 'purchaseCanonicalInfinityShopItem', requires: ['runtime-evaluation-port'] },
  'avocado.feed': { supported: true, authority: 'feedAllToAvocado', requires: ['runtime-evaluation-port'] },
  'avocado.complete-meditation-step': { supported: true, authority: 'completeCanonicalAvocadoMeditationStep', requires: ['runtime-evaluation-port'] },
  'time.set-double-time-rate': { supported: true, authority: 'clampDoubleTimeRate plus canonical timeline carrier' },
  'time.upgrade-stored-capacity': { supported: true, authority: 'upgradeStoredTimeCapacity', requires: ['stored-time-cheater-carrier'] },
  'time.request-stored-time-spend': { supported: true, authority: 'canonical commit-first stored-time spend intent', requires: ['stored-time-commit-first-runner'] },
  'settings.set-navigation-item-visible': { supported: true, authority: 'canonical persisted menu shortcut preference' },
} as const satisfies Readonly<Record<CanonicalGameCommandKind, CanonicalGameCommandSupport>>)

export const CANONICAL_GAME_COMMAND_KINDS = Object.freeze(
  Object.keys(CANONICAL_GAME_COMMAND_SUPPORT) as CanonicalGameCommandKind[],
)
