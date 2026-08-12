import { describe, expect, test } from 'vitest'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import { gameDecimalFromCanonicalString } from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  adoptPreparedCanonicalRuntimePublicationV2,
  createCanonicalRuntimePublicationV2,
  registerCanonicalRuntimeApplicationAuthorityV2,
} from './canonicalRuntimeSessionV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)

describe('prepared canonical runtime application publication', () => {
  test('adopts one deeply frozen revision without cloning the canonical state again', () => {
    const source = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 4,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const state = Object.freeze({
      ...source.state,
      dyson: Object.freeze({
        ...source.state.dyson,
        money: gameDecimalFromCanonicalString('1e1000'),
      }),
    })
    const authority = registerCanonicalRuntimeApplicationAuthorityV2()
    const adopted = adoptPreparedCanonicalRuntimePublicationV2(
      authority,
      source,
      Object.freeze({ revision: 5, state, runtime: source.runtime }),
    )
    expect(adopted.revision).toBe(5)
    expect(adopted.state).toBe(state)
    expect(Object.isFrozen(adopted.runtime)).toBe(true)
  })

  test('rejects forged authority, stale revision, mutable state, and unissued source', () => {
    const source = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 1,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const authority = registerCanonicalRuntimeApplicationAuthorityV2()
    const value = Object.freeze({
      revision: 2,
      state: source.state,
      runtime: source.runtime,
    })
    expect(() => adoptPreparedCanonicalRuntimePublicationV2(
      Object.freeze({ policy: 'canonical-runtime-application-publication-v1' }),
      source,
      value,
    )).toThrow('not authentic')
    expect(() => adoptPreparedCanonicalRuntimePublicationV2(
      authority,
      source,
      Object.freeze({ ...value, revision: 3 }),
    )).toThrow('advance one revision')
    expect(() => adoptPreparedCanonicalRuntimePublicationV2(
      authority,
      source,
      Object.freeze({ ...value, state: { ...source.state } }),
    )).toThrow('deeply frozen')
    expect(() => adoptPreparedCanonicalRuntimePublicationV2(
      authority,
      Object.freeze({ ...source }),
      value,
    )).toThrow('was not issued')
  })
})
