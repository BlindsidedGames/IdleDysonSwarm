export interface Stage7V2ExpectedWorkerIdentity {
  readonly buildId: string
  readonly catalogHash: string
  readonly tuningHash: string
}

export interface Stage7V2WorkerReady {
  readonly protocolVersion: 1
  readonly workerInstanceNonce: string
  readonly buildId: string
  readonly catalogHash: string
  readonly tuningHash: string
}

export type Stage7V2WorkerLaunchResult =
  | Readonly<{
      readonly status: 'ready'
      readonly worker: Worker
      readonly ready: Readonly<Stage7V2WorkerReady>
    }>
  | Readonly<{
      readonly status: 'resumable-failure'
      readonly reason: 'load-failed' | 'ready-timeout' | 'cache-mismatch' | 'identity-mismatch'
      readonly storedTimeUntouched: true
    }>

export interface Stage7V2WorkerLauncherOptions {
  readonly expectedIdentity: Readonly<Stage7V2ExpectedWorkerIdentity>
  readonly readyTimeoutMilliseconds?: number
  readonly createWorker?: () => Worker
  readonly setTimeout?: typeof globalThis.setTimeout
  readonly clearTimeout?: typeof globalThis.clearTimeout
}

const DEFAULT_READY_TIMEOUT_MILLISECONDS = 15_000

/** Dormant production entry. Merely importing or constructing it starts nothing. */
export class Stage7V2WorkerLauncher {
  readonly #expected: Readonly<Stage7V2ExpectedWorkerIdentity>
  readonly #timeoutMilliseconds: number
  readonly #createWorker: () => Worker
  readonly #setTimeout: typeof globalThis.setTimeout
  readonly #clearTimeout: typeof globalThis.clearTimeout
  #started: Promise<Stage7V2WorkerLaunchResult> | null = null
  #worker: Worker | null = null

  constructor(options: Readonly<Stage7V2WorkerLauncherOptions>) {
    const captured = captureOptions(options)
    this.#expected = captured.expectedIdentity
    this.#timeoutMilliseconds = captured.readyTimeoutMilliseconds
    this.#createWorker = captured.createWorker
    this.#setTimeout = captured.setTimeout
    this.#clearTimeout = captured.clearTimeout
  }

  start(): Promise<Stage7V2WorkerLaunchResult> {
    this.#started ??= this.#startOnce()
    return this.#started
  }

  terminate(): void {
    this.#worker?.terminate()
    this.#worker = null
  }

  async #startOnce(): Promise<Stage7V2WorkerLaunchResult> {
    let worker: Worker
    try {
      worker = this.#createWorker()
      this.#worker = worker
    } catch {
      return failure('load-failed')
    }
    return new Promise((resolve) => {
      let settled = false
      let timeout: ReturnType<typeof globalThis.setTimeout> | undefined
      const finish = (result: Stage7V2WorkerLaunchResult): void => {
        if (settled) return
        settled = true
        if (timeout !== undefined) this.#clearTimeout(timeout)
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        if (result.status !== 'ready') this.terminate()
        resolve(result)
      }
      const onError = (): void => finish(failure('load-failed'))
      const onMessage = (event: MessageEvent<unknown>): void => {
        let ready: Readonly<Stage7V2WorkerReady>
        try {
          ready = decodeReadyFrame(event.data)
        } catch {
          finish(failure('identity-mismatch'))
          return
        }
        if (ready.buildId !== this.#expected.buildId) {
          finish(failure('cache-mismatch'))
        } else if (ready.catalogHash !== this.#expected.catalogHash ||
          ready.tuningHash !== this.#expected.tuningHash) {
          finish(failure('identity-mismatch'))
        } else {
          finish(Object.freeze({ status: 'ready', worker, ready }))
        }
      }
      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)
      timeout = this.#setTimeout(
        () => finish(failure('ready-timeout')),
        this.#timeoutMilliseconds,
      )
    })
  }
}

function createStaticWorker(): Worker {
  return new Worker(
    new URL('../workers/storedTimeV2/storedTimeWorkerV2.ts', import.meta.url),
    { type: 'module' },
  )
}

function failure(
  reason: Extract<Stage7V2WorkerLaunchResult, { status: 'resumable-failure' }>['reason'],
): Stage7V2WorkerLaunchResult {
  return Object.freeze({
    status: 'resumable-failure',
    reason,
    storedTimeUntouched: true,
  })
}

function decodeReadyFrame(value: unknown): Readonly<Stage7V2WorkerReady> {
  if (!(value instanceof ArrayBuffer) || value.byteLength > 256 * 1024) {
    throw new TypeError('Invalid worker ready frame.')
  }
  const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(value)) as unknown
  const record = closedRecord(parsed, [
    'type', 'protocolVersion', 'workerInstanceNonce', 'buildId', 'catalogHash',
    'tuningHash', 'supportedPolicies', 'capabilities',
  ])
  const policies = closedArray(record?.supportedPolicies, 3)
  const capabilities = closedRecord(record?.capabilities, [
    'moduleWorker', 'transferableArrayBuffer', 'sharedArrayBuffer',
  ])
  if (record?.type !== 'ready' || record.protocolVersion !== 1 ||
    !identifier(record.workerInstanceNonce) || !identifier(record.buildId) ||
    !hash(record.catalogHash) || !hash(record.tuningHash) ||
    policies?.[0]?.id !== 'stored-time-fast-v1' || policies[0].version !== 1 ||
    policies?.[1]?.id !== 'stored-time-balanced-v1' || policies[1].version !== 1 ||
    policies?.[2]?.id !== 'stored-time-exact-v1' || policies[2].version !== 1 ||
    capabilities?.moduleWorker !== true ||
    capabilities.transferableArrayBuffer !== true ||
    capabilities.sharedArrayBuffer !== false) {
    throw new TypeError('Invalid worker ready identity.')
  }
  return Object.freeze({
    protocolVersion: 1,
    workerInstanceNonce: record.workerInstanceNonce,
    buildId: record.buildId,
    catalogHash: record.catalogHash,
    tuningHash: record.tuningHash,
  })
}

function captureOptions(options: unknown): Readonly<Required<Stage7V2WorkerLauncherOptions>> {
  const record = closedRecord(options, [
    'expectedIdentity', 'readyTimeoutMilliseconds', 'createWorker', 'setTimeout', 'clearTimeout',
  ], true)
  const expected = closedRecord(record?.expectedIdentity, ['buildId', 'catalogHash', 'tuningHash'])
  if (!identifier(expected?.buildId) || !hash(expected.catalogHash) || !hash(expected.tuningHash)) {
    throw new TypeError('Stage 7 worker identity is invalid.')
  }
  const timeoutValue = record?.readyTimeoutMilliseconds
  const readyTimeoutMilliseconds = timeoutValue === undefined
    ? DEFAULT_READY_TIMEOUT_MILLISECONDS
    : timeoutValue
  if (typeof readyTimeoutMilliseconds !== 'number' ||
    !Number.isSafeInteger(readyTimeoutMilliseconds) ||
    readyTimeoutMilliseconds < 1 || readyTimeoutMilliseconds > 60_000) {
    throw new TypeError('Stage 7 worker timeout is invalid.')
  }
  const createWorker = (record?.createWorker ?? createStaticWorker) as () => Worker
  const setTimeout = (record?.setTimeout ??
    globalThis.setTimeout.bind(globalThis)) as typeof globalThis.setTimeout
  const clearTimeout = (record?.clearTimeout ??
    globalThis.clearTimeout.bind(globalThis)) as typeof globalThis.clearTimeout
  if (typeof createWorker !== 'function' || typeof setTimeout !== 'function' ||
    typeof clearTimeout !== 'function') throw new TypeError('Stage 7 worker ports are invalid.')
  return Object.freeze({
    expectedIdentity: Object.freeze({
      buildId: expected.buildId,
      catalogHash: expected.catalogHash,
      tuningHash: expected.tuningHash,
    }),
    readyTimeoutMilliseconds,
    createWorker,
    setTimeout,
    clearTimeout,
  })
}

function closedArray(value: unknown, length: number): readonly Record<string, unknown>[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<
      PropertyKey, PropertyDescriptor
    >
    const keys = Reflect.ownKeys(descriptors)
    if (descriptors.length?.value !== length || keys.length !== length + 1) return null
    const result: Record<string, unknown>[] = []
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)]
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) return null
      const captured = closedRecord(descriptor.value, ['id', 'version'])
      if (captured === null) return null
      result.push(captured)
    }
    return Object.freeze(result)
  } catch {
    return null
  }
}

function closedRecord(
  value: unknown,
  keys: readonly string[],
  optional = false,
): Readonly<Record<string, unknown>> | null {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) return null
    const descriptors = Object.getOwnPropertyDescriptors(value)
    const actual = Reflect.ownKeys(descriptors)
    if (actual.some((key) => typeof key !== 'string' || !keys.includes(key)) ||
      (!optional && actual.length !== keys.length) ||
      actual.some((key) => {
        const descriptor = descriptors[key as string]!
        return !descriptor.enumerable || !('value' in descriptor)
      })) return null
    return Object.freeze(Object.fromEntries(
      actual.map((key) => [key, descriptors[key as string]!.value]),
    ))
  } catch {
    return null
  }
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,255}$/u.test(value)
}

function hash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
}
