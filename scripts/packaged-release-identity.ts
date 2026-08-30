import {
  resolveNativeReleaseMetadata,
  type NativeReleaseSource,
} from './sync-native-release.js'

export interface PackagedReleaseIdentity {
  readonly marketingVersion: string
  readonly releaseCandidateId: string
}

/**
 * Resolves the identity compiled into the renderer as its native metadata
 * fallback. Website and development builds keep the checked-in identity;
 * native packages embed the same validated override used by host metadata.
 */
export function resolvePackagedReleaseIdentity(
  source: NativeReleaseSource,
  mode: string,
  requestedReleaseCandidateId?: string,
): Readonly<PackagedReleaseIdentity> {
  const metadata = resolveNativeReleaseMetadata(
    source,
    mode === 'native' ? requestedReleaseCandidateId : undefined,
  )
  return Object.freeze({
    marketingVersion: metadata.marketingVersion,
    releaseCandidateId: metadata.releaseCandidateId,
  })
}
