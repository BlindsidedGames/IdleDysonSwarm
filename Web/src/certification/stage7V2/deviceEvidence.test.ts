import { describe, expect, test } from 'vitest'
import { STAGE7_V2_DEVICE_EVIDENCE_FIELDS } from './deviceMatrix'
import { captureStage7V2DeviceEvidence } from './deviceEvidence'

const evidence = Object.fromEntries(STAGE7_V2_DEVICE_EVIDENCE_FIELDS.map((key) => [key, null]))
Object.assign(evidence, { matrixId: 'chrome-current', result: 'BLOCKED' })

describe('Stage 7 device evidence', () => {
  test('captures the exact closed evidence vocabulary', () => {
    expect(captureStage7V2DeviceEvidence(evidence)).toEqual(evidence)
    expect(() => captureStage7V2DeviceEvidence({ ...evidence, extra: true })).toThrow()
    expect(() => captureStage7V2DeviceEvidence({ ...evidence, matrixId: 'unknown' })).toThrow()
  })

  test('rejects accessors, hostile prototypes, nonfinite numbers and unknown results', () => {
    const accessor = { ...evidence }
    Object.defineProperty(accessor, 'notes', { enumerable: true, get: () => 'read' })
    expect(() => captureStage7V2DeviceEvidence(accessor)).toThrow()
    expect(() => captureStage7V2DeviceEvidence(Object.assign(Object.create(null), evidence))).toThrow()
    expect(() => captureStage7V2DeviceEvidence({ ...evidence, maximumChunkMilliseconds: Infinity })).toThrow()
    expect(() => captureStage7V2DeviceEvidence({ ...evidence, result: 'maybe' })).toThrow()
  })

  test('cannot report PASS without every authentic repository-feasible fact', () => {
    expect(() => captureStage7V2DeviceEvidence({ ...evidence, result: 'PASS' })).toThrow()
    const complete = {
      ...evidence, result: 'PASS', saveReadback: true, reloadReadback: true,
      corruptionRecovery: true, lifecyclePauseReturn: true,
      platformStateIsLocal: true, portableSaveExcludesPlatform: true,
      fastCompleted: true, balancedCompleted: true, exactCompleted: true,
      developerPurchaseVerified: true, developerFreeEnableVerified: true,
      preAckRecovery: true, postCheckpointRecovery: true,
      forwardSchemaRecovery: true, extremeAdvanceVerified: true,
      longOfflineSeconds: 42_000_000, extremeDecimalCanonical: '1e1000',
      fastRawTicks: '4100', balancedRawTicks: '4100', exactRawTicks: '4100',
      workerCatalogHash: 'a'.repeat(64), workerTuningHash: 'b'.repeat(64),
      developerShardDebit: '1e5->0', developerStrangeMatterDebit: '5e5->0',
      developerLifetimeShardDelta: '1->1', maximumChunkMilliseconds: 10,
      maximumAtomicEventMilliseconds: 5,
      buildId: 'release:test', workerBuildId: 'release:test', schemaBefore: 13,
      schemaAfter: 13, initialRevision: 0, finalRevision: 9,
      physicalDevice: false, osApiLevel: null,
    }
    expect(captureStage7V2DeviceEvidence(complete).result).toBe('PASS')
    expect(captureStage7V2DeviceEvidence({
      ...complete,
      updateIdentityRecovery: true,
      updateBuildAId: 'release:a', updateBuildBId: 'release:test',
      updateBaselineRevision: 7, updateBaselineStoredTimeSeconds: 99,
      updatePortableHash: 'c'.repeat(64),
    }).result).toBe('PASS')
    expect(() => captureStage7V2DeviceEvidence({
      ...complete, updateIdentityRecovery: true,
    })).toThrow()
    expect(() => captureStage7V2DeviceEvidence({ ...complete, fastRawTicks: '4099' })).toThrow()
    expect(() => captureStage7V2DeviceEvidence({
      ...complete, matrixId: 'android-api26-emulator', osApiLevel: 36,
    })).toThrow()
  })
})
