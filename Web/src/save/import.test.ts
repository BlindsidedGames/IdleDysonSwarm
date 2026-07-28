import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { serializeWebSave } from './serialization'
import { PreparedSave } from './prepare'
import { prepareImportedSaveText } from './import'

const fixtureDirectory = new URL('../../test/fixtures/', import.meta.url)

describe('save import text preparation', () => {
  test('accepts canonical web saves and consumes the remote lifecycle timestamp', () => {
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

  test('rejects text outside both supported save envelopes', () => {
    expect(() =>
      prepareImportedSaveText('not a save', '2026-07-29T05:00:00Z'),
    ).toThrow()
  })
})
