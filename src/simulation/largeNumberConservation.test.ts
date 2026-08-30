import { describe, expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalFacilityId, CanonicalGameStateV1 } from '../game-state/types'
import { feedAllToAvocado } from './avocadoDomain'
import { purchaseCanonicalInfinityShopItem } from './canonicalInfinityShop'
import { applyCanonicalSkillIntervalEffects } from './canonicalSkillIntervalEffects'
import { deriveDreamRailgunReadinessFacts } from './dreamSpaceAge'
import {
  DYSON_AUTOMATION_TARGETS,
  previewDysonFacilityPurchase,
  tryPurchaseDysonFacility,
  type DysonAutomationState,
} from './dysonAutomation'
import { createBasicDysonState } from './dysonModel'
import {
  bitDecrement,
  bitIncrement,
  CONTINUOUS_MAXIMUM,
} from './numeric'
import { advanceRealityWorkers } from './realityWorkers'
import { applyAwayTimeGrant } from './timeResources'
import {
  tryDebitContinuous,
  tryPurchaseBasicFacility,
} from './transactions'

const COARSE_BALANCE = 2 ** 56
const COARSE_ULP = bitIncrement(COARSE_BALANCE) - COARSE_BALANCE
const SUB_ULP_STELLAR_BALANCE = 2 ** 64

function state(): CanonicalGameStateV1 {
  return hydrateGameState(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-08-30T00:00:00.000Z',
    }),
  ).state
}

describe('Avocato conservative feeds', () => {
  test.each([
    ['influence', 'influence'],
    ['strange-matter', 'strangeMatter'],
  ] as const)(
    '%s preserves the source remainder at a coarse destination',
    (source, avocadoKey) => {
      const initial = state()
      const before: CanonicalGameStateV1 = {
        ...initial,
        avocado: {
          ...initial.avocado,
          unlocked: true,
          [avocadoKey]: COARSE_BALANCE,
        },
        reality: {
          ...initial.reality,
          influence: source === 'influence' ? 20 : initial.reality.influence,
        },
        dream: {
          ...initial.dream,
          strangeMatter:
            source === 'strange-matter' ? 20 : initial.dream.strangeMatter,
        },
      }

      const result = feedAllToAvocado(before, source)
      const sourceBefore = source === 'influence'
        ? before.reality.influence
        : before.dream.strangeMatter
      const sourceAfter = source === 'influence'
        ? result.state.reality.influence
        : result.state.dream.strangeMatter
      const destinationAfter = result.state.avocado[avocadoKey]

      expect(result).toMatchObject({ accepted: true, code: 'fed', amount: 16 })
      expect(sourceBefore - sourceAfter).toBe(result.amount)
      expect(destinationAfter - COARSE_BALANCE).toBe(result.amount)
      expect(sourceAfter).toBe(4)
    },
  )

  test('debits only the Infinity Points represented by the destination', () => {
    const initial = state()
    const before: CanonicalGameStateV1 = {
      ...initial,
      infinity: {
        ...initial.infinity,
        points: 9_007_199_254_740_993n,
        spentPoints: 0n,
      },
      avocado: {
        ...initial.avocado,
        unlocked: true,
        infinityPoints: 0,
      },
    }

    const result = feedAllToAvocado(before, 'infinity-points')

    expect(result).toMatchObject({
      accepted: true,
      amount: 9_007_199_254_740_992,
      code: 'fed',
    })
    expect(result.state.infinity.points).toBe(1n)
    expect(result.state.avocado.infinityPoints).toBe(
      9_007_199_254_740_992,
    )
  })

  test('does not debit a sub-ULP source that cannot increase Avocato', () => {
    const initial = state()
    const before: CanonicalGameStateV1 = {
      ...initial,
      avocado: {
        ...initial.avocado,
        unlocked: true,
        influence: 1e300,
      },
      reality: { ...initial.reality, influence: 128 },
    }

    expect(feedAllToAvocado(before, 'influence')).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-maxed',
      state: before,
    })
  })
})

describe('Reality worker conservative conversion', () => {
  test('retains workers that a coarse Influence balance cannot fully represent', () => {
    const before = automaticRealityState(COARSE_BALANCE)
    const result = advanceRealityWorkers(before, 1, {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 20,
    })

    expect(result).toMatchObject({
      status: 'success',
      workersGenerated: 20n,
      automaticInfluence: 16,
    })
    expect(result.state.reality.influence - before.reality.influence).toBe(16)
    expect(result.state.reality.workersReady).toBe(4n)
  })

  test('retains every generated worker for a sub-ULP Influence request', () => {
    const before = automaticRealityState(1e300)
    const result = advanceRealityWorkers(before, 1, {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 128,
    })

    expect(result).toMatchObject({
      status: 'success',
      workersGenerated: 128n,
      automaticInfluence: 0,
    })
    expect(result.state.reality.influence).toBe(1e300)
    expect(result.state.reality.workersReady).toBe(128n)
  })
})

describe('Railgun conservative charge settlement', () => {
  test('debits exactly the energy represented as coarse railgun charge', () => {
    const before = railgunChargeState(20)
    const result = deriveDreamRailgunReadinessFacts(before, {
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.facts.chargeTransferred).toBe(COARSE_ULP)
    expect(result.facts.energyAfterChargeTransfer).toBe(4)
    expect(
      result.facts.chargeAfterChargeTransfer - COARSE_BALANCE,
    ).toBe(result.facts.chargeTransferred)
  })

  test('retains energy when the requested charge is below one destination ULP', () => {
    const before = railgunChargeState(10)
    const result = deriveDreamRailgunReadinessFacts(before, {
      doubleTimeActive: false,
      doubleTimeRate: 0,
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.facts.chargeTransferred).toBe(0)
    expect(result.facts.energyAfterChargeTransfer).toBe(10)
    expect(result.facts.chargeAfterChargeTransfer).toBe(COARSE_BALANCE)
  })
})

describe('Stellar Sacrifice conservative funding', () => {
  test.each([
    ['ordinary', 100, 10, 5, 1, 90, 5],
    ['partial funding', 5, 10, 6, 1, 0, 3],
    ['coarse source', COARSE_BALANCE, 10, 5, 1, COARSE_BALANCE - 8, 4],
    [
      'sub-ULP request',
      SUB_ULP_STELLAR_BALANCE,
      1,
      5,
      1,
      SUB_ULP_STELLAR_BALANCE,
      0,
    ],
  ] as const)(
    '%s grants planets only for the represented Bot debit',
    (_label, bots, botsPerSecond, planetsPerSecond, seconds, expectedBots, expectedPlanets) => {
      const initial = state()
      const starting: CanonicalGameStateV1 = {
        ...initial,
        dyson: { ...initial.dyson, bots },
      }
      const beforePlanets = starting.dyson.facilities.planets[0]
      const result = applyCanonicalSkillIntervalEffects(
        starting,
        starting,
        {
          seconds,
          botProductionPerSecond: 0,
          stellarBotsPerSecond: botsPerSecond,
          stellarPlanetsPerSecond: planetsPerSecond,
          scienceBoostPerSecond: 0,
          moneyUpgradePerSecond: 0,
        },
      )

      expect(result.dyson.bots).toBe(expectedBots)
      expect(
        result.dyson.facilities.planets[0] - beforePlanets,
      ).toBe(expectedPlanets)
    },
  )

  test('does not let same-interval Bot production fund a reward', () => {
    const initial = state()
    const starting: CanonicalGameStateV1 = {
      ...initial,
      dyson: { ...initial.dyson, bots: 0 },
    }
    const result = applyCanonicalSkillIntervalEffects(
      starting,
      starting,
      {
        seconds: 1,
        botProductionPerSecond: 100,
        stellarBotsPerSecond: 10,
        stellarPlanetsPerSecond: 5,
        scienceBoostPerSecond: 0,
        moneyUpgradePerSecond: 0,
      },
    )

    expect(result.dyson.bots).toBe(100)
    expect(result.dyson.facilities.planets).toEqual(
      starting.dyson.facilities.planets,
    )
  })
})

describe('Stored Time represented credit', () => {
  test.each([
    ['ordinary', 10, 100, 20, 30, 20],
    ['partial capacity', 95, 100, 20, 100, 5],
    ['coarse partial credit', COARSE_BALANCE, COARSE_BALANCE + 96, 20, COARSE_BALANCE + 16, 16],
    ['sub-ULP request', COARSE_BALANCE, COARSE_BALANCE + 96, 10, COARSE_BALANCE, 0],
    [
      'maximum saturation',
      bitDecrement(CONTINUOUS_MAXIMUM),
      CONTINUOUS_MAXIMUM,
      CONTINUOUS_MAXIMUM,
      CONTINUOUS_MAXIMUM,
      CONTINUOUS_MAXIMUM - bitDecrement(CONTINUOUS_MAXIMUM),
    ],
  ] as const)(
    '%s reports exactly the represented bank increase',
    (_label, bank, capacity, away, expectedBank, expectedCredit) => {
      const result = applyAwayTimeGrant({
        bankSeconds: bank,
        capacitySeconds: capacity,
        awaySeconds: away,
        dreamDoubleTimeBankSeconds: 0,
        cheater: false,
      })

      expect(result.bankSeconds).toBe(expectedBank)
      expect(result.storedTimeCreditedSeconds).toBe(expectedCredit)
      expect(result.bankSeconds - bank).toBe(result.storedTimeCreditedSeconds)
    },
  )
})

describe('coarse-ULP purchase probes', () => {
  test('preserves the established minimum-one-ULP purchase charge', () => {
    const result = tryDebitContinuous(COARSE_BALANCE, 1)

    expect(result).toEqual({
      balance: bitDecrement(COARSE_BALANCE),
      charged: COARSE_BALANCE - bitDecrement(COARSE_BALANCE),
      status: 'success',
    })
    expect(result.charged).toBeGreaterThan(1)
  })

  test('legacy basic-facility purchases fail closed before mutating extreme imported ownership', () => {
    const before = basicDysonPurchaseState()
    const result = tryPurchaseBasicFacility(
      before,
      'assembly_lines',
      'preserve-configured-mode',
    )

    expect(result).toMatchObject({ purchased: false, status: 'output-maxed' })
    expect(before.money).toBe(CONTINUOUS_MAXIMUM)
    expect(before.facilities.assembly_lines[1]).toBe(COARSE_BALANCE)
  })

  test('canonical facility purchases fail closed before mutating extreme imported ownership', () => {
    const before = dysonPurchaseState()
    const quote = previewDysonFacilityPurchase(before, 'assembly_lines')
    const result = tryPurchaseDysonFacility(before, 'assembly_lines')

    expect(quote).toMatchObject({ eligible: false, status: 'output-maxed' })
    expect(result.attempt).toMatchObject({
      purchased: false,
      status: 'output-maxed',
    })
    expect(result.state.money).toBe(before.money)
    expect(result.state.facilities.assembly_lines[1]).toBe(COARSE_BALANCE)
  })

  test('Infinity Shop rejects an unrepresentable retained-facility quantity before spending', () => {
    const initial = state()
    const before: CanonicalGameStateV1 = {
      ...initial,
      dyson: {
        ...initial.dyson,
        facilities: {
          ...initial.dyson.facilities,
          assembly_lines: [0, COARSE_BALANCE],
        },
      },
      infinity: {
        ...initial.infinity,
        points: 1n,
        spentPoints: 0n,
        retainedFacilities: {
          ...initial.infinity.retainedFacilities,
          assembly_lines: false,
        },
      },
    }

    expect(COARSE_BALANCE + 10 - COARSE_BALANCE).toBe(COARSE_ULP)
    const result = purchaseCanonicalInfinityShopItem(
      before,
      'retain-assembly-lines',
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-maxed',
      state: before,
    })
    expect(result.state.infinity.spentPoints).toBe(0n)
    expect(result.state.infinity.retainedFacilities.assembly_lines).toBe(false)
  })

  test('Infinity Shop still grants and charges the exact ordinary retained quantity', () => {
    const initial = state()
    const before: CanonicalGameStateV1 = {
      ...initial,
      dyson: {
        ...initial.dyson,
        facilities: {
          ...initial.dyson.facilities,
          assembly_lines: [0, 100],
        },
      },
      infinity: {
        ...initial.infinity,
        points: 1n,
        spentPoints: 0n,
        retainedFacilities: {
          ...initial.infinity.retainedFacilities,
          assembly_lines: false,
        },
      },
    }

    const result = purchaseCanonicalInfinityShopItem(
      before,
      'retain-assembly-lines',
    )

    expect(result).toMatchObject({ accepted: true, code: 'purchased' })
    expect(result.state.dyson.facilities.assembly_lines[1]).toBe(110)
    expect(result.state.infinity.spentPoints).toBe(1n)
    expect(result.state.infinity.retainedFacilities.assembly_lines).toBe(true)
  })
})

function automaticRealityState(influence: number): CanonicalGameStateV1 {
  const initial = state()
  return {
    ...initial,
    meta: {
      ...initial.meta,
      navigationRouteDiscovery: {
        knownRoutes: ['reality'],
        unvisitedRoutes: [],
      },
    },
    reality: {
      ...initial.reality,
      autoGather: true,
      influence,
      workersReady: 0n,
      workerGenerationProgress: 0,
    },
  }
}

function railgunChargeState(energy: number): CanonicalGameStateV1 {
  const initial = state()
  return {
    ...initial,
    dream: {
      ...initial.dream,
      resources: {
        ...initial.dream.resources,
        energy,
        railgunCharge: COARSE_BALANCE,
        spaceFactories: 0,
      },
      parameters: {
        ...initial.dream.parameters,
        railgunMaxCharge: COARSE_BALANCE + 96,
      },
      railgun: {
        ...initial.dream.railgun,
        firing: false,
      },
    },
  }
}

function dysonPurchaseState(): DysonAutomationState {
  const facilities = Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((facilityId) => [facilityId, [0, 0]]),
  ) as Record<CanonicalFacilityId, [number, number]>
  facilities.assembly_lines = [0, COARSE_BALANCE]
  return {
    money: CONTINUOUS_MAXIMUM,
    facilities,
    targetIndex: 0,
    globalEnabled: true,
    enabledFacilities: facilityBooleanRecord(true),
    unlockedFacilities: facilityBooleanRecord(true),
    buyMode: 'buy-1',
    roundedBulkBuy: false,
    retainedFacilities: {
      assembly_lines: false,
      ai_managers: false,
      servers: false,
      data_centers: false,
      planets: false,
    },
    assemblyMegaLinesOwned: false,
  }
}

function facilityBooleanRecord(
  value: boolean,
): Record<CanonicalFacilityId, boolean> {
  return Object.fromEntries(
    DYSON_AUTOMATION_TARGETS.map((facilityId) => [facilityId, value]),
  ) as Record<CanonicalFacilityId, boolean>
}

function basicDysonPurchaseState() {
  return createBasicDysonState({
    money: CONTINUOUS_MAXIMUM,
    science: 0,
    bots: 0,
    panels: 0,
    workers: 0,
    researchers: 0,
    moneyMultiplier: 1,
    scienceMultiplier: 1,
    panelRateMultiplier: 1,
    panelLifetime: 1,
    ownedSkills: [],
    facilities: {
      assembly_lines: [0, COARSE_BALANCE],
      ai_managers: [0, 0],
      servers: [0, 0],
      data_centers: [0, 0],
      planets: [0, 0],
    },
    modifiers: {
      assembly_lines: 1,
      ai_managers: 1,
      servers: 1,
      data_centers: 1,
      planets: 1,
    },
    automation: {
      enabledFacilities: [],
      buyMode: 'buy-1',
      roundedBulkBuy: false,
    },
  })
}
