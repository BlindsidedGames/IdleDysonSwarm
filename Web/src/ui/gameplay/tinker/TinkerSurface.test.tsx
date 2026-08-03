// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  TinkerSurface,
  type TinkerFacts,
} from './TinkerSurface'
import {
  TINKER_REPEAT_HOLD_MILLISECONDS,
  type TinkerCommandDispatch,
} from './useTransientTinkerHold'

const tinkerCss = readFileSync(
  resolve(
    process.cwd(),
    'src/ui/gameplay/tinker/tinker.css',
  ),
  'utf8',
)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('TinkerSurface transient interaction', () => {
  test('starts immediately, captures one pointer, enables repeat at 500 ms, and keeps the running panel visually intact on release', async () => {
    const dispatch = createDispatch()
    const view = renderTinker(dispatch)
    const button = tinkerButton()
    const capture = installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 17 })

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      kind: 'tinker.start',
      repeat: false,
    })
    expect(capture.set).toHaveBeenCalledWith(17)
    expect(button).toHaveAttribute('data-gesture-active', 'true')
    expect(button.closest('.tinker-surface')).toHaveAttribute(
      'data-held-visual',
      'true',
    )

    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS - 1)
    })
    expect(dispatch).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      kind: 'tinker.start',
      repeat: true,
    })

    view.rerender(tinkerElement(runningFacts({ repeat: true }), dispatch))
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button.closest('.tinker-surface')).toHaveAttribute(
      'data-held-visual',
      'true',
    )
    expect(
      screen.getByRole('progressbar', { name: 'Tinker progress' }),
    ).toHaveAttribute('value', '0.1')

    fireEvent.pointerUp(button, { button: 0, pointerId: 17 })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      kind: 'tinker.set-repeat',
      enabled: false,
    })
    expect(capture.release).toHaveBeenCalledWith(17)
    expect(button).not.toBeDisabled()
    expect(button).not.toHaveAttribute('aria-disabled')
    expect(button).toHaveAttribute('data-gesture-active', 'false')
    expect(button.closest('.tinker-surface')).toHaveAttribute(
      'data-held-visual',
      'false',
    )
    expect(
      screen.getByRole('progressbar', { name: 'Tinker progress' }),
    ).toHaveAttribute('value', '0.1')
  })

  test('does not dispatch another start when the visually intact panel is already running', () => {
    const dispatch = createDispatch()
    renderTinker(dispatch, runningFacts())
    const button = tinkerButton()
    installPointerCapture(button)

    expect(button).not.toBeDisabled()
    fireEvent.pointerDown(button, { button: 0, pointerId: 18 })
    fireEvent.pointerUp(button, { button: 0, pointerId: 18 })
    fireEvent.click(button, { detail: 0 })

    expect(dispatch).not.toHaveBeenCalled()
  })

  test('serializes repeat-on and release-off so revisioned dispatch cannot leave repeat enabled', async () => {
    const start = deferredResult()
    const enable = deferredResult()
    const dispatch = vi
      .fn<TinkerCommandDispatch>()
      .mockImplementationOnce(() => start.promise)
      .mockImplementationOnce(() => enable.promise)
      .mockResolvedValue(acceptedResult())
    renderTinker(dispatch)
    const button = tinkerButton()
    installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 91 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    fireEvent.pointerUp(button, { button: 0, pointerId: 91 })
    expect(dispatch).toHaveBeenCalledTimes(1)

    start.resolve(acceptedResult())
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      kind: 'tinker.start',
      repeat: true,
    })
    expect(dispatch).toHaveBeenCalledTimes(2)

    enable.resolve(acceptedResult())
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      kind: 'tinker.set-repeat',
      enabled: false,
    })
  })

  test('clears a pre-threshold hold without requesting repeat in either direction', () => {
    const dispatch = createDispatch()
    renderTinker(dispatch)
    const button = tinkerButton()
    installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 3 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS - 1)
    })
    fireEvent.pointerUp(button, { button: 0, pointerId: 3 })
    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      kind: 'tinker.start',
      repeat: false,
    })
  })

  test('allows distinct rapid taps without debounce and suppresses each compatibility click', async () => {
    const dispatch = createDispatch()
    renderTinker(dispatch)
    const button = tinkerButton()
    installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(button, { button: 0, pointerId: 1 })
    fireEvent.click(button, { detail: 1 })
    await flushDispatchQueue()
    fireEvent.pointerDown(button, { button: 0, pointerId: 2 })
    fireEvent.pointerUp(button, { button: 0, pointerId: 2 })
    fireEvent.click(button, { detail: 1 })

    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(dispatch.mock.calls.map(([command]) => command)).toEqual([
      { kind: 'tinker.start', repeat: false },
      { kind: 'tinker.start', repeat: false },
    ])
  })

  test('ignores extra pointers on the same control without allowing them to cancel the initiating pointer', async () => {
    const dispatch = createDispatch()
    renderTinker(dispatch)
    const button = tinkerButton()
    const capture = installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 11 })
    fireEvent.pointerDown(button, { button: 0, pointerId: 12 })
    fireEvent.pointerUp(button, { button: 0, pointerId: 12 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    await flushDispatchQueue()

    expect(capture.set).toHaveBeenCalledTimes(1)
    expect(capture.set).toHaveBeenCalledWith(11)
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(dispatch).toHaveBeenLastCalledWith({
      kind: 'tinker.start',
      repeat: true,
    })

    fireEvent.pointerUp(button, { button: 0, pointerId: 11 })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenLastCalledWith({
      kind: 'tinker.set-repeat',
      enabled: false,
    })
  })

  test.each([
    ['pointer cancellation', 'pointerCancel'],
    ['lost pointer capture', 'lostPointerCapture'],
  ] as const)('disables repeat on %s', async (_label, eventName) => {
    const dispatch = createDispatch()
    renderTinker(dispatch)
    const button = tinkerButton()
    installPointerCapture(button)

    fireEvent.pointerDown(button, { button: 0, pointerId: 9 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    fireEvent[eventName](button, { pointerId: 9 })
    await flushDispatchQueue()

    expect(dispatch).toHaveBeenLastCalledWith({
      kind: 'tinker.set-repeat',
      enabled: false,
    })
  })

  test('disables repeat on control blur and application blur without duplicate stop commands', async () => {
    const controlDispatch = createDispatch()
    renderTinker(controlDispatch)
    const first = tinkerButton()
    installPointerCapture(first)
    fireEvent.pointerDown(first, { button: 0, pointerId: 21 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    fireEvent.blur(first)
    fireEvent.blur(window)
    await flushDispatchQueue()
    expect(stopCommands(controlDispatch)).toHaveLength(1)

    cleanup()
    const windowDispatch = createDispatch()
    renderTinker(windowDispatch)
    const second = tinkerButton()
    installPointerCapture(second)
    fireEvent.pointerDown(second, { button: 0, pointerId: 22 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    fireEvent.blur(window)
    await flushDispatchQueue()
    expect(stopCommands(windowDispatch)).toHaveLength(1)
  })

  test('supports Space hold, ignores key auto-repeat and its native click, then preserves Enter activation', async () => {
    const dispatch = createDispatch()
    renderTinker(dispatch)
    const button = tinkerButton()

    fireEvent.keyDown(button, { key: ' ', repeat: false })
    fireEvent.keyDown(button, { key: ' ', repeat: true })
    expect(dispatch).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      kind: 'tinker.start',
      repeat: true,
    })

    fireEvent.keyUp(button, { key: ' ' })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      kind: 'tinker.set-repeat',
      enabled: false,
    })
    fireEvent.click(button, { detail: 0 })
    expect(dispatch).toHaveBeenCalledTimes(3)

    expect(
      fireEvent.keyDown(button, { key: 'Enter', repeat: true }),
    ).toBe(false)
    expect(dispatch).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(button, { key: 'Enter', repeat: false })
    fireEvent.click(button, { detail: 0 })
    await flushDispatchQueue()
    expect(dispatch).toHaveBeenNthCalledWith(4, {
      kind: 'tinker.start',
      repeat: false,
    })
  })

  test('keeps transient holds independent across separate Tinker controls', async () => {
    const firstDispatch = createDispatch()
    const secondDispatch = createDispatch()
    render(
      <IntlProvider locale="en">
        <TinkerSurface
          facts={readyFacts()}
          stateRevision={0}
          dispatch={firstDispatch}
        />
        <TinkerSurface
          facts={readyFacts()}
          stateRevision={0}
          dispatch={secondDispatch}
        />
      </IntlProvider>,
    )
    const [first, second] = screen.getAllByRole<HTMLButtonElement>(
      'button',
      {
        name:
          'Tinker in your garage Manually put together a new bot from parts in your shed.',
      },
    )
    installPointerCapture(first)
    installPointerCapture(second)

    fireEvent.pointerDown(first, { button: 0, pointerId: 31 })
    fireEvent.pointerDown(second, { button: 0, pointerId: 32 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    await flushDispatchQueue()

    expect(firstDispatch).toHaveBeenLastCalledWith({
      kind: 'tinker.start',
      repeat: true,
    })
    expect(secondDispatch).toHaveBeenLastCalledWith({
      kind: 'tinker.start',
      repeat: true,
    })

    fireEvent.pointerUp(first, { pointerId: 31 })
    await flushDispatchQueue()
    expect(stopCommands(firstDispatch)).toHaveLength(1)
    expect(stopCommands(secondDispatch)).toHaveLength(0)
  })

  test('cleans timers and requests repeat off on unmount only when needed', async () => {
    const beforeThreshold = createDispatch()
    const first = renderTinker(beforeThreshold)
    const firstButton = tinkerButton()
    installPointerCapture(firstButton)
    fireEvent.pointerDown(firstButton, { button: 0, pointerId: 41 })
    first.unmount()
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    expect(beforeThreshold).toHaveBeenCalledTimes(1)

    const afterThreshold = createDispatch()
    const second = renderTinker(afterThreshold)
    const secondButton = tinkerButton()
    installPointerCapture(secondButton)
    fireEvent.pointerDown(secondButton, { button: 0, pointerId: 42 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    second.unmount()
    await flushDispatchQueue()
    expect(stopCommands(afterThreshold)).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  test('redacts authoritative stale, rejected and runtime failures without retrying', async () => {
    const dispatch = vi
      .fn<TinkerCommandDispatch>()
      .mockResolvedValueOnce(rejectedResult())
      .mockResolvedValueOnce(nonStaleRejectedResult())
      .mockResolvedValueOnce(failedResult())
    renderTinker(dispatch)
    const button = tinkerButton()

    fireEvent.click(button, { detail: 0 })
    await act(async () => undefined)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tinker changed before the action completed. Try again.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'Expected revision 4 does not match current revision 5.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'SIM-STALE-REVISION',
    )
    expect(dispatch).toHaveBeenCalledTimes(1)

    fireEvent.click(button, { detail: 0 })
    await act(async () => undefined)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tinker could not be completed.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'Player has private rejection detail.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'TINKER-PRIVATE-REJECTION',
    )

    fireEvent.click(button, { detail: 0 })
    await act(async () => undefined)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tinker is temporarily unavailable.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'Writer authority was lost.',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'RUNTIME-PLAYER-AUTHORITY-LOST',
    )
    expect(dispatch).toHaveBeenCalledTimes(3)
  })

  test('maps a rejected dispatch Promise to safe runtime feedback without retry or detail leakage', async () => {
    const dispatch = createDispatch()
    dispatch.mockRejectedValueOnce(
      new Error('C:\\private\\save-path secret-owner-token'),
    )
    renderTinker(dispatch)

    fireEvent.click(tinkerButton(), { detail: 0 })
    await act(async () => undefined)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Tinker is temporarily unavailable.')
    expect(alert).not.toHaveTextContent('private')
    expect(alert).not.toHaveTextContent('secret-owner-token')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  test('remains interactive after StrictMode effect replay and cleans repeat exactly once', async () => {
    const dispatch = createDispatch()
    dispatch.mockResolvedValueOnce(rejectedResult())
    const view = render(
      <StrictMode>
        {tinkerElement(readyFacts(), dispatch)}
      </StrictMode>,
    )
    const button = tinkerButton()
    installPointerCapture(button)

    fireEvent.click(button, { detail: 0 })
    await act(async () => undefined)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tinker changed before the action completed. Try again.',
    )

    fireEvent.pointerDown(button, { button: 0, pointerId: 71 })
    act(() => {
      vi.advanceTimersByTime(TINKER_REPEAT_HOLD_MILLISECONDS)
    })
    await flushDispatchQueue()
    view.unmount()
    await flushDispatchQueue()

    expect(dispatch).toHaveBeenCalledWith({
      kind: 'tinker.start',
      repeat: false,
    })
    expect(dispatch).toHaveBeenCalledWith({
      kind: 'tinker.start',
      repeat: true,
    })
    expect(stopCommands(dispatch)).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('TinkerSurface presentation and accessibility', () => {
  test('holds canonical progress without animation when reduced motion is requested', () => {
    const requestFrame = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))

    renderTinker(
      createDispatch(),
      runningFacts({
        elapsedSeconds: 0.125,
        cooldownSeconds: 0.5,
        timeToCompletionSeconds: 0.375,
      }),
    )

    expect(
      screen.getByRole('progressbar', { name: 'Tinker progress' }),
    ).toHaveAttribute('value', '0.125')
    expect(screen.getByText('0.37s')).toBeInTheDocument()
    expect(requestFrame).not.toHaveBeenCalled()
  })

  test('keeps visual progress monotonic within a cycle and resets only when canonical progress wraps', () => {
    let now = 0
    let nextFrame: FrameRequestCallback | undefined
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextFrame = callback
        return 1
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const dispatch = createDispatch()
    const view = renderTinker(
      dispatch,
      runningFacts({ elapsedSeconds: 0.1 }),
    )
    const progress = screen.getByRole('progressbar', {
      name: 'Tinker progress',
    }) as HTMLProgressElement

    act(() => {
      now = 200
      nextFrame?.(now)
    })
    expect(progress.value).toBeCloseTo(0.3)

    view.rerender(
      tinkerElement(
        runningFacts({ elapsedSeconds: 0.2 }),
        dispatch,
      ),
    )
    expect(progress.value).toBeCloseTo(0.3)

    view.rerender(
      tinkerElement(
        runningFacts({ elapsedSeconds: 0.05 }),
        dispatch,
      ),
    )
    expect(progress.value).toBeCloseTo(0.05)
  })

  test('restarts visual progress when a new authoritative repeat wraps from zero to zero', () => {
    let now = 0
    let nextFrame: FrameRequestCallback | undefined
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        nextFrame = callback
        return 1
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const dispatch = createDispatch()
    const facts = runningFacts({ elapsedSeconds: 0 })
    const view = render(tinkerElement(facts, dispatch, 1))
    const progress = screen.getByRole('progressbar', {
      name: 'Tinker progress',
    }) as HTMLProgressElement

    act(() => {
      now = 500
      nextFrame?.(now)
    })
    expect(progress.value).toBeCloseTo(0.5)
    expect(screen.getByText('0.00s')).toBeInTheDocument()

    view.rerender(tinkerElement(facts, dispatch, 2))

    expect(progress.value).toBe(0)
    expect(screen.getByText('0.50s')).toBeInTheDocument()
    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  test('renders Unity copy, hold hint, time and progress with no Repeat control', () => {
    const dispatch = createDispatch()
    renderTinker(
      dispatch,
      runningFacts({
        repeat: true,
        effectiveManualLabour: true,
        elapsedSeconds: 0.125,
        cooldownSeconds: 0.5,
        timeToCompletionSeconds: 0.375,
        assemblyYield: 37_151.521_096_6,
      }),
    )

    expect(
      screen.getByText('Tinker in your garage'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Manually put together a new bot from parts in your shed.',
      ),
    ).toBeInTheDocument()
    expect(
      document.querySelector('.tinker-surface__output'),
    ).toHaveTextContent(
      'Masterfully made you will produce 37.1K.',
    )
    expect(screen.getByText('37.1K')).toHaveClass(
      'tinker-surface__yield',
    )
    expect(screen.getByText('0.37s')).toBeInTheDocument()
    const progress = screen.getByRole('progressbar', {
      name: 'Tinker progress',
    })
    expect(progress).toHaveAttribute('value', '0.125')
    expect(progress).toHaveAttribute('max', '0.5')
    expect(progress).toHaveAttribute('aria-valuetext', '0.37s')
    expect(
      screen.getByText('Hold anywhere to repeat...'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /repeat/i }),
    ).not.toBeInTheDocument()
    expect(
      tinkerButton().querySelector(
        '.tinker-surface__hold-progress',
      ),
    ).not.toBeInTheDocument()
    expect(tinkerCss).toMatch(
      /data-held-visual="true"[\s\S]*::-webkit-progress-value\s*\{[\s\S]*background:\s*#367879;/,
    )
    expect(tinkerCss).not.toContain('tinker-surface__hold-progress')
    expect(tinkerCss).not.toContain('@keyframes tinker-hold-to-repeat')
  })

  test('uses a compact stacked presentation on phone-sized screens', () => {
    expect(tinkerCss).toMatch(/@media \(max-width: 720px\)/)
    expect(tinkerCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.tinker-surface__control\s*\{[\s\S]*padding:\s*0\.32rem 0\.45rem;/,
    )
    expect(tinkerCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.tinker-surface__output\s*\{[\s\S]*grid-column:\s*1 \/ -1;/,
    )
    expect(tinkerCss).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.tinker-surface__progress\s*\{[\s\S]*block-size:\s*1rem;/,
    )
  })

  test('formats and highlights the blocked Manual Labour bot yield', () => {
    renderTinker(
      createDispatch(),
      runningFacts({
        presentationMode: 'manual-labour-blocked',
        botYield: 1_234,
      }),
    )

    expect(
      document.querySelector('.tinker-surface__output'),
    ).toHaveTextContent('You will produce 1.23K.')
    expect(screen.getByText('1.23K')).toHaveClass(
      'tinker-surface__yield',
    )
  })

  test('shows the exact fresh-save tip only in default Tinker mode', () => {
    const dispatch = createDispatch()
    const view = renderTinker(dispatch)

    expect(
      screen.getByText(
        'Tip: The tinker panel goes away after you have 10 assembly lines and 1 manager (or any data center).',
      ),
    ).toBeInTheDocument()

    view.rerender(
      tinkerElement(
        runningFacts({ effectiveManualLabour: true }),
        dispatch,
      ),
    )
    expect(screen.queryByText(/^Tip:/)).not.toBeInTheDocument()
  })

  test('restores the full cooldown display after a non-repeating cycle completes', () => {
    const dispatch = createDispatch()
    renderTinker(dispatch, {
      ...readyFacts(),
      timeToCompletionSeconds: 0.01,
    })

    expect(screen.getByText('0.50s')).toBeInTheDocument()
    expect(screen.queryByText('0.01s')).not.toBeInTheDocument()
  })

  test('has no automated accessibility violations in ready and running states', async () => {
    vi.useRealTimers()
    const ready = renderTinker(createDispatch())
    expect(
      (
        await axe.run(ready.container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).violations,
    ).toEqual([])

    ready.rerender(
      tinkerElement(
        runningFacts({
          elapsedSeconds: 0.1,
          cooldownSeconds: 0.5,
          timeToCompletionSeconds: 0.4,
        }),
        createDispatch(),
      ),
    )
    expect(
      (
        await axe.run(ready.container, {
          rules: {
            'color-contrast': { enabled: false },
            region: { enabled: false },
          },
        })
      ).violations,
    ).toEqual([])
  })
})

function renderTinker(
  dispatch: TinkerCommandDispatch,
  facts: TinkerFacts = readyFacts(),
) {
  return render(tinkerElement(facts, dispatch))
}

function tinkerElement(
  facts: TinkerFacts,
  dispatch: TinkerCommandDispatch,
  stateRevision = 0,
) {
  return (
    <IntlProvider locale="en">
      <TinkerSurface
        facts={facts}
        stateRevision={stateRevision}
        dispatch={dispatch}
      />
    </IntlProvider>
  )
}

function tinkerButton(): HTMLButtonElement {
  return screen.getByRole('button', {
    name:
      'Tinker in your garage Manually put together a new bot from parts in your shed.',
  })
}

function readyFacts(): TinkerFacts {
  return {
    runtime: {
      running: false,
      repeat: false,
      elapsedSeconds: 0,
      effectiveManualLabour: false,
      cooldownSeconds: 0.5,
    },
    stats: {
      botYield: 1,
      assemblyYield: 0,
      cooldownSeconds: 0.5,
    },
    presentationMode: 'default',
    canStart: true,
    eligibility: 'available',
    timeToCompletionSeconds: null,
  }
}

function runningFacts(
  overrides: {
    readonly repeat?: boolean
    readonly effectiveManualLabour?: boolean
    readonly elapsedSeconds?: number
    readonly cooldownSeconds?: number
    readonly timeToCompletionSeconds?: number
    readonly botYield?: number
    readonly assemblyYield?: number
    readonly presentationMode?: TinkerFacts['presentationMode']
  } = {},
): TinkerFacts {
  const cooldownSeconds = overrides.cooldownSeconds ?? 0.5
  return {
    runtime: {
      running: true,
      repeat: overrides.repeat ?? false,
      elapsedSeconds: overrides.elapsedSeconds ?? 0.1,
      effectiveManualLabour:
        overrides.effectiveManualLabour ?? false,
      cooldownSeconds,
    },
    stats: {
      botYield: overrides.botYield ?? 1,
      assemblyYield: overrides.assemblyYield ?? 0,
      cooldownSeconds,
    },
    presentationMode:
      overrides.presentationMode ??
      (overrides.effectiveManualLabour
        ? 'manual-labour'
        : 'default'),
    canStart: false,
    eligibility: 'already-running',
    timeToCompletionSeconds:
      overrides.timeToCompletionSeconds ?? 0.4,
  }
}

function acceptedResult(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    stateRevision: 1,
    activationRevision: { session: 1, state: 0 },
  }
}

function rejectedResult(): UiRuntimePlayerCommandResult {
  return {
    status: 'rejected',
    kind: 'transition',
    code: 'SIM-STALE-REVISION',
    reason: 'Expected revision 4 does not match current revision 5.',
    stale: true,
    stateRevision: 5,
    activationRevision: { session: 1, state: 4 },
  }
}

function nonStaleRejectedResult(): UiRuntimePlayerCommandResult {
  return {
    status: 'rejected',
    kind: 'transition',
    code: 'TINKER-PRIVATE-REJECTION',
    reason: 'Player has private rejection detail.',
    stale: false,
    stateRevision: 5,
    activationRevision: { session: 1, state: 5 },
  }
}

function failedResult(): UiRuntimePlayerCommandResult {
  return {
    status: 'failed',
    kind: 'runtime',
    code: 'RUNTIME-PLAYER-AUTHORITY-LOST',
    reason: 'Writer authority was lost.',
    retryable: false,
  }
}

function createDispatch() {
  return vi.fn<TinkerCommandDispatch>().mockResolvedValue(acceptedResult())
}

function deferredResult() {
  let resolve!: (value: UiRuntimePlayerCommandResult) => void
  const promise = new Promise<UiRuntimePlayerCommandResult>(
    (fulfill) => {
      resolve = fulfill
    },
  )
  return { promise, resolve }
}

async function flushDispatchQueue(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function stopCommands(dispatch: ReturnType<typeof createDispatch>) {
  return dispatch.mock.calls.filter(
    ([command]) =>
      command.kind === 'tinker.set-repeat' && !command.enabled,
  )
}

function installPointerCapture(button: HTMLButtonElement) {
  let captured: number | null = null
  const set = vi.fn((pointerId: number) => {
    captured = pointerId
  })
  const release = vi.fn((pointerId: number) => {
    if (captured === pointerId) captured = null
  })
  button.setPointerCapture = set
  button.releasePointerCapture = release
  button.hasPointerCapture = vi.fn(
    (pointerId: number) => captured === pointerId,
  )
  return { set, release }
}
