// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { StrictMode } from 'react'
import {
  act,
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimeFoundationStatus,
} from '.'
import {
  useBrowserRuntimeStatus,
} from './useBrowserRuntime'

afterEach(cleanup)

describe('browser runtime React adapter', () => {
  test('uses stable external-store snapshots and cleans StrictMode subscriptions without owning runtime lifecycle', () => {
    const store = new RuntimeStatusStore()
    render(
      <StrictMode>
        <StatusProbe runtime={store.runtime} />
      </StrictMode>,
    )
    expect(screen.getByText('idle')).toBeInTheDocument()
    expect(store.starts).toBe(0)
    expect(store.shutdowns).toBe(0)
    expect(store.activeSubscriptions).toBe(1)

    act(() => store.publish({ phase: 'starting' }))
    expect(screen.getByText('starting')).toBeInTheDocument()
    expect(store.starts).toBe(0)
    expect(store.shutdowns).toBe(0)
  })
})

function StatusProbe({
  runtime,
}: {
  readonly runtime: BrowserUiRuntimeFoundation
}) {
  const status = useBrowserRuntimeStatus(runtime)
  return <span>{status.phase}</span>
}

class RuntimeStatusStore {
  #status: UiRuntimeFoundationStatus = Object.freeze({
    phase: 'idle',
  })
  readonly #listeners = new Set<() => void>()
  starts = 0
  shutdowns = 0

  readonly runtime = {
    status: () => this.#status,
    subscribeStatus: (listener: () => void) => {
      this.#listeners.add(listener)
      return () => this.#listeners.delete(listener)
    },
    start: async () => {
      this.starts += 1
      return this.#status
    },
    shutdown: async () => {
      this.shutdowns += 1
    },
  } as unknown as BrowserUiRuntimeFoundation

  get activeSubscriptions(): number {
    return this.#listeners.size
  }

  publish(status: UiRuntimeFoundationStatus): void {
    this.#status = Object.freeze(status)
    for (const listener of [...this.#listeners]) listener()
  }
}
