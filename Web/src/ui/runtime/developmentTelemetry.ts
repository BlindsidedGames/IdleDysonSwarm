const DEVELOPMENT_TELEMETRY_ENDPOINT = '/__ids_dev_telemetry'

export type DevelopmentTelemetrySample = Readonly<
  Record<string, unknown>
>

export function reportDevelopmentTelemetry(
  kind: string,
  sample: DevelopmentTelemetrySample,
): void {
  if (!import.meta.env.DEV) return
  const body = JSON.stringify({
    capturedAt: new Date().toISOString(),
    kind,
    ...sample,
  })
  void fetch(DEVELOPMENT_TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export function startDevelopmentTelemetry(
  sample: () => DevelopmentTelemetrySample,
): () => void {
  if (!import.meta.env.DEV) return () => undefined
  const heartbeat = (): void => {
    reportDevelopmentTelemetry('heartbeat', sample())
  }
  const handleError = (event: ErrorEvent): void => {
    reportDevelopmentTelemetry('window-error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: safeError(event.error),
    })
  }
  const handleRejection = (event: PromiseRejectionEvent): void => {
    reportDevelopmentTelemetry('unhandled-rejection', {
      reason: safeError(event.reason),
    })
  }

  heartbeat()
  const interval = window.setInterval(heartbeat, 1_000)
  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleRejection)
  return () => {
    window.clearInterval(interval)
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleRejection)
  }
}

function safeError(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
