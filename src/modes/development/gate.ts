export function developmentModesAllowed(developmentBuild: boolean, enabled: string | undefined, hostname: string, nativeBridgePresent: boolean): boolean {
  return developmentBuild && enabled === '1' && (hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]') && !nativeBridgePresent
}
