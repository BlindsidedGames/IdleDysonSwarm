import { requireBrowserCapability } from './browserEnvironment'

export function createBrowserOwnerToken(): string {
  return createBrowserRandomToken(16)
}

export function createBrowserRandomToken(
  fallbackByteLength: 12 | 16,
): string {
  const browserCrypto = requireBrowserCapability(
    'Crypto',
    globalThis.crypto,
  )
  if (typeof browserCrypto.randomUUID === 'function') {
    return browserCrypto.randomUUID()
  }
  const random = new Uint8Array(fallbackByteLength)
  browserCrypto.getRandomValues(random)
  return [...random]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
