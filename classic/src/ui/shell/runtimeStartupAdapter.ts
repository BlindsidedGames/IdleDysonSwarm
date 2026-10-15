import type {
  UiRuntimeFoundationStatus,
} from '../runtime'
import type { HostKind } from '../../platform/releaseFoundation'
import type {
  StartupShellPhase,
  StartupShellViewModel,
} from './contracts'
import {
  createLocalDiagnosticReport,
  type LocalDiagnosticCode,
} from './diagnostics'

const RECOVERABLE_APPLICATION_OUTCOMES = new Set([
  'unsupported-future-version',
  'all-candidates-invalid',
])

export interface RuntimeStartupAdapterContext {
  readonly locale: string
  readonly saveSchemaVersion: number
  readonly buildId?: string
  readonly hostKind: HostKind
}

/**
 * Maps the host-neutral runtime status to presentation-only startup state.
 *
 * Raw reasons never cross this boundary. The shell receives only a localized
 * phase plus allowlisted diagnostic tokens.
 */
export function selectStartupShellViewModel(
  status: UiRuntimeFoundationStatus,
  context: Readonly<RuntimeStartupAdapterContext>,
): StartupShellViewModel {
  const phase = shellPhase(status)
  const code = diagnosticCode(phase)
  return Object.freeze({
    phase,
    ...(code === undefined
      ? {}
      : {
          diagnostics: createLocalDiagnosticReport({
            phase,
            code,
            buildId: context.buildId,
            hostKind: diagnosticHostKind(context.hostKind),
            locale: context.locale,
            saveSchemaVersion: context.saveSchemaVersion,
          }),
        }),
  })
}

function diagnosticHostKind(hostKind: HostKind): string {
  return hostKind === 'browser' ? 'browser-pwa' : hostKind
}

function shellPhase(
  status: UiRuntimeFoundationStatus,
): StartupShellPhase {
  switch (status.phase) {
    case 'idle':
      return 'idle'
    case 'starting':
      return 'starting'
    case 'ready':
      return 'ready-placeholder'
    case 'ownership-lost':
      return 'ownership-lost'
    case 'stopping':
    case 'stopped':
      return 'stopping'
    case 'blocked':
      if (status.code === 'writer-owned') {
        return 'writer-blocked'
      }
      if (
        status.code === 'application-blocked' &&
        status.applicationOutcome !== undefined &&
        RECOVERABLE_APPLICATION_OUTCOMES.has(
          status.applicationOutcome,
        )
      ) {
        return 'recovery'
      }
      return status.code === 'application-blocked'
        ? 'application-blocked'
        : 'error'
  }
}

function diagnosticCode(
  phase: StartupShellPhase,
): LocalDiagnosticCode | undefined {
  switch (phase) {
    case 'writer-blocked':
      return 'writer-unavailable'
    case 'application-blocked':
      return 'capability-unavailable'
    case 'recovery':
      return 'recovery-required'
    case 'ownership-lost':
      return 'writer-ownership-lost'
    case 'error':
      return 'startup-failed'
    case 'idle':
    case 'starting':
    case 'ready-placeholder':
    case 'stopping':
      return undefined
  }
}
