export type BrowserCapabilityName =
  | 'BroadcastChannel'
  | 'Clipboard'
  | 'Crypto'
  | 'Document'
  | 'Download'
  | 'IndexedDB'
  | 'MonotonicClock'
  | 'Navigation'
  | 'Window'

export class BrowserCapabilityUnavailableError extends Error {
  readonly capability: BrowserCapabilityName

  constructor(capability: BrowserCapabilityName) {
    super(
      `Browser capability ${capability} is unavailable in this environment.`,
    )
    this.name = 'BrowserCapabilityUnavailableError'
    this.capability = capability
  }
}

export function requireBrowserCapability<T>(
  capability: BrowserCapabilityName,
  value: T | null | undefined,
): T {
  if (value === null || value === undefined) {
    throw new BrowserCapabilityUnavailableError(capability)
  }
  return value
}
