// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  BrowserPwaUpdateController,
} from './serviceWorkerUpdate'

afterEach(() => {
  vi.useRealTimers()
})

describe('BrowserPwaUpdateController', () => {
  test('downloads a scoped update in the background without activating it', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker('installed')
    const registration = new FakeRegistration(worker)
    const serviceWorkers = new FakeServiceWorkerContainer(registration, true)
    const controller = createController(serviceWorkers)

    await controller.start()

    expect(serviceWorkers.register).toHaveBeenCalledWith(
      '/play/service-worker.js',
      { scope: '/play/', updateViaCache: 'none' },
    )
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(controller.getSnapshot()).toEqual({ phase: 'available' })
    expect(worker.postMessage).not.toHaveBeenCalled()
    controller.dispose()
  })

  test('activates only after acceptance and successful safe-update preparation', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker('installed')
    const registration = new FakeRegistration(worker)
    const serviceWorkers = new FakeServiceWorkerContainer(registration, true)
    const reloadPage = vi.fn()
    const prepare = vi.fn(async () => undefined)
    const controller = createController(serviceWorkers, reloadPage)
    await controller.start()

    const accepting = controller.acceptUpdate(prepare)
    await Promise.resolve()
    expect(prepare).toHaveBeenCalledTimes(1)
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'ACTIVATE_UPDATE',
    })
    expect(reloadPage).not.toHaveBeenCalled()

    serviceWorkers.dispatchEvent(new Event('controllerchange'))
    await accepting
    expect(reloadPage).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  test('keeps the waiting worker inactive when checkpoint preparation fails', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker('installed')
    const registration = new FakeRegistration(worker)
    const serviceWorkers = new FakeServiceWorkerContainer(registration, true)
    const reloadPage = vi.fn()
    const controller = createController(serviceWorkers, reloadPage)
    await controller.start()

    await controller.acceptUpdate(async () => {
      throw new Error('checkpoint rejected')
    })

    expect(controller.getSnapshot()).toEqual({
      phase: 'failed',
      reason: 'checkpoint rejected',
    })
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(reloadPage).not.toHaveBeenCalled()
    controller.dispose()
  })

  test('reloads the verified checkpoint instead of hanging when activation times out', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker('installed')
    const registration = new FakeRegistration(worker)
    const serviceWorkers = new FakeServiceWorkerContainer(registration, true)
    const reloadPage = vi.fn()
    const controller = createController(serviceWorkers, reloadPage)
    await controller.start()

    const accepting = controller.acceptUpdate(async () => undefined)
    await Promise.resolve()
    expect(reloadPage).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000)
    await accepting
    expect(reloadPage).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  test('does not prompt for a first install that has no controlling worker', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker('installed')
    const registration = new FakeRegistration(worker)
    const serviceWorkers = new FakeServiceWorkerContainer(registration, false)
    const controller = createController(serviceWorkers)

    await controller.start()

    expect(controller.getSnapshot()).toEqual({ phase: 'idle' })
    expect(worker.postMessage).not.toHaveBeenCalled()
    controller.dispose()
  })
})

class FakeWorker extends EventTarget {
  readonly postMessage = vi.fn()
  readonly state: ServiceWorkerState

  constructor(state: ServiceWorkerState) {
    super()
    this.state = state
  }
}

class FakeRegistration extends EventTarget {
  readonly update = vi.fn(async () => undefined)
  readonly installing: ServiceWorker | null = null
  readonly waiting: ServiceWorker | null

  constructor(waiting: ServiceWorker | null) {
    super()
    this.waiting = waiting
  }
}

class FakeServiceWorkerContainer extends EventTarget {
  readonly controller: ServiceWorker | null
  readonly register: ReturnType<typeof vi.fn>

  constructor(
    registration: FakeRegistration,
    controlled: boolean,
  ) {
    super()
    this.controller = controlled ? ({} as ServiceWorker) : null
    this.register = vi.fn(async () =>
      registration as unknown as ServiceWorkerRegistration)
  }
}

function createController(
  serviceWorkers: FakeServiceWorkerContainer,
  reloadPage = vi.fn(),
) {
  return new BrowserPwaUpdateController({
    serviceWorkers: serviceWorkers as unknown as ServiceWorkerContainer,
    basePath: '/play/',
    reloadPage,
    updateIntervalMilliseconds: 60_000,
    activationTimeoutMilliseconds: 1_000,
  })
}
