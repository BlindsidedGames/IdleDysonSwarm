import { describe, expect, test } from 'vitest'
import { isStoredTimeWorkerOutboundMessage } from './storedTimeProtocol'

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
  test('accepts complete typed frames', () => {
    expect(isStoredTimeWorkerOutboundMessage({
      type: 'ready',
      protocolVersion: 2,
      buildId: null,
    })).toBe(true)
    expect(isStoredTimeWorkerOutboundMessage({
      type: 'completed',
      protocolVersion: 2,
      jobId: 'job',
      candidate: {},
      consumedSeconds: 10,
      remainingSeconds: 0,
      progress,
    })).toBe(true)
  })

  test.each([
    { type: 'ready', protocolVersion: 1, buildId: null },
    { type: 'progress', protocolVersion: 2 },
    {
      type: 'progress',
      protocolVersion: 2,
      progress: { ...progress, fraction: 2 },
    },
    {
      type: 'completed',
      protocolVersion: 2,
      jobId: 'job',
      candidate: {},
      consumedSeconds: 5,
      remainingSeconds: 5,
      progress,
    },
    {
      type: 'completed',
      protocolVersion: 2,
      jobId: 'job',
      candidate: {},
      consumedSeconds: Number.NaN,
      remainingSeconds: 0,
      progress,
    },
    {
      type: 'failed',
      protocolVersion: 2,
      jobId: 'job',
      progress,
    },
  ])('rejects malformed same-version frames', (frame) => {
    expect(isStoredTimeWorkerOutboundMessage(frame)).toBe(false)
  })
})
