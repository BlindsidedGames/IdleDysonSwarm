import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  spawn,
  type ChildProcess,
} from 'node:child_process'
import {
  FIRST_SLICE_COMMIT_PROBE_MARKER,
  type FirstSliceCommitProbeSample,
} from '../../src/ui/performance/firstSliceCommitProbe'

export interface ViewportProfile {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly deviceScaleFactor: number
  readonly cpuThrottleRate: number
}

export interface BrowserMeasurementEnvironment {
  readonly browser: string
  readonly browserVersion: string
  readonly platform: string
  readonly productionUrl: string
}

export interface BrowserPerformanceEntries {
  readonly longTasks: readonly {
    readonly startTime: number
    readonly duration: number
  }[]
  readonly commandFeedbackLatenciesMilliseconds: readonly number[]
  readonly snapshotSelectionThroughReactCommit:
    readonly (FirstSliceCommitProbeSample & {
      readonly startTime: number
      readonly endTime: number
    })[]
  readonly events: readonly {
    readonly name: string
    readonly startTime: number
    readonly processingStart: number
    readonly processingEnd: number
    readonly interactionId: number
    readonly duration: number
  }[]
  readonly layoutShifts: readonly {
    readonly startTime: number
    readonly value: number
    readonly hadRecentInput: boolean
  }[]
  readonly largestContentfulPaintMilliseconds: number
}

export interface InstrumentedResourceCounts {
  readonly activeTimeouts: number
  readonly activeIntervals: number
  readonly activeAnimationFrames: number
  readonly activePointers: number
}

export interface ProductionPreview {
  readonly url: string
  stop(): Promise<void>
}

export interface ChromiumPage {
  readonly cdp: CdpSession
  readonly environment: BrowserMeasurementEnvironment
  navigate(url: string): Promise<void>
  evaluate<T>(expression: string): Promise<T>
  waitForSelector(selector: string, timeoutMilliseconds?: number): Promise<void>
  clickTinker(): Promise<boolean>
  warmFirstSliceCommitProbe(
    timeoutMilliseconds?: number,
  ): Promise<number>
  resetInteractionMeasurements(): Promise<void>
  readPerformanceEntries(): Promise<BrowserPerformanceEntries>
  readInstrumentedResourceCounts(): Promise<InstrumentedResourceCounts>
  collectGarbage(): Promise<void>
  readHeapUsedBytes(): Promise<number>
  readDomCounters(): Promise<{
    readonly documents: number
    readonly nodes: number
    readonly jsEventListeners: number
  }>
  readCallbackSubscriptionCounts(): Promise<{
    readonly callbackSubscriptionSets: number
    readonly callbackSubscriptionMembers: number
  }>
  close(): Promise<void>
}

interface CdpMessage {
  readonly id?: number
  readonly method?: string
  readonly params?: unknown
  readonly result?: unknown
  readonly error?: {
    readonly message?: string
  }
}

export class CdpSession {
  private readonly socket: WebSocket
  private readonly pending = new Map<
    number,
    {
      readonly resolve: (value: unknown) => void
      readonly reject: (reason: Error) => void
    }
  >()
  private nextId = 1
  private readonly eventListeners = new Map<
    string,
    Set<(params: unknown) => void>
  >()

  private constructor(socket: WebSocket) {
    this.socket = socket
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage
      if (message.id === undefined) {
        if (message.method !== undefined) {
          for (const listener of this.eventListeners.get(message.method) ?? []) {
            listener(message.params)
          }
        }
        return
      }
      const pending = this.pending.get(message.id)
      if (pending === undefined) return
      this.pending.delete(message.id)
      if (message.error !== undefined) {
        pending.reject(
          new Error(
            message.error.message ?? 'Chromium DevTools request failed.',
          ),
        )
      } else {
        pending.resolve(message.result)
      }
    })
    this.socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error('Chromium DevTools connection closed.'))
      }
      this.pending.clear()
    })
  }

  static async connect(url: string): Promise<CdpSession> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const onOpen = () => {
        socket.removeEventListener('error', onError)
        resolvePromise()
      }
      const onError = () => {
        socket.removeEventListener('open', onOpen)
        rejectPromise(
          new Error('Could not open Chromium DevTools connection.'),
        )
      }
      socket.addEventListener('open', onOpen, { once: true })
      socket.addEventListener('error', onError, { once: true })
    })
    return new CdpSession(socket)
  }

  send<T>(
    method: string,
    params: Readonly<Record<string, unknown>> = {},
  ): Promise<T> {
    const id = this.nextId
    this.nextId += 1
    return new Promise<T>((resolvePromise, rejectPromise) => {
      this.pending.set(id, {
        resolve: (value) => resolvePromise(value as T),
        reject: rejectPromise,
      })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close(): void {
    this.socket.close()
  }

  on<T>(method: string, listener: (params: T) => void): () => void {
    const listeners = this.eventListeners.get(method) ?? new Set()
    listeners.add(listener as (params: unknown) => void)
    this.eventListeners.set(method, listeners)
    return () => {
      listeners.delete(listener as (params: unknown) => void)
      if (listeners.size === 0) this.eventListeners.delete(method)
    }
  }
}

export async function startProductionPreview(
  webRoot: string,
  port: number,
  outDir?: string,
): Promise<ProductionPreview> {
  const url = `http://127.0.0.1:${port}/play/`
  if (await isReachable(url)) {
    throw new Error(
      `Production preview port ${port} is already serving another process.`,
    )
  }
  const viteBin = resolve(
    webRoot,
    'node_modules',
    'vite',
    'bin',
    'vite.js',
  )
  const previewArguments = [
    viteBin,
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ]
  if (outDir) {
    previewArguments.push('--outDir', outDir)
  }
  const child = spawn(
    process.execPath,
    previewArguments,
    {
      cwd: webRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
  const output: string[] = []
  child.stdout?.on('data', (chunk) => output.push(String(chunk)))
  child.stderr?.on('data', (chunk) => output.push(String(chunk)))
  try {
    await waitUntil(async () => {
      if (child.exitCode !== null) {
        throw new Error(
          `Production preview exited early.\n${output.join('')}`,
        )
      }
      return isReachable(url)
    }, 15_000)
  } catch (error) {
    stopChild(child)
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}\n${output.join('')}`)
  }
  return {
    url,
    async stop() {
      stopChild(child)
      await waitForExit(child)
    },
  }
}

export async function openChromiumPage(
  profile: ViewportProfile,
  productionUrl: string,
): Promise<ChromiumPage> {
  const executable = chromiumExecutable()
  const profileRoot = mkdtempSync(
    join(tmpdir(), 'idle-dyson-performance-'),
  )
  const child = spawn(
    executable,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profileRoot}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--disable-renderer-backgrounding',
      // This isolated local runner cannot start Chrome's subprocess sandbox.
      // It loads only the loopback production preview.
      '--no-sandbox',
      '--metrics-recording-only',
      'about:blank',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
  const chromiumOutput: string[] = []
  child.stdout?.on('data', (chunk) => chromiumOutput.push(String(chunk)))
  child.stderr?.on('data', (chunk) => chromiumOutput.push(String(chunk)))
  try {
    const portFile = join(profileRoot, 'DevToolsActivePort')
    await waitUntil(() => {
      try {
        return readFileSync(portFile, 'utf8').trim().length > 0
      } catch {
        if (child.exitCode !== null) {
          throw new Error(
            `Chromium exited before DevTools was ready.${formatChromiumOutput(chromiumOutput)}`,
          )
        }
        return false
      }
    }, 15_000)
    const [portText] = readFileSync(portFile, 'utf8').trim().split(/\r?\n/)
    const port = Number(portText)
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error('Chromium returned an invalid DevTools port.')
    }
    const root = `http://127.0.0.1:${port}`
    const version = await fetchJson<{
      readonly Browser: string
    }>(`${root}/json/version`)
    const targets = await fetchJson<
      readonly {
        readonly type: string
        readonly webSocketDebuggerUrl?: string
      }[]
    >(`${root}/json/list`)
    const target = targets.find(
      (candidate) =>
        candidate.type === 'page' &&
        candidate.webSocketDebuggerUrl !== undefined,
    )
    if (target?.webSocketDebuggerUrl === undefined) {
      throw new Error('Chromium did not expose a page target.')
    }
    const cdp = await CdpSession.connect(target.webSocketDebuggerUrl)
    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Performance.enable'),
      cdp.send('Network.enable'),
    ])
    await cdp.send('Page.bringToFront')
    await cdp.send('Emulation.setFocusEmulationEnabled', {
      enabled: true,
    })
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: profile.width,
      height: profile.height,
      deviceScaleFactor: profile.deviceScaleFactor,
      mobile: profile.width < 768,
    })
    await cdp.send('Emulation.setCPUThrottlingRate', {
      rate: profile.cpuThrottleRate,
    })
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: PERFORMANCE_INSTRUMENTATION,
    })
    return createPage({
      cdp,
      child,
      profileRoot,
      productionUrl,
      browserProduct: version.Browser,
    })
  } catch (error) {
    stopChild(child)
    await waitForExit(child)
    removeTemporaryProfile(profileRoot)
    if (
      error instanceof Error &&
      chromiumOutput.length > 0 &&
      !error.message.includes('Chromium output:')
    ) {
      throw new Error(
        `${error.message}${formatChromiumOutput(chromiumOutput)}`,
        { cause: error },
      )
    }
    throw error
  }
}

function formatChromiumOutput(chunks: readonly string[]): string {
  const output = chunks.join('').trim()
  if (output.length === 0) return ''
  return `\nChromium output:\n${output.slice(-8_000)}`
}

export async function interactFor(
  page: ChromiumPage,
  durationMilliseconds: number,
  intervalMilliseconds = 550,
): Promise<number> {
  const startedAt = Date.now()
  let activations = 0
  while (Date.now() - startedAt < durationMilliseconds) {
    if (await page.clickTinker()) activations += 1
    await delay(intervalMilliseconds)
  }
  return activations
}

export async function warmFirstSlice(
  page: ChromiumPage,
  minimumMilliseconds: number,
): Promise<void> {
  const startedAt = Date.now()
  do {
    await page.clickTinker()
    await delay(550)
  } while (Date.now() - startedAt < minimumMilliseconds)
  await delay(1_000)
}

function createPage(options: {
  readonly cdp: CdpSession
  readonly child: ChildProcess
  readonly profileRoot: string
  readonly productionUrl: string
  readonly browserProduct: string
}): ChromiumPage {
  const [browser = 'Chromium', browserVersion = 'unknown'] =
    options.browserProduct.split('/')
  let closed = false
  const evaluate = async <T>(expression: string): Promise<T> => {
    const response = await options.cdp.send<{
      readonly result: {
        readonly value?: T
        readonly description?: string
      }
      readonly exceptionDetails?: {
        readonly text?: string
      }
    }>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (response.exceptionDetails !== undefined) {
      throw new Error(
        response.exceptionDetails.text ??
          response.result.description ??
          'Browser evaluation failed.',
      )
    }
    return response.result.value as T
  }
  return {
    cdp: options.cdp,
    environment: {
      browser,
      browserVersion,
      platform: `${process.platform}-${process.arch}`,
      productionUrl: options.productionUrl,
    },
    async navigate(url) {
      await options.cdp.send('Page.navigate', { url })
      await this.waitForSelector('.tinker-surface__control', 30_000)
    },
    evaluate,
    async waitForSelector(selector, timeoutMilliseconds = 10_000) {
      await waitUntil(
        () =>
          evaluate<boolean>(
            `document.querySelector(${JSON.stringify(selector)}) !== null`,
          ),
        timeoutMilliseconds,
      )
    },
    async clickTinker() {
      const target = await evaluate<{
        readonly x: number
        readonly y: number
      } | null>(`(() => {
        const button = document.querySelector('.tinker-surface__control')
        if (!(button instanceof HTMLButtonElement) || button.disabled) {
          return null
        }
        const rect = button.getBoundingClientRect()
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
      })()`)
      if (target === null) return false
      await options.cdp.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: target.x,
        y: target.y,
        button: 'left',
        buttons: 1,
        clickCount: 1,
        pointerType: 'mouse',
      })
      await options.cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: target.x,
        y: target.y,
        button: 'left',
        buttons: 0,
        clickCount: 1,
        pointerType: 'mouse',
      })
      await delay(10)
      const stillActive = await evaluate<boolean>(
        `document.querySelector('.tinker-surface__control')?.getAttribute('data-gesture-active') === 'true'`,
      )
      if (stillActive) {
        throw new Error('Synthetic Tinker pointer remained active after release.')
      }
      return true
    },
    async warmFirstSliceCommitProbe(
      timeoutMilliseconds = 30_000,
    ) {
      const startedAt = Date.now()
      let observedRunning = false
      const activations = await evaluate<boolean>(`(() => {
        const button = document.querySelector('.tinker-surface__control')
        if (!(button instanceof HTMLButtonElement) || button.disabled) {
          return false
        }
        button.click()
        return true
      })()`) ? 1 : 0
      while (Date.now() - startedAt < timeoutMilliseconds) {
        await delay(550)
        const entries = await this.readPerformanceEntries()
        const running = await evaluate<boolean>(
          `document.querySelector('.tinker-surface')?.getAttribute('data-running') === 'true'`,
        )
        observedRunning ||= running
        if (
          entries.snapshotSelectionThroughReactCommit.length > 0 &&
          observedRunning &&
          !running
        ) {
          return activations
        }
      }
      const diagnostic = await evaluate<unknown>(`({
        probeInstalled: Boolean(window[${JSON.stringify(FIRST_SLICE_COMMIT_PROBE_MARKER)}]),
        performanceInstalled: Boolean(window.__idleDysonPerformance),
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus(),
        resources: window.__idleDysonPerformance?.readResources?.() ?? null,
        statusText: document.querySelector('[role="alert"]')?.textContent ?? null,
        tinkerText: document.querySelector('.tinker-surface__control')?.textContent ?? null,
      })`)
      throw new Error(
        `Timed out after ${timeoutMilliseconds} ms warming the first-slice commit probe. Diagnostic: ${JSON.stringify(diagnostic)}`,
      )
    },
    async resetInteractionMeasurements() {
      await evaluate(
        'window.__idleDysonPerformance.resetInteraction()',
      )
    },
    async readPerformanceEntries() {
      return evaluate<BrowserPerformanceEntries>(
        'window.__idleDysonPerformance.readPerformance()',
      )
    },
    async readInstrumentedResourceCounts() {
      return evaluate<InstrumentedResourceCounts>(
        'window.__idleDysonPerformance.readResources()',
      )
    },
    async collectGarbage() {
      await options.cdp.send('HeapProfiler.collectGarbage')
    },
    async readHeapUsedBytes() {
      const response = await options.cdp.send<{
        readonly metrics: readonly {
          readonly name: string
          readonly value: number
        }[]
      }>('Performance.getMetrics')
      return (
        response.metrics.find(
          (metric) => metric.name === 'JSHeapUsedSize',
        )?.value ?? 0
      )
    },
    async readDomCounters() {
      return options.cdp.send('Memory.getDOMCounters')
    },
    async readCallbackSubscriptionCounts() {
      const objectGroup = 'idle-dyson-performance-subscriptions'
      try {
        const prototype = await options.cdp.send<{
          readonly result: {
            readonly objectId?: string
          }
        }>('Runtime.evaluate', {
          expression: 'Set.prototype',
          objectGroup,
        })
        const prototypeObjectId = prototype.result.objectId
        if (prototypeObjectId === undefined) {
          throw new Error('Could not inspect callback subscription sets.')
        }
        const queried = await options.cdp.send<{
          readonly objects: {
            readonly objectId?: string
          }
        }>('Runtime.queryObjects', {
          prototypeObjectId,
          objectGroup,
        })
        const setsObjectId = queried.objects.objectId
        if (setsObjectId === undefined) {
          throw new Error('Chromium did not return live Set instances.')
        }
        const counted = await options.cdp.send<{
          readonly result: {
            readonly value?: {
              readonly callbackSubscriptionSets: number
              readonly callbackSubscriptionMembers: number
            }
          }
        }>('Runtime.callFunctionOn', {
          objectId: setsObjectId,
          returnByValue: true,
          functionDeclaration: `function () {
            return this.reduce((counts, set) => {
              if (
                set instanceof Set &&
                set.size > 0 &&
                [...set].every((member) => typeof member === 'function')
              ) {
                counts.callbackSubscriptionSets += 1
                counts.callbackSubscriptionMembers += set.size
              }
              return counts
            }, {
              callbackSubscriptionSets: 0,
              callbackSubscriptionMembers: 0,
            })
          }`,
        })
        if (counted.result.value === undefined) {
          throw new Error(
            'Chromium did not return callback subscription counts.',
          )
        }
        return counted.result.value
      } finally {
        await options.cdp.send('Runtime.releaseObjectGroup', {
          objectGroup,
        })
      }
    },
    async close() {
      if (closed) return
      closed = true
      try {
        await options.cdp.send('Browser.close')
      } catch {
        stopChild(options.child)
      } finally {
        options.cdp.close()
        await waitForExit(options.child)
        removeTemporaryProfile(options.profileRoot)
      }
    },
  }
}

function chromiumExecutable(): string {
  const configured = process.env.IDS_CHROMIUM_PATH
  const candidates = [
    configured,
    process.platform === 'win32'
      ? join(
          process.env.PROGRAMFILES ?? 'C:\\Program Files',
          'Google',
          'Chrome',
          'Application',
          'chrome.exe',
        )
      : undefined,
    process.platform === 'win32'
      ? join(
          process.env['PROGRAMFILES(X86)'] ??
            'C:\\Program Files (x86)',
          'Microsoft',
          'Edge',
          'Application',
          'msedge.exe',
        )
      : undefined,
    process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined,
    process.platform === 'linux'
      ? '/usr/bin/google-chrome'
      : undefined,
    process.platform === 'linux' ? '/usr/bin/chromium' : undefined,
  ].filter((candidate): candidate is string => candidate !== undefined)
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    'Chromium was not found. Set IDS_CHROMIUM_PATH to Chrome, Edge or Chromium.',
  )
}

function removeTemporaryProfile(path: string): void {
  const expectedPrefix = join(tmpdir(), 'idle-dyson-performance-')
  if (!resolve(path).startsWith(resolve(expectedPrefix))) {
    throw new Error('Refusing to remove an unexpected browser profile.')
  }
  try {
    rmSync(path, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100,
    })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'ENOTEMPTY') {
      throw error
    }
    console.warn(
      `Chromium released late; temporary profile remains for later cleanup: ${path}`,
    )
  }
}

function stopChild(child: ChildProcess): void {
  if (child.exitCode === null && !child.killed) {
    child.kill()
  }
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return
  await Promise.race([
    new Promise<void>((resolvePromise) => {
      child.once('exit', () => resolvePromise())
    }),
    delay(5_000).then(() => stopChild(child)),
  ])
}

async function isReachable(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      signal: AbortSignal.timeout(1_000),
    })
    return true
  } catch {
    return false
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Chromium DevTools returned HTTP ${response.status}.`)
  }
  return response.json() as Promise<T>
}

async function waitUntil(
  predicate: () => boolean | Promise<boolean>,
  timeoutMilliseconds: number,
): Promise<void> {
  const startedAt = Date.now()
  while (!(await predicate())) {
    if (Date.now() - startedAt >= timeoutMilliseconds) {
      throw new Error(
        `Timed out after ${timeoutMilliseconds} ms waiting for browser state.`,
      )
    }
    await delay(50)
  }
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds)
  })
}

const PERFORMANCE_INSTRUMENTATION = String.raw`
(() => {
  const longTasks = []
  const commandFeedback = []
  const snapshotSelectionThroughReactCommit = []
  const events = []
  const layoutShifts = []
  let largestContentfulPaint = 0
  let measurementStartedAt = 0
  let activeTinkerStart = null
  const timeouts = new Set()
  const intervals = new Set()
  const animationFrames = new Set()
  const pointers = new Set()

  const nativeSetTimeout = window.setTimeout.bind(window)
  const nativeClearTimeout = window.clearTimeout.bind(window)
  const nativeSetInterval = window.setInterval.bind(window)
  const nativeClearInterval = window.clearInterval.bind(window)
  const nativeRequestAnimationFrame =
    window.requestAnimationFrame.bind(window)
  const nativeCancelAnimationFrame =
    window.cancelAnimationFrame.bind(window)

  window.setTimeout = (handler, timeout, ...args) => {
    let id
    const wrapped = (...callbackArgs) => {
      timeouts.delete(id)
      if (typeof handler === 'function') {
        return handler(...callbackArgs)
      }
      return undefined
    }
    id = nativeSetTimeout(wrapped, timeout, ...args)
    timeouts.add(id)
    return id
  }
  window.clearTimeout = (id) => {
    timeouts.delete(id)
    return nativeClearTimeout(id)
  }
  window.setInterval = (handler, timeout, ...args) => {
    const id = nativeSetInterval(handler, timeout, ...args)
    intervals.add(id)
    return id
  }
  window.clearInterval = (id) => {
    intervals.delete(id)
    return nativeClearInterval(id)
  }
  window.requestAnimationFrame = (callback) => {
    let id
    id = nativeRequestAnimationFrame((timestamp) => {
      animationFrames.delete(id)
      callback(timestamp)
    })
    animationFrames.add(id)
    return id
  }
  window.cancelAnimationFrame = (id) => {
    animationFrames.delete(id)
    return nativeCancelAnimationFrame(id)
  }

  const observe = (type, callback, options = {}) => {
    if (
      typeof PerformanceObserver !== 'function' ||
      !PerformanceObserver.supportedEntryTypes.includes(type)
    ) {
      return
    }
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries())
    })
    observer.observe({ type, buffered: true, ...options })
  }
  observe('longtask', (entries) => {
    for (const entry of entries) {
      if (entry.startTime < measurementStartedAt) continue
      longTasks.push({
        startTime: entry.startTime,
        duration: entry.duration,
      })
    }
  })
  observe(
    'event',
    (entries) => {
      for (const entry of entries) {
        if (entry.startTime < measurementStartedAt) continue
        events.push({
          name: entry.name,
          startTime: entry.startTime,
          processingStart: entry.processingStart,
          processingEnd: entry.processingEnd,
          interactionId: entry.interactionId || 0,
          duration: entry.duration,
        })
      }
    },
    { durationThreshold: 16 },
  )
  observe('layout-shift', (entries) => {
    for (const entry of entries) {
      if (entry.startTime < measurementStartedAt) continue
      layoutShifts.push({
        startTime: entry.startTime,
        value: entry.value,
        hadRecentInput: entry.hadRecentInput,
      })
    }
  })
  observe('largest-contentful-paint', (entries) => {
    for (const entry of entries) {
      if (entry.startTime < measurementStartedAt) continue
      largestContentfulPaint = Math.max(
        largestContentfulPaint,
        entry.renderTime || entry.loadTime || entry.startTime,
      )
    }
  })

  document.addEventListener(
    'pointerdown',
    (event) => {
      pointers.add(event.pointerId)
      if (
        event.target instanceof Element &&
        event.target.closest('.tinker-surface__control')
      ) {
        activeTinkerStart = performance.now()
      }
    },
    true,
  )
  const releasePointer = (event) => pointers.delete(event.pointerId)
  document.addEventListener('pointerup', releasePointer, true)
  document.addEventListener('pointercancel', releasePointer, true)

  const installMutationObserver = () => {
    if (!document.documentElement) {
      nativeSetTimeout(installMutationObserver, 0)
      return
    }
    new MutationObserver(() => {
      if (activeTinkerStart === null) return
      const active = document.querySelector(
        '.tinker-surface__control[data-gesture-active="true"]',
      )
      if (!active) return
      commandFeedback.push(performance.now() - activeTinkerStart)
      activeTinkerStart = null
    }).observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['data-gesture-active'],
    })
  }
  installMutationObserver()

  window[${JSON.stringify(FIRST_SLICE_COMMIT_PROBE_MARKER)}] =
    Object.freeze({
      record(sample) {
        if (
          !sample ||
          !Number.isFinite(sample.durationMilliseconds) ||
          sample.durationMilliseconds < 0 ||
          !Number.isInteger(sample.revision?.session) ||
          !Number.isInteger(sample.revision?.state)
        ) {
          return
        }
        const endTime = performance.now()
        snapshotSelectionThroughReactCommit.push({
          revision: {
            session: sample.revision.session,
            state: sample.revision.state,
          },
          durationMilliseconds: sample.durationMilliseconds,
          startTime: endTime - sample.durationMilliseconds,
          endTime,
        })
      },
    })

  window.__idleDysonPerformance = Object.freeze({
    resetInteraction() {
      measurementStartedAt = performance.now()
      longTasks.length = 0
      commandFeedback.length = 0
      snapshotSelectionThroughReactCommit.length = 0
      events.length = 0
      activeTinkerStart = null
    },
    readPerformance() {
      return {
        longTasks: [...longTasks],
        commandFeedbackLatenciesMilliseconds: [...commandFeedback],
        snapshotSelectionThroughReactCommit:
          snapshotSelectionThroughReactCommit.map((sample) => ({
            revision: { ...sample.revision },
            durationMilliseconds: sample.durationMilliseconds,
            startTime: sample.startTime,
            endTime: sample.endTime,
          })),
        events: [...events],
        layoutShifts: [...layoutShifts],
        largestContentfulPaintMilliseconds: largestContentfulPaint,
      }
    },
    readResources() {
      return {
        activeTimeouts: timeouts.size,
        activeIntervals: intervals.size,
        activeAnimationFrames: animationFrames.size,
        activePointers: pointers.size,
      }
    },
  })
})()
`
