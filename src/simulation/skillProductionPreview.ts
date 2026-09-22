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
  return { ...derived.productionArrivalRates, panelLifetime: derived.globals.panelLifetimeSeconds, discoverySpeed: discovery?.speed ?? 1, discoveryMultiplier: discovery?.multiplier ?? 1 }
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
    for (const id of ['androids', 'pocketAndroids', 'superRadiantScattering']) {
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
