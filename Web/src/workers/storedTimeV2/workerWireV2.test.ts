import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import schema12Web from '../../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { migratePreparedSaveToV2 } from '../../game-state/mappingV2'
import { isGameDecimal } from '../../math/gameDecimal'
import { PreparedSave } from '../../save/prepare'
import { deserializeWebSave } from '../../save/serialization'
import {
  captureStoredTimeWorkerMainMessageV2,
  captureStoredTimeWorkerMessageV2,
  captureStoredTimeWorkerQueuedInputsV2,
  createStoredTimeWorkerTransportBudgetTerminalV2,
  decodeStoredTimeWorkerMainFrameV2,
  postStoredTimeWorkerMainFrameV2,
  STORED_TIME_POLICY_SUPPORT_V2,
  type StoredTimeWorkerMainMessageV2,
} from './workerProtocolV2'
import {
  createStoredTimeWorkerInstanceNonceV2,
  createStoredTimeWorkerReadyV2,
  getTrustedStoredTimeWorkerIdentityV2,
  requireMatchingStoredTimeWorkerIdentityV2,
  validateAndFreezeStoredTimeWorkerCatalogV2,
} from './workerIdentityV2'
import {
  captureStoredTimeWorkerDataV2,
  createStoredTimeWorkerLiveJobBudgetV2,
  decodeStoredTimeWorkerPublicationV2,
  decodeStoredTimeWorkerFrameV2,
  encodeStoredTimeWorkerFrameV2,
  encodeStoredTimeWorkerPublicationV2,
  getProvedStoredTimeWorkerLiveJobBytesV2,
  STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2,
  STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2,
  STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2,
  type StoredTimeWorkerPublicationDtoV2,
} from './workerWireV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const publication = Object.freeze({
  state: migrated.state,
  runtime: migrated.runtime,
})
const TEST_RELEASE_BUILD_ID = 'test-release-build-a'
describe('Stage 4D neutral worker wire DTO', () => {
  test('frames bounded DTOs into transferable buffers without aliases', async () => {
    const identity = await getTrustedStoredTimeWorkerIdentityV2(TEST_RELEASE_BUILD_ID)
    const start = startMessage(
      encodeStoredTimeWorkerPublicationV2(publication),
      identity.buildId,
      identity.catalogHash,
      identity.tuningHash,
    )
    let received: ArrayBuffer | null = null
    let outbound: ArrayBuffer | null = null
    postStoredTimeWorkerMainFrameV2({
      postMessage(message, transfer) {
        outbound = message as ArrayBuffer
        received = structuredClone(message, { transfer: [...transfer] }) as ArrayBuffer
      },
    }, start)

    expect(outbound?.byteLength).toBe(0)
    expect(received).toBeInstanceOf(ArrayBuffer)
    expect(decodeStoredTimeWorkerMainFrameV2(received)).toEqual(start)
    expect(STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2).toBe(256 * 1024)
    expect(getProvedStoredTimeWorkerLiveJobBytesV2())
      .toBe(STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2)
    expect(STORED_TIME_WORKER_FRAME_MEMORY_BUDGET_V2).toEqual({
      maximumInputFrames: 1,
      maximumCandidateFrames: 1,
      maximumFrameBytes: 256 * 1024,
      maximumDecodedJsonGraphs: 2,
      decodedJsonGraphBytes: 8 * 1024 * 1024,
      maximumCapturedDtoGraphs: 4,
      capturedDtoGraphBytes: 1024 * 1024,
      maximumCanonicalPublicationGraphs: 2,
      canonicalPublicationGraphBytes: 4 * 1024 * 1024,
      workerAndProtocolOverheadBytes: 3_670_016,
      maximumLiveBytes: 32 * 1024 * 1024,
    })

    const frame = encodeStoredTimeWorkerFrameV2({ ok: true })
    expect(decodeStoredTimeWorkerFrameV2(frame)).toEqual({ ok: true })
    const alias: Record<string, unknown> = { value: 1 }
    expect(() => encodeStoredTimeWorkerFrameV2({ left: alias, right: alias }))
      .toThrow(/unalias|acyclic/u)
    let gets = 0
    const hostile = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() { gets += 1; return 'x' },
    })
    expect(() => encodeStoredTimeWorkerFrameV2(hostile)).toThrow(/data properties/u)
    expect(gets).toBe(0)
    expect(() => decodeStoredTimeWorkerFrameV2(new ArrayBuffer(
      STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2 + 1,
    ))).toThrow(/256 KiB/u)
    const deeplyNested = new TextEncoder().encode(
      `${'['.repeat(129)}0${']'.repeat(129)}`,
    ).buffer as ArrayBuffer
    expect(() => decodeStoredTimeWorkerFrameV2(deeplyNested))
      .toThrow(/structural preflight budget/u)
  })

  test('enforces the aggregate live-job budget and releases frame ownership', () => {
    const budget = createStoredTimeWorkerLiveJobBudgetV2()
    const baselineBytes = budget.liveBytes
    const maximum = new ArrayBuffer(STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2)
    const releaseInput = budget.reserveInputFrame(maximum)
    const releaseCandidate = budget.reserveCandidateFrame(maximum)
    expect(budget.liveBytes).toBe(STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2)
    expect(() => budget.reserveInputFrame(new ArrayBuffer(1)))
      .toThrow(/already owns/u)
    releaseInput()
    expect(budget.liveBytes).toBe(
      STORED_TIME_WORKER_MAXIMUM_LIVE_JOB_BYTES_V2 -
        STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2,
    )
    budget.releaseFrames()
    expect(budget.liveBytes).toBe(baselineBytes)
    releaseCandidate()
    expect(budget.liveBytes).toBe(baselineBytes)
    expect(() => budget.reserveInputFrame(new ArrayBuffer(
      STORED_TIME_WORKER_MAXIMUM_FRAME_BYTES_V2 + 1,
    ))).toThrow(/live-job budget/u)
  })

  test('rejects a descriptor-safe graph before its object overhead exceeds the cap', () => {
    const entries = Object.fromEntries(Array.from({ length: 16_000 }, (_, index) => [
      `entry-${index.toString().padStart(5, '0')}`,
      null,
    ]))
    expect(() => captureStoredTimeWorkerDataV2(entries)).toThrow(/live graph budget/u)
  })
  test('encodes path-typed Decimal/bigint strings and restores a frozen V2 publication', () => {
    const encoded = encodeStoredTimeWorkerPublicationV2(publication)

    expect(typeof encoded.state.dyson.money).toBe('string')
    expect(typeof encoded.state.dyson.goalStage).toBe('string')
    expect(typeof encoded.runtime.dysonEvaluationSnapshot.panelsPerSecond).toBe('string')
    expect(JSON.stringify(encoded)).not.toContain('mantissa')

    const decoded = decodeStoredTimeWorkerPublicationV2(encoded)
    expect(decoded.state).toEqual(migrated.state)
    expect(decoded.runtime).toEqual(migrated.runtime)
    expect(isGameDecimal(decoded.state.dyson.money)).toBe(true)
    expect(Object.isFrozen(decoded.state)).toBe(true)
    expect(Object.isFrozen(decoded.runtime.dysonEvaluationSnapshot)).toBe(true)
    expect(decoded.state).not.toBe(migrated.state)
  })

  test('restores brands and freezing after native structuredClone', () => {
    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    const cloned = structuredClone(encoded)
    expect(Object.isFrozen(cloned)).toBe(false)

    const decoded = decodeStoredTimeWorkerPublicationV2(cloned)
    expect(isGameDecimal(decoded.state.infinity.availablePoints)).toBe(true)
    expect(Object.isFrozen(decoded.state.infinity.availablePoints)).toBe(true)
  })

  test('descriptor-rejects outbound and inbound accessors without invoking them', () => {
    let outboundGets = 0
    const outbound = Object.defineProperty({ runtime: migrated.runtime }, 'state', {
      enumerable: true,
      get() {
        outboundGets += 1
        return migrated.state
      },
    })
    expect(() => encodeStoredTimeWorkerPublicationV2(outbound)).toThrow(/data fields/u)
    expect(outboundGets).toBe(0)

    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    let inboundGets = 0
    const hostileDyson = { ...encoded.state.dyson }
    Object.defineProperty(hostileDyson, 'money', {
      enumerable: true,
      get() {
        inboundGets += 1
        return encoded.state.dyson.money
      },
    })
    const hostile = {
      ...encoded,
      state: { ...encoded.state, dyson: hostileDyson },
    }
    expect(() => decodeStoredTimeWorkerPublicationV2(hostile)).toThrow(/data properties/u)
    expect(inboundGets).toBe(0)
  })

  test('rejects aliases, cycles, malformed numeric strings and unknown durable keys', () => {
    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    const shared: unknown[] = []
    expect(() => decodeStoredTimeWorkerPublicationV2({
      state: shared,
      runtime: shared,
    })).toThrow(/unalias/u)
    shared.push(shared)
    expect(() => decodeStoredTimeWorkerPublicationV2({
      state: shared,
      runtime: encoded.runtime,
    })).toThrow(/unalias|acyclic/u)

    expect(() => decodeStoredTimeWorkerPublicationV2(withState(encoded, {
      ...encoded.state.dyson,
      money: '1e2trailing',
    }))).toThrow(/[Cc]anonical/u)
    expect(() => decodeStoredTimeWorkerPublicationV2(withState(encoded, {
      ...encoded.state.dyson,
      goalStage: '01',
    }))).toThrow(/canonical non-negative bigint/u)
    expect(() => decodeStoredTimeWorkerPublicationV2({
      ...encoded,
      runtime: { ...encoded.runtime, unexpected: 1 },
    })).toThrow(/declared data fields/u)
  })

  test('enforces depth, string and finite-number budgets before publication', () => {
    const deep: Record<string, unknown> = {}
    let cursor = deep
    for (let index = 0; index < 130; index += 1) {
      const next: Record<string, unknown> = {}
      cursor.next = next
      cursor = next
    }
    expect(() => decodeStoredTimeWorkerPublicationV2(deep)).toThrow(/depth budget/u)

    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    expect(() => decodeStoredTimeWorkerPublicationV2({
      ...encoded,
      state: {
        ...encoded.state,
        meta: { ...encoded.state.meta, createdAtLegacyText: 'x'.repeat(65_537) },
      },
    })).toThrow(/string budget/u)
    expect(() => decodeStoredTimeWorkerPublicationV2(withState(encoded, {
      ...encoded.state.dyson,
      botDistribution: Number.POSITIVE_INFINITY,
    }))).toThrow(/finite canonical number/u)

    const manyLargeStrings = Array.from(
      { length: 130 },
      () => 'x'.repeat(65_000),
    )
    expect(() => captureStoredTimeWorkerDataV2(manyLargeStrings))
      .toThrow(/encoded byte budget/u)
  })

  test('rejects altered array prototypes before reading index accessors', () => {
    let gets = 0
    const hostile: unknown[] = []
    Object.defineProperty(hostile, '0', {
      enumerable: true,
      configurable: true,
      get() {
        gets += 1
        return 'value'
      },
    })
    Object.defineProperty(hostile, 'length', { value: 1, writable: true })
    Object.setPrototypeOf(hostile, {})
    expect(() => captureStoredTimeWorkerDataV2(hostile))
      .toThrow(/canonical array prototype/u)
    expect(gets).toBe(0)
  })
})

describe('Stage 4D closed worker protocol and identity', () => {
  test('captures the closed versioned queued-command union without getters or duplicate IDs', () => {
    const commands = captureStoredTimeWorkerQueuedInputsV2(Object.freeze([
      Object.freeze({ id: 'dyson-1', remainingHorizonSeconds: 1, commandVersion: 1, commandKind: 'dyson-facility-purchase', facilityId: 'assembly_lines', requestedMode: 'buy-1', roundedBulkBuy: false }),
      Object.freeze({ id: 'quantum-buy', remainingHorizonSeconds: 2, commandVersion: 1, commandKind: 'quantum-upgrade-purchase', upgradeId: 'CashBonus', requestedMode: 'buy-10' }),
      Object.freeze({ id: 'quantum-reset', remainingHorizonSeconds: 3, commandVersion: 1, commandKind: 'quantum-action' }),
    ]))
    expect(commands.map((command) => command.commandKind)).toEqual([
      'dyson-facility-purchase', 'quantum-upgrade-purchase', 'quantum-action',
    ])
    expect(() => captureStoredTimeWorkerQueuedInputsV2([
      { id: 'same', remainingHorizonSeconds: 1, commandVersion: 1, commandKind: 'quantum-action' },
      { id: 'same', remainingHorizonSeconds: 2, commandVersion: 1, commandKind: 'quantum-action' },
    ])).toThrow(/unique/u)
    expect(() => captureStoredTimeWorkerQueuedInputsV2([
      { id: 'future', remainingHorizonSeconds: 1, commandVersion: 2, commandKind: 'quantum-action' },
    ])).toThrow(/version/u)
    expect(() => captureStoredTimeWorkerQueuedInputsV2([
      { id: 'extra', remainingHorizonSeconds: 1, commandVersion: 1, commandKind: 'quantum-action', extra: true },
    ])).toThrow(/exactly/u)
    let gets = 0
    const accessor = Object.defineProperty({}, 'id', {
      enumerable: true,
      get() { gets += 1; return 'hostile' },
    })
    expect(() => captureStoredTimeWorkerQueuedInputsV2([accessor])).toThrow()
    const altered: unknown[] = []
    Object.setPrototypeOf(altered, {})
    expect(() => captureStoredTimeWorkerQueuedInputsV2(altered)).toThrow(/prototype/u)
    expect(gets).toBe(0)
  })

  test('keeps ready pre-start scoped and closes every declared field', async () => {
    const nonce = createStoredTimeWorkerInstanceNonceV2()
    const ready = await createStoredTimeWorkerReadyV2(nonce, TEST_RELEASE_BUILD_ID)
    const captured = captureStoredTimeWorkerMessageV2(structuredClone(ready))
    expect(captured).toEqual(ready)
    expect(Object.keys(captured).sort()).toEqual([
      'buildId', 'capabilities', 'catalogHash', 'protocolVersion',
      'supportedPolicies', 'tuningHash', 'type', 'workerInstanceNonce',
    ].sort())
    expect(captured).not.toHaveProperty('jobId')
    expect(captured).not.toHaveProperty('controlSequence')
    expect(() => captureStoredTimeWorkerMessageV2({ ...ready, jobId: 'job' }))
      .toThrow(/exactly its declared fields/u)
  })

  test('captures a closed post-start message and rejects extras, omissions and accessors', async () => {
    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    const identity = await getTrustedStoredTimeWorkerIdentityV2(TEST_RELEASE_BUILD_ID)
    const start = startMessage(
      encoded,
      identity.buildId,
      identity.catalogHash,
      identity.tuningHash,
    )
    expect(captureStoredTimeWorkerMainMessageV2(structuredClone(start))).toEqual(start)
    expect(start).not.toHaveProperty('controlSequence')
    expect(() => captureStoredTimeWorkerMainMessageV2({ ...start, extra: true }))
      .toThrow(/exactly its declared fields/u)
    const { checkpointSequence: _omitted, ...missing } = start
    expect(() => captureStoredTimeWorkerMainMessageV2(missing))
      .toThrow(/exactly its declared fields/u)

    let gets = 0
    const hostile = Object.defineProperty({ ...start }, 'publication', {
      enumerable: true,
      get() {
        gets += 1
        return encoded
      },
    })
    expect(() => captureStoredTimeWorkerMainMessageV2(hostile)).toThrow(/data properties/u)
    expect(gets).toBe(0)

    const durableAccounting = Object.freeze({
      cumulativeProcessedSeconds: 12,
      cumulativeDoubleTimeConsumedSeconds: 0,
      cumulativeInfinityElapsedSeconds: 12,
      cumulativeInfinityResetCount: '0',
      lastInfinityResetElapsedSeconds: null,
      sealedInfinityCycleSeconds: 12,
      sealedInfinityBoundaryRemaining: 100,
      cumulativeRawAutomationTicks: '34',
      cumulativeRepresentativeGroups: 5,
      automationTimeUntilNextEvent: 0.5,
    })
    const terminal = createStoredTimeWorkerTransportBudgetTerminalV2(
      start,
      durableAccounting,
    )
    expect(terminal.failure).toMatchObject({
      type: 'failed',
      code: 'budget-exceeded',
      retryable: true,
      diagnosticCode: 'transport-budget',
      progress: {
        computedSeconds: 12,
        durableSeconds: 12,
        computedRawTicks: '34',
        durableRawTicks: '34',
        representativeGroups: 5,
      },
    })
    expect(terminal.revocation).toMatchObject({
      type: 'authority-revoked',
      jobId: start.jobId,
      acknowledgedBaseRevision: start.acknowledgedBaseRevision,
    })
    expect(Object.isFrozen(terminal.failure.progress)).toBe(true)

    let accountingGets = 0
    const hostileAccounting = Object.defineProperty({}, 'cumulativeProcessedSeconds', {
      enumerable: true,
      get() { accountingGets += 1; return 1 },
    })
    expect(() => createStoredTimeWorkerTransportBudgetTerminalV2(
      start,
      hostileAccounting,
    )).toThrow(/exactly its declared fields/u)
    expect(accountingGets).toBe(0)

    const cancel = {
      type: 'cancel',
      protocolVersion: 1,
      workerInstanceNonce: start.workerInstanceNonce,
      jobId: start.jobId,
      originRevision: start.originRevision,
      acknowledgedBaseRevision: start.acknowledgedBaseRevision,
      policyId: start.policyId,
      policyVersion: 1,
      checkpointSequence: start.checkpointSequence,
      controlSequence: 1,
      reason: 'user',
    }
    expect(captureStoredTimeWorkerMainMessageV2(cancel)).toEqual(cancel)
    const { controlSequence: _missingControl, ...invalidCancel } = cancel
    expect(() => captureStoredTimeWorkerMainMessageV2(invalidCancel))
      .toThrow(/exactly its declared fields/u)
  })

  test('captures only the closed durable restart cursor needed after worker reload', async () => {
    const encoded = encodeStoredTimeWorkerPublicationV2(publication)
    const identity = await getTrustedStoredTimeWorkerIdentityV2(TEST_RELEASE_BUILD_ID)
    const start = startMessage(
      encoded, identity.buildId, identity.catalogHash, identity.tuningHash,
    )
    const restart = Object.freeze({
      originalInitialAutomationHorizonSeconds: 3,
      originalInitialAutomationTargetIndex: 4,
      originalRequestedDurationSeconds: 60,
      originalRequestedRawAutomationTicks: '571',
      completedRepresentativeGroups: 2,
      cumulativeAccounting: Object.freeze({
        cumulativeProcessedSeconds: 10,
        cumulativeDoubleTimeConsumedSeconds: 10,
        cumulativeInfinityElapsedSeconds: 10,
        cumulativeInfinityResetCount: '0',
        lastInfinityResetElapsedSeconds: null,
        sealedInfinityCycleSeconds: 10,
        sealedInfinityBoundaryRemaining: 100,
        cumulativeRawAutomationTicks: '71',
        cumulativeRepresentativeGroups: 2,
        automationTimeUntilNextEvent: 0.1,
      }),
      cumulativeSchedulerSummary: Object.freeze({
        automationTicks: '71',
        analyticallySkippedAutomationTicks: '69',
        storedTimeConsumedSeconds: 10,
        baseSimulationSeconds: 10,
        dreamSimulationSeconds: 20,
        infinityResetCount: '0',
        dreamResetCount: '0',
        dreamFastNormalizedResetCount: '0',
        dreamFastNormalizationFirstCycleElapsedSeconds: null,
        dreamFastNormalizationCycleSeconds: null,
        dreamMeteorResetCount: '0',
        dreamAiResetCount: '0',
        dreamGlobalWarmingResetCount: '0',
        dreamBlackHoleResetCount: '0',
        dreamStrangeMatterRequested: '0',
      dreamStrangeMatterEffective: '0',
      dreamStrangeMatterFinal: null,
      dreamLifetimeStrangeMatterFinal: null,
      dreamCurrentQuantumRunStrangeMatterFinal: null,
      dreamRecentProcessedSegmentStrangeMatterFinal: null,
      quantumResetCount:'0',quantumEntanglementCount:'0',quantumAvailableShardsEffective:'0',quantumLifetimeShardsEffective:'0',quantumInfinityPointsConsumed:'0',quantumAvailableShardsFinal:null,quantumLifetimeShardsFinal:null,quantumInfinityAvailableFinal:null,quantumInfinityAllocatedFinal:null,quantumResetSkillPointsFinal:null,
        lastInfinityResetElapsedSeconds: null,
        materialEvents: 8,
        zeroTimePasses: 0,
        boundaryDigest: '0123456789abcdef',
      }),
      sealedRemainingDurationSeconds: 50,
      rebasedQueuedInputs: Object.freeze([]),
      priorCandidateHash: 'a'.repeat(64),
    })
    const resumed = { ...start, restart }

    expect(captureStoredTimeWorkerMainMessageV2(resumed).restart).toEqual(restart)
    expect(() => captureStoredTimeWorkerMainMessageV2({
      ...resumed,
      restart: { ...restart, extra: true },
    })).toThrow(/declared fields/u)
    expect(() => captureStoredTimeWorkerMainMessageV2({
      ...resumed,
      restart: { ...restart, originalInitialAutomationTargetIndex: 8 },
    })).toThrow(/0\.\.7/u)
  })

  test('deep-validates/freezes same-release catalog and returns deterministic hashes', async () => {
    const first = await getTrustedStoredTimeWorkerIdentityV2(TEST_RELEASE_BUILD_ID)
    const second = await getTrustedStoredTimeWorkerIdentityV2(TEST_RELEASE_BUILD_ID)
    expect(first).toBe(second)
    expect(first.catalogHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(first.tuningHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(first.buildId).toBe(TEST_RELEASE_BUILD_ID)
    expect(Object.isFrozen(first.catalog)).toBe(true)
    expect(Object.isFrozen(first.catalog.assets[0]?.data)).toBe(true)
    expect(Object.isFrozen(first.tuning['web-authored-v1'])).toBe(true)
  })

  test('rejects a different executable build while data identities remain unchanged', async () => {
    const first = await getTrustedStoredTimeWorkerIdentityV2('test-release-build-a')
    const second = await getTrustedStoredTimeWorkerIdentityV2('test-release-build-b')
    expect(second.catalogHash).toBe(first.catalogHash)
    expect(second.tuningHash).toBe(first.tuningHash)
    expect(second.buildId).not.toBe(first.buildId)
    expect(() => requireMatchingStoredTimeWorkerIdentityV2(second, first))
      .toThrow(/does not match this release/u)
    expect(() => requireMatchingStoredTimeWorkerIdentityV2(first, first)).not.toThrow()
  })

  test('rejects catalog extra data, count drift, duplicate identity and malformed values', async () => {
    const source = structuredClone((await getTrustedStoredTimeWorkerIdentityV2(
      TEST_RELEASE_BUILD_ID,
    )).catalog)
    const extra = structuredClone(source) as unknown as {
      assets: { data: Record<string, unknown> }[]
    }
    extra.assets[0]!.data.unexpected = true
    expect(() => validateAndFreezeStoredTimeWorkerCatalogV2(extra))
      .toThrow(/unexpected retained-data key/u)

    const countDrift = structuredClone(source) as unknown as {
      countsByKind: Record<string, number>
    }
    const kind = Object.keys(countDrift.countsByKind)[0]!
    countDrift.countsByKind[kind] += 1
    expect(() => validateAndFreezeStoredTimeWorkerCatalogV2(countDrift))
      .toThrow(/does not match/u)

    const duplicate = structuredClone(source) as unknown as {
      assets: Record<string, unknown>[]
    }
    duplicate.assets[1] = structuredClone(duplicate.assets[0]!)
    expect(() => validateAndFreezeStoredTimeWorkerCatalogV2(duplicate))
      .toThrow(/duplicate asset identity/u)

    const malformed = structuredClone(source) as unknown as {
      assets: { data: Record<string, unknown> }[]
    }
    const allowedKey = Object.keys(malformed.assets[0]!.data)[0]!
    malformed.assets[0]!.data[allowedKey] = Number.NaN
    expect(() => validateAndFreezeStoredTimeWorkerCatalogV2(malformed))
      .toThrow(/finite canonical number/u)
  })

  test('keeps schema13 and opaque scheduler tokens out of worker transport', () => {
    const directory = fileURLToPath(new URL('.', import.meta.url))
    const protocol = readFileSync(`${directory}workerProtocolV2.ts`, 'utf8')
    const wire = readFileSync(`${directory}workerWireV2.ts`, 'utf8')
    expect(`${protocol}\n${wire}`).not.toMatch(/from ['"].*schema13/u)
    expect(protocol).not.toMatch(/Continuation|WeakMap|MaterialBoundarySeal/u)
  })
})

function startMessage(
  encoded: Readonly<StoredTimeWorkerPublicationDtoV2>,
  buildId: string,
  catalogHash: string,
  tuningHash: string,
): Readonly<StoredTimeWorkerMainMessageV2> {
  return Object.freeze({
    type: 'start',
    protocolVersion: 1,
    workerInstanceNonce: 'worker-0001',
    jobId: 'job-0001',
    originRevision: 7,
    acknowledgedBaseRevision: 7,
    policyId: STORED_TIME_POLICY_SUPPORT_V2[0].id,
    policyVersion: 1,
    checkpointSequence: 0,
    admittedBankSeconds: 120,
    requestedDurationSeconds: 60,
    requestedRawAutomationTicks: '60',
    automationIntervalSeconds: 1,
    permanentDoubleIp: false,
    restart: null,
    materialEventBudget: 8,
    buildId,
    catalogHash,
    tuningHash,
    queuedInputs:Object.freeze([]),
    publication: encoded,
  })
}

function withState(
  encoded: Readonly<StoredTimeWorkerPublicationDtoV2>,
  dyson: unknown,
): unknown {
  return {
    ...encoded,
    state: { ...encoded.state, dyson },
  }
}
