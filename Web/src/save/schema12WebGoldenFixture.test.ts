import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import fixtureText from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import provenance from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.provenance.json'
import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { compareGraphs } from '../parity/compare'
import { DEFAULT_SAVE_IMPORT_LIMITS } from './decodeIdb1'
import { PreparedSave } from './prepare'
import {
  deserializeWebSave,
  deserializeWebSaveBounded,
  serializeWebSave,
} from './serialization'

describe('schema-12 IDSWEB1 golden fixture', () => {
  test('is the deterministic development first-run prepared state', () => {
    const prepared = createDeterministicUnityFirstRunPreparedSave()
    const expected = prepared.copyValidatedState()

    expect(fixtureText).toMatch(/^IDSWEB1:/)
    expect(serializeWebSave(expected)).toBe(fixtureText)
    expect(hashExactText(fixtureText)).toBe(provenance.artifactSha256)
    expect(Buffer.byteLength(fixtureText, 'utf8')).toBe(
      provenance.artifactBytes,
    )
    expect(provenance.saveSchema).toBe(12)
    expect(provenance.classification).toBe(
      'development-only-non-private',
    )
  })

  test('round-trips, bounded-decodes, and re-enters preparation unchanged', () => {
    const expected =
      createDeterministicUnityFirstRunPreparedSave().copyValidatedState()
    const decoded = deserializeWebSave(fixtureText)
    const bounded = deserializeWebSaveBounded(
      fixtureText,
      DEFAULT_SAVE_IMPORT_LIMITS,
    )
    const preparedAgain = PreparedSave.fromDecoded(decoded)

    expect(decoded.saveVersion).toBe(12)
    expect(compareGraphs(decoded, expected)).toEqual([])
    expect(compareGraphs(bounded, expected)).toEqual([])
    expect(
      compareGraphs(preparedAgain.copyValidatedState(), expected),
    ).toEqual([])
    expect(preparedAgain.sourceSchema).toBe(12)
    expect(preparedAgain.targetSchema).toBe(12)
    expect(serializeWebSave(decoded)).toBe(fixtureText)
  })

  test('records only the checked-in Unity first-run development source', () => {
    expect(provenance.source).toEqual({
      kind: 'checked-in-unity-first-run-development-artifact',
      artifactPath:
        'Web/src/application/firstRun/generated/first-run-schema-12.idb1.txt',
      artifactSha256:
        '259EF04EFC4946C51A6FEA96064A2D2F05A8DB5778A1ECF4B3943A42A317D4FF',
      provenancePath:
        'Web/src/application/firstRun/generated/first-run-schema-12.provenance.json',
      provenanceSha256:
        '194BFE52C0884DD2A0E1DFD74B617933A4938B96D1CEA7EC1AB95281E004F4A4',
    })
    expect(provenance.privacy).toEqual({
      localProductionSaveUsed: false,
      browserProfileUsed: false,
      indexedDbExportUsed: false,
      playerOrSupportSaveUsed: false,
    })
  })
})

function hashExactText(text: string): string {
  return createHash('sha256')
    .update(text, 'utf8')
    .digest('hex')
    .toUpperCase()
}
