import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'
import { prepareImportedSaveText } from './import'
import { RECEIVING_DEVICE_PREFERENCE_FIELDS } from './importContext'
import { mappingCoverageManifest } from '../game-state/mappingCoverage'
import {
  TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
  TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
} from './transitionalV2Retirement'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

describe('save import text preparation', () => {
  test('accepts a historical lowercase IDB1 envelope through the shared import pipeline', () => {
    const uppercase = readFileSync(
      new URL(
        'schema-08-canonical-idb1-main-save.txt',
        fixtureDirectory,
      ),
      'utf8',
    )
    const lowercase = `idb1:${uppercase.slice('IDB1:'.length)}`

    const imported = prepareImportedSaveText(
      lowercase,
      '2026-07-29T05:00:00Z',
    )

    expect(imported.targetSchema).toBe(14)
    expect(imported.copyValidatedState()).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-07-29T05:00:00Z',
    })
  })

  test('retains every top-level field classified as a presentation preference', () => {
    const classified = mappingCoverageManifest.entries
      .filter(
        (entry) =>
          entry.classification === 'presentation-preference' &&
          /^\$\.[^.]+$/.test(entry.sourcePath),
      )
      .map((entry) => entry.sourcePath.slice(2))

    expect(RECEIVING_DEVICE_PREFERENCE_FIELDS).toEqual(
      expect.arrayContaining(classified),
    )
  })

  test('manual shared import consumes remote lifecycle time but preserves its stored bank', () => {
    const source = PreparedSave.fromDecoded({
      saveVersion: 12,
      dateQuitString: 'remote quit',
      offlineTime: 45,
      futureValue: { retained: true },
    })
    const text = serializeWebSave(source.copyValidatedState())

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    ).copyValidatedState()

    expect(imported).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-07-29T05:00:00Z',
      offlineTime: 45,
      futureValue: { retained: true },
    })
  })

  test('round-trips a 128-day stored-time bank and capacity without capping them', () => {
    const seconds = 128 * 86_400
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        offlineTime: seconds,
        maxOfflineTime: seconds,
      }).copyValidatedState(),
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    ).copyValidatedState()

    expect(imported.offlineTime).toBe(seconds)
    expect(imported.maxOfflineTime).toBe(seconds)
  })

  test('manual export and import preserve a universe designation beyond the discrete ceiling', () => {
    const designation = DISCRETE_MAXIMUM + 42n
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        saveData: { universesConsumed: designation },
      }).copyValidatedState(),
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    ).copyValidatedState()

    expect(
      (imported.saveData as Record<string, unknown>).universesConsumed,
    ).toBe(designation)
  })

  test('does not accept device entitlement claims from a shared Web save', () => {
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
        cheater: true,
        unlockAllTabs: true,
        [TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]: 99,
        [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]: 'a'.repeat(64),
      }).copyValidatedState(),
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    ).copyValidatedState()

    expect(imported.doubleIp).toBe(false)
    expect(imported.debugOptions).toBe(false)
    expect(imported.debugEverEnabled).toBe(false)
    expect(imported.cheater).toBe(false)
    expect(imported.unlockAllTabs).toBe(false)
    expect(imported).not.toHaveProperty(
      TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
    )
    expect(imported).not.toHaveProperty(
      TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
    )
    expect((imported.packedSettingsFlags as bigint) & 0b1100n).toBe(0n)
  })

  test('preserves only the receiving installation retirement proof', () => {
    const receiving = PreparedSave.fromDecoded({ saveVersion: 12 })
      .copyValidatedState()
    receiving[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD] = 7
    receiving[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] = 'b'.repeat(64)
    const sender = PreparedSave.fromDecoded({
      saveVersion: 12,
      [TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]: 99,
      [TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD]: 'a'.repeat(64),
    }).copyValidatedState()

    const imported = prepareImportedSaveText(
      serializeWebSave(sender),
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T05:00:00Z',
      },
      receiving,
    ).copyValidatedState()

    expect(imported[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD]).toBe(7)
    expect(imported[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD])
      .toBe('b'.repeat(64))
  })

  test('strips an incomplete receiving retirement proof pair', () => {
    const receiving = PreparedSave.fromDecoded({ saveVersion: 12 })
      .copyValidatedState()
    receiving[TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD] = 7
    receiving[TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD] = 'not-a-hash'

    const imported = prepareImportedSaveText(
      serializeWebSave(
        PreparedSave.fromDecoded({ saveVersion: 12 }).copyValidatedState(),
      ),
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T05:00:00Z',
      },
      receiving,
    ).copyValidatedState()

    expect(imported).not.toHaveProperty(
      TRANSITIONAL_V2_CHECKPOINT_REVISION_FIELD,
    )
    expect(imported).not.toHaveProperty(
      TRANSITIONAL_V2_STORED_TIME_JOB_SHA256_FIELD,
    )
  })

  test('retains receiving-device presentation preferences on manual imports', () => {
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        globalMute: false,
        screensaverEnabled: false,
        hidePurchased: false,
        numberFormatting: 0,
        skillsBuyOnTap: false,
        frameRate: 30,
        botsButtonToggle: false,
        storyButtonToggle: false,
        bots: 42,
      }).copyValidatedState(),
    )
    const receiving = PreparedSave.fromDecoded({
      saveVersion: 12,
      globalMute: true,
      screensaverEnabled: true,
      hidePurchased: true,
      numberFormatting: 3,
      skillsBuyOnTap: true,
      frameRate: 120,
      botsButtonToggle: true,
      storyButtonToggle: true,
      bots: 1,
    }).copyValidatedState()

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T05:00:00Z',
      },
      receiving,
    ).copyValidatedState()

    expect(imported).toMatchObject({
      globalMute: true,
      screensaverEnabled: true,
      hidePurchased: true,
      numberFormatting: 3,
      skillsBuyOnTap: true,
      frameRate: 120,
      botsButtonToggle: true,
      storyButtonToggle: true,
      bots: 42,
    })
  })

  test('manual shared import keeps only the receiving local Developer Options unlock', () => {
    const sender = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
      }).copyValidatedState(),
    )
    const receiver = PreparedSave.fromDecoded({
      saveVersion: 12,
      doubleIp: false,
      debugOptions: true,
      debugEverEnabled: true,
      cheater: true,
      unlockAllTabs: true,
    }).copyValidatedState()

    const imported = prepareImportedSaveText(
      sender,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T05:00:00Z',
      },
      receiver,
    ).copyValidatedState()

    expect(imported.doubleIp).toBe(false)
    expect(imported.debugEverEnabled).toBe(true)
    expect(imported.debugOptions).toBe(true)
    expect(imported.cheater).toBe(true)
    expect(imported.unlockAllTabs).toBe(true)
  })

  test('manual shared import cannot introduce a sender Developer Options claim', () => {
    const sender = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        debugOptions: true,
        debugEverEnabled: true,
      }).copyValidatedState(),
    )

    const imported = prepareImportedSaveText(
      sender,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'manual-shared-import',
        importedAtUtc: '2026-07-29T05:00:00Z',
      },
      PreparedSave.fromDecoded({
        saveVersion: 12,
        debugOptions: false,
        debugEverEnabled: false,
      }).copyValidatedState(),
    ).copyValidatedState()

    expect(imported.debugEverEnabled).toBe(false)
    expect(imported.debugOptions).toBe(false)
  })

  test('automatic same-device migration preserves Unity evidence and quit time for one startup grant', () => {
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        dateQuitString: '2026-07-29T04:00:00Z',
        offlineTime: 30,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
      }).copyValidatedState(),
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'automatic-unity-migration',
        observedAtUtc: '2026-07-29T05:00:00Z',
      },
    ).copyValidatedState()

    expect(imported).toMatchObject({
      dateQuitString: '2026-07-29T04:00:00Z',
      offlineTime: 30,
      doubleIp: true,
      debugOptions: true,
      debugEverEnabled: true,
    })
  })

  test('automatic context preserves the genuine Unity quit timestamp for startup consumption', () => {
    const text = readFileSync(
      new URL('schema-08-canonical-idb1-main-save.txt', fixtureDirectory),
      'utf8',
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'automatic-unity-migration',
        observedAtUtc: '2026-07-29T05:00:00Z',
      },
    ).copyValidatedState()

    expect(imported.dateQuitString).toBe('02/02/2026 23:04:43')
  })

  test('transitional Web upgrade preserves local lifecycle and entitlement state', () => {
    const text = JSON.stringify({
      format: 'IDSWEB1',
      schema: 12,
      state: {
        saveVersion: 12,
        dateQuitString: '2026-07-29T04:00:00Z',
        debugOptions: true,
        debugEverEnabled: true,
      },
    })

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
      undefined,
      {
        kind: 'transitional-web-upgrade',
        upgradedAtUtc: '2026-07-29T05:00:00Z',
      },
    ).copyValidatedState()

    expect(imported).toMatchObject({
      dateQuitString: '2026-07-29T04:00:00Z',
      debugOptions: true,
      debugEverEnabled: true,
    })
  })

  test('accepts shipped Unity IDB1 saves through the same migration pipeline', () => {
    const text = readFileSync(
      new URL('schema-08-canonical-idb1-main-save.txt', fixtureDirectory),
      'utf8',
    )

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    )

    expect(imported.targetSchema).toBe(14)
    expect(imported.copyValidatedState()).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-07-29T05:00:00Z',
    })
  })

  test('accepts compressed Web saves through the same preparation pipeline', () => {
    const text = serializeWebSave({
      saveVersion: 12,
      dateQuitString: 'remote quit',
      futureValue: { retained: true },
    })

    const imported = prepareImportedSaveText(
      text,
      '2026-07-29T05:00:00Z',
    ).copyValidatedState()

    expect(imported).toMatchObject({
      dateQuitString: '',
      lastSuccessfulLoadUtc: '2026-07-29T05:00:00Z',
      futureValue: { retained: true },
    })
  })

  test('rejects text outside both supported save envelopes', () => {
    expect(() =>
      prepareImportedSaveText('not a save', '2026-07-29T05:00:00Z'),
    ).toThrow()
  })
})
