import type {
  LifecycleAdapter,
  LifecyclePhase,
} from './contracts'
import { requireBrowserCapability } from './browserEnvironment'

export interface BrowserDocumentLifecyclePort {
  readonly visibilityState: DocumentVisibilityState
  hasFocus(): boolean
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

export interface BrowserWindowLifecyclePort {
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}

export class BrowserLifecycleAdapter implements LifecycleAdapter {
  private readonly documentPort: BrowserDocumentLifecyclePort
  private readonly windowPort: BrowserWindowLifecyclePort
  private readonly listeners =
    new Set<(phase: LifecyclePhase) => void>()
  private listening = false
  private lastPhase: LifecyclePhase | undefined

  constructor(
    documentPort?: BrowserDocumentLifecyclePort,
    windowPort?: BrowserWindowLifecyclePort,
  ) {
    this.documentPort =
      documentPort ??
      requireBrowserCapability(
        'Document',
        globalThis.document,
      )
    this.windowPort =
      windowPort ??
      requireBrowserCapability('Window', globalThis.window)
  }

  subscribe(
    listener: (phase: LifecyclePhase) => void,
  ): () => void {
    this.listeners.add(listener)
    this.startListening()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stopListening()
    }
  }

  currentPhase(): LifecyclePhase {
    return this.documentPort.visibilityState === 'hidden'
      ? 'background'
      : this.documentPort.hasFocus()
        ? 'active'
        : 'focus-lost'
  }

  private startListening(): void {
    if (this.listening) return
    this.listening = true
    this.documentPort.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.windowPort.addEventListener('focus', this.handleFocus)
    this.windowPort.addEventListener('blur', this.handleBlur)
    this.windowPort.addEventListener(
      'pagehide',
      this.handlePageHide,
    )
    this.windowPort.addEventListener(
      'pageshow',
      this.handlePageShow,
    )
  }

  private stopListening(): void {
    if (!this.listening) return
    this.listening = false
    this.documentPort.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    )
    this.windowPort.removeEventListener('focus', this.handleFocus)
    this.windowPort.removeEventListener('blur', this.handleBlur)
    this.windowPort.removeEventListener(
      'pagehide',
      this.handlePageHide,
    )
    this.windowPort.removeEventListener(
      'pageshow',
      this.handlePageShow,
    )
    this.lastPhase = undefined
  }

  private readonly handleVisibilityChange = (): void => {
    this.emit(this.currentPhase())
  }

  private readonly handleFocus = (): void => {
    if (this.documentPort.visibilityState === 'visible') {
      this.emit('active')
    }
  }

  private readonly handleBlur = (): void => {
    if (this.documentPort.visibilityState === 'visible') {
      this.emit('focus-lost')
    }
  }

  private readonly handlePageHide = (): void => {
    this.emit('terminating')
  }

  private readonly handlePageShow = (): void => {
    this.handleVisibilityChange()
  }

  private emit(phase: LifecyclePhase): void {
    if (phase === this.lastPhase) return
    this.lastPhase = phase
    for (const listener of [...this.listeners]) {
      try {
        listener(phase)
      } catch {
        // One host callback cannot suppress lifecycle delivery to the rest.
      }
    }
  }
}

export interface MonotonicTimeSource {
  now(): number
}

export interface WallTimeSource {
  now(): number
}

export interface BrowserLifecycleClockSample {
  readonly utcMilliseconds: number
  readonly serializedUtcText: string
}

/** Supplies monotonic elapsed time for the Wave 2 foreground driver. */
export class BrowserMonotonicClock {
  private readonly monotonicSource: MonotonicTimeSource
  private lastMonotonic: number

  constructor(
    monotonicSource?: MonotonicTimeSource,
  ) {
    this.monotonicSource =
      monotonicSource ??
      requireBrowserCapability(
        'MonotonicClock',
        globalThis.performance,
      )
    this.lastMonotonic = this.monotonicSource.now()
  }

  nowMilliseconds(): number {
    const candidate = this.monotonicSource.now()
    this.lastMonotonic = Math.max(this.lastMonotonic, candidate)
    return this.lastMonotonic
  }
}

/**
 * Samples raw wall UTC for CanonicalLifecycleCoordinator. Backward movement
 * must remain visible so canonical away-time integrity checks can reject it.
 */
export class BrowserLifecycleUtcClock {
  private readonly wallSource: WallTimeSource

  constructor(wallSource: WallTimeSource = Date) {
    this.wallSource = wallSource
  }

  sample(): BrowserLifecycleClockSample {
    const candidate = this.wallSource.now()
    if (!Number.isFinite(candidate)) {
      throw new Error('Browser wall clock returned a non-finite UTC value.')
    }
    return Object.freeze({
      utcMilliseconds: candidate,
      serializedUtcText: new Date(candidate).toISOString(),
    })
  }
}
