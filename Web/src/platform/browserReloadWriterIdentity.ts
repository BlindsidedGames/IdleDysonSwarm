import { requireBrowserCapability } from './browserEnvironment'

const WRITER_TAB_TOKEN_KEY =
  'idle-dyson-swarm:writer-tab-token'

export type BrowserNavigationType =
  | 'navigate'
  | 'reload'
  | 'back_forward'
  | 'prerender'

export interface BrowserReloadWriterIdentity {
  readonly ownerToken: string
  readonly allowUnexpiredSameOwnerTakeover: boolean
}

export interface BrowserReloadWriterIdentityOptions {
  readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
  readonly navigationType?: BrowserNavigationType
  readonly ownerTokenFactory?: () => string
}

/**
 * Gives a reloaded document the previous document's tab-scoped writer token.
 *
 * Every non-reload navigation replaces the token. That prevents a duplicated
 * tab, which may inherit sessionStorage, from claiming to be the original tab.
 * When storage or navigation inspection is unavailable, the caller receives a
 * fresh token and normal lease-expiry behavior remains in force.
 */
export function createBrowserReloadWriterIdentity(
  options: Readonly<BrowserReloadWriterIdentityOptions> = {},
): BrowserReloadWriterIdentity {
  const storage = options.storage ?? browserSessionStorage()
  const navigationType =
    options.navigationType ?? browserNavigationType()
  const previousToken = readToken(storage)
  if (
    navigationType === 'reload' &&
    previousToken !== undefined
  ) {
    return Object.freeze({
      ownerToken: previousToken,
      allowUnexpiredSameOwnerTakeover: true,
    })
  }

  const ownerToken = (
    options.ownerTokenFactory ?? defaultOwnerTokenFactory
  )()
  writeToken(storage, ownerToken)
  return Object.freeze({
    ownerToken,
    allowUnexpiredSameOwnerTakeover: false,
  })
}

function browserSessionStorage():
  | Pick<Storage, 'getItem' | 'setItem'>
  | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

function browserNavigationType(): BrowserNavigationType | undefined {
  try {
    const entry = globalThis.performance
      ?.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    return entry?.type
  } catch {
    return undefined
  }
}

function readToken(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
): string | undefined {
  try {
    const token = storage?.getItem(WRITER_TAB_TOKEN_KEY)?.trim()
    return token === undefined || token.length === 0
      ? undefined
      : token
  } catch {
    return undefined
  }
}

function writeToken(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
  ownerToken: string,
): void {
  try {
    storage?.setItem(WRITER_TAB_TOKEN_KEY, ownerToken)
  } catch {
    // Storage denial keeps the ordinary expiry-based lease behavior.
  }
}

function defaultOwnerTokenFactory(): string {
  const browserCrypto = requireBrowserCapability(
    'Crypto',
    globalThis.crypto,
  )
  if (typeof browserCrypto.randomUUID === 'function') {
    return browserCrypto.randomUUID()
  }
  const random = new Uint8Array(16)
  browserCrypto.getRandomValues(random)
  return [...random]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
