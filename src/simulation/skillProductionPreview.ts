import { withCanonicalBotAllocation } from './canonicalBotAllocation'
import { canTinkerAssemblyLines } from './manualFacilityAugments'
import { MANUAL_LABOUR_TUNING } from './manualLabourAugments'
import { deriveCanonicalTinkerStats } from './canonicalTinker'
import { hasManualLabourAugment, MANUAL_LABOUR_AUGMENTS } from './skillSubskills'
import { highestOwnedFacility } from './stellarArithmetic'
import { resolveStellarAggregate } from './canonicalSkillIntervalEffects'
import { addContinuous, multiplyContinuous } from './numeric'
import { deriveDiscoveryEffects } from './discoveryEffects'
import type { CanonicalEventTimeState } from './canonicalEventTimeModel'
import { deriveDysonProduction } from './canonicalDysonDerivation'
import { purchaseCanonicalSkill, refundCanonicalSkill } from './canonicalSkillTransactions'
import { deriveDreamFoundationalInformationProductionFacts } from './dreamFoundationalInformation'
import { deriveDreamSpaceAgeProductionFacts } from './dreamSpaceAge'

export interface SkillProductionPreview {
  readonly projected: boolean
  readonly projectedSeconds: number
  readonly rows: readonly {
    readonly id: keyof ReturnType<typeof productionValues>
    readonly changed: boolean
    readonly before: number
    readonly after: number
  }[]
}

function productionValues(derived: Extract<ReturnType<typeof deriveDysonProduction>, { ok: true }>['value'], state: CanonicalEventTimeState['gameState']) {
  const discovery = state.discovery?.unlocked ? deriveDiscoveryEffects(state, derived.nextEvaluationSnapshot) : null
  const rates = { ...derived.productionArrivalRates, galactic_brains: 0 }
  const target = highestOwnedFacility(state.dyson.facilities)
  if (target !== null) {
    // Compare one game second using the same starting-balance funding rule as play.
    const stellar = resolveStellarAggregate(state.dyson.bots, rates.bots,
      derived.auxiliary.stellarSacrifice.botsPerSecond,
      derived.auxiliary.stellarSacrifice.facilitiesPerSecond, 1)
    rates[target] = addContinuous(rates[target], stellar.facilitiesProduced)
    rates.bots -= stellar.botsConsumed
  }
  const tinker = deriveCanonicalTinkerStats(state, derived.auxiliary.tinkerAssemblyYield, derived.auxiliary.tinkerAdditionalFacilityYields)
  const makesFacilities = canTinkerAssemblyLines(state)
  // Match the Simulation screen's base rates before the temporary Double Time multiplier.
  const foundational = deriveDreamFoundationalInformationProductionFacts(state, 1)
  const spaceAge = deriveDreamSpaceAgeProductionFacts(state, 1)
  if (foundational.status !== 'success' || spaceAge.status !== 'success') throw new Error('Simulation production preview unavailable')
  return { ...rates, manualBots: makesFacilities && !hasManualLabourAugment(state, 'handAssembly') ? 0 : multiplyContinuous(tinker.botYield, derived.botBoostMultiplier), manualAssemblyLines: tinker.facilityYields?.assembly_lines ?? 0,
    manualManagers: tinker.facilityYields?.ai_managers ?? 0,
    manualServers: tinker.facilityYields?.servers ?? 0,
    manualDataCenters: tinker.facilityYields?.data_centers ?? 0,
    manualPlanets: tinker.facilityYields?.planets ?? 0,
    manualMatrioshka: tinker.facilityYields?.matrioshka_brains ?? 0,
    manualBirch: tinker.facilityYields?.birch_planets ?? 0,
    manualGalactic: tinker.facilityYields?.galactic_brains ?? 0,
    hunterCommunity: foundational.facts.timers.hunterTimerProgress.outputPerSecond.community,
    gathererCommunity: foundational.facts.timers.gathererTimerProgress.outputPerSecond.community,
    launchedPanelEnergy: spaceAge.facts.energy.swarmPerSecond,
    panelLifetime: derived.globals.panelLifetimeSeconds, discoverySpeed: discovery?.speed ?? 1, elevationSpeed: state.discovery?.elevation ? discovery!.elevationSpeed : 1, enlightenmentSpeed: state.discovery?.enlightenment ? discovery!.enlightenmentSpeed : 1, cashBotsMultiplier: discovery?.cashBotsMultiplier ?? 1, discoveryMultiplier: discovery?.multiplier ?? 1 }
}

/** On-demand comparison only: never advance production, automation, or the real save. */
export function previewSkillProduction(
  runtime: Pick<CanonicalEventTimeState, 'gameState' | 'compatibilityTuning' | 'entitlements' | 'evaluationSnapshot'>,
  skillId: string,
  kind: 'purchase' | 'refund',
): SkillProductionPreview {
  const state = withCanonicalBotAllocation(runtime.gameState)
  const change = (kind === 'purchase' ? purchaseCanonicalSkill : refundCanonicalSkill)(state, skillId)
  if (!change.accepted) throw new Error(change.reason)
  let candidate = withCanonicalBotAllocation(change.state)
  let projected = false
  let projectedSeconds = 0
  if (kind === 'purchase') {
    for (const id of ['androids', 'pocketAndroids', 'superRadiantScattering', MANUAL_LABOUR_AUGMENTS.patientHands]) {
      const skill = candidate.skills.byId[id]
      if (!change.affectedSkillIds.includes(id) || !skill?.owned || skill.timerSeconds !== 0) continue
      projected = true
      const seconds = id === MANUAL_LABOUR_AUGMENTS.patientHands ? MANUAL_LABOUR_TUNING.maximumWaitingSeconds : 600
      projectedSeconds = Math.max(projectedSeconds, seconds)
      candidate = { ...candidate, skills: { ...candidate.skills, byId: {
        ...candidate.skills.byId, [id]: { ...skill, timerSeconds: seconds },
      } } }
    }
  }
  const derive = (source: typeof state, snapshot = runtime.evaluationSnapshot) => {
    const result = deriveDysonProduction(source, runtime.compatibilityTuning, runtime.entitlements, snapshot)
    if (!result.ok) throw new Error(result.issues[0]?.detail ?? 'Production preview unavailable')
    return result.value
  }
  const before = productionValues(derive(state, derive(state).nextEvaluationSnapshot), state)
  // Assignment refreshes the effect snapshot before the next production read.
  const after = productionValues(derive(candidate, derive(candidate).nextEvaluationSnapshot), candidate)
  const ids = Object.keys(before) as (keyof typeof before)[]
  return {
    projected,
    projectedSeconds,
    rows: ids.map((id) => ({ id, before: before[id], after: after[id],
      changed: Math.abs(before[id] - after[id]) >
        1e-10 * Math.max(Math.abs(before[id]), Math.abs(after[id]), Number.MIN_VALUE),
    })),
  }
}
