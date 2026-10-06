// @vitest-environment jsdom
import fixture from '../../../../test/fixtures/progression/maximum-skills.idsweb1.txt?raw'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { hydrateGameState, dehydrateGameState } from '../../../game-state/mapping'
import { prepareImportedSaveText } from '../../../save/import'
import { serializeWebSave } from '../../../save/serialization'
import { previewCanonicalResearchPurchase, purchaseCanonicalResearch, selectCanonicalResearchPresentationFacts } from '../../../simulation/researchAutomation'
import { ResearchVisibilityContext } from '../../research-visibility/context'
import { ResearchSurface, type ResearchSurfaceProps } from './ResearchSurface'
import { researchCardPresentationKey, stackDurabilityCard } from './durabilityCard'

const session = hydrateGameState(prepareImportedSaveText(fixture, '2026-09-13T00:00:00.000Z'))
const ids = [1, 2, 3, 4].map((i) => `research.panel_lifetime_${i}`)
function stateAfter(count: number) {
  let state = structuredClone(session.state)
  state = { ...state, dyson: { ...state.dyson, science: 1e25 }, research: { ...state.research, levelsById: {} } }
  for (const id of ids.slice(0, count)) {
    const result = purchaseCanonicalResearch(state, session.compatibilityTuning, id)
    if (!result.accepted) throw new Error(result.code)
    state = result.state
  }
  return state
}
function previews(state = stateAfter(0), automatic = false, includeCash = false) {
  return (includeCash ? [...ids, 'research.money_multiplier'] : ids).map((id) => {
    const purchase = previewCanonicalResearchPurchase(state, session.compatibilityTuning, id)
    return { ...purchase, ...selectCanonicalResearchPresentationFacts(state, session.compatibilityTuning, id, purchase.selectedQuantity)!, automationActive: automatic }
  })
}
afterEach(cleanup)

test.each([[0, 0, 1], [1, 1, 3], [2, 3, 6], [3, 6, 10], [4, 10, 10]])(
  'stage %i preserves canonical purchase and cumulative effect through save reload', (stage, current, projected) => {
    const state = stateAfter(stage)
    const restored = hydrateGameState(prepareImportedSaveText(serializeWebSave(dehydrateGameState(session, state).copyValidatedState()), '2026-09-13T00:00:00.000Z')).state
    const cards = previews(restored)
    const original = structuredClone(cards)
    const [card] = stackDurabilityCard(cards)
    expect(card.currentEffect).toBe(current)
    expect(card.projectedEffect).toBe(projected)
    expect(card.researchId).toBe(ids[Math.min(stage, 3)])
    expect(card.maxed).toBe(stage === 4)
    expect(card.cost).toBe(cards[Math.min(stage, 3)].cost)
    expect(card.eligible).toBe(stage !== 4)
    expect(researchCardPresentationKey(card)).toBe('durability')
    expect(cards).toEqual(original)
  },
)

test('insufficient funds keeps the next canonical stage and price', () => {
  const state = stateAfter(2)
  const [card] = stackDurabilityCard(previews({ ...state, dyson: { ...state.dyson, science: 0 } }))
  expect(card.researchId).toBe(ids[2])
  expect(card.code).toBe('insufficient-science')
  expect(card.eligible).toBe(false)
  expect(card.currentEffect).toBe(3)
})

test('missing definitions are not collapsed into a falsely completed card', () => {
  const cards = previews().slice(0, 2)
  expect(stackDurabilityCard(cards)).toBe(cards)
  expect(stackDurabilityCard(cards).map(researchCardPresentationKey)).toEqual(ids.slice(0, 2))
})

function surface(cards: ReturnType<typeof previews>, dispatchPlayer: ResearchSurfaceProps['dispatchPlayer']) {
  return <IntlProvider locale="en" messages={{}}>
    <ResearchVisibilityContext.Provider value={{ hideCompleted: true, setHideCompleted: () => undefined }}>
      <ResearchSurface cards={cards} locale="en" researchers={1} sciencePerSecond={1}
        buyMode="buy-max" roundedBulkBuy={false} presets={[]} presetAutomationSlot={0}
        automationUnlocked={false} automationEnabledById={{}} automationResearchIds={[]}
        purchaseRouteAvailable buyModeRouteAvailable roundedBulkRouteAvailable presetAutomationRouteAvailable automationRouteAvailable
        dispatchPlayer={dispatchPlayer} />
    </ResearchVisibilityContext.Provider>
  </IntlProvider>
}

test('one stable card purchases each next stage, hides at completion and returns after reset', async () => {
  const dispatch = vi.fn<ResearchSurfaceProps['dispatchPlayer']>().mockResolvedValue({ status: 'accepted' } as never)
  const view = render(surface(previews(), dispatch))
  const originalCard = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  const originalButton = within(originalCard).getByRole('button')
  originalButton.focus()
  for (let stage = 0; stage < 4; stage++) {
    view.rerender(surface(previews(stateAfter(stage)), dispatch))
    expect(screen.getAllByRole('heading', { name: 'Durability Upgrade' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')).toBe(originalCard)
    expect(document.activeElement).toBe(originalButton)
    await act(async () => fireEvent.click(originalButton))
    expect(dispatch).toHaveBeenLastCalledWith({ kind: 'research.purchase', researchId: ids[stage] })
  }
  view.rerender(surface(previews(stateAfter(4)), dispatch))
  expect(screen.queryByRole('heading', { name: 'Durability Upgrade' })).toBeNull()
  expect(originalCard.isConnected).toBe(false)
  const emptyState = screen.getByRole('status')
  expect(emptyState.textContent).toMatch(/research.*completed.*hidden/i)
  expect(document.activeElement).toBe(emptyState)
  view.rerender(surface(previews(), dispatch))
  const restartedCard = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  expect(within(restartedCard).getByRole('button').hasAttribute('disabled')).toBe(false)
  expect(restartedCard.textContent).toContain('+0s')
})

test('final canonical purchase hides Durability, focuses uncapped research, and respects the visibility checkbox', async () => {
  const user = userEvent.setup()
  const dispatched = vi.fn()
  function Harness() {
    const [state, setState] = useState(() => stateAfter(3))
    const [hideCompleted, setHideCompleted] = useState(true)
    const cards = previews(state, false, true)
    const dispatchPlayer: ResearchSurfaceProps['dispatchPlayer'] = async (command) => {
      dispatched(command)
      if (command.kind !== 'research.purchase') throw new Error('Unexpected command')
      const result = purchaseCanonicalResearch(state, session.compatibilityTuning, command.researchId)
      if (!result.accepted) throw new Error(result.code)
      setState(result.state)
      return { status: 'accepted' } as never
    }
    return <IntlProvider locale="en" messages={{}}>
      <ResearchVisibilityContext.Provider value={{ hideCompleted, setHideCompleted }}>
        <ResearchSurface cards={cards} locale="en" researchers={1} sciencePerSecond={1}
          buyMode="buy-max" roundedBulkBuy={false} presets={[]} presetAutomationSlot={0}
          automationUnlocked={false} automationEnabledById={{}} automationResearchIds={[]}
          purchaseRouteAvailable buyModeRouteAvailable roundedBulkRouteAvailable presetAutomationRouteAvailable automationRouteAvailable
          dispatchPlayer={dispatchPlayer} />
      </ResearchVisibilityContext.Provider>
    </IntlProvider>
  }
  render(<Harness />)
  const card = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  const purchase = within(card).getByRole('button')
  purchase.focus()
  await user.keyboard('{Enter}')
  expect(dispatched).toHaveBeenCalledExactlyOnceWith({ kind: 'research.purchase', researchId: ids[3] })
  expect(screen.queryByRole('heading', { name: 'Durability Upgrade' })).toBeNull()
  const cashCard = screen.getByRole('heading', { name: /Cash/ }).closest('article')!
  expect(document.activeElement).toBe(within(cashCard).getByRole('button'))
  expect(screen.queryByRole('status')).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Research purchase settings' }))
  const checkbox = screen.getByRole('checkbox', { name: 'Hide completed Research' }) as HTMLInputElement
  expect(checkbox.checked).toBe(true)
  await user.click(checkbox)
  const completedCard = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  expect(within(completedCard).getByText('Maxed')).toBeTruthy()
  expect(within(completedCard).getByRole('button').hasAttribute('disabled')).toBe(true)
  expect(completedCard.textContent).toContain('+10s')
  await user.click(checkbox)
  expect(checkbox.checked).toBe(true)
  expect(screen.queryByRole('heading', { name: 'Durability Upgrade' })).toBeNull()
  expect(screen.getByRole('heading', { name: /Cash/ })).toBeTruthy()
  expect(document.activeElement).toBe(checkbox)
})

test('hide completed keeps unfinished Durability visible when the next stage is unaffordable', () => {
  const state = stateAfter(2)
  render(surface(previews({ ...state, dyson: { ...state.dyson, science: 0 } }), vi.fn()))
  const card = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  expect(within(card).getByRole('button').hasAttribute('disabled')).toBe(true)
  expect(card.textContent).toContain('+3s')
  expect(within(card).queryByText('Maxed')).toBeNull()
})

test('automation never exposes a manual purchase action', () => {
  render(surface(previews(stateAfter(2), true), vi.fn()))
  const card = screen.getByRole('heading', { name: 'Durability Upgrade' }).closest('article')!
  expect(within(card).getByRole('button').hasAttribute('disabled')).toBe(true)
  expect(card.textContent).toContain('Auto')
})
