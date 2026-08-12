import { describe, expect, test } from 'vitest'
import {
  STAGE7_V2_DEVICE_CERTIFICATION_MATRIX,
  STAGE7_V2_DEVICE_EVIDENCE_FIELDS,
} from './deviceMatrix'

describe('Stage 7 device certification matrix', () => {
  test('pins the supported browser and device baseline/current targets', () => {
    expect(STAGE7_V2_DEVICE_CERTIFICATION_MATRIX.map((entry) => entry.id)).toEqual([
      'chrome-current', 'android-api26-emulator', 'android-api36-emulator',
      'ios-current-simulator',
    ])
    expect(STAGE7_V2_DEVICE_CERTIFICATION_MATRIX.filter((entry) => entry.minimum)
      .map((entry) => entry.id)).toEqual(['android-api26-emulator'])
    expect(STAGE7_V2_DEVICE_CERTIFICATION_MATRIX.filter((entry) => entry.physicalRequired)
      .map((entry) => entry.id)).toEqual([])
  })

  test('requires reproducible identity, persistence, lifecycle, extreme-value and timing evidence', () => {
    for (const required of [
      'buildId', 'workerBuildId', 'saveReadback', 'corruptionRecovery',
      'lifecyclePauseReturn', 'longOfflineSeconds', 'extremeDecimalCanonical',
      'platformStateIsLocal', 'maximumAtomicEventMilliseconds', 'result',
    ]) expect(STAGE7_V2_DEVICE_EVIDENCE_FIELDS).toContain(required)
    expect(new Set(STAGE7_V2_DEVICE_EVIDENCE_FIELDS).size)
      .toBe(STAGE7_V2_DEVICE_EVIDENCE_FIELDS.length)
  })
})
