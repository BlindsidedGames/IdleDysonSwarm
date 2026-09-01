// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
import { SimulationsSurface } from './SimulationsSurface'
import matureSimulationsSaveText from '../../../../test/fixtures/progression/mature-simulations.idsweb1.txt?raw'

afterEach(() => cleanup())

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

async function createApplication(): Promise<CanonicalGameApplicationFacade> {
  const application = createProductionCanonicalApplicationFactory({
    createFirstRunSave: () => matureSimulationsSave,
    readHostEntitlements: () => ({ permanentDoubleIp: false }),
  })(new MemoryRepository(matureSimulationsSave))
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
