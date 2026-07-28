export type Unsubscribe = () => void

export interface Clock {
  nowMilliseconds(): number
}

export interface SimulationSnapshot {
  readonly schema: number
  readonly revision: number
  readonly state: Readonly<Record<string, unknown>>
}

export interface SimulationCommand {
  readonly kind: string
  readonly payload?: Readonly<Record<string, unknown>>
}

/**
 * React, persistence and platform adapters depend only on this boundary.
 * The pure event-time scheduler and each migrated gameplay model live behind it,
 * so neither rendering nor wall-clock behavior can become authoritative.
 */
export interface SimulationEngine {
  snapshot(): SimulationSnapshot
  dispatch(command: SimulationCommand): void
  advanceBy(milliseconds: number): void
  subscribe(listener: (snapshot: SimulationSnapshot) => void): Unsubscribe
}
