import { describe, expect, test } from 'vitest'
import type { InfinityCycleHistoryEntry } from '../../../game-state/types'
import {
  RAPID_INFINITY_EXIT_SECONDS,
  shouldSettleRapidInfinityVisualization,
} from './rapidInfinityVisualization'

describe('rapid Infinity visualization selection', () => {
  test('settles after three recent rapid automatic Break Infinities', () => {
    expect(shouldSettleRapidInfinityVisualization({
      automaticResetEnabled: true,
      infinityCycleSeconds: 0.1,
      recentInfinityCycles: [cycle(0.08), cycle(0.12), cycle(0.49)],
    })).toBe(true)
  })

  test('keeps ordinary, manual, slow, and insufficient histories progressive', () => {
    const base = {
      automaticResetEnabled: true,
      infinityCycleSeconds: 0.1,
    }
    expect(shouldSettleRapidInfinityVisualization({
      ...base,
      recentInfinityCycles: [cycle(0.1), cycle(0.1)],
    })).toBe(false)
    expect(shouldSettleRapidInfinityVisualization({
      ...base,
      recentInfinityCycles: [cycle(0.1), cycle(0.6), cycle(0.1)],
    })).toBe(false)
    expect(shouldSettleRapidInfinityVisualization({
      ...base,
      recentInfinityCycles: [cycle(0.1), cycle(0.1, false), cycle(0.1)],
    })).toBe(false)
    expect(shouldSettleRapidInfinityVisualization({
      ...base,
      recentInfinityCycles: [cycle(0.1), cycle(0.1, true, false), cycle(0.1)],
    })).toBe(false)
  })

  test('exits when automation stops or the active cycle remains unsettled', () => {
    const recentInfinityCycles = [cycle(0.1), cycle(0.1), cycle(0.1)]
    expect(shouldSettleRapidInfinityVisualization({
      automaticResetEnabled: false,
      infinityCycleSeconds: 0.1,
      recentInfinityCycles,
    })).toBe(false)
    expect(shouldSettleRapidInfinityVisualization({
      automaticResetEnabled: true,
      infinityCycleSeconds: RAPID_INFINITY_EXIT_SECONDS + 0.01,
      recentInfinityCycles,
    })).toBe(false)
  })
})

function cycle(
  durationSeconds: number,
  automatic = true,
  breakInfinity = true,
): InfinityCycleHistoryEntry {
  return {
    breakInfinity,
    automatic,
    configuredTarget: 3n,
    reward: 3n,
    durationSeconds,
  }
}
