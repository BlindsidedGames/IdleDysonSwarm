/**
 * Purchase evidence that is trusted only because it was read from the same
 * device's original Unity save during automatic first-launch migration.
 *
 * This is deliberately not a portable save claim. Manual/shared imports never
 * receive this capability and therefore cannot promote Store ownership.
 */
export type AutomaticUnityPlatform =
  | 'android'
  | 'ios'
  | 'windows'
  | 'macos'
  | 'linux'

export type AutomaticUnityPathClass =
  | 'capacitor-external-files'
  | 'capacitor-documents'
  | 'unity-local-low'
  | 'unity-application-support-editor'
  | 'unity-application-support-player'
  | 'unity-xdg-config'

export interface AutomaticSameDeviceUnityCandidateProvenance {
  readonly kind: 'automatic-same-device-unity'
  readonly platform: AutomaticUnityPlatform
  readonly sourceClass: 'unity-persistent-data-save'
  readonly opaqueSourceIdentifier: string
  readonly pathClass: AutomaticUnityPathClass
}

export interface BrowserRetainedImportCandidateProvenance {
  readonly kind: 'browser-retained-import'
}

export type LegacyCandidateProvenance =
  | AutomaticSameDeviceUnityCandidateProvenance
  | BrowserRetainedImportCandidateProvenance

export interface LegacyCandidateTrustInput {
  readonly id: string
  readonly sourcePath: string
  readonly provenance?: Readonly<LegacyCandidateProvenance>
}

/**
 * A provenance label is not sufficient by itself. The opaque native identity,
 * repository candidate identity, and read-only bridge path must all agree.
 */
export function isVerifiedAutomaticSameDeviceUnityCandidate(
  candidate: Readonly<LegacyCandidateTrustInput>,
): candidate is Readonly<LegacyCandidateTrustInput> & {
  readonly provenance: Readonly<AutomaticSameDeviceUnityCandidateProvenance>
} {
  const provenance = candidate.provenance
  return provenance?.kind === 'automatic-same-device-unity' &&
    candidate.id === provenance.opaqueSourceIdentifier &&
    candidate.sourcePath ===
      `unity-readonly:${provenance.opaqueSourceIdentifier}`
}

export interface AutomaticUnityPurchaseEvidence
  extends AutomaticSameDeviceUnityCandidateProvenance {
  readonly permanentDoubleInfinityPoints: boolean
  readonly contentSha256: string
  readonly saveSchemaVersion: number
}

export interface AutomaticUnityPurchaseEvidencePromoter {
  promoteAutomaticUnityPurchaseEvidence(
    evidence: Readonly<AutomaticUnityPurchaseEvidence>,
  ): Promise<void>
}

export async function sha256Utf8(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    throw new Error(
      'Automatic Unity purchase promotion requires SHA-256 support.',
    )
  }
  const digest = await subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
