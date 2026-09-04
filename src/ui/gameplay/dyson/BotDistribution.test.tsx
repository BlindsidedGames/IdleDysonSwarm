// @vitest-environment jsdom

import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import { prepareIdb1Save } from '../../../save/prepare'
import { routeCanonicalGameCommand } from '../../../application/canonicalGameCommands'
import { deriveBasicDysonState } from '../../../simulation/canonicalDysonDerivation'
import { withCanonicalBotAllocation } from '../../../simulation/canonicalBotAllocation'
import { BotDistribution, type BotDistributionProps } from './DysonControls'

afterEach(cleanup)

type Result = Awaited<ReturnType<BotDistributionProps['dispatchPlayer']>>
const accepted = { status: 'accepted' } as Result
const rejected = { status: 'rejected' } as Result

function setup(dispatchPlayer = vi.fn<BotDistributionProps['dispatchPlayer']>()
  .mockResolvedValue(accepted)) {
  function component(distribution: number, routeAvailable = true) {
    return (
      <IntlProvider locale="en" messages={{}} onError={() => undefined}>
        <BotDistribution locale="en" distribution={distribution}
          multitasking={false} routeAvailable={routeAvailable}
          dispatchPlayer={dispatchPlayer} />
      </IntlProvider>
    )
  }
  const view = render(component(0.5))
  return {
    slider: screen.getByRole('slider') as HTMLInputElement,
    dispatchPlayer,
    publish: (distribution: number, routeAvailable = true) =>
      view.rerender(component(distribution, routeAvailable)),
  }
}

function tapAfterRelease(slider: HTMLInputElement, value: string) {
  fireEvent.pointerDown(slider)
  fireEvent.pointerUp(slider)
  fireEvent.change(slider, { target: { value } })
}

async function settle() {
  await act(async () => undefined)
}

test('endpoint track taps apply the current allocation and real production immediately', async () => {
  const session = hydrateGameState(prepareIdb1Save(fixture).prepared)
  let state = withCanonicalBotAllocation({
    ...session.state,
    dyson: { ...session.state.dyson, bots: 100, botDistribution: 0.5 },
    quantum: {
      ...session.state.quantum,
      unlocks: { ...session.state.quantum.unlocks, botMultitasking: false },
    },
  })
  const derive = (candidate = state, snapshot = session.skillEffectEvaluationSnapshot) =>
    deriveBasicDysonState(candidate, session.compatibilityTuning,
      { permanentDoubleIp: false }, snapshot)
  const dispatchPlayer = vi.fn<BotDistributionProps['dispatchPlayer']>(async (command) => {
    const result = routeCanonicalGameCommand(state, command, {
      runtimeCarriers: {
        compatibilityTuning: session.compatibilityTuning,
        skillEffectEvaluationSnapshot: session.skillEffectEvaluationSnapshot,
        storedTimeCheater: false,
        selectedSkillPresetSlot: 1,
      },
      runtimeEvaluation: {
        evaluate: (candidate, previous) => {
          const derived = derive(candidate, previous!)
          if (!derived.ok) throw new Error('Fixture derivation failed')
          return { accepted: true, snapshot: derived.value.nextEvaluationSnapshot }
        },
      },
    })
    expect(result.accepted).toBe(true)
    state = result.state
    return accepted
  })
  const { slider, publish } = setup(dispatchPlayer)
  const initial = derive()
  expect(initial.ok).toBe(true)
  if (!initial.ok) return

  tapAfterRelease(slider, '100')
  await settle()
  publish(state.dyson.botDistribution)
  expect(slider.value).toBe('100')
  expect(state.dyson.workers).toBe(0)
  expect(state.dyson.researchers).toBe(100)
  const science = derive()
  expect(science.ok).toBe(true)
  if (!science.ok) return
  expect(science.value.rates.science).toBe(initial.value.rates.science * 2)
  expect(science.value.rates.money).toBe(0)

  tapAfterRelease(slider, '0')
  await settle()
  publish(state.dyson.botDistribution)
  expect(slider.value).toBe('0')
  expect(state.dyson.workers).toBe(100)
  expect(state.dyson.researchers).toBe(0)
  const cash = derive()
  expect(cash.ok).toBe(true)
  if (!cash.ok) return
  expect(cash.value.rates.science).toBe(0)
  expect(cash.value.rates.money).toBeGreaterThan(initial.value.rates.money)
  expect(dispatchPlayer.mock.calls.map(([command]) => command.distribution)).toEqual([1, 0])
})

test('dragging previews intermediate values and commits only its final value on release', async () => {
  const { slider, dispatchPlayer } = setup()
  fireEvent.pointerDown(slider)
  fireEvent.change(slider, { target: { value: '70' } })
  fireEvent.change(slider, { target: { value: '90' } })
  expect(slider.value).toBe('90')
  expect(dispatchPlayer).not.toHaveBeenCalled()
  fireEvent.pointerUp(slider)
  await settle()
  expect(dispatchPlayer.mock.calls.map(([command]) => command.distribution)).toEqual([0.9])
})

test('the latest tap survives a pending command and its intermediate publication', async () => {
  let resolveFirst!: (result: Result) => void
  const dispatchPlayer = vi.fn<BotDistributionProps['dispatchPlayer']>()
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    .mockResolvedValue(accepted)
  const { slider, publish } = setup(dispatchPlayer)
  tapAfterRelease(slider, '100')
  tapAfterRelease(slider, '25')
  tapAfterRelease(slider, '0')
  expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  publish(1)
  expect(slider.value).toBe('0')
  await act(async () => resolveFirst(accepted))
  expect(dispatchPlayer.mock.calls.map(([command]) => command.distribution)).toEqual([1, 0])
  publish(0)
  expect(slider.value).toBe('0')
})

test('keyboard changes and blur submit without duplicates; a failed value can be retried', async () => {
  const { slider, dispatchPlayer } = setup()
  fireEvent.keyDown(slider, { key: 'ArrowRight' })
  fireEvent.change(slider, { target: { value: '51' } })
  fireEvent.keyUp(slider, { key: 'ArrowRight' })
  fireEvent.blur(slider)
  await settle()
  expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  dispatchPlayer.mockResolvedValueOnce(rejected)
  tapAfterRelease(slider, '100')
  await settle()
  expect(screen.getByRole('alert')).not.toBeNull()
  fireEvent.blur(slider)
  await settle()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(dispatchPlayer.mock.calls.map(([command]) => command.distribution)).toEqual([0.51, 1, 1])
})

test('cancelling or blurring a drag completes it, and losing the route stops submissions', async () => {
  const { slider, dispatchPlayer, publish } = setup()
  fireEvent.pointerDown(slider)
  fireEvent.change(slider, { target: { value: '70' } })
  fireEvent.pointerCancel(slider)
  await settle()
  expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  fireEvent.pointerDown(slider)
  fireEvent.change(slider, { target: { value: '80' } })
  fireEvent.blur(slider)
  await settle()
  expect(dispatchPlayer).toHaveBeenCalledTimes(2)
  publish(0.8, false)
  fireEvent.keyUp(slider)
  expect(dispatchPlayer).toHaveBeenCalledTimes(2)
})


test('losing the route drops a queued value while the current command finishes', async () => {
  let resolveFirst!: (result: Result) => void
  const dispatchPlayer = vi.fn<BotDistributionProps['dispatchPlayer']>()
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    .mockResolvedValue(accepted)
  const { slider, publish } = setup(dispatchPlayer)
  tapAfterRelease(slider, '100')
  tapAfterRelease(slider, '0')
  publish(0.5, false)
  await act(async () => resolveFirst(accepted))
  expect(dispatchPlayer).toHaveBeenCalledTimes(1)
})
