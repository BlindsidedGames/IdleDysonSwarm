import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {
  FIRST_SLICE_COMMIT_PROBE_MARKER,
  isNewCommittedRevision,
  recordFirstSliceReactCommit,
  type FirstSliceCommitProbeSample,
} from './firstSliceCommitProbe'

describe('first-slice commit revision pairing', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('excludes initial mount and StrictMode effect replay', () => {
    const revision = { session: 1, state: 4 }
    expect(isNewCommittedRevision(null, revision)).toBe(false)
    expect(isNewCommittedRevision(revision, revision)).toBe(false)
  })

  test('accepts state and session transitions only after a prior commit', () => {
    expect(
      isNewCommittedRevision(
        { session: 1, state: 4 },
        { session: 1, state: 5 },
      ),
    ).toBe(true)
    expect(
      isNewCommittedRevision(
        { session: 1, state: 5 },
        { session: 2, state: 0 },
      ),
    ).toBe(true)
  })

  test('records the exact pre-captured commit boundary', () => {
    const samples: FirstSliceCommitProbeSample[] = []
    vi.stubGlobal(FIRST_SLICE_COMMIT_PROBE_MARKER, {
      record(sample: FirstSliceCommitProbeSample) {
        samples.push(sample)
      },
    })

    recordFirstSliceReactCommit(12.25, 19.5, {
      session: 2,
      state: 7,
    })

    expect(samples).toEqual([
      {
        revision: { session: 2, state: 7 },
        durationMilliseconds: 7.25,
      },
    ])
  })
})
