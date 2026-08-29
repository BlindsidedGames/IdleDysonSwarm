import { describe, expect, test } from 'vitest'
import { deserializeWebSave } from '../../save/serialization'
import type { CanonicalLifecycleClock } from '../canonicalLifecycleCoordinator'
import {
  createProductionUnityFirstRunSaveFactory,
  createUnityFirstRunResetRequest,
} from './productionFirstRun'

function sequentialClock(...timestamps: readonly string[]): CanonicalLifecycleClock {
  let index = 0
  return {
    sample: () => {
      const serializedUtcText = timestamps[index++]!
      return {
        serializedUtcText,
        utcMilliseconds: Date.parse(serializedUtcText),
      }
    },
  }
}

describe('production first-run composition', () => {
  test('creates first-run saves from the current host UTC sample', () => {
    const createFirstRunSave = createProductionUnityFirstRunSaveFactory(
      sequentialClock('2026-08-30T00:00:00.000Z'),
    )

    expect(createFirstRunSave().copyValidatedState().dateStarted)
      .toBe('2026-08-30T00:00:00.000Z')
  })

  test('samples import UTC before creating the replacement save', () => {
    const clock = sequentialClock(
      '2026-08-30T00:00:00.000Z',
      '2026-08-30T00:00:01.000Z',
    )
    const createFirstRunSave = createProductionUnityFirstRunSaveFactory(clock)

    const request = createUnityFirstRunResetRequest(clock, createFirstRunSave)
    const replacement = deserializeWebSave(request.text)

    expect(request).toMatchObject({
      source: 'paste',
      importedAtUtc: '2026-08-30T00:00:00.000Z',
      overwriteApproved: true,
    })
    expect(replacement.dateStarted).toBe('2026-08-30T00:00:01.000Z')
  })
})
