import { loadCheckedInProgressionMatrixFixtures } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/scripts/support/progressionMatrixFixtures.ts'
import { advanceRealityWorkers } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/simulation/realityWorkers.ts'
import { REALITY_UPGRADE_DEFINITIONS } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/simulation/realityUpgrades.ts'
import { SIMULATION_UPGRADE_DEFINITIONS } from '/Users/matthewrushworth/Projects/Idle Dyson Swarm/src/simulation/dreamEducationUpgrades.ts'

process.stdout.write(`${JSON.stringify({
  realityUpgradeDefinitions: [...REALITY_UPGRADE_DEFINITIONS.values()],
  simulationUpgradeDefinitions: [...SIMULATION_UPGRADE_DEFINITIONS.values()],
}, null, 2)}\n`)

for (const fixture of loadCheckedInProgressionMatrixFixtures().filter(({ id }) =>
  id === 'reality-unlock' || id === 'mature-simulations' || id === 'late-quantum')) {
  const reality = advanceRealityWorkers(fixture.state, 0)
  const dream = fixture.state.dream
  process.stdout.write(`${JSON.stringify({
    id: fixture.id,
    saveSha256: fixture.saveSha256,
    reality: fixture.state.reality,
    realityDerived: {
      status: reality.status,
      generationPerSecond: reality.generationPerSecond,
      workersGenerated: reality.workersGenerated,
      automaticInfluence: reality.automaticInfluence,
    },
    dream: {
      resources: dream.resources,
      resetCount: dream.resetCount,
      strangeMatter: dream.strangeMatter,
      disasterStage: dream.disasterStage,
      ownedUpgrades: Object.entries(dream.upgrades).filter(([, owned]) => owned).map(([id]) => id),
      education: dream.education,
      purchaseBatches: dream.purchaseBatches,
    },
  }, (_key, value) => typeof value === 'bigint' ? `${value}n` : value, 2)}\n`)
}
