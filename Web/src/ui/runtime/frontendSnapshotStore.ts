import type { DeepReadonly } from '../../core/contracts'
import {
  FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
  type FrontendApplicationSnapshot,
} from '../../application/frontendSnapshot'

export type FrozenFrontendApplicationSnapshot =
  DeepReadonly<FrontendApplicationSnapshot>

export type FrontendSnapshotListener = (
  snapshot: FrozenFrontendApplicationSnapshot,
) => void

export interface FrontendSnapshotFrameScheduler {
  requestFrame(callback: () => void): unknown
  cancelFrame(handle: unknown): void
}

export type FrontendSnapshotDelivery = 'immediate' | 'animation-frame'

/**
 * Owns the sole UI-visible snapshot identity.
 *
 * Callers may offer newly projected objects after every fenced operation. The
 * store publishes only when the application envelope identity changes, so a
 * rejected or no-op command cannot masquerade as a canonical update.
 */
export class FrontendSnapshotStore {
  private current = freezeOwned<FrontendApplicationSnapshot>({
    version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
    phase: 'idle',
  })
  private readonly listeners = new Set<FrontendSnapshotListener>()
  private readonly scheduler: FrontendSnapshotFrameScheduler | undefined
  private scheduledHandle: unknown
  private notificationScheduled = false
  private disposed = false

  constructor(scheduler?: FrontendSnapshotFrameScheduler) {
    this.scheduler = scheduler
  }

  snapshot(): FrozenFrontendApplicationSnapshot {
    return this.current
  }

  subscribe(listener: FrontendSnapshotListener): () => void {
    if (this.disposed) return () => undefined
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  publish(
    snapshot: Readonly<FrontendApplicationSnapshot>,
    force = false,
    delivery: FrontendSnapshotDelivery = 'immediate',
  ): FrozenFrontendApplicationSnapshot {
    if (this.disposed) {
      return this.current
    }
    if (!force && sameEnvelope(this.current, snapshot)) {
      if (delivery === 'immediate' && this.notificationScheduled) {
        this.cancelScheduledNotification()
        this.notifyListeners()
      }
      return this.current
    }
    this.current = freezeOwned(snapshot)
    if (delivery === 'animation-frame' && this.scheduler !== undefined) {
      this.scheduleNotification()
    } else {
      this.cancelScheduledNotification()
      this.notifyListeners()
    }
    return this.current
  }

  publishStarting(): FrozenFrontendApplicationSnapshot {
    return this.publish({
      version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
      phase: 'starting',
    })
  }

  clear(): FrozenFrontendApplicationSnapshot {
    return this.publish({
      version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
      phase: 'idle',
    })
  }

  dispose(): void {
    this.disposed = true
    this.cancelScheduledNotification()
    this.listeners.clear()
  }

  private scheduleNotification(): void {
    if (this.notificationScheduled) return
    this.notificationScheduled = true
    this.scheduledHandle = this.scheduler!.requestFrame(() => {
      this.notificationScheduled = false
      this.scheduledHandle = undefined
      if (!this.disposed) this.notifyListeners()
    })
  }

  private cancelScheduledNotification(): void {
    if (!this.notificationScheduled || this.scheduler === undefined) {
      return
    }
    this.scheduler.cancelFrame(this.scheduledHandle)
    this.notificationScheduled = false
    this.scheduledHandle = undefined
  }

  private notifyListeners(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current)
      } catch {
        // Presentation observers cannot interrupt canonical publication.
      }
    }
  }
}

export class BrowserFrontendSnapshotFrameScheduler
  implements FrontendSnapshotFrameScheduler
{
  requestFrame(callback: () => void): unknown {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      return {
        kind: 'animation-frame',
        handle: globalThis.requestAnimationFrame(callback),
      }
    }
    return { kind: 'timeout', handle: globalThis.setTimeout(callback, 0) }
  }

  cancelFrame(handle: unknown): void {
    const scheduled = handle as
      | { readonly kind: 'animation-frame'; readonly handle: number }
      | {
          readonly kind: 'timeout'
          readonly handle: ReturnType<typeof setTimeout>
        }
    if (scheduled.kind === 'animation-frame') {
      globalThis.cancelAnimationFrame?.(scheduled.handle)
    } else {
      globalThis.clearTimeout(scheduled.handle)
    }
  }
}

function sameEnvelope(
  left: Readonly<FrontendApplicationSnapshot>,
  right: Readonly<FrontendApplicationSnapshot>,
): boolean {
  if (
    left.version !== right.version ||
    left.phase !== right.phase
  ) {
    return false
  }
  if (
    left.phase === 'idle' ||
    left.phase === 'starting' ||
    right.phase === 'idle' ||
    right.phase === 'starting'
  ) {
    return true
  }
  if (left.phase === 'blocked' || right.phase === 'blocked') {
    return (
      left.phase === 'blocked' &&
      right.phase === 'blocked' &&
      left.outcome === right.outcome &&
      left.error === right.error
    )
  }
  if (left.phase !== 'ready' || right.phase !== 'ready') {
    return false
  }
  return (
    left.source === right.source &&
    left.revision.session === right.revision.session &&
    left.revision.state === right.revision.state &&
    left.revision.durable === right.revision.durable &&
    left.operation === right.operation &&
    sameCheckpoint(left.checkpoint, right.checkpoint)
  )
}

function sameCheckpoint(
  left: Extract<
    FrontendApplicationSnapshot,
    { readonly phase: 'ready' }
  >['checkpoint'],
  right: Extract<
    FrontendApplicationSnapshot,
    { readonly phase: 'ready' }
  >['checkpoint'],
): boolean {
  if (
    left.kind !== right.kind ||
    left.durableRevision !== right.durableRevision
  ) {
    return false
  }
  if (left.kind === 'clean' || right.kind === 'clean') {
    return left.kind === 'clean' && right.kind === 'clean'
  }
  if (
    left.kind === 'checkpointing' ||
    right.kind === 'checkpointing'
  ) {
    return (
      left.kind === 'checkpointing' &&
      right.kind === 'checkpointing' &&
      left.targetStateRevision === right.targetStateRevision
    )
  }
  return (
    left.kind === 'dirty' &&
    right.kind === 'dirty' &&
    left.reason === right.reason &&
    left.error === right.error
  )
}

function freezeOwned<T>(value: Readonly<T>): DeepReadonly<T> {
  return deepFreeze(value as T)
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (
    value === null ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value as DeepReadonly<T>
  }
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value) as DeepReadonly<T>
}
