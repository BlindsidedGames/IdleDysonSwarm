import { describe, expect, test } from 'vitest'
import {
  createIdleStoredTimeJobStatus,
  isStoredTimeWorkerOutboundMessage,
} from './storedTimeProtocol'

const progress = Object.freeze({
  jobId: 'job',
  requestedSeconds: 10,
  computedSeconds: 5,
  fraction: 0.5,
  elapsedMilliseconds: 20,
  estimatedRemainingMilliseconds: 20,
  maximumChunkMilliseconds: 4,
})

describe('Stored Time worker protocol', () => {
  test('creates immutable, identity-independent idle statuses', () => {
    const status = createIdleStoredTimeJobStatus()
    expect(status).toEqual({ kind: 'idle' })
    expect(Object.isFrozen(status)).toBe(true)
    expect(createIdleStoredTimeJobStatus()).not.toBe(status)
  })

  test('accepts complete typed frames', () => {
    expect(isStoredTimeWorkerOutboundMessage({
      type: 'ready',
      protocolVersion: 3,
      buildId: null,
    })).toBe(true)
    expect(isStoredTimeWorkerOutboundMessage({
      type: 'completed',
      protocolVersion: 3,
      jobId: 'job',
      candidate: {},
      firstDisasterOccurrences: [{
        cause: 'Meteor',
        strangeMatterGranted: 1,
        resetCount: 1n,
        preResetEra: 'information',
      }],
      consumedSeconds: 10,
      remainingSeconds: 0,
      progress,
    })).toBe(true)
    expect(isStoredTimeWorkerOutboundMessage({
      type: 'completed',
      protocolVersion: 3,
      jobId: 'job',
      candidate: {},
      firstDisasterOccurrences: [],
      consumedSeconds: 10,
      remainingSeconds: 0,
      progress,
    })).toBe(true)
  })

  test.each([
    { type: 'ready', protocolVersion: 1, buildId: null },
    { type: 'progress', protocolVersion: 3 },
    {
      type: 'progress',
      protocolVersion: 3,
      progress: { ...progress, fraction: 2 },
    },
    {
      type: 'completed',
      protocolVersion: 3,
      jobId: 'job',
      candidate: {},
      firstDisasterOccurrences: [],
      consumedSeconds: 5,
      remainingSeconds: 5,
      progress,
    },
    {
      type: 'completed',
      protocolVersion: 3,
      jobId: 'job',
      candidate: {},
      firstDisasterOccurrences: [],
      consumedSeconds: Number.NaN,
      remainingSeconds: 0,
      progress,
    },
    {
      type: 'failed',
      protocolVersion: 3,
      jobId: 'job',
      progress,
    },
  ])('rejects malformed same-version frames', (frame) => {
    expect(isStoredTimeWorkerOutboundMessage(frame)).toBe(false)
  })
})
