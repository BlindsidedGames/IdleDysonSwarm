import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { extractDynamicSkillId } from './dynamicEffectId'

const PANEL_LIFETIME_SUFFIX = '.panel_lifetime'
const PANELS_PER_SECOND_SUFFIX = '.panels_per_second'

export interface PanelDynamicEffectInputs {
  readonly ownedSkills: ReadonlySet<string>
  readonly botMultitasking: boolean
  readonly botDistribution: number
  readonly fragments: bigint
  readonly managers: readonly [automatic: number, manual: number]
  readonly androidsTimerSeconds: number
  readonly workers: number
  readonly totalPanelsDecayed: number
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
  readonly bots: number
}

export function tryResolvePanelLifetimeDynamicEffect(
  effectId: string,
  inputs: PanelDynamicEffectInputs,
): number | undefined {
  const skillId = extractDynamicSkillId(effectId, PANEL_LIFETIME_SUFFIX)
  if (skillId === undefined) return undefined
  if (!PANEL_LIFETIME_SKILLS.has(skillId)) return undefined
  validateInputs(inputs)

  switch (skillId) {
    case 'panelMaintenance':
      if (!inputs.ownedSkills.has(skillId)) return 0
      return inputs.botMultitasking
        ? 100
        : (1 - inputs.botDistribution) * 100
    case 'panelWarranty':
      if (!inputs.ownedSkills.has(skillId)) return 0
      return inputs.fragments > 0n
        ? 5 * Math.pow(2, Number(inputs.fragments - 1n))
        : 0
    case 'artificiallyEnhancedPanels': {
      if (!inputs.ownedSkills.has(skillId)) return 0
      const managersTotal = inputs.managers[0] + inputs.managers[1]
      return managersTotal >= 1 ? 5 * Math.log10(managersTotal) : 0
    }
    case 'androids':
      if (!inputs.ownedSkills.has(skillId)) return 0
      return Math.floor(
        inputs.androidsTimerSeconds > 600
          ? 200
          : inputs.androidsTimerSeconds / 3,
      )
    case 'renewableEnergy':
      if (!inputs.ownedSkills.has(skillId)) return 1
      return inputs.workers >= 1e7
        ? 1 + 0.1 * Math.log10(inputs.workers / 1e6)
        : 1
    case 'citadelCouncil':
      if (!inputs.ownedSkills.has(skillId)) return 1
      return Math.max(
        1,
        logarithm(inputs.totalPanelsDecayed, 1.2),
      )
    case 'stellarDominance':
      if (!inputs.ownedSkills.has(skillId)) return 1
      return inputs.bots >= stellarSacrificesRequiredBots(inputs) ? 10 : 1
  }
}

export function tryResolvePanelsPerSecondDynamicEffect(
  effectId: string,
  inputs: PanelDynamicEffectInputs,
): number | undefined {
  const skillId = extractDynamicSkillId(effectId, PANELS_PER_SECOND_SUFFIX)
  if (skillId === undefined) return undefined
  if (!PANELS_PER_SECOND_SKILLS.has(skillId)) return undefined
  validateInputs(inputs)

  switch (skillId) {
    case 'reapers':
      if (!inputs.ownedSkills.has(skillId)) return 1
      return Math.max(
        1,
        logarithm(inputs.totalPanelsDecayed, 2) / 10,
      )
    case 'rocketMania':
      if (!inputs.ownedSkills.has(skillId)) return 1
      return inputs.panelsPerSecond > 20
        ? logarithm(inputs.panelsPerSecond, 20)
        : 1
  }
}

const PANEL_LIFETIME_SKILLS = new Set([
  'panelMaintenance',
  'panelWarranty',
  'artificiallyEnhancedPanels',
  'androids',
  'renewableEnergy',
  'citadelCouncil',
  'stellarDominance',
])

const PANELS_PER_SECOND_SKILLS = new Set([
  'reapers',
  'rocketMania',
])

function stellarSacrificesRequiredBots(
  inputs: PanelDynamicEffectInputs,
): number {
  const stars =
    inputs.panelsPerSecond * inputs.panelLifetimeSeconds / 20_000
  let botsNeeded = inputs.ownedSkills.has('supernova')
    ? stars * 1_000_000
    : inputs.ownedSkills.has('stellarObliteration')
      ? stars * 1_000
      : stars
  if (botsNeeded < 1) botsNeeded = 1
  // This resolver is reached only for the owned stellarDominance skill.
  botsNeeded *= 100
  if (inputs.ownedSkills.has('stellarImprovements')) botsNeeded /= 1_000
  return botsNeeded
}

function logarithm(value: number, base: number): number {
  return Math.log(value) / Math.log(base)
}

function validateInputs(inputs: PanelDynamicEffectInputs): void {
  if (!(inputs.ownedSkills instanceof Set)) {
    throw new Error('Panel dynamic effects require an owned-skill set.')
  }
  if (typeof inputs.botMultitasking !== 'boolean') {
    throw new Error('Panel dynamic effects require botMultitasking.')
  }
  requireUnitInterval(inputs.botDistribution, 'botDistribution')
  if (typeof inputs.fragments !== 'bigint' || inputs.fragments < 0n) {
    throw new Error('Panel dynamic effects require non-negative fragments.')
  }
  if (!Array.isArray(inputs.managers) || inputs.managers.length !== 2) {
    throw new Error('Panel dynamic effects require two manager counts.')
  }
  requireNonNegative(inputs.managers[0], 'automatic managers')
  requireNonNegative(inputs.managers[1], 'manual managers')
  requireNonNegative(inputs.androidsTimerSeconds, 'androids timer')
  requireNonNegative(inputs.workers, 'workers')
  requireNonNegative(inputs.totalPanelsDecayed, 'total panels decayed')
  requireNonNegative(inputs.panelsPerSecond, 'panels per second')
  requireNonNegative(inputs.panelLifetimeSeconds, 'panel lifetime')
  requireNonNegative(inputs.bots, 'bots')
}

function requireNonNegative(value: number, label: string): void {
  if (!isFiniteNonNegativeNumber(value)) {
    throw new Error(
      `Panel dynamic effects require finite non-negative ${label}.`,
    )
  }
}

function requireUnitInterval(value: number, label: string): void {
  if (!isFiniteNonNegativeNumber(value) || value > 1) {
    throw new Error(
      `Panel dynamic effects require ${label} between zero and one.`,
    )
  }
}
