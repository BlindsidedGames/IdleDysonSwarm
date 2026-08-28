import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  AVOCADO_LOG_THRESHOLD,
  deriveAvocadoMultiplier,
  feedAllToAvocado,
} from './avocadoDomain'
import { bitDecrement } from './numeric'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  return {
    ...source,
    infinity: {
      ...source.infinity,
      points: 50n,
      spentPoints: 8n,
    },
    reality: { ...source.reality, influence: 100 },
    dream: { ...source.dream, strangeMatter: 1_000 },
    avocado: {
      unlocked: true,
      infinityPoints: 0,
      influence: 0,
      strangeMatter: 0,
      overflowMultiplier: 0,
    },
  }
}

describe('canonical Avocado domain', () => {
  test('uses the authored threshold and neutral below-threshold components', () => {
    expect(AVOCADO_LOG_THRESHOLD).toBe(10)
    const source = state()
    expect(deriveAvocadoMultiplier(source)).toEqual({
      infinityPoints: 1,
      influence: 1,
      strangeMatter: 1,
      overflow: 1,
      total: 1,
    })

    const threshold = {
      ...source,
      avocado: {
        ...source.avocado,
        infinityPoints: 10,
        influence: 100,
        strangeMatter: 1_000,
        overflowMultiplier: 2,
      },
    }
    expect(deriveAvocadoMultiplier(threshold)).toEqual({
      infinityPoints: 1,
      influence: 2,
      strangeMatter: 3,
      overflow: 3,
      total: 18,
    })
  })

  test('returns a neutral multiplier while locked regardless of stored values', () => {
    const source = state()
    const locked = {
      ...source,
      avocado: {
        ...source.avocado,
        unlocked: false,
        infinityPoints: 1_000_000,
        overflowMultiplier: 42,
      },
    }
    expect(deriveAvocadoMultiplier(locked).total).toBe(1)
  })

  test('feeds only unspent Infinity Points and preserves spent bookkeeping', () => {
    const source = state()
    const before = structuredClone(source)
    const result = feedAllToAvocado(source, 'infinity-points')
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'fed',
      amount: 42,
    })
    expect(result.state.infinity.points).toBe(8n)
    expect(result.state.infinity.spentPoints).toBe(8n)
    expect(result.state.avocado.infinityPoints).toBe(42)
    expect(source).toEqual(before)
  })

  test('drains all Influence and Strange Matter atomically', () => {
    const source = state()
    const influence = feedAllToAvocado(source, 'influence')
    expect(influence.amount).toBe(100)
    expect(influence.state.reality.influence).toBe(0)
    expect(influence.state.avocado.influence).toBe(100)

    const matter = feedAllToAvocado(
      influence.state,
      'strange-matter',
    )
    expect(matter.amount).toBe(1_000)
    expect(matter.state.dream.strangeMatter).toBe(0)
    expect(matter.state.avocado.strangeMatter).toBe(1_000)
  })

  test('feeds continuous resources near the double ceiling', () => {
    const source = state()
    const enormous = bitDecrement(Number.MAX_VALUE)
    const result = feedAllToAvocado({
      ...source,
      dream: { ...source.dream, strangeMatter: enormous },
    }, 'strange-matter')

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      amount: enormous,
    })
    expect(result.state.dream.strangeMatter).toBe(0)
    expect(result.state.avocado.strangeMatter).toBe(enormous)
  })

  test('preserves resources when the Avocato accumulator is already saturated', () => {
    const source = state()
    const result = feedAllToAvocado({
      ...source,
      avocado: { ...source.avocado, strangeMatter: Number.MAX_VALUE },
    }, 'strange-matter')

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-maxed',
    })
    expect(result.state.dream.strangeMatter).toBe(1_000)
  })

  test('partially drains a continuous source when only part fits', () => {
    const source = state()
    const available = 1e308
    const current = 1e308
    const result = feedAllToAvocado({
      ...source,
      dream: { ...source.dream, strangeMatter: available },
      avocado: { ...source.avocado, strangeMatter: current },
    }, 'strange-matter')

    const credited = Number.MAX_VALUE - current
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'fed',
      amount: credited,
    })
    expect(result.state.avocado.strangeMatter).toBe(Number.MAX_VALUE)
    expect(result.state.dream.strangeMatter).toBe(available - credited)
  })

  test('rejects locked and empty feeds without mutation', () => {
    const source = state()
    const locked = {
      ...source,
      avocado: { ...source.avocado, unlocked: false },
    }
    expect(feedAllToAvocado(locked, 'influence')).toMatchObject({
      accepted: false,
      changed: false,
      code: 'locked',
      state: locked,
    })

    const empty = {
      ...source,
      reality: { ...source.reality, influence: 0 },
    }
    expect(feedAllToAvocado(empty, 'influence')).toMatchObject({
      accepted: false,
      changed: false,
      code: 'empty',
      state: empty,
    })
  })
})
