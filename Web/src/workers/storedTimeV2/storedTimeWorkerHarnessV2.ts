/** Dedicated dormant harness factory. Production roots must not import it. */
export function createDormantStoredTimeWorkerV2(): Worker {
  return new Worker(new URL('./storedTimeWorkerV2.ts', import.meta.url), {
    type: 'module',
  })
}

const status = document.querySelector<HTMLElement>('[data-worker-status]')
const worker = createDormantStoredTimeWorkerV2()
const benchmarkRequested = new URLSearchParams(location.search).has('benchmark')
const benchmarkModule = benchmarkRequested
  ? import('./storedTimeWorkerBenchmarkV2')
  : null
let benchmarkStarted = false
worker.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (status !== null) {
    status.textContent = 'Dormant Stored Time worker frame received'
  }
  if (!benchmarkStarted && benchmarkModule !== null) {
    benchmarkStarted = true
    void benchmarkModule.then(({ runStoredTimeWorkerBenchmarkV2 }) =>
      runStoredTimeWorkerBenchmarkV2(worker, status, event.data),
    )
  }
})
worker.addEventListener('error', () => {
  if (status !== null) status.textContent = 'Dormant Stored Time worker failed'
})
