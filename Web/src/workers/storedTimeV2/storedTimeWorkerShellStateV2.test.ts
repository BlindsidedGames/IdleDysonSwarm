import { describe, expect, test } from 'vitest'

import schema12Web from '../../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import { PreparedSave } from '../../save/prepare'
import { deserializeWebSave } from '../../save/serialization'
import type {
  StoredTimeWorkerAccountingDtoV2,
  StoredTimeWorkerMainMessageV2,
} from './workerProtocolV2'
import { StoredTimeWorkerShellStateV2 } from './storedTimeWorkerShellStateV2'
import { encodeStoredTimeWorkerPublicationV2 } from './workerWireV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const publication = encodeStoredTimeWorkerPublicationV2(Object.freeze({
  state: migrated.state,
  runtime: migrated.runtime,
}))

const accounting = Object.freeze({
  cumulativeProcessedSeconds: 12,
  cumulativeDoubleTimeConsumedSeconds: 0,
  cumulativeInfinityElapsedSeconds: 12,
  cumulativeInfinityResetCount: '0',
  lastInfinityResetElapsedSeconds: null,
  sealedInfinityCycleSeconds: 12,
  sealedInfinityBoundaryRemaining: 0,
  cumulativeRawAutomationTicks: '34',
  cumulativeRepresentativeGroups: 5,
  automationTimeUntilNextEvent: 0.5,
}) satisfies Readonly<StoredTimeWorkerAccountingDtoV2>

describe('Stored Time worker shell transport state', () => {
  test('uses newly acknowledged durable counters and terminalizes exactly once', () => {
    const state = new StoredTimeWorkerShellStateV2()
    const start = message('start', 0, 0, null)
    state.beforeAccept(start)
    const ack = message('checkpoint-committed', 1, 1, 4)
    state.beforeAccept(ack)

    const terminal = state.beginTransportBudgetTerminal()
    expect(terminal?.failure.progress).toMatchObject({
      computedSeconds: 12,
      durableSeconds: 12,
      computedRawTicks: '34',
      durableRawTicks: '34',
      representativeGroups: 5,
    })
    expect(state.beginTransportBudgetTerminal()).toBeNull()
    state.finishTransportBudgetTerminal()
    expect(state.active).toBe(false)
    expect(state.transportTerminating).toBe(false)
  })

  test('clears a completed acknowledgement and retains a periodic one', () => {
    const state = new StoredTimeWorkerShellStateV2()
    const periodic = message('checkpoint-committed', 1, 1, 4)
    state.beforeAccept(periodic)
    state.afterAccept(periodic)
    expect(state.active).toBe(true)

    const completed = message('checkpoint-committed', 2, 2, 0)
    state.beforeAccept(completed)
    state.afterAccept(completed)
    expect(state.active).toBe(false)
    expect(state.beginTransportBudgetTerminal()).toBeNull()
  })
})

function message(
  type: 'start' | 'checkpoint-committed',
  acknowledgedBaseRevision: number,
  checkpointSequence: number,
  remaining: number | null,
) {
  const common = {
    protocolVersion: 1,
    workerInstanceNonce: 'worker-test',
    jobId: 'job-test',
    originRevision: 0,
    acknowledgedBaseRevision,
    policyId: 'stored-time-fast-v1',
    policyVersion: 1,
    checkpointSequence,
  } as const
  return (type === 'start'
    ? Object.freeze({
        type,
        ...common,
        admittedBankSeconds: 1,
        requestedDurationSeconds: 1,
        requestedRawAutomationTicks: '1',
        automationIntervalSeconds: 1,
        materialEventBudget: 8,
        buildId: 'build-test',
        catalogHash: 'a'.repeat(64),
        tuningHash: 'b'.repeat(64),
        restart: null,
        publication,
      })
    : Object.freeze({
        type,
        ...common,
        publishedRevision: acknowledgedBaseRevision,
        proposalHashEcho: 'c'.repeat(64),
        candidateHash: 'd'.repeat(64),
        accounting,
        sealedRemainingDurationSeconds: remaining,
        rebasedQueuedInputs: Object.freeze([]),
        publication,
      })) as unknown as Readonly<StoredTimeWorkerMainMessageV2>
}
