import { describe, expect, test } from 'vitest'
import { PreparedSave, prepareImportedSave } from './prepare'

describe('import save preparation', () => {
  test('establishes a fresh lifecycle baseline without losing durable state', () => {
    const source = PreparedSave.fromDecoded({
      saveVersion: 12,
      dateQuitString: '2026-07-01T02:03:04Z',
      lastSuccessfulLoadUtc: '2026-06-30T01:02:03Z',
      offlineTime: 12_345,
      offlineTimeUsedThisInfinity: 67,
      futureContainer: {
        durableValue: 89n,
      },
    })

    const imported = prepareImportedSave(source, '2026-07-29T04:05:06Z')

    expect(imported.copyValidatedState()).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-07-29T04:05:06Z',
      offlineTime: 12_345,
      offlineTimeUsedThisInfinity: 67,
      futureContainer: {
        durableValue: 89n,
      },
    })
    expect(source.copyValidatedState()).toMatchObject({
      dateQuitString: '2026-07-01T02:03:04Z',
      lastSuccessfulLoadUtc: '2026-06-30T01:02:03Z',
    })
  })

  test('rejects an empty local import timestamp', () => {
    const source = PreparedSave.fromDecoded({ saveVersion: 12 })

    expect(() => prepareImportedSave(source, '   ')).toThrow(
      'Import timestamp must not be empty.',
    )
  })
})
