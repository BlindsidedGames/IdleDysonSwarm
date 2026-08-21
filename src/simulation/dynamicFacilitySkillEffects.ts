/**
 * Canonical inputs consumed by Unity's dynamic facility production and
 * facility-modifier skill effects. Values such as starsSurrounded are derived
 * earlier by the production model so this resolver remains pure and does not
 * depend on Unity's mutable Oracle graph.
 */
export interface DynamicFacilitySkillContext {
  readonly panelLifetimeSeconds: number
  readonly fragments: number
  readonly assignedSkillPoints: number
  readonly serversTotal: number
  readonly manualDataCenters: number
  readonly effectivePlanets: number
  readonly starsSurrounded: number
  readonly galaxiesEngulfed: number
  readonly rudimentarySingularityProduction: number
  readonly pocketDimensionsProduction: number
  readonly superRadiantScatteringTimerSeconds: number
}

const UNITY_FLOAT_001 = Math.fround(0.01)
const UNITY_FLOAT_005 = Math.fround(0.05)
const UNITY_FLOAT_01 = Math.fround(0.1)

/**
 * Resolves effects handled by the facility branches of Unity's
 * SkillEffectCatalog.TryResolveDynamicValue. Undefined means the effect is not
 * dynamic in this resolver and its authored value should be used.
 */
export function resolveDynamicFacilitySkillEffect(
  effectId: string,
  context: Readonly<DynamicFacilitySkillContext>,
): number | undefined {
  switch (effectId) {
    case 'effect.staying_power.assembly_lines':
      return 1 + UNITY_FLOAT_001 * context.panelLifetimeSeconds
    case 'effect.rudimentary_singularity.data_centers':
      return context.rudimentarySingularityProduction
    case 'effect.parallel_computation.data_centers':
      return context.serversTotal > 1
        ? 1 + UNITY_FLOAT_01 * Math.log2(context.serversTotal)
        : 1
    case 'effect.pocket_dimensions.planets':
      return context.pocketDimensionsProduction
  }

  const skillId = modifierSkillId(effectId)
  if (skillId === undefined) return undefined

  switch (skillId) {
    case 'fragmentAssembly':
      return context.fragments > 4 ? 3 : 1
    case 'progressiveAssembly':
      return 1 + 0.5 * context.fragments
    case 'versatileProductionTactics':
      if (effectId.endsWith('.assembly_lines_modifier')) return 1.5
      if (effectId.endsWith('.planets_modifier')) {
        return context.effectivePlanets >= 100 ? 1.5 : 1
      }
      return 1
    case 'oneMinutePlan':
      return context.panelLifetimeSeconds >= 60 ? 5 : 1.5
    case 'dysonSubsidies':
      return context.starsSurrounded >= 1 ? 2 : 1
    case 'purityOfBody':
      return Math.pow(1.25, context.assignedSkillPoints)
    case 'clusterNetworking':
      return context.serversTotal > 1
        ? 1 + UNITY_FLOAT_005 * Math.log10(context.serversTotal)
        : 1
    case 'parallelProcessing':
      return context.serversTotal > 1
        ? 1 + UNITY_FLOAT_005 * Math.log2(context.serversTotal)
        : 1
    case 'whatWillComeToPass':
      return 1 + 0.01 * context.manualDataCenters
    case 'hypercubeNetworks':
      return context.serversTotal > 1
        ? 1 + 0.1 * Math.log10(context.serversTotal)
        : 1
    case 'galacticPradigmShift':
      return context.galaxiesEngulfed >= 1 ? 3 : 1.5
    case 'purityOfSEssence':
      return Math.pow(1.42, context.assignedSkillPoints)
    case 'superRadiantScattering':
      return (
        1 + 0.01 * context.superRadiantScatteringTimerSeconds
      )
    default:
      return undefined
  }
}

function modifierSkillId(effectId: string): string | undefined {
  const match = /^effect\.([^.]+)\.[^.]+_modifier$/.exec(effectId)
  return match?.[1]
}
