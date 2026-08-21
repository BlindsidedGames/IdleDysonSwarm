import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  applyAwayTimeReplay,
  beginColdStartReplay,
  DESKTOP_LIFECYCLE_POLICY,
  evaluateLifecycleEvent,
  MOBILE_LIFECYCLE_POLICY,
  WEB_LIFECYCLE_POLICY,
  type LifecycleCoordinatorState,
} from './lifecycleAwayTime'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const clock = {
  utcMilliseconds: 100_000,
  serializedUtcText: '1970-01-01T00:01:40.0000000Z',
} as const

function canonical(
  timeline: Partial<CanonicalGameStateV1['timeline']> = {},
): CanonicalGameStateV1 {
  const state = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  return {
    ...state,
    timeline: {
      ...state.timeline,
      storedTimeAvailableSeconds: 10,
      storedTimeCapacitySeconds: 100,
      lastSuspendedAtLegacyText: 'old-quit-timestamp',
      doubleTime: {
        ...state.timeline.doubleTime,
        bankSeconds: 20,
      },
      ...timeline,
    },
  }
}

function coordinator(
  overrides: Partial<LifecycleCoordinatorState> = {},
): LifecycleCoordinatorState {
  return {
    canonical: canonical(),
    loaded: true,
    saveReady: true,
    coldStartReplayPending: false,
    coldStartGateSaveUsed: false,
    departureTimestampRecorded: false,
    ...overrides,
  }
}

describe('pure lifecycle policy and cold-start gate', () => {
  test('beginning a cold start withholds readiness and resets its save debounce', () => {
    const result = beginColdStartReplay(
      coordinator({ coldStartGateSaveUsed: true }),
      true,
    )

    expect(result.saveReady).toBe(false)
    expect(result.coldStartReplayPending).toBe(true)
    expect(result.coldStartGateSaveUsed).toBe(false)
  })

  test.each([
    { kind: 'pause_changed', paused: true } as const,
    { kind: 'focus_changed', focused: false } as const,
  ])('mobile $kind stamps and requests a normal save', (event) => {
    const result = evaluateLifecycleEvent(
      coordinator(),
      event,
      MOBILE_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.saveIntent).toMatchObject({
      force: false,
      stampQuitTimestamp: true,
    })
    expect(
      result.saveIntent?.candidate.timeline.lastSuspendedAtLegacyText,
    ).toBe(clock.serializedUtcText)
  })

  test('preserves the first committed departure timestamp across later non-active save intents', () => {
    const first = evaluateLifecycleEvent(
      coordinator(),
      { kind: 'focus_changed', focused: false },
      MOBILE_LIFECYCLE_POLICY,
      {
        utcMilliseconds: 0,
        serializedUtcText: '2026-07-29T00:00:00Z',
      },
    )
    expect(first.saveIntent).toMatchObject({
      trigger: 'focus_lost',
      stampQuitTimestamp: true,
    })
    expect(first.state.departureTimestampRecorded).toBe(true)

    const later = evaluateLifecycleEvent(
      first.state,
      { kind: 'pause_changed', paused: true },
      MOBILE_LIFECYCLE_POLICY,
      {
        utcMilliseconds: 5_000,
        serializedUtcText: '2026-07-29T00:00:05Z',
      },
    )
    expect(later.saveIntent).toMatchObject({
      trigger: 'pause',
      stampQuitTimestamp: false,
    })
    expect(
      later.saveIntent?.candidate.timeline
        .lastSuspendedAtLegacyText,
    ).toBe('2026-07-29T00:00:00Z')
  })

  test.each([
    { kind: 'pause_changed', paused: true } as const,
    { kind: 'focus_changed', focused: false } as const,
  ])('desktop $kind is a no-op', (event) => {
    const before = coordinator()
    const result = evaluateLifecycleEvent(
      before,
      event,
      DESKTOP_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.state).toBe(before)
    expect(result.saveIntent).toBeNull()
    expect(result.replayAwayTime).toBe(false)
  })

  test('web focus loss stays active while hidden time saves for replay', () => {
    const before = coordinator()
    const focusLost = evaluateLifecycleEvent(
      before,
      { kind: 'focus_changed', focused: false },
      WEB_LIFECYCLE_POLICY,
      clock,
    )

    expect(focusLost.state).toBe(before)
    expect(focusLost.saveIntent).toBeNull()
    expect(focusLost.replayAwayTime).toBe(false)

    const hidden = evaluateLifecycleEvent(
      before,
      { kind: 'pause_changed', paused: true },
      WEB_LIFECYCLE_POLICY,
      clock,
    )

    expect(hidden.saveIntent).toMatchObject({
      trigger: 'pause',
      stampQuitTimestamp: true,
    })
    expect(
      hidden.saveIntent?.candidate.timeline
        .lastSuspendedAtLegacyText,
    ).toBe(clock.serializedUtcText)

    const visible = evaluateLifecycleEvent(
      hidden.state,
      { kind: 'focus_changed', focused: true },
      WEB_LIFECYCLE_POLICY,
      clock,
    )
    expect(visible.replayAwayTime).toBe(true)
  })

  test('quit stamps and requests a save on every platform', () => {
    const result = evaluateLifecycleEvent(
      coordinator(),
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.saveIntent).toEqual({
      trigger: 'quit',
      force: false,
      stampQuitTimestamp: true,
      candidate: result.state.canonical,
    })
    expect(result.state.canonical.timeline.lastSuspendedAtLegacyText).toBe(
      clock.serializedUtcText,
    )
  })

  test('focus gain emits replay intent without changing canonical state', () => {
    const before = coordinator()
    const result = evaluateLifecycleEvent(
      before,
      { kind: 'focus_changed', focused: true },
      MOBILE_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.replayAwayTime).toBe(true)
    expect(result.saveIntent).toBeNull()
    expect(result.state).toBe(before)
  })

  test('the first cold-gate save preserves the old quit timestamp', () => {
    const before = coordinator({
      saveReady: false,
      coldStartReplayPending: true,
    })
    const result = evaluateLifecycleEvent(
      before,
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.saveIntent).toMatchObject({
      trigger: 'quit',
      force: true,
      stampQuitTimestamp: false,
    })
    expect(result.state.canonical.timeline.lastSuspendedAtLegacyText).toBe(
      'old-quit-timestamp',
    )
    expect(result.state.coldStartGateSaveUsed).toBe(true)
  })

  test('later cold-gate saves are debounced and cannot overwrite the timestamp', () => {
    const first = evaluateLifecycleEvent(
      coordinator({
        saveReady: false,
        coldStartReplayPending: true,
      }),
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      clock,
    )
    const second = evaluateLifecycleEvent(
      first.state,
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      {
        utcMilliseconds: 200_000,
        serializedUtcText: 'replacement-must-not-be-used',
      },
    )

    expect(second.saveIntent).toBeNull()
    expect(second.blockedReason).toBe('cold_start_gate_debounced')
    expect(second.state.canonical.timeline.lastSuspendedAtLegacyText).toBe(
      'old-quit-timestamp',
    )
  })

  test('an unloaded cold gate cannot consume its one forced save', () => {
    const result = evaluateLifecycleEvent(
      coordinator({
        loaded: false,
        saveReady: false,
        coldStartReplayPending: true,
      }),
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      clock,
    )

    expect(result.saveIntent).toBeNull()
    expect(result.blockedReason).toBe('not_loaded')
    expect(result.state.coldStartGateSaveUsed).toBe(false)
  })
})

describe('pure canonical away-time replay', () => {
  test('Idle Electric Sheep doubles admitted away time only once', () => {
    const source = canonical()
    const sheep = {
      ...source,
      skills: {
        ...source.skills,
        byId: {
          ...source.skills.byId,
          idleElectricSheep: {
            ...source.skills.byId.idleElectricSheep!,
            owned: true,
          },
        },
      },
    }
    const first = applyAwayTimeReplay({
      state: coordinator({ canonical: sheep }),
      clock,
      parsedQuitTimestamp: { status: 'valid', utcMilliseconds: 70_000 },
      parsedStartedTimestamp: { status: 'missing' },
    })
    expect(first.resolution.grantedSeconds).toBe(30)
    expect(first.storedTimeCreditedSeconds).toBe(60)
    expect(first.state.canonical.timeline.storedTimeAvailableSeconds).toBe(70)

    const replay = applyAwayTimeReplay({
      state: first.state,
      clock,
      parsedQuitTimestamp: { status: 'missing' },
      parsedStartedTimestamp: { status: 'missing' },
    })
    expect(replay.storedTimeCreditedSeconds).toBe(0)
    expect(replay.state.canonical.timeline.storedTimeAvailableSeconds).toBe(70)
  })

  test('valid timestamps consume quit state and grant stored and Dream time', () => {
    const result = applyAwayTimeReplay({
      state: coordinator({
        saveReady: false,
        coldStartReplayPending: true,
      }),
      clock,
      parsedQuitTimestamp: {
        status: 'valid',
        utcMilliseconds: 70_000,
      },
      parsedStartedTimestamp: { status: 'invalid' },
    })

    expect(result.resolution.source).toBe('quit_timestamp')
    expect(result.resolution.grantedSeconds).toBe(30)
    expect(result.storedTimeCreditedSeconds).toBe(30)
    expect(
      result.state.canonical.timeline.storedTimeAvailableSeconds,
    ).toBe(40)
    expect(result.state.canonical.timeline.doubleTime.bankSeconds).toBe(80)
    expect(
      result.state.canonical.timeline.lastSuspendedAtLegacyText,
    ).toBeNull()
    expect(result.timestampConsumed).toBe(true)
    expect(result.state.coldStartReplayPending).toBe(false)
    expect(result.state.coldStartGateSaveUsed).toBe(false)
    expect(result.state.saveReady).toBe(true)
  })

  test('invalid quit input uses explicit started fallback and is consumed', () => {
    const result = applyAwayTimeReplay({
      state: coordinator(),
      clock,
      parsedQuitTimestamp: { status: 'invalid' },
      parsedStartedTimestamp: {
        status: 'valid',
        utcMilliseconds: 90_000,
      },
    })

    expect(result.resolution.source).toBe('started_timestamp_fallback')
    expect(result.resolution.grantedSeconds).toBe(10)
    expect(result.timestampConsumed).toBe(true)
    expect(
      result.state.canonical.timeline.lastSuspendedAtLegacyText,
    ).toBeNull()
  })

  test('negative time grants nothing, consumes timestamp, and emits cheater intent', () => {
    const result = applyAwayTimeReplay({
      state: coordinator(),
      clock,
      parsedQuitTimestamp: {
        status: 'valid',
        utcMilliseconds: 110_000,
      },
      parsedStartedTimestamp: { status: 'missing' },
    })

    expect(result.resolution.rawSeconds).toBe(-10)
    expect(result.storedTimeCreditedSeconds).toBe(0)
    expect(result.markComparisonIntegrityCompromised).toBe(true)
    expect(result.timestampConsumed).toBe(true)
    expect(
      result.state.canonical.timeline.storedTimeAvailableSeconds,
    ).toBe(10)
    expect(result.state.canonical.timeline.doubleTime.bankSeconds).toBe(20)
  })

  test('missing quit input grants nothing but still releases the cold gate', () => {
    const before = coordinator({
      saveReady: false,
      coldStartReplayPending: true,
    })
    const result = applyAwayTimeReplay({
      state: before,
      clock,
      parsedQuitTimestamp: { status: 'missing' },
      parsedStartedTimestamp: {
        status: 'valid',
        utcMilliseconds: 1_000,
      },
    })

    expect(result.resolution.source).toBe('missing_quit_timestamp')
    expect(result.timestampConsumed).toBe(false)
    expect(result.storedTimeCreditedSeconds).toBe(0)
    expect(result.state.canonical).toBe(before.canonical)
    expect(result.state.saveReady).toBe(true)
    expect(result.state.coldStartReplayPending).toBe(false)
  })

  test('a later normal quit may stamp only after replay releases the gate', () => {
    const replay = applyAwayTimeReplay({
      state: coordinator({
        saveReady: false,
        coldStartReplayPending: true,
      }),
      clock,
      parsedQuitTimestamp: {
        status: 'valid',
        utcMilliseconds: 90_000,
      },
      parsedStartedTimestamp: { status: 'invalid' },
    })
    const quit = evaluateLifecycleEvent(
      replay.state,
      { kind: 'quit_requested' },
      DESKTOP_LIFECYCLE_POLICY,
      {
        utcMilliseconds: 120_000,
        serializedUtcText: 'new-post-replay-quit',
      },
    )

    expect(quit.saveIntent).toMatchObject({
      force: false,
      stampQuitTimestamp: true,
    })
    expect(quit.state.canonical.timeline.lastSuspendedAtLegacyText).toBe(
      'new-post-replay-quit',
    )
  })
})
