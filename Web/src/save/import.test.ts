import { readFileSync } from 'node:fs'
import { gzipSync, strToU8 } from 'fflate'
import { describe, expect, test } from 'vitest'
import { serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'
import { prepareImportedSaveText } from './import'
import { RECEIVING_DEVICE_PREFERENCE_FIELDS } from './importContext'
import { mappingCoverageManifest } from '../game-state/mappingCoverage'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

function syntheticWebNativeV13(): string {
  const json = JSON.stringify({
    schemaVersion: 13,
    modelVersion: 2,
    savedAtUtc: '2026-08-08T00:00:00.000Z',
    state: {},
  })
  const compressed = gzipSync(strToU8(json), { level: 9, mtime: 0 })
  let binary = ''
  for (const byte of compressed) binary += String.fromCharCode(byte)
  return `IDSWEB1:${btoa(binary)}`
}

describe('save import text preparation', () => {
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

  test('does not accept device entitlement claims from a shared Web save', () => {
    const text = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
        cheater: true,
        unlockAllTabs: true,
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
    const nonportablePackedMask =
      (1n << 2n) | (1n << 3n) | (1n << 4n) | (1n << 9n)
    expect(
      (imported.packedSettingsFlags as bigint) & nonportablePackedMask,
    ).toBe(0n)
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

  test('manual shared import keeps only the receiving local platform state', () => {
    const sender = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        doubleIp: true,
        debugOptions: true,
        debugEverEnabled: true,
        cheater: false,
        unlockAllTabs: false,
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
    const receivingPackedMask =
      (1n << 2n) | (1n << 4n) | (1n << 9n)
    expect(
      (imported.packedSettingsFlags as bigint) & receivingPackedMask,
    ).toBe(receivingPackedMask)
    expect((imported.packedSettingsFlags as bigint) & (1n << 3n)).toBe(0n)
  })

  test('manual shared import cannot introduce sender platform state', () => {
    const sender = serializeWebSave(
      PreparedSave.fromDecoded({
        saveVersion: 12,
        debugOptions: true,
        debugEverEnabled: true,
        cheater: true,
        unlockAllTabs: true,
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
        cheater: false,
        unlockAllTabs: false,
      }).copyValidatedState(),
    ).copyValidatedState()

    expect(imported.debugEverEnabled).toBe(false)
    expect(imported.debugOptions).toBe(false)
    expect(imported.cheater).toBe(false)
    expect(imported.unlockAllTabs).toBe(false)
    const platformPackedMask =
      (1n << 2n) | (1n << 4n) | (1n << 9n)
    expect(
      (imported.packedSettingsFlags as bigint) & platformPackedMask,
    ).toBe(0n)
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
        cheater: true,
        unlockAllTabs: true,
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
      cheater: true,
      unlockAllTabs: true,
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
        cheater: true,
        unlockAllTabs: true,
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
      cheater: true,
      unlockAllTabs: true,
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

    expect(imported.targetSchema).toBe(12)
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

  test('rejects a synthetic Web-native V13 import as unsupported future', () => {
    expect(() =>
      prepareImportedSaveText(
        syntheticWebNativeV13(),
        '2026-07-29T05:00:00Z',
      ),
    ).toThrow('Save schema 13 is newer than supported schema 12.')
  })

  test('rejects text outside both supported save envelopes', () => {
    expect(() =>
      prepareImportedSaveText('not a save', '2026-07-29T05:00:00Z'),
    ).toThrow()
  })
})
