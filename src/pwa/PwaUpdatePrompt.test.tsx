// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'
import type {
  PwaUpdateController,
  PwaUpdateSnapshot,
} from './serviceWorkerUpdate'

afterEach(cleanup)

describe('PwaUpdatePrompt', () => {
  test('requires an explicit player action before accepting a downloaded update', async () => {
    const user = userEvent.setup()
    const controller = new FakeUpdateController({ phase: 'available' })
    const prepare = vi.fn(async () => undefined)
    render(
      <IntlProvider locale="en">
        <PwaUpdatePrompt
          controller={controller}
          prepareForActivation={prepare}
        />
      </IntlProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Update ready' })).toBeVisible()
    expect(controller.acceptUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save and update' }))
    expect(controller.acceptUpdate).toHaveBeenCalledWith(prepare)
  })

  test('stays hidden until an installed update is waiting', () => {
    const controller = new FakeUpdateController({ phase: 'idle' })
    render(
      <IntlProvider locale="en">
        <PwaUpdatePrompt
          controller={controller}
          prepareForActivation={async () => undefined}
        />
      </IntlProvider>,
    )

    expect(screen.queryByRole('heading', { name: 'Update ready' })).not.toBeInTheDocument()
  })
})

class FakeUpdateController implements PwaUpdateController {
  readonly acceptUpdate = vi.fn(async () => undefined)
  private readonly snapshot: PwaUpdateSnapshot

  constructor(snapshot: PwaUpdateSnapshot) {
    this.snapshot = snapshot
  }

  getSnapshot = () => this.snapshot
  subscribe = () => () => undefined
  start = async () => undefined
  dispose = () => undefined
}
