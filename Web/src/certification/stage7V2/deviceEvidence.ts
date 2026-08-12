import {
  STAGE7_V2_DEVICE_CERTIFICATION_MATRIX,
  STAGE7_V2_DEVICE_EVIDENCE_FIELDS,
} from './deviceMatrix'

export type Stage7V2DeviceEvidence = Readonly<Record<
  (typeof STAGE7_V2_DEVICE_EVIDENCE_FIELDS)[number],
  string | number | boolean | null
>>

export function captureStage7V2DeviceEvidence(value: unknown): Stage7V2DeviceEvidence {
  if (value === null || typeof value !== 'object' || Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype) throw invalid()
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const actual = Reflect.ownKeys(descriptors)
  if (actual.length !== STAGE7_V2_DEVICE_EVIDENCE_FIELDS.length ||
    actual.some((key) => typeof key !== 'string' ||
      !STAGE7_V2_DEVICE_EVIDENCE_FIELDS.includes(key as never))) throw invalid()
  const captured = Object.fromEntries(STAGE7_V2_DEVICE_EVIDENCE_FIELDS.map((key) => {
    const descriptor = descriptors[key]
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) throw invalid()
    const field = descriptor.value as unknown
    if (field !== null && typeof field !== 'string' && typeof field !== 'boolean' &&
      (typeof field !== 'number' || !Number.isFinite(field))) throw invalid()
    return [key, field]
  })) as Stage7V2DeviceEvidence
  if (!STAGE7_V2_DEVICE_CERTIFICATION_MATRIX.some((entry) => entry.id === captured.matrixId) ||
    !['PASS', 'FAIL', 'BLOCKED'].includes(String(captured.result))) throw invalid()
  if (captured.result === 'PASS') {
    const requiredTrue = [
      'saveReadback', 'reloadReadback', 'corruptionRecovery', 'lifecyclePauseReturn',
      'platformStateIsLocal', 'portableSaveExcludesPlatform', 'fastCompleted',
      'balancedCompleted', 'exactCompleted', 'developerPurchaseVerified',
      'developerFreeEnableVerified', 'preAckRecovery', 'postCheckpointRecovery',
      'forwardSchemaRecovery', 'extremeAdvanceVerified',
    ] as const
    if (requiredTrue.some((key) => captured[key] !== true) ||
      captured.longOfflineSeconds !== 42_000_000 ||
      captured.extremeDecimalCanonical !== '1e1000' ||
      !canonicalAtLeast4100(captured.fastRawTicks) ||
      !canonicalAtLeast4100(captured.balancedRawTicks) ||
      !canonicalAtLeast4100(captured.exactRawTicks) ||
      captured.workerCatalogHash === null || captured.workerTuningHash === null ||
      typeof captured.buildId !== 'string' || captured.buildId.length === 0 ||
      typeof captured.workerBuildId !== 'string' || captured.workerBuildId.length === 0 ||
      captured.schemaBefore !== 13 || captured.schemaAfter !== 13 ||
      !Number.isSafeInteger(captured.initialRevision) || !Number.isSafeInteger(captured.finalRevision) ||
      (captured.finalRevision as number) < (captured.initialRevision as number) ||
      captured.developerShardDebit !== '1e5->0' ||
      captured.developerStrangeMatterDebit !== '5e5->0' ||
      typeof captured.developerLifetimeShardDelta !== 'string' ||
      !unchangedLedger(captured.developerLifetimeShardDelta) ||
      typeof captured.maximumChunkMilliseconds !== 'number' ||
      typeof captured.maximumAtomicEventMilliseconds !== 'number' ||
      captured.maximumChunkMilliseconds >= 40 ||
      captured.maximumAtomicEventMilliseconds >= 40) throw invalid()
    if (captured.updateIdentityRecovery === true && (
      typeof captured.updateBuildAId !== 'string' ||
      typeof captured.updateBuildBId !== 'string' ||
      captured.updateBuildAId === captured.updateBuildBId ||
      captured.updateBuildBId !== captured.buildId ||
      !Number.isSafeInteger(captured.updateBaselineRevision) ||
      typeof captured.updateBaselineStoredTimeSeconds !== 'number' ||
      !Number.isFinite(captured.updateBaselineStoredTimeSeconds) ||
      captured.updateBaselineStoredTimeSeconds < 0 ||
      typeof captured.updatePortableHash !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(captured.updatePortableHash) ||
      (captured.updateBaselineRevision as number) > (captured.finalRevision as number)
    )) throw invalid()
    const matrix = STAGE7_V2_DEVICE_CERTIFICATION_MATRIX.find(
      (entry) => entry.id === captured.matrixId,
    )!
    if (matrix.physicalRequired || captured.physicalDevice !== false) throw invalid()
    if (
      (matrix.id === 'android-api26-emulator' && captured.osApiLevel !== 26) ||
      (matrix.id === 'android-api36-emulator' && captured.osApiLevel !== 36) ||
      ((matrix.id === 'chrome-current' || matrix.id === 'ios-current-simulator') &&
        captured.osApiLevel !== null)
    ) throw invalid()
  }
  return Object.freeze(captured)
}

function unchangedLedger(value: string): boolean {
  const match = /^(0|[1-9][0-9]*(?:\.[0-9]+)?(?:e-?[1-9][0-9]*)?)->(.+)$/u.exec(value)
  return match !== null && match[1] === match[2]
}

function canonicalAtLeast4100(value: unknown): boolean {
  return typeof value === 'string' && /^(?:0|[1-9][0-9]*)$/u.test(value) && BigInt(value) >= 4_100n
}

function invalid(): TypeError {
  return new TypeError('Stage 7 device certification evidence is invalid.')
}
