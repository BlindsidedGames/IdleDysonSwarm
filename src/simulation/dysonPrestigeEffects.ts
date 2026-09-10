import {
  isSafePositiveInteger,
} from '../core/finiteNonNegativeNumber'
import { getGameAsset } from '../game-data/catalog'
import {
  REALITY_SYSTEM_TUNING_ASSET_ID,
  REALITY_SYSTEM_TUNING_ASSET_KIND,
} from '../game-data/runtimeAssetKinds'
import type {
  AvocadoState,
  QuantumState,
} from '../game-state/types'
import { isDiscreteResource } from './numeric'

export const DYSON_INFINITY_MULTIPLIER_CAP = 1e44

export function quantumCashMultiplier(
  quantum: Pick<QuantumState, 'cashBonusLevels'>,
): number {
  return quantumBonusMultiplier(quantum.cashBonusLevels)
}

export function quantumScienceMultiplier(
  quantum: Pick<QuantumState, 'scienceBonusLevels'>,
): number {
  return quantumBonusMultiplier(quantum.scienceBonusLevels)
}

export function infinityFacilityMultiplier(
  infinityPoints: bigint,
  minimumPoints: bigint,
): number {
  if (infinityPoints < minimumPoints) return 1
  const clamped = Math.min(
    Math.max(0, Number(infinityPoints)),
    DYSON_INFINITY_MULTIPLIER_CAP,
  )
  return 1 + clamped
}

export function avocadoDysonMultiplier(
  avocado: AvocadoState,
  threshold = readAvocadoLogThreshold(),
): number {
  if (!avocado.unlocked) return 1
  if (!isSafePositiveInteger(threshold)) {
    throw new Error(
      'Avocado logarithm threshold must be a positive safe integer.',
    )
  }

  let multiplier = 1
  if (avocado.infinityPoints >= threshold) {
    multiplier *= Math.log10(avocado.infinityPoints)
  }
  if (avocado.influence >= threshold) {
    multiplier *= Math.log10(avocado.influence)
  }
  if (avocado.strangeMatter >= threshold) {
    multiplier *= Math.log10(avocado.strangeMatter)
  }
  if (avocado.overflowMultiplier >= 1) {
    multiplier *= 1 + avocado.overflowMultiplier
  }
  return multiplier
}

function quantumBonusMultiplier(levels: bigint): number {
  if (!isDiscreteResource(levels)) {
    throw new Error(
      'Quantum bonus levels exceed the characterized numeric range.',
    )
  }
  // Ownership and spending stay exact bigint values. Production is already
  // floating point; the full signed64 level range yields a finite multiplier.
  return 1 + Number(levels) * 0.05
}

function readAvocadoLogThreshold(): number {
  const asset = getGameAsset(
    REALITY_SYSTEM_TUNING_ASSET_KIND,
    REALITY_SYSTEM_TUNING_ASSET_ID,
  )
  const threshold = asset?.data.avocadoLogThreshold
  if (!isSafePositiveInteger(threshold)) {
    throw new Error(
      'Exported RealitySystemTuning has no valid avocadoLogThreshold.',
    )
  }
  return threshold
}
