import { deriveCanonicalTinkerStats } from './canonicalTinker'
import { hasManualLabourAugment, MANUAL_LABOUR_AUGMENTS } from './skillSubskills'
import { highestOwnedFacility } from './stellarArithmetic'
import { resolveStellarAggregate } from './canonicalSkillIntervalEffects'
import { addContinuous, multiplyContinuous } from './numeric'
import { deriveDiscoveryEffects } from './discoveryEffects'
import type { CanonicalEventTimeState } from './canonicalEventTimeModel'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { purchaseCanonicalSkill, refundCanonicalSkill } from './canonicalSkillTransactions'

export interface SkillProductionPreview {
  readonly projected: boolean
  readonly rows: readonly {
    readonly id: keyof ReturnType<typeof productionValues>
    readonly changed: boolean
    readonly before: number
    readonly after: number
  }[]
}

function productionValues(derived: Extract<ReturnType<typeof deriveBasicDysonState>, { ok: true }>['value'], state: CanonicalEventTimeState['gameState']) {
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
  const tinker = deriveCanonicalTinkerStats(state, derived.auxiliary.tinkerAssemblyYield)
  const makesFacilities = !hasManualLabourAugment(state, 'handAssembly') && state.challenges?.active !== 'built-by-hand' && state.skills.byId.manualLabour?.owned && state.dyson.facilities.ai_managers[1] >= 1
  return { ...rates, manualBots: makesFacilities ? 0 : multiplyContinuous(tinker.botYield, derived.botBoostMultiplier), manualAssemblyLines: makesFacilities ? tinker.assemblyYield : 0, panelLifetime: derived.globals.panelLifetimeSeconds, discoverySpeed: discovery?.speed ?? 1, elevationSpeed: state.discovery?.elevation ? discovery!.elevationSpeed : 1, enlightenmentSpeed: state.discovery?.enlightenment ? discovery!.enlightenmentSpeed : 1, cashBotsMultiplier: discovery?.cashBotsMultiplier ?? 1, discoveryMultiplier: discovery?.multiplier ?? 1 }
}

/** On-demand comparison only: never advance production, automation, or the real save. */
export function previewSkillProduction(
  runtime: Pick<CanonicalEventTimeState, 'gameState' | 'compatibilityTuning' | 'entitlements' | 'evaluationSnapshot'>,
  skillId: string,
  kind: 'purchase' | 'refund',
): SkillProductionPreview {
  const state = runtime.gameState
  const change = (kind === 'purchase' ? purchaseCanonicalSkill : refundCanonicalSkill)(state, skillId)
  if (!change.accepted) throw new Error(change.reason)
  let candidate = change.state
  let projected = false
  if (kind === 'purchase') {
    for (const id of ['androids', 'pocketAndroids', 'superRadiantScattering', MANUAL_LABOUR_AUGMENTS.patientHands]) {
      const skill = candidate.skills.byId[id]
      if (!change.affectedSkillIds.includes(id) || !skill?.owned || skill.timerSeconds !== 0) continue
      projected = true
      candidate = { ...candidate, skills: { ...candidate.skills, byId: {
        ...candidate.skills.byId, [id]: { ...skill, timerSeconds: 600 },
      } } }
    }
  }
  const derive = (source: typeof state, snapshot = runtime.evaluationSnapshot) => {
    const result = deriveBasicDysonState(source, runtime.compatibilityTuning, runtime.entitlements, snapshot)
    if (!result.ok) throw new Error(result.issues[0]?.detail ?? 'Production preview unavailable')
    return result.value
  }
  const before = productionValues(derive(state, derive(state).nextEvaluationSnapshot), state)
  // Assignment refreshes the effect snapshot before the next production read.
  const after = productionValues(derive(candidate, derive(candidate).nextEvaluationSnapshot), candidate)
  const ids = Object.keys(before) as (keyof typeof before)[]
  return {
    projected,
    rows: ids.map((id) => ({ id, before: before[id], after: after[id],
      changed: Math.abs(before[id] - after[id]) >
        1e-10 * Math.max(Math.abs(before[id]), Math.abs(after[id]), Number.MIN_VALUE),
    })),
  }
}
