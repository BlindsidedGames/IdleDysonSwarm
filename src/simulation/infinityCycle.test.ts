import { describe, expect, test } from 'vitest'
import {
  BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM,
  BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM,
  breakInfinityTargetFromPresentationPosition,
  infinityPointsPerMinute,
  ordinaryInfinityBotThreshold,
  preferredInfinityRatePeak,
  projectBreakInfinityPresentationControl,
  projectInfinityProgress,
} from './infinityCycle'

describe('Infinity progress projection', () => {
  test('projects finite run efficiency with a deterministic zero-time value', () => {
    expect(infinityPointsPerMinute(72n, 120)).toBe(36)
    expect(infinityPointsPerMinute(72n, 0)).toBe(0)
    expect(infinityPointsPerMinute(0n, 60)).toBe(0)
  })

  test('keeps the lower reward across the two-percent throughput plateau', () => {
    expect(preferredInfinityRatePeak(
      { rate: 74_545.45, reward: 82n },
      { rate: 75_400, reward: 166n },
    )).toEqual({ rate: 74_545.45, reward: 82n })
    expect(preferredInfinityRatePeak(
      { rate: 74_208.1448, reward: 164n },
      { rate: 74_200, reward: 82n },
    )).toEqual({ rate: 74_200, reward: 82n })
  })

  test('replaces the peak only for a material rate improvement', () => {
    expect(preferredInfinityRatePeak(
      { rate: 74_208.1448, reward: 82n },
      { rate: 76_000, reward: 164n },
    )).toEqual({ rate: 76_000, reward: 164n })
  })

  test('projects ordinary logarithmic progress without a navigation reward', () => {
    const resetThreshold = ordinaryInfinityBotThreshold(0n)
    const facts = projectInfinityProgress({
      bots: Math.sqrt(resetThreshold),
      totalInfinityPoints: 0n,
      divisionsPurchased: 0n,
      breakTheLoop: false,
      breakTarget: 1n,
      permanentDoubleIp: false,
      quantumDoubleIp: false,
    })

    expect(facts).toMatchObject({
      mode: 'ordinary',
      currentReward: 0n,
      navigationReward: null,
      progressFraction: 0.5,
      resetThresholdBots: resetThreshold,
      botsRemainingToReset:
        resetThreshold - Math.sqrt(resetThreshold),
      currentRewardThresholdBots: null,
      nextRewardThresholdBots: null,
      botsRemainingToNextReward: null,
      breakTargetProgress: null,
    })
  })

  test('projects Break Infinity point-band and target progress from canonical reward math', () => {
    const baseThreshold = ordinaryInfinityBotThreshold(0n)
    const nextThreshold = baseThreshold * (1 + 3.9)
    const bots = baseThreshold + (nextThreshold - baseThreshold) / 2
    const facts = projectInfinityProgress({
      bots,
      totalInfinityPoints: 0n,
      divisionsPurchased: 0n,
      breakTheLoop: true,
      breakTarget: 5n,
      permanentDoubleIp: false,
      quantumDoubleIp: false,
    })

    expect(facts).toMatchObject({
      mode: 'break',
      currentReward: 1n,
      navigationReward: 1n,
      currentRewardThresholdBots: baseThreshold,
      breakTargetProgress: {
        targetReward: 5n,
        currentReward: 1n,
        fraction: 0.2,
      },
    })
    expect(facts.progressFraction).toBeCloseTo(0.5, 12)
    expect(facts.nextRewardThresholdBots / nextThreshold).toBeCloseTo(
      1,
      12,
    )
    expect(
      facts.botsRemainingToNextReward /
        ((nextThreshold - baseThreshold) / 2),
    ).toBeCloseTo(1, 12)
    expect(facts.botsRemainingToReset).toBeGreaterThan(0)
  })

  test('uses canonical permanent and Quantum reward multipliers', () => {
    const baseThreshold = ordinaryInfinityBotThreshold(0n)
    const facts = projectInfinityProgress({
      bots: baseThreshold,
      totalInfinityPoints: 0n,
      divisionsPurchased: 0n,
      breakTheLoop: true,
      breakTarget: 5n,
      permanentDoubleIp: true,
      quantumDoubleIp: true,
    })

    expect(facts).toMatchObject({
      mode: 'break',
      currentReward: 4n,
      navigationReward: 4n,
      breakTargetProgress: {
        targetReward: 5n,
        currentReward: 4n,
        fraction: 0.8,
      },
    })
    expect(
      facts.resetThresholdBots / (baseThreshold * (1 + 3.9)),
    ).toBeCloseTo(1, 12)
    expect(
      facts.botsRemainingToReset / (baseThreshold * 3.9),
    ).toBeCloseTo(1, 12)
  })

  test('publishes the first-Reality warning gate without UI rule reconstruction', () => {
    const resetThreshold = ordinaryInfinityBotThreshold(0n)
    const nearBoundary = Math.pow(resetThreshold, 0.96)

    expect(
      projectInfinityProgress({
        bots: nearBoundary,
        totalInfinityPoints: 41n,
        divisionsPurchased: 0n,
        breakTheLoop: false,
        breakTarget: 1n,
        permanentDoubleIp: false,
        quantumDoubleIp: false,
      }).showRealityWarning,
    ).toBe(true)
    expect(
      projectInfinityProgress({
        bots: nearBoundary,
        totalInfinityPoints: 42n,
        divisionsPurchased: 0n,
        breakTheLoop: false,
        breakTarget: 1n,
        permanentDoubleIp: false,
        quantumDoubleIp: false,
      }).showRealityWarning,
    ).toBe(false)
  })
})

describe('Break Infinity presentation control', () => {
  test.each([
    [0n, BREAK_INFINITY_PRESENTATION_TARGET_MINIMUM],
    [1n, 1n],
    [42n, 42n],
    [1_100n, BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM],
    [2_147_483_647n, BREAK_INFINITY_PRESENTATION_TARGET_MAXIMUM],
  ] as const)('round-trips clamped target %s', (target, expected) => {
    const control = projectBreakInfinityPresentationControl(target)

    expect(
      breakInfinityTargetFromPresentationPosition(
        control.currentPosition,
      ),
    ).toBe(expected)
  })

  test('publishes Unity practical logarithmic bounds', () => {
    expect(projectBreakInfinityPresentationControl(1n)).toEqual({
      minimum: 1n,
      maximum: 1_100n,
      minimumPosition: Math.log10(2),
      maximumPosition: Math.log10(1_101),
      currentPosition: Math.log10(2),
    })
  })
})
