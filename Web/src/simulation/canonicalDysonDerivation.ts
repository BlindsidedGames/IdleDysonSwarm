import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
} from './dysonFacilities'
import {
  createBasicDysonState,
  type BasicDysonRates,
} from './dysonModel'
import { isSupportedStaticSkill, staticSkillEffects } from './skillEffects'
import { calculateStat } from './stat'

export interface DysonEntitlements {
  readonly permanentDoubleIp: boolean
}

export type DysonDerivationIssueCode =
  | 'DYSON_OWNED_SKILL_UNSUPPORTED'
  | 'DYSON_RESEARCH_EFFECT_UNSUPPORTED'
  | 'DYSON_SECRET_BUFF_UNSUPPORTED'
  | 'DYSON_INFINITY_MODIFIER_UNSUPPORTED'
  | 'DYSON_AVOCADO_MODIFIER_UNSUPPORTED'
  | 'DYSON_MEGA_STRUCTURE_UNSUPPORTED'
  | 'DYSON_QUANTUM_LEVEL_UNSUPPORTED'

export interface DysonDerivationIssue {
  readonly code: DysonDerivationIssueCode
  readonly path: string
  readonly detail: string
}

export interface DerivedBasicDysonState {
  readonly allocation: {
    readonly workers: number
    readonly researchers: number
  }
  readonly globals: {
    readonly moneyMultiplier: number
    readonly scienceMultiplier: number
    readonly panelsPerSecond: number
    readonly panelLifetimeSeconds: number
  }
  readonly facilityModifiers: Readonly<
    Record<BasicDysonFacilityId, number>
  >
  readonly rates: Readonly<BasicDysonRates>
  readonly entitlements: DysonEntitlements
}

export type DysonDerivationResult =
  | { readonly ok: true; readonly value: DerivedBasicDysonState }
  | { readonly ok: false; readonly issues: readonly DysonDerivationIssue[] }

const FACILITY_MODIFIER_STATS: Readonly<
  Record<BasicDysonFacilityId, string>
> = {
  assembly_lines: 'Facility.AssemblyLine.Modifier',
  ai_managers: 'Facility.Manager.Modifier',
  servers: 'Facility.Server.Modifier',
  data_centers: 'Facility.DataCenter.Modifier',
  planets: 'Facility.Planet.Modifier',
}

/**
 * Reconstructs the exact characterized Basic Dyson derived state from
 * canonical durable causes plus compatibility tuning and platform
 * entitlements. Unsupported active dependencies reject as typed issues rather
 * than falling back to cached Unity values or approximate formulas.
 */
export function deriveBasicDysonState(
  state: CanonicalGameStateV1,
  tuning: Readonly<DysonCompatibilityTuning>,
  entitlements: DysonEntitlements,
): DysonDerivationResult {
  const issues = findUnsupportedDependencies(state)
  if (issues.length > 0) {
    return { ok: false, issues: Object.freeze(issues) }
  }

  const ownedSkills = Object.entries(state.skills.byId)
    .filter(([, skill]) => skill.owned)
    .map(([id]) => id)
    .sort()
  const moneyMultiplier = quantumMultiplier(state.quantum.cashBonusLevels)
  const scienceMultiplier = quantumMultiplier(
    state.quantum.scienceBonusLevels,
  )
  const panelLifetime = 10
  const facilityModifiers = Object.fromEntries(
    BASIC_DYSON_FACILITY_IDS.map((id) => [
      id,
      calculateStat(
        1,
        staticSkillEffects(ownedSkills, FACILITY_MODIFIER_STATS[id]),
      ),
    ]),
  ) as Record<BasicDysonFacilityId, number>
  const model = createBasicDysonState({
    money: state.dyson.money,
    science: state.dyson.science,
    bots: state.dyson.bots,
    panels: state.dyson.totalPanelsDecayed,
    workers: state.dyson.workers,
    researchers: state.dyson.researchers,
    moneyMultiplier,
    scienceMultiplier,
    panelRateMultiplier: tuning.panelsPerSecMulti,
    panelLifetime,
    ownedSkills,
    facilities: Object.fromEntries(
      BASIC_DYSON_FACILITY_IDS.map((id) => [
        id,
        [...state.dyson.facilities[id]],
      ]),
    ) as Record<BasicDysonFacilityId, [number, number]>,
    modifiers: {
      assembly_lines: 1,
      ai_managers: 1,
      servers: 1,
      data_centers: 1,
      planets: 1,
    },
    automation: {
      enabledFacilities: BASIC_DYSON_FACILITY_IDS.filter(
        (id) => state.dyson.automation.enabledFacilities[id],
      ),
      buyMode: state.dyson.automation.buyMode,
      roundedBulkBuy: state.dyson.automation.roundedBulkBuy,
    },
  })

  return {
    ok: true,
    value: Object.freeze({
      allocation: Object.freeze({
        workers: state.dyson.workers,
        researchers: state.dyson.researchers,
      }),
      globals: Object.freeze({
        moneyMultiplier,
        scienceMultiplier,
        panelsPerSecond: model.rates.panels,
        panelLifetimeSeconds: panelLifetime,
      }),
      facilityModifiers: Object.freeze(facilityModifiers),
      rates: Object.freeze({ ...model.rates }),
      entitlements: Object.freeze({ ...entitlements }),
    }),
  }
}

function findUnsupportedDependencies(
  state: CanonicalGameStateV1,
): DysonDerivationIssue[] {
  const issues: DysonDerivationIssue[] = []
  for (const [id, skill] of Object.entries(state.skills.byId)) {
    if (skill.owned && !isSupportedStaticSkill(id)) {
      issues.push({
        code: 'DYSON_OWNED_SKILL_UNSUPPORTED',
        path: `skills.byId.${id}`,
        detail: `Owned skill '${id}' is not characterized by the Basic Dyson stat pipeline.`,
      })
    }
  }
  for (const [id, level] of Object.entries(state.research.levelsById)) {
    if (level > 0) {
      issues.push({
        code: 'DYSON_RESEARCH_EFFECT_UNSUPPORTED',
        path: `research.levelsById.${id}`,
        detail: `Research '${id}' requires runtime effect materialization.`,
      })
    }
  }
  if (state.infinity.secretsOfTheUniverse > 0n) {
    issues.push({
      code: 'DYSON_SECRET_BUFF_UNSUPPORTED',
      path: 'infinity.secretsOfTheUniverse',
      detail: 'Secret-buff reconstruction is not yet ported.',
    })
  }
  if (state.infinity.points > 0n) {
    issues.push({
      code: 'DYSON_INFINITY_MODIFIER_UNSUPPORTED',
      path: 'infinity.points',
      detail: 'Infinity facility modifier reconstruction is not yet ported.',
    })
  }
  if (
    state.avocado.unlocked ||
    state.avocado.infinityPoints > 0 ||
    state.avocado.influence > 0 ||
    state.avocado.strangeMatter > 0 ||
    state.avocado.overflowMultiplier > 0
  ) {
    issues.push({
      code: 'DYSON_AVOCADO_MODIFIER_UNSUPPORTED',
      path: 'avocado',
      detail: 'Avocado multiplier reconstruction is not yet ported.',
    })
  }
  for (const id of [
    'matrioshka_brains',
    'birch_planets',
    'galactic_brains',
  ] as const) {
    const owned = state.dyson.facilities[id]
    if (
      owned[0] > 0 ||
      owned[1] > 0 ||
      state.dyson.automation.enabledFacilities[id]
    ) {
      issues.push({
        code: 'DYSON_MEGA_STRUCTURE_UNSUPPORTED',
        path: `dyson.facilities.${id}`,
        detail: `Mega-structure '${id}' is outside the characterized Basic Dyson slice.`,
      })
    }
  }
  for (const [id, levels] of [
    ['cashBonusLevels', state.quantum.cashBonusLevels],
    ['scienceBonusLevels', state.quantum.scienceBonusLevels],
  ] as const) {
    if (levels > BigInt(Number.MAX_SAFE_INTEGER)) {
      issues.push({
        code: 'DYSON_QUANTUM_LEVEL_UNSUPPORTED',
        path: `quantum.${id}`,
        detail: `Quantum bonus '${id}' exceeds the characterized numeric range.`,
      })
    }
  }
  return issues
}

function quantumMultiplier(levels: bigint): number {
  return 1 + Number(levels) * 0.05
}
