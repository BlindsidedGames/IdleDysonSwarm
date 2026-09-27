import { expect, test } from 'vitest'
import { createDeterministicMatureDysonFixture, DETERMINISTIC_DYSON_SNAPSHOT, DETERMINISTIC_DYSON_TUNING } from '../../scripts/support/deterministicMatureDysonFixture'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { MEGA_STRUCTURE_FACILITY_IDS } from './dysonFacilityCatalog'
import { SWARM_AUGMENTS } from './skillSubskills'
import { applyStatEffect } from './stat'

test.each(MEGA_STRUCTURE_FACILITY_IDS)('%s ordered production contributions include its aggregate modifiers exactly once', facilityId => {
  const state = createDeterministicMatureDysonFixture({ ownedSkillIds: ['superSwarm', 'superRadiantScattering'] })
  state.discovery = { unlocked: true, completions: 1n, progress: 0, startingPower: 0n, speedUpgrades: 0n }
  state.challenges = { ...state.challenges!, blankSlateCompleted: true, galvanizedSkillIds: ['superSwarm'] }
  state.skills.byId = { ...state.skills.byId, [SWARM_AUGMENTS.botnet]: { owned: true, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 } }
  const result = deriveBasicDysonState(state, DETERMINISTIC_DYSON_TUNING, { permanentDoubleIp: false }, DETERMINISTIC_DYSON_SNAPSHOT)
  if (!result.ok) throw Error(JSON.stringify(result.issues))
  const fact = result.value.facilityFacts[facilityId]
  const contributions = fact.details.contributions!
  const attribution = fact.details.modifierContributions!
  const aggregate = contributions.filter(row => row.displayRole === 'modifier')
  expect(aggregate).toHaveLength(1)
  expect(aggregate[0].value).toBe(fact.details.modifier)
  expect(aggregate[0].runningTotal).toBe(fact.production.perSecond)
  expect(fact.production.perSecond).toBeGreaterThan(fact.details.baseProductionPerSecond * fact.ownership.total)
  let running = 0
  for (const row of contributions) {
    running = applyStatEffect(running, { id: row.sourceId, operation: row.operation, value: row.value, order: row.order ?? 0 })
    expect(row.runningTotal).toBe(running)
  }
  expect(running).toBe(fact.production.perSecond)
  // Individual explanations remain in the attribution list, rather than
  // multiplying their already-aggregated values into production a second time.
  expect(attribution.filter(row => row.source?.id === 'superRadiantScattering')).toHaveLength(1)
  expect(attribution.filter(row => row.sourceId === SWARM_AUGMENTS.botnet)).toHaveLength(1)
  expect(attribution.filter(row => row.sourceId === 'discovery.production')).toHaveLength(1)
  expect(contributions.some(row => row.sourceId === SWARM_AUGMENTS.botnet || row.sourceId === 'discovery.production')).toBe(false)
})
