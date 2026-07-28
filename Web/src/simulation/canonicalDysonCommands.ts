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
import type { BasicDysonFacilityId } from './dysonFacilities'
import {
  tryPurchaseMegaStructure,
  type MegaStructureId,
  type MegaStructurePurchaseResult,
} from './megaStructurePurchases'
import type { SimulationAutomationPolicy } from './types'

export interface CanonicalDysonAutomationResult {
  readonly state: CanonicalGameStateV1
  readonly attempts: readonly DysonAutomationAttempt[]
}

export interface CanonicalMegaStructurePurchaseResult
  extends Omit<MegaStructurePurchaseResult, 'state'> {
  readonly state: CanonicalGameStateV1
}

export interface CanonicalBasicFacilityPurchaseResult {
  readonly state: CanonicalGameStateV1
  readonly attempt: DysonAutomationAttempt
}

export type CanonicalBasicFacilityPurchasePreview =
  DysonFacilityPurchasePreview<BasicDysonFacilityId>

/**
 * Returns the exact immutable quote used by the canonical purchase path.
 */
export function previewCanonicalBasicFacilityPurchase(
  state: CanonicalGameStateV1,
  facilityId: BasicDysonFacilityId,
): CanonicalBasicFacilityPurchasePreview {
  const automationState = toDysonAutomationState(state)
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
export function tryPurchaseCanonicalBasicFacility(
  state: CanonicalGameStateV1,
  facilityId: BasicDysonFacilityId,
): CanonicalBasicFacilityPurchaseResult {
  const automationState = toDysonAutomationState(state)
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
 * Applies an unlock-aware manual mega purchase to canonical state while
 * retaining the immutable application-command contract.
 */
export function tryPurchaseCanonicalMegaStructure(
  state: CanonicalGameStateV1,
  facilityId: MegaStructureId,
): CanonicalMegaStructurePurchaseResult {
  const result = tryPurchaseMegaStructure(
    {
      money: state.dyson.money,
      facilities: state.dyson.facilities,
      quantumUnlocks: megaUnlocks(state),
      buyMode: state.dyson.automation.buyMode,
      roundedBulkBuy: state.dyson.automation.roundedBulkBuy,
    },
    facilityId,
  )
  if (!result.purchased) return { ...result, state }
  return {
    ...result,
    state: replaceDysonState(
      state,
      result.state.money,
      result.state.facilities,
      state.timeline.dysonAutomationTargetIndex,
    ),
  }
}

/**
 * Runs Unity's rotating eight-target bot automation against one canonical
 * snapshot. Each unlock is re-evaluated after the previous sequential debit.
 */
export function runCanonicalDysonAutomation(
  state: CanonicalGameStateV1,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
): CanonicalDysonAutomationResult {
  const automationState = toDysonAutomationState(state)
  const result = runDysonAutomationTick(
    automationState,
    policy,
    (facilityId, candidate) =>
      isFacilityUnlocked(state, candidate, facilityId),
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
  }
}

function isFacilityUnlocked(
  canonical: CanonicalGameStateV1,
  candidate: Readonly<DysonAutomationState>,
  id: CanonicalFacilityId,
): boolean {
  const total = (facilityId: CanonicalFacilityId) =>
    candidate.facilities[facilityId][0] +
    candidate.facilities[facilityId][1]
  switch (id) {
    case 'assembly_lines':
      return true
    case 'ai_managers':
      return total('assembly_lines') >= 5
    case 'servers':
      return total('ai_managers') >= 1
    case 'data_centers':
      return total('servers') >= 1
    case 'planets':
      return total('data_centers') >= 1
    case 'matrioshka_brains':
      return (
        canonical.quantum.unlocks.matrioshkaBrains &&
        total('planets') >= 1
      )
    case 'birch_planets':
      return (
        canonical.quantum.unlocks.birchPlanets &&
        total('matrioshka_brains') >= 1
      )
    case 'galactic_brains':
      return (
        canonical.quantum.unlocks.galacticBrains &&
        total('birch_planets') >= 1
      )
  }
}

function megaUnlocks(state: CanonicalGameStateV1) {
  return {
    matrioshkaBrains: state.quantum.unlocks.matrioshkaBrains,
    birchPlanets: state.quantum.unlocks.birchPlanets,
    galacticBrains: state.quantum.unlocks.galacticBrains,
  }
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
