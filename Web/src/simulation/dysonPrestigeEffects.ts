import { getGameAsset } from '../game-data/catalog'
import type {
  AvocadoState,
  QuantumState,
} from '../game-state/types'

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
  if (!Number.isSafeInteger(threshold) || threshold <= 0) {
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
  const level = Number(levels)
  if (!Number.isSafeInteger(level) || level < 0) {
    throw new Error(
      'Quantum bonus levels exceed the characterized numeric range.',
    )
  }
  return 1 + level * 0.05
}

function readAvocadoLogThreshold(): number {
  const asset = getGameAsset(
    'IdleDysonSwarm.Data.Balance.RealitySystemTuning',
    'RealitySystemTuning',
  )
  const threshold = asset?.data.avocadoLogThreshold
  if (
    typeof threshold !== 'number' ||
    !Number.isSafeInteger(threshold) ||
    threshold <= 0
  ) {
    throw new Error(
      'Exported RealitySystemTuning has no valid avocadoLogThreshold.',
    )
  }
  return threshold
}
