import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
  CanonicalOwnedPair,
} from '../game-state/types'
import {
  DYSON_AUTOMATION_TARGETS,
  previewDysonFacilityPurchase,
  runDysonAutomationTick,
  tryPurchaseDysonFacility,
  type DysonAutomationAttempt,
  type DysonAutomationState,
  type DysonFacilityPurchasePreview,
} from './dysonAutomation'
import {
  DYSON_FACILITY_DEFINITIONS,
} from './dysonFacilityCatalog'
import type { SimulationAutomationPolicy } from './types'

export interface CanonicalDysonAutomationResult {
  readonly state: CanonicalGameStateV1
  readonly attempts: readonly DysonAutomationAttempt[]
}

export interface CanonicalFacilityPurchaseResult {
  readonly state: CanonicalGameStateV1
  readonly attempt: DysonAutomationAttempt
}

export type CanonicalFacilityPurchasePreview<
  TFacilityId extends CanonicalFacilityId = CanonicalFacilityId,
> = DysonFacilityPurchasePreview<TFacilityId>

/**
 * Returns the exact immutable quote used by the canonical purchase path.
 */
export function previewCanonicalFacilityPurchase<
  TFacilityId extends CanonicalFacilityId,
>(
  state: CanonicalGameStateV1,
  facilityId: TFacilityId,
  planetModifier = 1,
): CanonicalFacilityPurchasePreview<TFacilityId> {
  const automationState = toDysonAutomationState(state, planetModifier)
  automationState.globalEnabled = true
  automationState.enabledFacilities[facilityId] = true
  return previewDysonFacilityPurchase(
    automationState,
    facilityId,
    'preserve-configured-mode',
    (id, candidate) => isFacilityUnlocked(state, candidate, id),
  )
}

/**
 * Applies an unlock-aware manual basic-facility purchase to canonical state.
 */
export function tryPurchaseCanonicalFacility(
  state: CanonicalGameStateV1,
  facilityId: CanonicalFacilityId,
  planetModifier = 1,
): CanonicalFacilityPurchaseResult {
  const automationState = toDysonAutomationState(state, planetModifier)
  automationState.globalEnabled = true
  automationState.enabledFacilities[facilityId] = true
  const result = tryPurchaseDysonFacility(
    automationState,
    facilityId,
    (id, candidate) => isFacilityUnlocked(state, candidate, id),
  )
  return {
    state: result.attempt.purchased
      ? replaceDysonState(
          state,
          result.state.money,
          result.state.facilities,
          state.timeline.dysonAutomationTargetIndex,
        )
      : state,
    attempt: result.attempt,
  }
}

/**
 * Projects facility visibility without coupling it to affordability or the
 * selected purchase quantity. Megastructures remain a presentation group,
 * but use the same facility catalog and ownership contract as every other
 * Dyson facility.
 */
export function isCanonicalFacilityVisible(
  state: CanonicalGameStateV1,
  facilityId: CanonicalFacilityId,
): boolean {
  const ownership = state.dyson.facilities[facilityId]
  if (ownership[0] + ownership[1] > 0) return true
  const definition = DYSON_FACILITY_DEFINITIONS[facilityId]
  if (definition.quantumUnlock !== undefined) {
    return state.quantum.unlocks[definition.quantumUnlock]
  }
  return false
}

/**
 * Runs Unity's rotating eight-target bot automation against one canonical
 * snapshot. Each unlock is re-evaluated after the previous sequential debit.
 */
export function runCanonicalDysonAutomation(
  state: CanonicalGameStateV1,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
  planetModifier = 1,
): CanonicalDysonAutomationResult {
  const automationState = toDysonAutomationState(state, planetModifier)
  const result = runDysonAutomationTick(
    automationState,
    policy,
    (facilityId, candidate) =>
      isFacilityUnlocked(state, candidate, facilityId) === true,
  )
  return {
    state: replaceDysonState(
      state,
      result.state.money,
      result.state.facilities,
      result.nextTargetIndex,
    ),
    attempts: result.attempts,
  }
}

function toDysonAutomationState(
  state: CanonicalGameStateV1,
  planetModifier: number,
): DysonAutomationState {
  return {
    money: state.dyson.money,
    facilities: Object.fromEntries(
      DYSON_AUTOMATION_TARGETS.map((id) => [
        id,
        [...state.dyson.facilities[id]],
      ]),
    ) as DysonAutomationState['facilities'],
    targetIndex: state.timeline.dysonAutomationTargetIndex,
    globalEnabled: state.infinity.automationUnlocked.bots,
    enabledFacilities: {
      ...state.dyson.automation.enabledFacilities,
    },
    // The resolver below is authoritative and recalculates from each
    // sequential candidate. This field remains populated for the generic
    // automation contract and diagnostics.
    unlockedFacilities: Object.fromEntries(
      DYSON_AUTOMATION_TARGETS.map((id) => [id, false]),
    ) as Record<CanonicalFacilityId, boolean>,
    buyMode: state.dyson.automation.buyMode,
    roundedBulkBuy: state.dyson.automation.roundedBulkBuy,
    retainedFacilities: {
      ...state.infinity.retainedFacilities,
    },
    assemblyMegaLinesOwned:
      state.skills.byId.assemblyMegaLines?.owned === true,
    planetModifier,
    terraNovaOwned: state.skills.byId.terraNova?.owned === true,
    terraGloriaeOwned: state.skills.byId.terraGloriae?.owned === true,
  }
}

function isFacilityUnlocked(
  canonical: CanonicalGameStateV1,
  candidate: Readonly<DysonAutomationState>,
  id: CanonicalFacilityId,
): true | 'locked' | 'prerequisite-not-met' {
  const definition = DYSON_FACILITY_DEFINITIONS[id]
  const ownership = candidate.facilities[id]
  if (
    definition.group === 'megastructure' &&
    ownership[0] + ownership[1] > 0
  ) {
    return true
  }
  if (
    definition.quantumUnlock !== undefined &&
    !canonical.quantum.unlocks[definition.quantumUnlock]
  ) {
    return 'locked'
  }
  const prerequisite = definition.prerequisite
  if (prerequisite === undefined) return true
  const pair = candidate.facilities[prerequisite.facilityId]
  const owned = pair[0] + pair[1]
  return owned >= prerequisite.owned
    ? true
    : definition.group === 'megastructure'
      ? 'prerequisite-not-met'
      : 'locked'
}

function replaceDysonState(
  state: CanonicalGameStateV1,
  money: number,
  facilities: Readonly<
    Record<CanonicalFacilityId, CanonicalOwnedPair>
  >,
  targetIndex: number,
): CanonicalGameStateV1 {
  return {
    ...state,
    dyson: {
      ...state.dyson,
      money,
      facilities,
    },
    timeline: {
      ...state.timeline,
      dysonAutomationTargetIndex: targetIndex,
    },
  }
}
