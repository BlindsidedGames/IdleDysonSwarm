export type LocalDiagnosticPhase =
  | 'idle'
  | 'starting'
  | 'writer-blocked'
  | 'application-blocked'
  | 'recovery'
  | 'ready-placeholder'
  | 'ownership-lost'
  | 'stopping'
  | 'error'
  | 'render-failure'

export type LocalDiagnosticCode =
  | 'none'
  | 'writer-unavailable'
  | 'capability-unavailable'
  | 'recovery-required'
  | 'writer-ownership-lost'
  | 'startup-failed'
  | 'render-failed'

export interface LocalDiagnosticContext {
  readonly phase: LocalDiagnosticPhase
  readonly code: LocalDiagnosticCode
  readonly buildId?: string
  readonly hostKind?: string
  readonly locale?: string
  readonly saveSchemaVersion?: number
  readonly frontendRevision?: string
  readonly canonicalRevision?: string
}

export interface LocalDiagnosticReport {
  readonly phase: LocalDiagnosticPhase
  readonly code: LocalDiagnosticCode
  readonly buildId?: string
  readonly hostKind?: string
  readonly locale?: string
  readonly saveSchemaVersion?: number
  readonly frontendRevision?: string
  readonly canonicalRevision?: string
  readonly errorKind?: LocalErrorKind
}

export type LocalErrorKind =
  | 'AggregateError'
  | 'Error'
  | 'EvalError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'TypeError'
  | 'URIError'
  | 'UnknownError'

const SAFE_TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/
const ALLOWED_PHASES = new Set<LocalDiagnosticPhase>([
  'idle',
  'starting',
  'writer-blocked',
  'application-blocked',
  'recovery',
  'ready-placeholder',
  'ownership-lost',
  'stopping',
  'error',
  'render-failure',
])
const ALLOWED_CODES = new Set<LocalDiagnosticCode>([
  'none',
  'writer-unavailable',
  'capability-unavailable',
  'recovery-required',
  'writer-ownership-lost',
  'startup-failed',
  'render-failed',
])
const ALLOWED_ERROR_KINDS = new Set([
  'AggregateError',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'UnknownError',
])

/**
 * Creates an allowlisted, local-only diagnostic record. Error messages,
 * stacks, save payloads, file paths, URLs, credentials, and arbitrary
 * properties are never copied into the result.
 */
export function createLocalDiagnosticReport(
  context: LocalDiagnosticContext,
  errorKind?: LocalErrorKind,
): LocalDiagnosticReport {
  const sanitizedErrorKind = safeErrorKind(errorKind)
  return Object.freeze({
    phase: safePhase(context.phase),
    code: safeCode(context.code),
    ...safeTokenField('buildId', context.buildId),
    ...safeTokenField('hostKind', context.hostKind),
    ...safeTokenField('locale', context.locale),
    ...safeIntegerField(
      'saveSchemaVersion',
      context.saveSchemaVersion,
    ),
    ...safeTokenField(
      'frontendRevision',
      context.frontendRevision,
    ),
    ...safeTokenField(
      'canonicalRevision',
      context.canonicalRevision,
    ),
    ...(sanitizedErrorKind === undefined
      ? {}
      : { errorKind: sanitizedErrorKind }),
  })
}

/**
 * Formats an already-redacted report for display or an explicit local copy.
 * The stable key order keeps support comparisons deterministic.
 */
export function formatLocalDiagnosticReport(
  report: LocalDiagnosticReport,
): string {
  const sanitized = createLocalDiagnosticReport(
    {
      phase: report.phase,
      code: report.code,
      buildId: report.buildId,
      hostKind: report.hostKind,
      locale: report.locale,
      saveSchemaVersion: report.saveSchemaVersion,
      frontendRevision: report.frontendRevision,
      canonicalRevision: report.canonicalRevision,
    },
    safeErrorKind(report.errorKind),
  )
  return JSON.stringify(sanitized, null, 2)
}

function safeTokenField<Key extends string>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> {
  if (value === undefined) return {}
  return {
    [key]: SAFE_TOKEN.test(value) ? value : '[redacted]',
  } as Partial<Record<Key, string>>
}

function safeIntegerField<Key extends string>(
  key: Key,
  value: number | undefined,
): Partial<Record<Key, number>> {
  if (
    value === undefined ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return {}
  }
  return { [key]: value } as Partial<Record<Key, number>>
}

export function classifyLocalError(error: unknown): LocalErrorKind {
  if (!(error instanceof Error)) return 'UnknownError'
  return ALLOWED_ERROR_KINDS.has(error.name)
    ? (error.name as LocalErrorKind)
    : 'Error'
}

function safePhase(value: unknown): LocalDiagnosticPhase {
  return ALLOWED_PHASES.has(value as LocalDiagnosticPhase)
    ? (value as LocalDiagnosticPhase)
    : 'error'
}

function safeCode(value: unknown): LocalDiagnosticCode {
  return ALLOWED_CODES.has(value as LocalDiagnosticCode)
    ? (value as LocalDiagnosticCode)
    : 'startup-failed'
}

function safeErrorKind(value: unknown): LocalErrorKind | undefined {
  if (value === undefined) return undefined
  return ALLOWED_ERROR_KINDS.has(value as LocalErrorKind)
    ? (value as LocalErrorKind)
    : 'Error'
}
