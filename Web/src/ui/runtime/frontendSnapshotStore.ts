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

/**
 * Owns the sole UI-visible snapshot identity.
 *
 * Callers may offer newly projected objects after every fenced operation. The
 * store publishes only when the application envelope identity changes, so a
 * rejected or no-op command cannot masquerade as a canonical update.
 */
export class FrontendSnapshotStore {
  private current = freezeDetached<FrontendApplicationSnapshot>({
    version: FRONTEND_GAMEPLAY_SNAPSHOT_VERSION,
    phase: 'idle',
  })
  private readonly listeners = new Set<FrontendSnapshotListener>()
  private disposed = false

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
  ): FrozenFrontendApplicationSnapshot {
    if (this.disposed || sameEnvelope(this.current, snapshot)) {
      return this.current
    }
    this.current = freezeDetached(snapshot)
    for (const listener of [...this.listeners]) {
      try {
        listener(this.current)
      } catch {
        // Presentation observers cannot interrupt canonical publication.
      }
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
    this.listeners.clear()
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

function freezeDetached<T>(value: Readonly<T>): DeepReadonly<T> {
  return deepFreeze(structuredClone(value) as T)
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
