export const HTML_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

export const CONTENT_SECURITY_POLICY = [
  HTML_CONTENT_SECURITY_POLICY,
  "frame-ancestors 'none'",
].join('; ')

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), publickey-credentials-create=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
})

/**
 * Emits the conventional static-host header file copied into the production
 * Vite output. The hosting layer remains responsible for honoring this file.
 */
export function renderStaticSecurityHeaders(): string {
  const lines = Object.entries(SECURITY_HEADERS).map(
    ([name, value]) => `  ${name}: ${value}`,
  )
  return ['/*', ...lines, ''].join('\n')
}
