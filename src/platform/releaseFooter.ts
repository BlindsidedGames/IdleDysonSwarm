import type { RuntimeTarget } from './contracts'
import type { PlatformMetadataSource } from './releaseFoundation'

export type ReleaseFooterPlatform =
  | 'iOS'
  | 'Android'
  | 'Steam'
  | 'Desktop'
  | 'Website'
  | 'Dev'

export const DESKTOP_DISTRIBUTIONS = Object.freeze([
  'desktop',
  'steam',
] as const)

export type DesktopDistribution =
  (typeof DESKTOP_DISTRIBUTIONS)[number]

export interface ReleaseFooterPresentation {
  readonly platform: ReleaseFooterPlatform
  readonly version: string
  readonly build: string
}

export interface ReleaseFooterSourceIdentity {
  readonly marketingVersion: string
  readonly releaseCandidateId: string
}

export interface ResolveReleaseFooterOptions {
  readonly target: RuntimeTarget
  readonly developmentBuild: boolean
  readonly source: Readonly<ReleaseFooterSourceIdentity>
  readonly metadata?: PlatformMetadataSource
  readonly desktopDistribution?: DesktopDistribution
}

export function desktopDistributionFromBuildValue(
  value: unknown,
): DesktopDistribution {
  if (value === undefined || value === '') return 'desktop'
  if (value === 'desktop' || value === 'steam') return value
  throw new Error('Desktop distribution must be desktop or steam.')
}

/**
 * Resolves a compact player-visible host identity. Native package metadata wins
 * so CI release overrides and installed package values cannot drift from the
 * footer; checked-in release identity supplies the Website and safe fallback.
 */
export async function resolveReleaseFooter(
  options: Readonly<ResolveReleaseFooterOptions>,
): Promise<Readonly<ReleaseFooterPresentation>> {
  if (options.target === 'browser') {
    return Object.freeze({
      platform: options.developmentBuild ? 'Dev' : 'Website',
      version: options.source.marketingVersion,
      build: options.developmentBuild
        ? 'local'
        : options.source.releaseCandidateId,
    })
  }

  if (options.target === 'electron' && options.developmentBuild) {
    return Object.freeze({
      platform: 'Dev',
      version: options.source.marketingVersion,
      build: 'local',
    })
  }

  let version = options.source.marketingVersion
  let build = fallbackNativeBuild(options.target, options.source)
  try {
    const metadata = await options.metadata?.metadata()
    if (metadata !== undefined) {
      version = metadata.applicationVersion
      build = metadata.applicationBuild ?? build
    }
  } catch {
    // Optional footer metadata must not prevent startup. The checked-in
    // identity remains a deterministic fallback for local packages.
  }

  return Object.freeze({
    platform: platformForTarget(
      options.target,
      options.desktopDistribution,
    ),
    version,
    build,
  })
}

function platformForTarget(
  target: Exclude<RuntimeTarget, 'browser'>,
  desktopDistribution?: DesktopDistribution,
): Extract<
  ReleaseFooterPlatform,
  'iOS' | 'Android' | 'Steam' | 'Desktop'
> {
  switch (target) {
    case 'ios':
      return 'iOS'
    case 'android':
      return 'Android'
    case 'electron':
      return desktopDistribution === 'steam' ? 'Steam' : 'Desktop'
  }
}

function fallbackNativeBuild(
  target: Exclude<RuntimeTarget, 'browser'>,
  source: Readonly<ReleaseFooterSourceIdentity>,
): string {
  return target === 'ios'
    ? appleBuildNumber(source.releaseCandidateId)
    : source.releaseCandidateId
}

function appleBuildNumber(releaseCandidateId: string): string {
  if (!/^\d{10}$/.test(releaseCandidateId)) return releaseCandidateId
  return `${releaseCandidateId.slice(2, 6)}.${releaseCandidateId.slice(6, 8)}.${releaseCandidateId.slice(8, 10)}`
}
