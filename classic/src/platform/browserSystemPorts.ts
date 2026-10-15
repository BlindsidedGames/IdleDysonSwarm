import type {
  ClipboardAdapter,
  ExternalNavigationAdapter,
} from './contracts'
import { requireBrowserCapability } from './browserEnvironment'

export interface ClipboardPort {
  readText(): Promise<string>
  writeText(value: string): Promise<void>
}

export class BrowserClipboardAdapter implements ClipboardAdapter {
  private readonly clipboard: ClipboardPort

  constructor(clipboard?: ClipboardPort) {
    this.clipboard =
      clipboard ??
      requireBrowserCapability(
        'Clipboard',
        globalThis.navigator?.clipboard,
      )
  }

  readText(): Promise<string> {
    return this.clipboard.readText()
  }

  writeText(value: string): Promise<void> {
    return this.clipboard.writeText(value)
  }
}

export type ExternalWindowOpener = (
  url: string,
  target: '_blank',
  features: 'noopener,noreferrer',
) => void

export class BrowserExternalNavigationAdapter
  implements ExternalNavigationAdapter
{
  private readonly allowedOrigins: ReadonlySet<string>
  private readonly opener: ExternalWindowOpener

  constructor(
    allowedOrigins: readonly string[],
    opener?: ExternalWindowOpener,
  ) {
    this.allowedOrigins = new Set(
      allowedOrigins.map(normalizeAllowedOrigin),
    )
    this.opener = opener ?? defaultExternalWindowOpener
  }

  async openUrl(url: string): Promise<void> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error('External link is not a valid absolute URL.')
    }
    if (
      parsed.protocol !== 'https:' ||
      !this.allowedOrigins.has(parsed.origin) ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) {
      throw new Error(
        `External link origin ${parsed.origin} is not approved.`,
      )
    }
    this.opener(parsed.href, '_blank', 'noopener,noreferrer')
  }
}

function defaultExternalWindowOpener(
  url: string,
  target: '_blank',
  features: 'noopener,noreferrer',
): void {
  requireBrowserCapability(
    'Navigation',
    globalThis.window,
  ).open(url, target, features)
}

function normalizeAllowedOrigin(value: string): string {
  const parsed = new URL(value)
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin === 'null'
  ) {
    throw new Error(
      'External navigation allowlist entries must be HTTPS origins.',
    )
  }
  return parsed.origin
}
