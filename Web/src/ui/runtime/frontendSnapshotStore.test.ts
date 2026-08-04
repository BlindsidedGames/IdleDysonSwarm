import { describe, expect, test } from 'vitest'
import type { FrontendApplicationSnapshot } from '../../application/frontendSnapshot'
import { FrontendSnapshotStore } from './frontendSnapshotStore'

describe('frontend snapshot external store', () => {
  test('takes ownership of recursively frozen snapshots with stable identity', () => {
    const store = new FrontendSnapshotStore()
    const publications: FrontendApplicationSnapshot[] = []
    store.subscribe((snapshot) => publications.push(snapshot))
    const source = readySnapshot(1, 0, 0, 'first')

    const first = store.publish(source)
    expect(store.snapshot()).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first.phase).toBe('ready')
    if (first.phase !== 'ready') return
    expect(Object.isFrozen(first.revision)).toBe(true)
    expect(Object.isFrozen(first.gameplay)).toBe(true)
    expect(() => {
      source.gameplay.marker = 'mutated-source'
    }).toThrow()
    expect((first.gameplay as unknown as { marker: string }).marker)
      .toBe('first')

    const duplicate = store.publish(
      readySnapshot(1, 0, 0, 'different-projection'),
    )
    expect(duplicate).toBe(first)
    expect(publications).toHaveLength(1)

    const forced = store.publish(
      readySnapshot(1, 0, 0, 'route-projection'),
      true,
    )
    expect(forced).not.toBe(first)
    expect(
      (forced as typeof forced & { gameplay: { marker: string } })
        .gameplay.marker,
    ).toBe('route-projection')
    expect(publications).toHaveLength(2)

    const durable = store.publish(
      readySnapshot(1, 0, 1, 'checkpointed'),
    )
    expect(durable).not.toBe(forced)
    expect(publications).toHaveLength(3)
  })

  test('contains listener failures and clears gameplay identity on ownership loss', () => {
    const store = new FrontendSnapshotStore()
    let healthyCalls = 0
    store.subscribe(() => {
      throw new Error('render failed')
    })
    store.subscribe(() => {
      healthyCalls += 1
    })

    store.publish(readySnapshot(1, 1, 1, 'ready'))
    const cleared = store.clear()

    expect(healthyCalls).toBe(2)
    expect(cleared).toEqual({ version: 1, phase: 'idle' })
    expect(Object.isFrozen(cleared)).toBe(true)
  })
})

function readySnapshot(
  session: number,
  state: number,
  durable: number,
  marker: string,
): FrontendApplicationSnapshot & {
  gameplay: { marker: string }
} {
  return {
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision: { session, state, durable },
    checkpoint: {
      kind: 'clean',
      durableRevision: durable,
    },
    operation: 'none',
    gameplay: { marker },
  } as unknown as FrontendApplicationSnapshot & {
    gameplay: { marker: string }
  }
}
