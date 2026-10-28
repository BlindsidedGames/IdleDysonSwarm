// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import {
  createProductionCanonicalApplicationFactory,
} from '../../../application/productionApplicationFactory'
import {
  CanonicalLifecycleCoordinator,
} from '../../../application/canonicalLifecycleCoordinator'
import type {
  CanonicalGameApplicationFacade,
} from '../../../application/canonicalGameApplication'
import {
  cloneCanonicalRuntimeState,
  type CanonicalRuntimeState,
} from '../../../application/canonicalRuntimeSession'
import { prepareImportedSaveText } from '../../../save/import'
import type { PreparedSave } from '../../../save/prepare'
import type {
  FirstLaunchMigrationResult,
  SaveRepository,
} from '../../../save/repository'
import { DESKTOP_LIFECYCLE_POLICY } from '../../../simulation/lifecycleAwayTime'
import { RevisionedPlayerCommandDispatcher } from '../../runtime/playerCommandDispatcher'
import { SIMULATION_RESOURCE_MAXIMUM } from '../../../simulation/numeric'
import { simulationPurchaseQuantity } from './simulationPurchaseQuantity'
import { SimulationsSurface } from './SimulationsSurface'
import matureSimulationsSaveText from '../../../../test/fixtures/progression/mature-simulations.idsweb1.txt?raw'

afterEach(() => { cleanup(); localStorage.clear() })

const matureSimulationsSave = prepareImportedSaveText(
  matureSimulationsSaveText,
  '2026-08-19T00:00:00.000Z',
)

describe('SimulationsSurface command availability', () => {
  test('activates the authored free Community boost without weakening paid or invalid zero-cost gates', async () => {
    const application = await createApplication()
    await installAvailabilityScenario(application)
    const dispatcher = createDispatcher(application)
    const before = readyGameplay(application)

    render(
      <IntlProvider locale="en" messages={{}} onError={() => undefined}>
        <SimulationsSurface
          locale="en"
          facts={before.gameplay.derived.simulations}
          progression={before.gameplay.progression.dream}
          previews={before.gameplay.previews.dream}
          influence={before.gameplay.resources.reality.influence}
          activeDoubleTimeRate={0}
          spaceAgePurchaseQuantity={1}
          commandAvailability={{
            setBuyMode: true,
            purchaseFoundational:
              before.gameplay.commands.byKind['dream.purchase-foundational']
                .routeAvailable,
            purchaseSpaceAge:
              before.gameplay.commands.byKind['dream.purchase-space-age']
                .routeAvailable,
            startEducation:
              before.gameplay.commands.byKind['dream.start-education']
                .routeAvailable,
            blackHoleReset:
              before.gameplay.commands.byKind['dream.request-black-hole-reset']
                .routeAvailable,
          }}
          dispatchPlayer={(command) => dispatcher.dispatch(command)}
        />
      </IntlProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Foundational Era' }))
    const freeBoost = screen.getByRole('button', { name: 'Boost, Free' })
    expect(freeBoost.hasAttribute('disabled')).toBe(false)
    const paidPurchases = screen.getAllByRole('button', {
      name: /^\+\d+, .* Influence$/,
    })
    expect(paidPurchases).toHaveLength(2)
    for (const paidPurchase of paidPurchases) {
      expect(paidPurchase.hasAttribute('disabled')).toBe(true)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Information Era' }))
    expect(
      screen.getByRole('button', { name: 'Boost, 0 Influence' })
        .hasAttribute('disabled'),
    ).toBe(true)

    fireEvent.click(freeBoost)

    await waitFor(() => {
      const after = readyGameplay(application)
      expect(after.gameplay.progression.dream.parameters.communityBoostClock)
        .toBe(
          after.gameplay.progression.dream.parameters.communityBoostDuration,
        )
      expect(after.gameplay.resources.reality.influence).toBe(0)
    })
  })
})

async function createApplication(repository = new MemoryRepository(matureSimulationsSave)): Promise<CanonicalGameApplicationFacade> {
  const application = createProductionCanonicalApplicationFactory({
    createFirstRunSave: () => matureSimulationsSave,
    readHostEntitlements: () => ({ permanentDoubleIp: false }),
  })(repository)
  await application.start()
  return application
}

async function installAvailabilityScenario(
  application: CanonicalGameApplicationFacade,
): Promise<void> {
  const snapshot = application.snapshot()
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready canonical application.')
  }
  const current = cloneCanonicalRuntimeState(
    snapshot.state as CanonicalRuntimeState,
  )
  const engineering = current.gameState.dream.education.engineering
  const candidate = {
    ...current,
    gameState: {
      ...current.gameState,
      reality: {
        ...current.gameState.reality,
        influence: 0,
      },
      dream: {
        ...current.gameState.dream,
        resources: {
          ...current.gameState.dream.resources,
          cities: 1,
        },
        parameters: {
          ...current.gameState.dream.parameters,
          communityBoostCost: 0,
          communityBoostIsFree: true,
          communityBoostClock: 0,
          factoriesBoostCost: 0,
          factoriesBoostClock: 0,
        },
        education: {
          ...current.gameState.dream.education,
          engineering: {
            ...engineering,
            active: false,
            complete: true,
            progress: engineering.researchTime,
          },
        },
      },
    },
  }
  const result = await application.commitAwayReplacement(
    {
      sessionRevision: snapshot.revision.session,
      expectedStateRevision: snapshot.revision.state,
    },
    candidate,
  )
  if (!result.committed) {
    throw new Error(result.reason ?? 'Could not install test state.')
  }
}

function createDispatcher(application: CanonicalGameApplicationFacade) {
  const coordinator = new CanonicalLifecycleCoordinator({
    application,
    lifecycle: {
      currentPhase: () => 'active',
      subscribe: () => () => undefined,
    },
    clock: {
      sample: () => ({
        utcMilliseconds: 0,
        serializedUtcText: '1970-01-01T00:00:00.000Z',
      }),
    },
    policy: DESKTOP_LIFECYCLE_POLICY,
    subscribeToLifecycle: false,
  })
  return new RevisionedPlayerCommandDispatcher({
    latestSnapshot: () => application.frontendSnapshot('simulations'),
    dispatch: (envelope, cancelRequested) =>
      coordinator.dispatchPlayer(envelope, cancelRequested),
    serialize: (operation) => operation(),
    publishSnapshot: () => undefined,
    isCurrent: () => true,
    cancelRequested: () => false,
  })
}

function readyGameplay(application: CanonicalGameApplicationFacade) {
  const snapshot = application.frontendSnapshot('simulations')
  if (snapshot.phase !== 'ready') {
    throw new Error('Expected a ready frontend snapshot.')
  }
  return snapshot
}

class MemoryRepository implements SaveRepository {
  private current: PreparedSave

  constructor(current: PreparedSave) {
    this.current = current
  }

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent(): Promise<PreparedSave> {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: this.current }
  }

  async commit(save: PreparedSave): Promise<PreparedSave> {
    this.current = save
    return save
  }
}


function surface(application: CanonicalGameApplicationFacade) {
  const { gameplay } = readyGameplay(application)
  return <IntlProvider locale="en" messages={{}} onError={() => undefined}>
    <SimulationsSurface
      locale="en" facts={gameplay.derived.simulations}
      progression={gameplay.progression.dream} previews={gameplay.previews.dream}
      influence={gameplay.resources.reality.influence} activeDoubleTimeRate={0}
      spaceAgePurchaseQuantity={simulationPurchaseQuantity(gameplay.progression.dream.buyMode ?? 'buy-1')}
      commandAvailability={{setBuyMode:true,purchaseFoundational:true,purchaseSpaceAge:true,startEducation:true,blackHoleReset:true}}
      dispatchPlayer={command => createDispatcher(application).dispatch(command)}
    />
  </IntlProvider>
}

async function installPurchaseScenario(application: CanonicalGameApplicationFacade, fullStorage = false) {
  const snapshot = application.snapshot()
  if (snapshot.phase !== 'ready') throw new Error('Not ready')
  const current = cloneCanonicalRuntimeState(snapshot.state as CanonicalRuntimeState)
  const dream = current.gameState.dream
  const result = await application.commitAwayReplacement({sessionRevision:snapshot.revision.session,expectedStateRevision:snapshot.revision.state}, {
    ...current,
    gameState: {...current.gameState, reality:{...current.gameState.reality,influence:1e8},dream:{...dream,
      resources:{...dream.resources,cities:1,spaceFactories:100,energy:0,solarPanels:0,fusion:0,dysonPanels:fullStorage ? BigInt(SIMULATION_RESOURCE_MAXIMUM) : 0n,swarmPanels:0n},
      purchaseBatches:{hunters:0n,gatherers:0n,solar:0n,fusion:0n},
      education:{...dream.education,advancedPhysics:{...dream.education.advancedPhysics,complete:true}},
    }},
  })
  if (!result.committed) throw new Error(result.reason)
}

function expandSimulationPanels(container: HTMLElement) {
  container.querySelectorAll<HTMLButtonElement>('.ui-collapsible-section__trigger[aria-expanded="false"]').forEach(button => fireEvent.click(button))
}

describe('Simulation saved purchase controls and formulas', () => {
  test.each(['buy-1','buy-10','buy-50','buy-100','buy-max'] as const)('purchases each producer with %s and reloads the selection and ownership', async mode => {
    const repository = new MemoryRepository(matureSimulationsSave)
    const application = await createApplication(repository)
    await installPurchaseScenario(application)
    const view = render(surface(application))
    expandSimulationPanels(view.container)
    fireEvent.click(view.container.querySelector('.ui-progress-controls-panel__settings')!)
    const quantity = simulationPurchaseQuantity(mode)
    const buttons = within(view.container.querySelector('.simulations-purchase-quantity') as HTMLElement).getAllByRole('button')
    fireEvent.click(buttons[['buy-1','buy-10','buy-50','buy-100','buy-max'].indexOf(mode)])
    await waitFor(() => expect(readyGameplay(application).gameplay.progression.dream.buyMode ?? 'buy-1').toBe(mode))
    view.rerender(surface(application))
    expect(buttons[['buy-1','buy-10','buy-50','buy-100','buy-max'].indexOf(mode)].getAttribute('aria-pressed')).toBe('true')
    for (const [title, resource] of [['Hunters','hunters'],['Gatherers','gatherers'],['Solar Panels','solarPanels'],['Fusion Generators','fusion']] as const) {
      // Refill Influence between families so Max exercises every command.
      if (title !== 'Hunters') await installPurchaseScenario(application)
      view.rerender(surface(application))
      const before = readyGameplay(application).gameplay
      const card = screen.getByRole('article', {name:new RegExp('^'+title)})
      const button = within(card).getByRole('button')
      expect((button as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(button)
      await waitFor(() => expect(Number(readyGameplay(application).gameplay.resources.dream[resource])).toBeGreaterThan(Number(before.resources.dream[resource])))
      const after = readyGameplay(application).gameplay
      expect(after.resources.reality.influence).toBeLessThan(before.resources.reality.influence)
      if (quantity !== 'max') {
        const batch = resource === 'hunters' ? before.progression.dream.huntersPerPurchase : resource === 'gatherers' ? before.progression.dream.gatherersPerPurchase : 1
        expect(Number(after.resources.dream[resource])-Number(before.resources.dream[resource])).toBe(quantity*Number(batch))
      }
      await application.checkpoint()
      const restored = readyGameplay(await createApplication(repository)).gameplay
      expect(restored.progression.dream.buyMode ?? 'buy-1').toBe(mode)
      expect(restored.resources.dream[resource]).toBe(after.resources.dream[resource])
    }
  })

  test('shows the existing logarithmic formula style and retains the visibility toggle on remount', async () => {
    const application = await createApplication()
    await installPurchaseScenario(application)
    const view = render(surface(application))
    expandSimulationPanels(view.container)
    fireEvent.click(view.container.querySelector('.ui-progress-controls-panel__settings')!)
    const checkbox = screen.getByRole('checkbox', {name:'Show formulas inline'})
    fireEvent.click(checkbox)
    const card = screen.getByRole('article', {name:/^Space Factories/})
    const factory = readyGameplay(application).gameplay.derived.simulations.live.production
    expect(factory.ok).toBe(true)
    expect(card.querySelector('dt')?.textContent).toBe('Speed multiplier')
    expect(card.querySelector('dd')?.textContent).toMatch(/^\(1 \+ Log₁₀\(100\)\) × .+ × .+ = /)
    view.unmount()
    const remount = render(surface(application))
    expandSimulationPanels(remount.container)
    expect(screen.getByRole('article', {name:/^Space Factories/}).querySelector('dd')).not.toBeNull()
  })
})


test('shows a capped Space Factory instead of a false active formula or no-producers claim', async () => {
  const application = await createApplication()
  await installPurchaseScenario(application, true)
  localStorage.setItem('idle-dyson-swarm.simulations.show-formulas', 'true')
  const view = render(surface(application))
  expandSimulationPanels(view.container)
  expect(screen.getByRole('article', {name:/^Space Factories/}).querySelector('dd')?.textContent).toBe('Capped')
})
