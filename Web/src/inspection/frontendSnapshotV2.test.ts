import { describe, expect, test } from 'vitest'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { createCanonicalRuntimePublicationV2 } from '../application/canonicalRuntimeSessionV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
  isGameDecimal,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  projectLegacyPresentationState,
  selectFrontendApplicationSnapshotV2,
} from './frontendSnapshotV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)

describe('V2 full-game frontend projection', () => {
  test('keeps a route-scoped Bots projection within an interactive budget', () => {
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 1,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const started = performance.now()
    const revision = Object.freeze({ session: 1, state: 1, durable: 1 })
    const snapshot = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'bots',
    )
    const elapsed = performance.now() - started
    expect(snapshot.phase).toBe('ready')
    expect(elapsed).toBeLessThan(250)
    const cachedStarted = performance.now()
    expect(selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'bots',
    )).toBe(snapshot)
    expect(performance.now() - cachedStarted).toBeLessThan(2)
  })

  test('keeps exact large resources in the real gameplay snapshot', () => {
    const huge = gameDecimalFromCanonicalString('1e1000')
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: { ...migrated.state.dyson, money: huge, science: huge },
      infinity: { ...migrated.state.infinity, availablePoints: huge },
      skills: { ...migrated.state.skills, selectedPreset: 4 },
      reality: { ...migrated.state.reality, influence: huge },
      quantum: {
        ...migrated.state.quantum,
        availableShards: huge,
        lifetimeEarnedShards: huge,
      },
      avocado: { ...migrated.state.avocado, unlocked: true },
      dream: { ...migrated.state.dream, strangeMatter: huge },
    })
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 8,
      state,
      runtime: migrated.runtime,
    }))
    const snapshot = selectFrontendApplicationSnapshotV2(
      publication,
      Object.freeze({ session: 1, state: 8, durable: 8 }),
      'clean',
      'all',
    )

    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.dyson.money)).toBe('1e1000')
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.dyson.science)).toBe('1e1000')
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.infinity.availablePoints)).toBe('1e1000')
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.gameplay.resources)).toBe(true)
    expect(snapshot.gameplay.runtime.selectedSkillPresetSlot).toBe(4)
    expect(projectLegacyPresentationState(state).dyson.money).toBe(0)

    const assemblyLine = snapshot.gameplay.previews.dyson.basicFacilities.find(
      ({ facilityId }) => facilityId === 'assembly_lines',
    )
    expect(assemblyLine?.eligible).toBe(true)
    expect(isGameDecimal(assemblyLine?.cost)).toBe(true)
    if (assemblyLine !== undefined && isGameDecimal(assemblyLine.cost)) {
      expect(gameDecimalToCanonicalString(assemblyLine.cost)).toBe('1e2')
    }
    expect(snapshot.gameplay.previews.research.cards.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.infinity.shop.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.dream.foundational.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.reality.upgrades.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.quantum.upgrades.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.avocado.feeds.some(({ eligible }) => eligible)).toBe(true)
    expect(containsMaximumNumber(snapshot.gameplay.previews)).toBe(false)
  }, 30_000)
})

function containsMaximumNumber(value: unknown): boolean {
  if (value === Number.MAX_VALUE) return true
  if (Array.isArray(value)) return value.some(containsMaximumNumber)
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).some(containsMaximumNumber)
}
