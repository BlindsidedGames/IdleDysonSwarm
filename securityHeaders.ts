export const HTML_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://www.blindsidedgames.com/promotions/",
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

// Only the owned mode document is embedded, and only by this origin.
export const MODE_FRAME_SECURITY_HEADERS = Object.freeze({
  ...SECURITY_HEADERS,
  'Content-Security-Policy': `${HTML_CONTENT_SECURITY_POLICY}; frame-ancestors 'self'`,
  'X-Frame-Options': 'SAMEORIGIN',
})

/**
 * Emits the conventional static-host header file copied into the production
 * Vite output. The hosting layer remains responsible for honoring this file.
 */
export function renderStaticSecurityHeaders(
  routePattern = '/*',
): string {
  const lines = Object.entries(SECURITY_HEADERS).map(
    ([name, value]) => `  ${name}: ${value}`,
  )
  const frameRoute = `${routePattern.slice(0, -1)}mode.html`
  return [routePattern, ...lines, '', frameRoute,
    '  ! Content-Security-Policy', '  ! X-Frame-Options',
    `  Content-Security-Policy: ${MODE_FRAME_SECURITY_HEADERS['Content-Security-Policy']}`,
    '  X-Frame-Options: SAMEORIGIN', ''].join('\n')
}
