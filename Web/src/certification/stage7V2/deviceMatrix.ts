export const STAGE7_V2_DEVICE_CERTIFICATION_MATRIX = Object.freeze([
  Object.freeze({
    id: 'chrome-current', platform: 'web', engine: 'Chrome current',
    minimum: false, execution: 'ci-browser', physicalRequired: false,
  }),
  Object.freeze({
    id: 'android-api26-emulator', platform: 'android', engine: 'Android System WebView',
    os: 'Android 8.0 API 26', minimum: true, execution: 'ci-emulator', physicalRequired: false,
  }),
  Object.freeze({
    id: 'android-api36-emulator', platform: 'android', engine: 'Android System WebView current',
    os: 'Android API 36', minimum: false, execution: 'ci-emulator', physicalRequired: false,
  }),
  Object.freeze({
    id: 'ios-current-simulator', platform: 'ios', engine: 'WKWebView current',
    os: 'GitHub macOS current iOS simulator', minimum: false,
    execution: 'ci-simulator', physicalRequired: false,
  }),
] as const)

export const STAGE7_V2_DEVICE_EVIDENCE_FIELDS = Object.freeze([
  'matrixId', 'performedAtUtc', 'tester', 'deviceModel', 'physicalDevice', 'osApiLevel',
  'osVersion', 'webViewVersion', 'appVersion', 'buildId', 'workerBuildId',
  'workerCatalogHash', 'workerTuningHash', 'policy', 'schemaBefore', 'schemaAfter',
  'initialRevision', 'finalRevision', 'saveReadback', 'reloadReadback',
  'corruptionRecovery', 'lifecyclePauseReturn', 'forcedReloadRecovery',
  'longOfflineSeconds', 'extremeDecimalCanonical', 'updateIdentityRecovery',
  'updateBuildAId', 'updateBuildBId', 'updateBaselineRevision',
  'updateBaselineStoredTimeSeconds', 'updatePortableHash',
  'platformStateIsLocal', 'portableSaveExcludesPlatform', 'maximumChunkMilliseconds',
  'maximumAtomicEventMilliseconds', 'fastRawTicks', 'balancedRawTicks',
  'exactRawTicks', 'fastCompleted', 'balancedCompleted', 'exactCompleted',
  'developerPurchaseVerified', 'developerFreeEnableVerified',
  'developerShardDebit', 'developerStrangeMatterDebit',
  'developerLifetimeShardDelta', 'preAckRecovery', 'postCheckpointRecovery',
  'forwardSchemaRecovery', 'extremeAdvanceVerified', 'result', 'notes',
] as const)
