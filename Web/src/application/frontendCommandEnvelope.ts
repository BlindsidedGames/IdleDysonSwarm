import type { DeepReadonly } from '../core/contracts'
import {
  CANONICAL_PLAYER_COMMAND_SUPPORT,
  type CanonicalPlayerCommand,
  type CanonicalPlayerCommandKind,
} from './canonicalPlayerCommands'
import type {
  ApplicationCommandEnvelope,
  ApplicationRevision,
} from './contracts'

/** Captures a detached frontend command with optimistic-concurrency fencing. */
export function createFrontendCommandEnvelope(
  revision: Readonly<ApplicationRevision>,
  command: Readonly<CanonicalPlayerCommand>,
): DeepReadonly<ApplicationCommandEnvelope<CanonicalPlayerCommand>> {
  assertRevision('session', revision.session)
  assertRevision('state', revision.state)
  if (!hasCommandKind(command.kind)) {
    throw new Error(`Unknown canonical command kind '${command.kind}'.`)
  }
  return deepFreeze({
    sessionRevision: revision.session,
    expectedStateRevision: revision.state,
    command: structuredClone(command),
  })
}

function hasCommandKind(kind: string): kind is CanonicalPlayerCommandKind {
  return Object.prototype.hasOwnProperty.call(
    CANONICAL_PLAYER_COMMAND_SUPPORT,
    kind,
  )
}

function assertRevision(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} revision must be a non-negative safe integer.`)
  }
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as DeepReadonly<T>
  }
  for (const nested of Object.values(value)) deepFreeze(nested)
  return Object.freeze(value) as DeepReadonly<T>
}
