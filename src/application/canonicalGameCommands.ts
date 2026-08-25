import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../game-state/skillEffectEvaluationSnapshot'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
  CanonicalSkillPresetAutomationSlot,
  CanonicalSkillPresetSlot,
  DreamEducationId,
  DreamUpgradeFlag,
} from '../game-state/types'
import type { StoredTimeAccuracyPreset } from '../game-state/types'
import type {
  BottomNavigationDestinationId,
} from '../game-state/navigationPreferences'
import {
  DEFAULT_BOTTOM_NAVIGATION_VISIBILITY,
} from '../game-state/navigationPreferences'
import {
  defaultSkillPresetColorId,
  isSkillPresetColorId,
  type SkillPresetColorId,
} from '../game-state/skillPresetColors'
import {
  feedAllToAvocado,
  type AvocadoFeedSource,
} from '../simulation/avocadoDomain'
import {
  completeCanonicalAvocadoMeditationStep,
} from '../simulation/avocadoMeditation'
import {
  applyCanonicalBlackHoleReset,
  applyCanonicalDreamReset,
} from '../simulation/canonicalDreamReset'
import {
  runCanonicalDysonAutomation,
  tryPurchaseCanonicalBasicFacility,
  tryPurchaseCanonicalMegaStructure,
} from '../simulation/canonicalDysonCommands'
import {
  purchaseCanonicalInfinityShopItem,
  type CanonicalInfinityShopItemId,
} from '../simulation/canonicalInfinityShop'
import {
  normalizeSkillAssignment,
  parseCanonicalSkillPreset,
  previewAddSkillToPreset,
  previewRemoveSkillFromPreset,
  replaceCanonicalSkillPreset,
} from '../simulation/canonicalSkillPresetTransactions'
import {
  purchaseCanonicalSkill,
  refundCanonicalSkill,
  resetCanonicalSkills,
  runCanonicalSkillAutoAssignment,
} from '../simulation/canonicalSkillTransactions'
import {
  purchaseSimulationUpgrade,
  startDreamEducation,
} from '../simulation/dreamEducationUpgrades'
import {
  purchaseDreamFoundationalInformation,
  type DreamPurchaseCommand,
} from '../simulation/dreamFoundationalInformation'
import {
  purchaseDreamSpaceAge,
  type DreamSpaceAgePurchase,
} from '../simulation/dreamSpaceAge'
import type { BasicDysonFacilityId } from '../simulation/dysonFacilities'
import type { MegaStructureId } from '../simulation/megaStructurePurchases'
import {
  purchaseQuantumUpgradeBulk,
  type QuantumUpgradeBulkQuantity,
} from '../simulation/quantumUpgrades'
import { withCanonicalBotAllocation } from '../simulation/canonicalBotAllocation'
import type { QuantumUpgradeId } from '../simulation/quantumUpgrades'
import { purchaseRealityUpgrade } from '../simulation/realityUpgrades'
import type { RealityUpgradeId } from '../simulation/realityUpgrades'
import { gatherRealityInfluence } from '../simulation/realityWorkers'
import {
  purchaseCanonicalResearch,
  runResearchAutomationTick,
} from '../simulation/researchAutomation'
import { upgradeStoredTimeCapacity } from '../simulation/timeResources'
import type {
  BuyMode,
} from '../simulation/transactions'
import type { SimulationAutomationPolicy } from '../simulation/types'

/**
 * The application-level player and automation commands whose state changes
 * must remain independent from any browser presentation.
 *
 * Blocked members are intentional inventory entries. They prevent a frontend
 * from silently implementing missing Unity rules while keeping the eventual
 * command contract explicit.
 */
export type CanonicalGameCommand =
  | {
      readonly kind: 'dyson.purchase-basic-facility'
      readonly facilityId: BasicDysonFacilityId
    }
  | {
      readonly kind: 'dyson.purchase-mega-structure'
      readonly facilityId: MegaStructureId
    }
  | {
      readonly kind: 'dyson.run-automation'
      readonly policy?: SimulationAutomationPolicy
    }
  | {
      readonly kind: 'dyson.set-buy-mode'
      readonly buyMode: BuyMode
    }
  | {
      readonly kind: 'dyson.set-rounded-bulk-buy'
      readonly enabled: boolean
    }
  | {
      readonly kind: 'dyson.set-facility-automation'
      readonly facilityId: CanonicalFacilityId
      readonly enabled: boolean
    }
  | {
      readonly kind: 'dyson.set-bot-distribution'
      readonly distribution: number
    }
  | {
      readonly kind: 'research.purchase'
      readonly researchId: string
    }
  | {
      readonly kind: 'research.run-automation'
    }
  | {
      readonly kind: 'research.set-buy-mode'
      readonly buyMode: BuyMode
    }
  | {
      readonly kind: 'research.set-rounded-bulk-buy'
      readonly enabled: boolean
    }
  | {
      readonly kind: 'research.set-automation'
      readonly researchId: string
      readonly enabled: boolean
    }
  | {
      readonly kind: 'skill.purchase'
      readonly skillId: string
    }
  | {
      readonly kind: 'skill.refund'
      readonly skillId: string
    }
  | {
      readonly kind: 'skill.set-auto-assignment'
      readonly skillIds: readonly string[]
    }
  | {
      readonly kind: 'skill.set-preset-assignment'
      readonly slot: CanonicalSkillPresetSlot
      readonly skillIds: readonly string[]
    }
  | {
      readonly kind: 'skill.set-preset-bot-distribution'
      readonly slot: CanonicalSkillPresetSlot
      readonly distribution: number
    }
  | {
      readonly kind: 'skill.rename-preset'
      readonly slot: CanonicalSkillPresetSlot
      readonly name: string
    }
  | {
      readonly kind: 'skill.set-preset-color'
      readonly slot: CanonicalSkillPresetSlot
      readonly colorId: SkillPresetColorId
    }
  | {
      readonly kind: 'skill.select-preset'
      readonly slot: CanonicalSkillPresetSlot
    }
  | {
      readonly kind: 'skill.add-to-current-preset'
      readonly skillId: string
    }
  | {
      readonly kind: 'skill.remove-from-current-preset'
      readonly skillId: string
    }
  | {
      readonly kind: 'skill.import-preset'
      readonly slot: CanonicalSkillPresetSlot
      readonly serialized: string
    }
  | {
      readonly kind: 'skill.set-tab-preset-automation'
      readonly tab: 'bots' | 'research'
      readonly slot: CanonicalSkillPresetAutomationSlot
    }
  | {
      readonly kind: 'skill.apply-tab-preset-automation'
      readonly tab: 'bots' | 'research'
    }
  | {
      readonly kind: 'skill.set-auto-assign-non-refundable'
      readonly enabled: boolean
    }
  | {
      readonly kind: 'skill.reset'
    }
  | {
      readonly kind: 'skill.run-auto-assignment'
    }
  | {
      readonly kind: 'dream.purchase-foundational'
      readonly purchase: DreamPurchaseCommand
    }
  | {
      readonly kind: 'dream.purchase-space-age'
      readonly purchase: DreamSpaceAgePurchase
      readonly quantity?: number
    }
  | {
      readonly kind: 'dream.purchase-upgrade'
      readonly upgradeId: DreamUpgradeFlag
    }
  | {
      readonly kind: 'dream.start-education'
      readonly educationId: DreamEducationId
    }
  | {
      readonly kind: 'dream.request-reset'
    }
  | {
      readonly kind: 'dream.request-black-hole-reset'
    }
  | {
      readonly kind: 'reality.purchase-upgrade'
      readonly upgradeId: RealityUpgradeId
    }
  | {
      readonly kind: 'reality.gather-influence'
    }
  | {
      readonly kind: 'quantum.purchase-upgrade'
      readonly upgradeId: QuantumUpgradeId
      readonly quantity?: QuantumUpgradeBulkQuantity
    }
  | {
      readonly kind: 'quantum.request-leap'
    }
  | {
      readonly kind: 'infinity.set-automatic-reset'
      readonly enabled: boolean
    }
  | {
      readonly kind: 'infinity.request-reset'
    }
  | {
      readonly kind: 'infinity.set-break-target'
      readonly target: bigint
    }
  | {
      readonly kind: 'infinity.purchase-shop-item'
      readonly itemId: CanonicalInfinityShopItemId
    }
  | {
      readonly kind: 'avocado.feed'
      readonly source: AvocadoFeedSource
    }
  | {
      readonly kind: 'avocado.complete-meditation-step'
      readonly requiredStepIndex: number
    }
  | {
      readonly kind: 'time.upgrade-stored-capacity'
    }
  | {
      readonly kind: 'time.request-stored-time-spend'
      readonly requestedSeconds: number
    }
  | {
      readonly kind: 'time.set-stored-time-preset'
      readonly preset: StoredTimeAccuracyPreset
    }
  | {
      readonly kind: 'settings.set-processing-interval'
      readonly milliseconds: number
    }
  | {
      readonly kind: 'settings.set-navigation-item-visible'
      readonly item: BottomNavigationDestinationId
      readonly visible: boolean
    }

export type CanonicalGameCommandKind = CanonicalGameCommand['kind']

export type {
  CanonicalSkillPresetAutomationSlot,
  CanonicalSkillPresetSlot,
} from '../game-state/types'

export type CanonicalGameCommandCode =
  | 'quantum-leap-boundary-unavailable'
  | 'research-tuning-carrier-unavailable'
  | 'runtime-evaluation-carrier-unavailable'
  | 'runtime-evaluation-rejected'
  | 'selected-skill-preset-carrier-unavailable'
  | 'stored-time-cheater-carrier-unavailable'
  | `avocado:${string}`
  | `avocado-meditation:${string}`
  | `dream-education:${string}`
  | `dream-foundational:${string}`
  | `dream-reset:${string}`
  | `dream-space-age:${string}`
  | `dream-upgrade:${string}`
  | `dyson-automation:${string}`
  | `dyson-basic:${string}`
  | `dyson-bot-distribution:${string}`
  | `dyson-mega:${string}`
  | `dyson-setting:${string}`
  | `infinity-break-target:${string}`
  | `infinity-automatic-reset:${string}`
  | `infinity-reset:${string}`
  | `infinity-shop:${string}`
  | `quantum-leap:${string}`
  | `quantum-upgrade:${string}`
  | `reality-gather:${string}`
  | `reality-upgrade:${string}`
  | `research-automation:${string}`
  | `research-purchase:${string}`
  | `time-stored-preset:${string}`
  | `settings-processing-interval:${string}`
  | `research-setting:${string}`
  | `settings:${string}`
  | `skill:${string}`
  | `time-double-rate:${string}`
  | `time-stored-capacity:${string}`
  | `time-stored-spend:${string}`

export interface CanonicalGameCommandIssue {
  readonly code: string
  readonly path: string
  readonly detail: string
}

/**
 * State that is save-affecting but does not currently live inside
 * CanonicalGameStateV1. It travels with every command result so callers can
 * publish or discard the complete transaction.
 */
export interface CanonicalGameRuntimeCarriers {
  /**
   * This must be supplied from the current hydrated session on each dispatch;
   * callers must not capture first-session tuning in an engine definition.
   */
  readonly compatibilityTuning:
    | Readonly<DysonCompatibilityTuning>
    | null
  readonly skillEffectEvaluationSnapshot:
    | Readonly<DysonSkillEffectEvaluationSnapshot>
    | null
  /**
   * Unity's persistent `cheater` value is required by stored-time repair but
   * has no CanonicalGameStateV1 field yet.
   */
  readonly storedTimeCheater: boolean | null
  /**
   * Unity persists selectedPreset separately from the five preset payloads,
   * but CanonicalGameStateV1 does not yet carry that field.
   */
  readonly selectedSkillPresetSlot: CanonicalSkillPresetSlot | null
}

export type CanonicalRuntimeEvaluationPortResult =
  | {
      readonly accepted: true
      readonly snapshot: Readonly<DysonSkillEffectEvaluationSnapshot>
      readonly facilityModifiers?: Readonly<
        Record<CanonicalFacilityId, number>
      >
      readonly planetPricingModifier?: number
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly issues?: readonly CanonicalGameCommandIssue[]
    }

/**
 * Recalculates the runtime Dyson skill snapshot after a candidate state
 * changes. Implementations return the new snapshot; they must not publish it
 * through a captured mutable closure.
 */
export interface CanonicalRuntimeEvaluationPort {
  evaluate(
    state: Readonly<CanonicalGameStateV1>,
    previous:
      | Readonly<DysonSkillEffectEvaluationSnapshot>
      | null,
  ): CanonicalRuntimeEvaluationPortResult
}

export type CanonicalQuantumLeapPortResult =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly code: string
      readonly state: CanonicalGameStateV1
      readonly issues?: readonly CanonicalGameCommandIssue[]
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly issues?: readonly CanonicalGameCommandIssue[]
    }

/**
 * Owns Quantum Leap eligibility and execution as one event-model boundary.
 * The implementation must enforce the total-42 visibility gate, choose the
 * entanglement-versus-reset branch, and derive artifact skill points without
 * accepting any reward or branch choice from the command caller.
 */
export interface CanonicalQuantumLeapPort {
  requestLeap(
    state: Readonly<CanonicalGameStateV1>,
  ): CanonicalQuantumLeapPortResult
}

export type CanonicalInfinityResetPortResult =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly code: string
      readonly state: CanonicalGameStateV1
      readonly issues?: readonly CanonicalGameCommandIssue[]
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly issues?: readonly CanonicalGameCommandIssue[]
    }

/** Owns manual Infinity eligibility, reward derivation, and reset execution. */
export interface CanonicalInfinityResetPort {
  requestReset(
    state: Readonly<CanonicalGameStateV1>,
  ): CanonicalInfinityResetPortResult
}

export interface CanonicalGameCommandOptions {
  readonly runtimeCarriers?: Readonly<CanonicalGameRuntimeCarriers>
  readonly runtimeEvaluation?: CanonicalRuntimeEvaluationPort
  readonly quantumLeap?: CanonicalQuantumLeapPort
  readonly infinityReset?: CanonicalInfinityResetPort
}

export type CanonicalGameCommandIntent = {
  readonly kind: 'advance-stored-time'
  readonly seconds: number
}

interface CanonicalGameCommandResultFields {
  readonly code: CanonicalGameCommandCode
  readonly state: CanonicalGameStateV1
  readonly issues: readonly CanonicalGameCommandIssue[]
  readonly runtimeCarriers: Readonly<CanonicalGameRuntimeCarriers>
  readonly intents: readonly CanonicalGameCommandIntent[]
}

export type CanonicalGameCommandResult =
  | (CanonicalGameCommandResultFields & {
      readonly accepted: true
      readonly changed: boolean
    })
  | (CanonicalGameCommandResultFields & {
      readonly accepted: false
      readonly changed: false
    })

export interface CanonicalGameCommandSupport {
  readonly supported: boolean
  readonly authority: string
  readonly requires?: readonly (
    | 'compatibility-tuning'
    | 'infinity-reset-port'
    | 'quantum-leap-port'
    | 'runtime-evaluation-port'
    | 'selected-skill-preset-carrier'
    | 'stored-time-commit-first-runner'
    | 'stored-time-cheater-carrier'
  )[]
}

export const CANONICAL_GAME_COMMAND_SUPPORT = Object.freeze({
  'dyson.purchase-basic-facility': {
    supported: true,
    authority: 'tryPurchaseCanonicalBasicFacility',
    requires: ['runtime-evaluation-port'],
  },
  'dyson.purchase-mega-structure': {
    supported: true,
    authority: 'tryPurchaseCanonicalMegaStructure',
    requires: ['runtime-evaluation-port'],
  },
  'dyson.run-automation': {
    supported: true,
    authority: 'runCanonicalDysonAutomation',
    requires: ['runtime-evaluation-port'],
  },
  'dyson.set-buy-mode': {
    supported: true,
    authority: 'canonical Dyson buy-mode setting transaction',
  },
  'dyson.set-rounded-bulk-buy': {
    supported: true,
    authority: 'canonical Dyson rounded-bulk setting transaction',
  },
  'dyson.set-facility-automation': {
    supported: true,
    authority: 'canonical unlock-aware facility automation setting',
  },
  'dyson.set-bot-distribution': {
    supported: true,
    authority: 'canonical Unity-rounded bot-distribution setting',
    requires: [
      'selected-skill-preset-carrier',
      'runtime-evaluation-port',
    ],
  },
  'research.purchase': {
    supported: true,
    authority: 'purchaseCanonicalResearch',
    requires: ['compatibility-tuning', 'runtime-evaluation-port'],
  },
  'research.run-automation': {
    supported: true,
    authority: 'runResearchAutomationTick',
    requires: ['compatibility-tuning', 'runtime-evaluation-port'],
  },
  'research.set-buy-mode': {
    supported: true,
    authority: 'canonical research buy-mode setting transaction',
  },
  'research.set-rounded-bulk-buy': {
    supported: true,
    authority: 'canonical research rounded-bulk setting transaction',
  },
  'research.set-automation': {
    supported: true,
    authority: 'canonical unlock-aware research automation setting',
  },
  'skill.purchase': {
    supported: true,
    authority: 'purchaseCanonicalSkill',
    requires: ['runtime-evaluation-port'],
  },
  'skill.refund': {
    supported: true,
    authority: 'refundCanonicalSkill',
    requires: ['runtime-evaluation-port'],
  },
  'skill.set-auto-assignment': {
    supported: true,
    authority: 'canonical dependency-safe active assignment queue',
    requires: ['selected-skill-preset-carrier'],
  },
  'skill.set-preset-assignment': {
    supported: true,
    authority: 'canonical dependency-safe preset assignment queue',
  },
  'skill.set-preset-bot-distribution': {
    supported: true,
    authority: 'canonical preset bot-distribution setting',
  },
  'skill.rename-preset': {
    supported: true,
    authority: 'canonical preset-name setting',
  },
  'skill.set-preset-color': {
    supported: true,
    authority: 'canonical preset-color setting',
  },
  'skill.select-preset': {
    supported: true,
    authority:
      'resetCanonicalSkills plus runCanonicalSkillAutoAssignment',
    requires: [
      'selected-skill-preset-carrier',
      'runtime-evaluation-port',
    ],
  },
  'skill.add-to-current-preset': {
    supported: true,
    authority:
      'canonical dependency-closure preset queue transaction',
    requires: ['selected-skill-preset-carrier'],
  },
  'skill.remove-from-current-preset': {
    supported: true,
    authority:
      'canonical queued-dependent cascade preset transaction',
    requires: ['selected-skill-preset-carrier'],
  },
  'skill.import-preset': {
    supported: true,
    authority:
      'canonical validated Unity v1 preset import transaction',
    requires: [
      'selected-skill-preset-carrier',
      'runtime-evaluation-port',
    ],
  },
  'skill.set-tab-preset-automation': {
    supported: true,
    authority: 'canonical persisted tab preset automation setting',
    requires: [
      'selected-skill-preset-carrier',
      'runtime-evaluation-port',
    ],
  },
  'skill.apply-tab-preset-automation': {
    supported: true,
    authority: 'canonical tab-open preset selection transaction',
    requires: [
      'selected-skill-preset-carrier',
      'runtime-evaluation-port',
    ],
  },
  'skill.set-auto-assign-non-refundable': {
    supported: true,
    authority: 'canonical auto-assignment preference setting',
  },
  'skill.reset': {
    supported: true,
    authority: 'resetCanonicalSkills',
    requires: ['runtime-evaluation-port'],
  },
  'skill.run-auto-assignment': {
    supported: true,
    authority: 'runCanonicalSkillAutoAssignment',
    requires: ['runtime-evaluation-port'],
  },
  'dream.purchase-foundational': {
    supported: true,
    authority: 'purchaseDreamFoundationalInformation',
    requires: ['runtime-evaluation-port'],
  },
  'dream.purchase-space-age': {
    supported: true,
    authority: 'purchaseDreamSpaceAge',
    requires: ['runtime-evaluation-port'],
  },
  'dream.purchase-upgrade': {
    supported: true,
    authority: 'purchaseSimulationUpgrade',
    requires: ['runtime-evaluation-port'],
  },
  'dream.start-education': {
    supported: true,
    authority: 'startDreamEducation',
    requires: ['runtime-evaluation-port'],
  },
  'dream.request-reset': {
    supported: true,
    authority: 'applyCanonicalDreamReset',
    requires: ['runtime-evaluation-port'],
  },
  'dream.request-black-hole-reset': {
    supported: true,
    authority: 'applyCanonicalBlackHoleReset',
    requires: ['runtime-evaluation-port'],
  },
  'reality.purchase-upgrade': {
    supported: true,
    authority: 'purchaseRealityUpgrade',
    requires: ['runtime-evaluation-port'],
  },
  'reality.gather-influence': {
    supported: true,
    authority: 'gatherRealityInfluence',
    requires: ['runtime-evaluation-port'],
  },
  'quantum.purchase-upgrade': {
    supported: true,
    authority: 'purchaseQuantumUpgradeBulk',
    requires: ['runtime-evaluation-port'],
  },
  'quantum.request-leap': {
    supported: true,
    authority: 'injected canonical Quantum Leap event-model boundary',
    requires: ['quantum-leap-port', 'runtime-evaluation-port'],
  },
  'infinity.set-break-target': {
    supported: true,
    authority: 'canonical queued Break-target setting',
  },
  'infinity.set-automatic-reset': {
    supported: true,
    authority: 'canonical persisted automatic Infinity setting',
  },
  'infinity.request-reset': {
    supported: true,
    authority: 'canonical manual Infinity event-model boundary',
    requires: ['infinity-reset-port'],
  },
  'infinity.purchase-shop-item': {
    supported: true,
    authority: 'purchaseCanonicalInfinityShopItem',
    requires: ['runtime-evaluation-port'],
  },
  'avocado.feed': {
    supported: true,
    authority: 'feedAllToAvocado',
    requires: ['runtime-evaluation-port'],
  },
  'avocado.complete-meditation-step': {
    supported: true,
    authority: 'completeCanonicalAvocadoMeditationStep',
    requires: ['runtime-evaluation-port'],
  },
  'time.upgrade-stored-capacity': {
    supported: true,
    authority: 'upgradeStoredTimeCapacity',
    requires: ['stored-time-cheater-carrier'],
  },
  'time.request-stored-time-spend': {
    supported: true,
    authority: 'canonical commit-first stored-time spend intent',
    requires: ['stored-time-commit-first-runner'],
  },
  'time.set-stored-time-preset': {
    supported: true,
    authority: 'canonical persisted Stored Time accuracy preference',
  },
  'settings.set-processing-interval': {
    supported: true,
    authority: 'canonical persisted active gameplay cadence preference',
  },
  'settings.set-navigation-item-visible': {
    supported: true,
    authority: 'canonical persisted menu shortcut preference',
  },
} as const satisfies Readonly<
  Record<CanonicalGameCommandKind, CanonicalGameCommandSupport>
>)

export const CANONICAL_GAME_COMMAND_KINDS = Object.freeze(
  Object.keys(
    CANONICAL_GAME_COMMAND_SUPPORT,
  ) as CanonicalGameCommandKind[],
)

const EMPTY_ISSUES = Object.freeze(
  [] as CanonicalGameCommandIssue[],
)

const EMPTY_INTENTS = Object.freeze(
  [] as CanonicalGameCommandIntent[],
)

const EMPTY_RUNTIME_CARRIERS: Readonly<CanonicalGameRuntimeCarriers> =
  Object.freeze({
    compatibilityTuning: null,
    skillEffectEvaluationSnapshot: null,
    storedTimeCheater: null,
    selectedSkillPresetSlot: null,
  })

/**
 * Routes one command through its canonical domain authority and returns the
 * canonical state plus out-of-model runtime carriers as one transaction.
 * Every rejection returns the exact input state object.
 *
 * `runtimeCarriers` must be read from the currently active hydrated session
 * for every dispatch. In particular, compatibility tuning must not be closed
 * over when an engine definition is first constructed because imports replace
 * the active session and its tuning snapshot.
 */
export function routeCanonicalGameCommand(
  state: CanonicalGameStateV1,
  command: CanonicalGameCommand,
  options: Readonly<CanonicalGameCommandOptions> = {},
): CanonicalGameCommandResult {
  const carriers =
    options.runtimeCarriers ?? EMPTY_RUNTIME_CARRIERS

  switch (command.kind) {
    case 'settings.set-navigation-item-visible': {
      const current = state.meta.navigationVisibility ??
        DEFAULT_BOTTOM_NAVIGATION_VISIBILITY
      const changed = current[command.item] !== command.visible
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              meta: {
                ...state.meta,
                navigationVisibility: {
                  ...current,
                  [command.item]: command.visible,
                },
              },
            }
          : state,
        changed,
        `settings:${changed ? 'navigation-visibility-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'dyson.purchase-basic-facility': {
      const pricing = options.runtimeEvaluation?.evaluate(
        state,
        carriers.skillEffectEvaluationSnapshot,
      )
      const result = tryPurchaseCanonicalBasicFacility(
        state,
        command.facilityId,
        pricing?.accepted === true
          ? pricing.planetPricingModifier ??
            pricing.facilityModifiers?.planets ??
            1
          : 1,
      )
      if (!result.attempt.purchased) {
        return rejectDomain(
          state,
          carriers,
          `dyson-basic:${result.attempt.status}`,
          command.kind,
          result.attempt.status,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        `dyson-basic:${result.attempt.status}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dyson.purchase-mega-structure': {
      const result = tryPurchaseCanonicalMegaStructure(
        state,
        command.facilityId,
      )
      if (!result.purchased) {
        return rejectDomain(
          state,
          carriers,
          `dyson-mega:${result.status}`,
          command.kind,
          result.status,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        `dyson-mega:${result.status}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dyson.run-automation': {
      const pricing = options.runtimeEvaluation?.evaluate(
        state,
        carriers.skillEffectEvaluationSnapshot,
      )
      const result = runCanonicalDysonAutomation(
        state,
        command.policy,
        pricing?.accepted === true
          ? pricing.planetPricingModifier ??
            pricing.facilityModifiers?.planets ??
            1
          : 1,
      )
      return finalizeAccepted(
        state,
        result.state,
        result.state !== state,
        `dyson-automation:${
          result.attempts.some((attempt) => attempt.purchased)
            ? 'purchased'
            : 'ran'
        }`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dyson.set-buy-mode':
      return finalizeAccepted(
        state,
        state.dyson.automation.buyMode === command.buyMode
          ? state
          : {
              ...state,
              dyson: {
                ...state.dyson,
                automation: {
                  ...state.dyson.automation,
                  buyMode: command.buyMode,
                },
              },
            },
        state.dyson.automation.buyMode !== command.buyMode,
        `dyson-setting:${
          state.dyson.automation.buyMode === command.buyMode
            ? 'unchanged'
            : 'buy-mode-set'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )

    case 'dyson.set-rounded-bulk-buy':
      return finalizeAccepted(
        state,
        state.dyson.automation.roundedBulkBuy === command.enabled
          ? state
          : {
              ...state,
              dyson: {
                ...state.dyson,
                automation: {
                  ...state.dyson.automation,
                  roundedBulkBuy: command.enabled,
                },
              },
            },
        state.dyson.automation.roundedBulkBuy !== command.enabled,
        `dyson-setting:${
          state.dyson.automation.roundedBulkBuy === command.enabled
            ? 'unchanged'
            : 'rounded-bulk-set'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )

    case 'dyson.set-facility-automation': {
      const gate = dysonAutomationSettingGate(
        state,
        command.facilityId,
      )
      if (gate !== null) {
        return rejectDomain(
          state,
          carriers,
          `dyson-setting:${gate}`,
          command.kind,
          gate,
        )
      }
      const current =
        state.dyson.automation.enabledFacilities[command.facilityId]
      const changed = current !== command.enabled
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              dyson: {
                ...state.dyson,
                automation: {
                  ...state.dyson.automation,
                  enabledFacilities: {
                    ...state.dyson.automation.enabledFacilities,
                    [command.facilityId]: command.enabled,
                  },
                },
              },
            }
          : state,
        changed,
        `dyson-setting:${changed ? 'facility-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'dyson.set-bot-distribution': {
      if (state.quantum.unlocks.botMultitasking) {
        return rejectDomain(
          state,
          carriers,
          'dyson-bot-distribution:locked-by-multitasking',
          command.kind,
          'Bot Multitasking disables the distribution player action.',
        )
      }
      const selected = carriers.selectedSkillPresetSlot
      if (selected === null) {
        return selectedPresetCarrierUnavailable(state, carriers)
      }
      const distribution = normalizeBotDistribution(
        command.distribution,
      )
      if (distribution === null) {
        return rejectDomain(
          state,
          carriers,
          'dyson-bot-distribution:invalid',
          command.kind,
          'Bot distribution must be finite.',
        )
      }
      const preset = state.skills.presets[selected - 1]
      const changed =
        state.dyson.botDistribution !== distribution ||
        preset.botDistribution !== distribution
      return finalizeAccepted(
        state,
          changed
          ? withCanonicalBotAllocation({
              ...state,
              dyson: {
                ...state.dyson,
                botDistribution: distribution,
              },
              skills: {
                ...state.skills,
                presets: replacePreset(
                  state.skills.presets,
                  selected,
                  { ...preset, botDistribution: distribution },
                ),
              },
            })
          : state,
        changed,
        `dyson-bot-distribution:${
          changed ? 'set' : 'unchanged'
        }`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'research.purchase': {
      const tuning = carriers.compatibilityTuning
      if (tuning === null) {
        return researchTuningCarrierUnavailable(state, carriers)
      }
      const result = purchaseCanonicalResearch(
        state,
        tuning,
        command.researchId,
      )
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `research-purchase:${result.code}`,
          command.kind,
          result.reason,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `research-purchase:${
          result.changed ? 'purchased' : 'unchanged'
        }`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'research.run-automation': {
      const tuning = carriers.compatibilityTuning
      if (tuning === null) {
        return researchTuningCarrierUnavailable(state, carriers)
      }
      const result = runResearchAutomationTick(
        state,
        tuning,
      )
      return finalizeAccepted(
        state,
        result.state,
        result.state !== state,
        `research-automation:${
          result.purchases.length > 0 ? 'purchased' : 'ran'
        }`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'research.set-buy-mode':
      return finalizeAccepted(
        state,
        state.research.automation.buyMode === command.buyMode
          ? state
          : {
              ...state,
              research: {
                ...state.research,
                automation: {
                  ...state.research.automation,
                  buyMode: command.buyMode,
                },
              },
            },
        state.research.automation.buyMode !== command.buyMode,
        `research-setting:${
          state.research.automation.buyMode === command.buyMode
            ? 'unchanged'
            : 'buy-mode-set'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )

    case 'research.set-rounded-bulk-buy':
      return finalizeAccepted(
        state,
        state.research.automation.roundedBulkBuy === command.enabled
          ? state
          : {
              ...state,
              research: {
                ...state.research,
                automation: {
                  ...state.research.automation,
                  roundedBulkBuy: command.enabled,
                },
              },
            },
        state.research.automation.roundedBulkBuy !== command.enabled,
        `research-setting:${
          state.research.automation.roundedBulkBuy === command.enabled
            ? 'unchanged'
            : 'rounded-bulk-set'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )

    case 'research.set-automation': {
      const gate = researchAutomationSettingGate(
        state,
        command.researchId,
      )
      if (gate !== null) {
        return rejectDomain(
          state,
          carriers,
          `research-setting:${gate}`,
          command.kind,
          gate,
        )
      }
      const current =
        state.research.automation.enabledById[command.researchId]
      const changed = current !== command.enabled
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              research: {
                ...state.research,
                automation: {
                  ...state.research.automation,
                  enabledById: {
                    ...state.research.automation.enabledById,
                    [command.researchId]: command.enabled,
                  },
                },
              },
            }
          : state,
        changed,
        `research-setting:${changed ? 'automation-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.purchase':
    case 'skill.refund': {
      const result =
        command.kind === 'skill.purchase'
          ? purchaseCanonicalSkill(state, command.skillId)
          : refundCanonicalSkill(state, command.skillId)
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${result.code}`,
          command.kind,
          result.reason,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `skill:${result.changed ? 'changed' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'skill.reset':
    case 'skill.run-auto-assignment': {
      const result =
        command.kind === 'skill.reset'
          ? resetCanonicalSkills(state)
          : runCanonicalSkillAutoAssignment(state)
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${result.code}`,
          command.kind,
          result.reason,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `skill:${result.changed ? 'changed' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'skill.set-auto-assignment': {
      const selected = carriers.selectedSkillPresetSlot
      if (selected === null) {
        return selectedPresetCarrierUnavailable(state, carriers)
      }
      const skillIds = normalizeSkillAssignment(command.skillIds)
      const preset = state.skills.presets[selected - 1]
      const changed =
        !sameStrings(
          state.skills.activeAutoAssignment,
          skillIds,
        ) ||
        !sameStrings(preset.skillIds, skillIds)
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                activeAutoAssignment: skillIds,
                presets: replacePreset(
                  state.skills.presets,
                  selected,
                  { ...preset, skillIds },
                ),
              },
            }
          : state,
        changed,
        `skill:${changed ? 'active-assignment-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.set-preset-assignment': {
      const skillIds = normalizeSkillAssignment(command.skillIds)
      const preset = state.skills.presets[command.slot - 1]
      const changed = !sameStrings(preset.skillIds, skillIds)
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                presets: replacePreset(
                  state.skills.presets,
                  command.slot,
                  { ...preset, skillIds },
                ),
              },
            }
          : state,
        changed,
        `skill:${changed ? 'preset-assignment-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.set-preset-bot-distribution': {
      const distribution = normalizeBotDistribution(
        command.distribution,
      )
      if (distribution === null) {
        return rejectDomain(
          state,
          carriers,
          'skill:invalid-preset-bot-distribution',
          command.kind,
          'Preset bot distribution must be finite.',
        )
      }
      const preset = state.skills.presets[command.slot - 1]
      const changed = preset.botDistribution !== distribution
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                presets: replacePreset(
                  state.skills.presets,
                  command.slot,
                  { ...preset, botDistribution: distribution },
                ),
              },
            }
          : state,
        changed,
        `skill:${changed ? 'preset-distribution-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.rename-preset': {
      const preset = state.skills.presets[command.slot - 1]
      const changed = preset.name !== command.name
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                presets: replacePreset(
                  state.skills.presets,
                  command.slot,
                  { ...preset, name: command.name },
                ),
              },
            }
          : state,
        changed,
        `skill:${changed ? 'preset-renamed' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.set-preset-color': {
      if (!isSkillPresetColorId(command.colorId)) {
        return rejectDomain(
          state,
          carriers,
          'skill:invalid-preset-color',
          command.kind,
          `Unsupported preset color '${String(command.colorId)}'.`,
        )
      }
      const preset = state.skills.presets[command.slot - 1]
      const changed = preset.colorId !== command.colorId
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                presets: replacePreset(
                  state.skills.presets,
                  command.slot,
                  { ...preset, colorId: command.colorId },
                ),
              },
            }
          : state,
        changed,
        `skill:${changed ? 'preset-color-set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.add-to-current-preset':
    case 'skill.remove-from-current-preset': {
      const selected = carriers.selectedSkillPresetSlot
      if (selected === null) {
        return selectedPresetCarrierUnavailable(state, carriers)
      }
      const preview =
        command.kind === 'skill.add-to-current-preset'
          ? previewAddSkillToPreset(
              state,
              selected,
              command.skillId,
            )
          : previewRemoveSkillFromPreset(
              state,
              selected,
              command.skillId,
            )
      if (!preview.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:preset-queue-${preview.code}`,
          command.kind,
          preview.reason,
        )
      }
      const preset = state.skills.presets[selected - 1]
      const changed =
        !sameStrings(
          state.skills.activeAutoAssignment,
          preview.nextSkillIds,
        ) ||
        !sameStrings(preset.skillIds, preview.nextSkillIds)
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                activeAutoAssignment: [...preview.nextSkillIds],
                presets: replacePreset(
                  state.skills.presets,
                  selected,
                  {
                    ...preset,
                    skillIds: [...preview.nextSkillIds],
                  },
                ),
              },
            }
          : state,
        changed,
        `skill:${
          changed
            ? command.kind === 'skill.add-to-current-preset'
              ? 'preset-skill-added'
              : 'preset-skill-removed'
            : 'unchanged'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.import-preset': {
      const parsed = parseCanonicalSkillPreset(command.serialized, state)
      if (!parsed.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:preset-import-${parsed.code}`,
          command.kind,
          parsed.reason,
        )
      }
      const imported = replaceCanonicalSkillPreset(
        state,
        command.slot,
        {
          name: parsed.payload.presetName,
          botDistribution: parsed.payload.botDistribution,
          skillIds: parsed.payload.skillIds,
          colorId:
            parsed.payload.colorId ??
            defaultSkillPresetColorId(command.slot),
        },
      )
      if (carriers.selectedSkillPresetSlot !== command.slot) {
        return finalizeAccepted(
          state,
          imported,
          imported !== state,
          'skill:preset-imported',
          carriers,
          options.runtimeEvaluation,
          EMPTY_ISSUES,
          false,
        )
      }

      const reset = resetCanonicalSkills(imported)
      if (!reset.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${reset.code}`,
          command.kind,
          reset.reason,
        )
      }
      const loaded: CanonicalGameStateV1 = {
        ...reset.state,
        dyson: {
          ...reset.state.dyson,
          botDistribution: parsed.payload.botDistribution,
        },
        skills: {
          ...reset.state.skills,
          activeAutoAssignment: [...parsed.payload.skillIds],
        },
      }
      const assignment = runCanonicalSkillAutoAssignment(loaded)
      if (!assignment.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${assignment.code}`,
          command.kind,
          assignment.reason,
        )
      }
      return finalizeAccepted(
        state,
        withCanonicalBotAllocation(assignment.state),
        true,
        'skill:preset-imported-and-loaded',
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'skill.set-tab-preset-automation': {
      const changed =
        state.skills.tabPresetAutomation[command.tab] !== command.slot
      const configured = changed
        ? {
            ...state,
            skills: {
              ...state.skills,
              tabPresetAutomation: {
                ...state.skills.tabPresetAutomation,
                [command.tab]: command.slot,
              },
            },
          }
        : state
      if (
        command.slot === 0 ||
        command.slot === carriers.selectedSkillPresetSlot
      ) {
        return finalizeAccepted(
          state,
          configured,
          changed,
          `skill:${
            changed ? 'tab-preset-automation-set' : 'unchanged'
          }`,
          carriers,
          options.runtimeEvaluation,
          EMPTY_ISSUES,
          false,
        )
      }
      const selected = routeCanonicalGameCommand(
        configured,
        { kind: 'skill.select-preset', slot: command.slot },
        options,
      )
      if (!selected.accepted) {
        return Object.freeze({
          ...selected,
          state,
          changed: false,
        })
      }
      return Object.freeze({
        ...selected,
        changed: changed || selected.changed,
        code: 'skill:tab-preset-automation-set-and-applied',
      })
    }

    case 'skill.apply-tab-preset-automation': {
      const slot = state.skills.tabPresetAutomation[command.tab]
      if (
        slot === 0 ||
        slot === carriers.selectedSkillPresetSlot
      ) {
        return finalizeAccepted(
          state,
          state,
          false,
          'skill:unchanged',
          carriers,
          options.runtimeEvaluation,
          EMPTY_ISSUES,
          false,
        )
      }
      const applied = routeCanonicalGameCommand(
        state,
        { kind: 'skill.select-preset', slot },
        options,
      )
      return applied.accepted
        ? Object.freeze({
            ...applied,
            code: 'skill:tab-preset-applied',
          })
        : applied
    }

    case 'skill.set-auto-assign-non-refundable': {
      const changed =
        state.skills.autoAssignNonRefundable !== command.enabled
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              skills: {
                ...state.skills,
                autoAssignNonRefundable: command.enabled,
              },
            }
          : state,
        changed,
        `skill:${
          changed ? 'auto-assign-preference-set' : 'unchanged'
        }`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'skill.select-preset': {
      const current = carriers.selectedSkillPresetSlot
      if (current === null) {
        return selectedPresetCarrierUnavailable(state, carriers)
      }
      const savedCurrent = replacePreset(
        state.skills.presets,
        current,
        {
          ...state.skills.presets[current - 1],
          skillIds: [...state.skills.activeAutoAssignment],
          botDistribution: state.dyson.botDistribution,
        },
      )
      const target = savedCurrent[command.slot - 1]
      const reset = resetCanonicalSkills({
        ...state,
        skills: {
          ...state.skills,
          presets: savedCurrent,
        },
      })
      if (!reset.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${reset.code}`,
          command.kind,
          reset.reason,
        )
      }
      const loaded: CanonicalGameStateV1 = {
        ...reset.state,
        dyson: {
          ...reset.state.dyson,
          botDistribution: target.botDistribution,
        },
        skills: {
          ...reset.state.skills,
          activeAutoAssignment: [...target.skillIds],
        },
      }
      const assignment = runCanonicalSkillAutoAssignment(loaded)
      if (!assignment.accepted) {
        return rejectDomain(
          state,
          carriers,
          `skill:${assignment.code}`,
          command.kind,
          assignment.reason,
        )
      }
      const nextCarriers = Object.freeze({
        ...carriers,
        selectedSkillPresetSlot: command.slot,
      })
      const changed =
        assignment.state !== state || current !== command.slot
      return finalizeAccepted(
        state,
        withCanonicalBotAllocation(assignment.state),
        changed,
        `skill:${changed ? 'preset-selected' : 'unchanged'}`,
        nextCarriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.purchase-foundational': {
      const result = purchaseDreamFoundationalInformation(
        state,
        command.purchase,
      )
      if (!result.purchased) {
        return rejectDomain(
          state,
          carriers,
          `dream-foundational:${result.status}`,
          command.kind,
          result.status,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        `dream-foundational:${result.status}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.purchase-space-age': {
      const result = purchaseDreamSpaceAge(
        state,
        command.purchase,
        command.quantity,
      )
      if (!result.purchased) {
        return rejectDomain(
          state,
          carriers,
          `dream-space-age:${result.status}`,
          command.kind,
          result.status,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        `dream-space-age:${result.status}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.purchase-upgrade': {
      const result = purchaseSimulationUpgrade(
        state,
        command.upgradeId,
      )
      if (!result.accepted) {
        const issues = result.unsupportedEffect === null
          ? undefined
          : [
              issue(
                'DREAM_UPGRADE_EFFECT_UNSUPPORTED',
                `gameData.simulationUpgrades.${command.upgradeId}`,
                result.unsupportedEffect,
              ),
            ]
        return rejectDomain(
          state,
          carriers,
          `dream-upgrade:${result.code}`,
          command.kind,
          result.code,
          issues,
        )
      }
      return finalizeAccepted(
        state,
        result.candidate,
        result.changed,
        `dream-upgrade:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.start-education': {
      const result = startDreamEducation(
        state,
        command.educationId,
      )
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `dream-education:${result.code}`,
          command.kind,
          result.code,
        )
      }
      return finalizeAccepted(
        state,
        result.candidate,
        result.changed,
        `dream-education:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.request-reset': {
      const result = applyCanonicalDreamReset(state, {
        kind: 'automatic',
      })
      if (!result.ok) {
        return reject(
          state,
          carriers,
          'dream-reset:invalid',
          ...result.issues,
        )
      }
      if (!result.applied) {
        return rejectDomain(
          state,
          carriers,
          `dream-reset:${result.reason}`,
          command.kind,
          result.reason,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        'dream-reset:applied',
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'dream.request-black-hole-reset': {
      const result = applyCanonicalBlackHoleReset(state)
      if (!result.ok) {
        return reject(
          state,
          carriers,
          'dream-reset:invalid',
          ...result.issues,
        )
      }
      if (!result.applied) {
        return rejectDomain(
          state,
          carriers,
          `dream-reset:${result.reason}`,
          command.kind,
          result.reason,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        'dream-reset:black-hole-applied',
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'reality.purchase-upgrade': {
      const result = purchaseRealityUpgrade(
        state,
        command.upgradeId,
      )
      if (!result.accepted) {
        const issues = result.definitionGap === null
          ? undefined
          : [
              issue(
                'REALITY_UPGRADE_DEFINITION_GAP',
                `gameData.simulationUpgrades.${command.upgradeId}`,
                result.definitionGap,
              ),
            ]
        return rejectDomain(
          state,
          carriers,
          `reality-upgrade:${result.code}`,
          command.kind,
          result.code,
          issues,
        )
      }
      return finalizeAccepted(
        state,
        result.candidate,
        result.changed,
        `reality-upgrade:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'reality.gather-influence': {
      const result = gatherRealityInfluence(state)
      if (!result.gathered) {
        return rejectDomain(
          state,
          carriers,
          `reality-gather:${result.status}`,
          command.kind,
          result.status,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        true,
        `reality-gather:${result.status}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'quantum.purchase-upgrade': {
      const result = purchaseQuantumUpgradeBulk(
        state,
        command.upgradeId,
        command.quantity ?? 1n,
      )
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `quantum-upgrade:${result.code}`,
          command.kind,
          result.code,
        )
      }
      return finalizeAccepted(
        state,
        result.changed
          ? withCanonicalBotAllocation(result.state)
          : result.state,
        result.changed,
        `quantum-upgrade:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'quantum.request-leap': {
      if (options.quantumLeap === undefined) {
        return reject(
          state,
          carriers,
          'quantum-leap-boundary-unavailable',
          issue(
            'QUANTUM_LEAP_BOUNDARY_UNAVAILABLE',
            'ports.quantumLeap',
            'Quantum Leap requires the event-model boundary that owns the total-42 gate, branch choice, and artifact-point derivation.',
          ),
        )
      }
      let result: CanonicalQuantumLeapPortResult
      try {
        result = options.quantumLeap.requestLeap(state)
      } catch (error) {
        return reject(
          state,
          carriers,
          'quantum-leap:port-failed',
          issue(
            'QUANTUM_LEAP_PORT_FAILED',
            'ports.quantumLeap',
            errorDetail(error),
          ),
        )
      }
      if (!result.accepted) {
        return reject(
          state,
          carriers,
          `quantum-leap:${result.code}`,
          ...(result.issues ?? [
            issue(
              'QUANTUM_LEAP_REJECTED',
              command.kind,
              result.code,
            ),
          ]),
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `quantum-leap:${result.code}`,
        carriers,
        options.runtimeEvaluation,
        result.issues,
      )
    }

    case 'infinity.request-reset': {
      if (options.infinityReset === undefined) {
        return reject(
          state,
          carriers,
          'infinity-reset:port-missing',
          issue(
            'INFINITY_RESET_PORT_MISSING',
            'ports.infinityReset',
            'Manual Infinity requires the event-model boundary that owns eligibility and reward derivation.',
          ),
        )
      }
      let result: CanonicalInfinityResetPortResult
      try {
        result = options.infinityReset.requestReset(state)
      } catch (error) {
        return reject(
          state,
          carriers,
          'infinity-reset:port-failed',
          issue(
            'INFINITY_RESET_PORT_FAILED',
            'ports.infinityReset',
            errorDetail(error),
          ),
        )
      }
      if (!result.accepted) {
        return reject(
          state,
          carriers,
          `infinity-reset:${result.code}`,
          ...(result.issues ?? [
            issue('INFINITY_RESET_REJECTED', command.kind, result.code),
          ]),
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `infinity-reset:${result.code}`,
        carriers,
        options.runtimeEvaluation,
        result.issues,
      )
    }

    case 'infinity.set-automatic-reset': {
      const changed =
        command.enabled !== state.infinity.automaticResetEnabled
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              infinity: {
                ...state.infinity,
                automaticResetEnabled: command.enabled,
              },
            }
          : state,
        changed,
        `infinity-automatic-reset:${changed ? 'set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'infinity.set-break-target': {
      if (!state.quantum.unlocks.breakTheLoop) {
        return rejectDomain(
          state,
          carriers,
          'infinity-break-target:locked',
          command.kind,
          'Break target is unavailable until Break The Loop is owned.',
        )
      }
      if (command.target > 2_147_483_647n) {
        return rejectDomain(
          state,
          carriers,
          'infinity-break-target:invalid',
          command.kind,
          'Break target exceeds the canonical Unity integer range.',
        )
      }
      const target = command.target < 1n ? 1n : command.target
      const changed = target !== state.infinity.breakTarget
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              infinity: {
                ...state.infinity,
                breakTarget: target,
              },
            }
          : state,
        changed,
        `infinity-break-target:${changed ? 'set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'infinity.purchase-shop-item': {
      const result = purchaseCanonicalInfinityShopItem(
        state,
        command.itemId,
      )
      if (!result.accepted) {
        const extraIssues = result.issue === null
          ? undefined
          : [
              issue(
                'INFINITY_SHOP_DEFINITION_GAP',
                command.kind,
                result.issue,
              ),
            ]
        return rejectDomain(
          state,
          carriers,
          `infinity-shop:${result.code}`,
          command.kind,
          result.code,
          extraIssues,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `infinity-shop:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'avocado.feed': {
      const result = feedAllToAvocado(state, command.source)
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `avocado:${result.code}`,
          command.kind,
          result.code,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `avocado:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'avocado.complete-meditation-step': {
      const result = completeCanonicalAvocadoMeditationStep(
        state,
        command.requiredStepIndex,
      )
      if (!result.accepted) {
        return rejectDomain(
          state,
          carriers,
          `avocado-meditation:${result.code}`,
          command.kind,
          result.code,
        )
      }
      return finalizeAccepted(
        state,
        result.state,
        result.changed,
        `avocado-meditation:${result.code}`,
        carriers,
        options.runtimeEvaluation,
      )
    }

    case 'time.upgrade-stored-capacity': {
      if (carriers.storedTimeCheater === null) {
        return reject(
          state,
          carriers,
          'stored-time-cheater-carrier-unavailable',
          issue(
            'STORED_TIME_CHEATER_CARRIER_UNAVAILABLE',
            'runtime.storedTimeCheater',
            "Unity's persistent cheater flag is required by stored-time repair but is absent from CanonicalGameStateV1.",
          ),
        )
      }
      const result = upgradeStoredTimeCapacity({
        bankSeconds:
          state.timeline.storedTimeAvailableSeconds,
        capacitySeconds:
          state.timeline.storedTimeCapacitySeconds,
        cheater: carriers.storedTimeCheater,
      })
      const canonicalChanged =
        result.bankSeconds !==
          state.timeline.storedTimeAvailableSeconds ||
        result.capacitySeconds !==
          state.timeline.storedTimeCapacitySeconds
      const carrierChanged =
        result.cheater !== carriers.storedTimeCheater
      const changed =
        canonicalChanged || carrierChanged || result.upgraded
      if (!changed) {
        return rejectDomain(
          state,
          carriers,
          `time-stored-capacity:${
            result.maximumReached ? 'maximum-reached' : 'not-ready'
          }`,
          command.kind,
          result.maximumReached ? 'maximum-reached' : 'not-ready',
        )
      }
      const candidate = canonicalChanged
        ? {
            ...state,
            timeline: {
              ...state.timeline,
              storedTimeAvailableSeconds: result.bankSeconds,
              storedTimeCapacitySeconds: result.capacitySeconds,
            },
          }
        : state
      return finalizeAccepted(
        state,
        candidate,
        true,
        `time-stored-capacity:${
          result.upgraded ? 'upgraded' : 'state-repaired'
        }`,
        {
          ...carriers,
          storedTimeCheater: result.cheater,
        },
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'time.request-stored-time-spend': {
      if (
        !Number.isFinite(command.requestedSeconds) ||
        command.requestedSeconds <= 0
      ) {
        return rejectDomain(
          state,
          carriers,
          'time-stored-spend:invalid-request',
          command.kind,
          'Stored-time spend must request a positive finite duration.',
        )
      }
      const available =
        state.timeline.storedTimeAvailableSeconds
      if (!Number.isFinite(available) || available <= 0) {
        return rejectDomain(
          state,
          carriers,
          'time-stored-spend:empty',
          command.kind,
          'No finite positive stored-time balance is available.',
        )
      }
      const seconds = Math.min(
        command.requestedSeconds,
        available,
      )
      return acceptedIntent(
        state,
        carriers,
        'time-stored-spend:intent-created',
        Object.freeze({
          kind: 'advance-stored-time',
          seconds,
        }),
      )
    }

    case 'time.set-stored-time-preset': {
      if (!['fast', 'balanced', 'accurate'].includes(command.preset)) {
        return rejectDomain(
          state,
          carriers,
          'time-stored-preset:invalid',
          command.kind,
          'Stored Time accuracy preset is invalid.',
        )
      }
      const changed =
        command.preset !== state.timeline.processing.storedTimePreset
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              timeline: {
                ...state.timeline,
                processing: {
                  ...state.timeline.processing,
                  storedTimePreset: command.preset,
                },
              },
            }
          : state,
        changed,
        `time-stored-preset:${changed ? 'set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }

    case 'settings.set-processing-interval': {
      if (
        !Number.isInteger(command.milliseconds) ||
        command.milliseconds < 33 ||
        command.milliseconds > 200
      ) {
        return rejectDomain(
          state,
          carriers,
          'settings-processing-interval:invalid',
          command.kind,
          'Game processing interval must be an integer from 33 to 200 milliseconds.',
        )
      }
      const changed =
        command.milliseconds !==
        state.timeline.processing.activeIntervalMilliseconds
      return finalizeAccepted(
        state,
        changed
          ? {
              ...state,
              timeline: {
                ...state.timeline,
                processing: {
                  ...state.timeline.processing,
                  activeIntervalMilliseconds: command.milliseconds,
                },
              },
              infinity: {
                ...state.infinity,
                currentCyclePeakIpPerMinute: 0,
                currentCyclePeakReward: 0n,
              },
            }
          : state,
        changed,
        `settings-processing-interval:${changed ? 'set' : 'unchanged'}`,
        carriers,
        options.runtimeEvaluation,
        EMPTY_ISSUES,
        false,
      )
    }
  }
}

function finalizeAccepted(
  original: CanonicalGameStateV1,
  candidate: CanonicalGameStateV1,
  changed: boolean,
  code: CanonicalGameCommandCode,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
  evaluator: CanonicalRuntimeEvaluationPort | undefined,
  issues: readonly CanonicalGameCommandIssue[] = EMPTY_ISSUES,
  refreshEvaluation = true,
): CanonicalGameCommandResult {
  if (!changed) {
    return {
      accepted: true,
      changed: false,
      code,
      state: original,
      issues: freezeIssues(issues),
      runtimeCarriers: carriers,
      intents: EMPTY_INTENTS,
    }
  }
  if (refreshEvaluation && evaluator === undefined) {
    return reject(
      original,
      carriers,
      'runtime-evaluation-carrier-unavailable',
      issue(
        'RUNTIME_EVALUATION_CARRIER_UNAVAILABLE',
        'runtime.skillEffectEvaluationSnapshot',
        'CanonicalGameStateV1 does not carry the runtime Dyson skill-effect snapshot; a transactional evaluation port is required before publishing changed state.',
      ),
    )
  }

  let nextCarriers = carriers
  if (refreshEvaluation) {
    let evaluation: CanonicalRuntimeEvaluationPortResult
    try {
      evaluation = evaluator!.evaluate(
        candidate,
        carriers.skillEffectEvaluationSnapshot,
      )
    } catch (error) {
      return reject(
        original,
        carriers,
        'runtime-evaluation-rejected',
        issue(
          'RUNTIME_EVALUATION_FAILED',
          'ports.runtimeEvaluation',
          errorDetail(error),
        ),
      )
    }
    if (!evaluation.accepted) {
      return reject(
        original,
        carriers,
        'runtime-evaluation-rejected',
        ...(evaluation.issues ?? [
          issue(
            'RUNTIME_EVALUATION_REJECTED',
            'ports.runtimeEvaluation',
            evaluation.code,
          ),
        ]),
      )
    }
    nextCarriers = Object.freeze({
      ...carriers,
      skillEffectEvaluationSnapshot: evaluation.snapshot,
    })
  }

  return {
    accepted: true,
    changed: true,
    code,
    state: candidate,
    issues: freezeIssues(issues),
    runtimeCarriers: nextCarriers,
    intents: EMPTY_INTENTS,
  }
}

function acceptedIntent(
  state: CanonicalGameStateV1,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
  code: CanonicalGameCommandCode,
  intent: CanonicalGameCommandIntent,
): CanonicalGameCommandResult {
  return {
    accepted: true,
    changed: false,
    code,
    state,
    issues: EMPTY_ISSUES,
    runtimeCarriers: carriers,
    intents: Object.freeze([intent]),
  }
}

function rejectDomain(
  state: CanonicalGameStateV1,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
  code: CanonicalGameCommandCode,
  path: string,
  detail: string,
  issues: readonly CanonicalGameCommandIssue[] = EMPTY_ISSUES,
): CanonicalGameCommandResult {
  return reject(
    state,
    carriers,
    code,
    ...issues,
    issue('CANONICAL_COMMAND_REJECTED', path, detail),
  )
}

function reject(
  state: CanonicalGameStateV1,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
  code: CanonicalGameCommandCode,
  ...issues: readonly CanonicalGameCommandIssue[]
): CanonicalGameCommandResult {
  return {
    accepted: false,
    changed: false,
    code,
    state,
    issues: freezeIssues(issues),
    runtimeCarriers: carriers,
    intents: EMPTY_INTENTS,
  }
}

function issue(
  code: string,
  path: string,
  detail: string,
): CanonicalGameCommandIssue {
  return Object.freeze({ code, path, detail })
}

function freezeIssues(
  issues: readonly CanonicalGameCommandIssue[],
): readonly CanonicalGameCommandIssue[] {
  return issues.length === 0
    ? EMPTY_ISSUES
    : Object.freeze([...issues])
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function researchTuningCarrierUnavailable(
  state: CanonicalGameStateV1,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
): CanonicalGameCommandResult {
  return reject(
    state,
    carriers,
    'research-tuning-carrier-unavailable',
    issue(
      'RESEARCH_TUNING_CARRIER_UNAVAILABLE',
      'runtime.compatibilityTuning',
      'Research transactions require compatibility tuning from the current hydrated session.',
    ),
  )
}

function selectedPresetCarrierUnavailable(
  state: CanonicalGameStateV1,
  carriers: Readonly<CanonicalGameRuntimeCarriers>,
): CanonicalGameCommandResult {
  return reject(
    state,
    carriers,
    'selected-skill-preset-carrier-unavailable',
    issue(
      'SELECTED_SKILL_PRESET_CARRIER_UNAVAILABLE',
      'runtime.selectedSkillPresetSlot',
      "Unity's selectedPreset value is required to synchronize the live queue and bot distribution but is absent from CanonicalGameStateV1.",
    ),
  )
}

function dysonAutomationSettingGate(
  state: Readonly<CanonicalGameStateV1>,
  facilityId: CanonicalFacilityId,
): string | null {
  if (!state.infinity.automationUnlocked.bots) {
    return 'automation-locked'
  }
  if (
    facilityId === 'matrioshka_brains' &&
    !state.quantum.unlocks.matrioshkaBrains
  ) {
    return 'facility-locked'
  }
  if (
    facilityId === 'birch_planets' &&
    !state.quantum.unlocks.birchPlanets
  ) {
    return 'facility-locked'
  }
  if (
    facilityId === 'galactic_brains' &&
    !state.quantum.unlocks.galacticBrains
  ) {
    return 'facility-locked'
  }
  return null
}

function researchAutomationSettingGate(
  state: Readonly<CanonicalGameStateV1>,
  researchId: string,
): string | null {
  if (!state.infinity.automationUnlocked.research) {
    return 'automation-locked'
  }
  if (
    !Object.prototype.hasOwnProperty.call(
      state.research.automation.enabledById,
      researchId,
    )
  ) {
    return 'unknown-research'
  }
  const facilityId =
    researchId === 'research.matrioshka_brains_upgrade'
      ? 'matrioshka_brains'
      : researchId === 'research.birch_planets_upgrade'
        ? 'birch_planets'
        : researchId === 'research.galactic_brains_upgrade'
          ? 'galactic_brains'
          : null
  if (
    facilityId !== null &&
    state.dyson.facilities[facilityId][0] +
      state.dyson.facilities[facilityId][1] <=
      0
  ) {
    return 'research-locked'
  }
  return null
}

function normalizeBotDistribution(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const clamped = Math.max(0, Math.min(1, value))
  return Math.round(clamped * 100) / 100
}

function replacePreset(
  presets: CanonicalGameStateV1['skills']['presets'],
  slot: CanonicalSkillPresetSlot,
  preset: CanonicalGameStateV1['skills']['presets'][number],
): CanonicalGameStateV1['skills']['presets'] {
  const candidate = [...presets]
  candidate[slot - 1] = preset
  return candidate as unknown as CanonicalGameStateV1['skills']['presets']
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}
