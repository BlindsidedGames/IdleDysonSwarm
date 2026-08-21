import type { LegacySaveCandidate } from '../save/repository'
import type {
  AutomaticSameDeviceUnityCandidateProvenance,
  AutomaticUnityPathClass,
  AutomaticUnityPlatform,
} from '../save/automaticPurchaseEvidence'
import type { NativeMigrationSource } from './platformSaveStorage'

export const UNITY_APPLICATION_ID =
  'com.blindsidedgames.idledysonswarm' as const
export const UNITY_COMPANY_NAME = 'BlindsidedGames'
export const UNITY_PRODUCT_NAME = 'Idle Dyson Swarm'
export const UNITY_SAVE_FILE_NAME = 'idle_dyson_swarm_save.txt'

export type CapacitorFilesystemDirectory =
  | 'data'
  | 'documents'
  | 'external'

export interface CapacitorReadOnlyLocation {
  readonly kind: 'capacitor'
  readonly platform: 'android' | 'ios'
  readonly directory: CapacitorFilesystemDirectory
  readonly path: string
}

export interface ElectronReadOnlyLocation {
  readonly kind: 'electron'
  readonly platform: 'win32' | 'darwin' | 'linux'
  readonly absolutePath: string
}

export interface ReadOnlyNativeFileProbe<Location> {
  /** Returns null when the candidate does not exist. No mutation is exposed. */
  readTextIfExists(location: Readonly<Location>): Promise<string | null>
}

export interface DesktopPathEnvironment {
  readonly platform: 'win32' | 'darwin' | 'linux'
  readonly homeDirectory: string
  readonly xdgConfigHome?: string
}

export function createCapacitorNativeMigrationSource(
  platform: 'android' | 'ios',
  probe: ReadOnlyNativeFileProbe<CapacitorReadOnlyLocation>,
): NativeMigrationSource {
  const location: CapacitorReadOnlyLocation = Object.freeze({
    kind: 'capacitor',
    platform,
    // Unity uses the retained external-files container on Android and the
    // retained Documents container on iOS. The new Web save uses Data instead.
    directory: platform === 'android' ? 'external' : 'documents',
    path: UNITY_SAVE_FILE_NAME,
  })
  return new ProbingNativeMigrationSource(
    [{
      id: `${platform}-retained-container`,
      displayName: `Unity ${platform.toUpperCase()} save`,
      location,
      provenance: automaticUnityProvenance(
        platform,
        `${platform}-retained-container`,
        platform === 'android'
          ? 'capacitor-external-files'
          : 'capacitor-documents',
      ),
    }],
    probe,
  )
}

export function createElectronNativeMigrationSource(
  environment: Readonly<DesktopPathEnvironment>,
  probe: ReadOnlyNativeFileProbe<ElectronReadOnlyLocation>,
): NativeMigrationSource {
  return new ProbingNativeMigrationSource(
    desktopUnityLocations(environment).map((location, index) => {
      const id = `${environment.platform}-${index + 1}`
      return {
        id,
        displayName: `Unity ${desktopPlatformName(environment.platform)} save`,
        location,
        provenance: automaticUnityProvenance(
          desktopAuditPlatform(environment.platform),
          id,
          desktopPathClass(environment.platform, index),
        ),
      }
    }),
    probe,
    environment.platform === 'darwin',
  )
}

export function desktopUnityLocations(
  environment: Readonly<DesktopPathEnvironment>,
): readonly ElectronReadOnlyLocation[] {
  const { platform, homeDirectory } = environment
  if (homeDirectory.trim() === '') {
    throw new Error('Desktop Unity discovery requires a home directory.')
  }
  if (platform === 'win32') {
    return Object.freeze([Object.freeze({
      kind: 'electron' as const,
      platform,
      absolutePath: joinPath(
        '\\',
        homeDirectory,
        'AppData',
        'LocalLow',
        UNITY_COMPANY_NAME,
        UNITY_PRODUCT_NAME,
        UNITY_SAVE_FILE_NAME,
      ),
    })])
  }
  if (platform === 'darwin') {
    return Object.freeze([
      Object.freeze({
        kind: 'electron' as const,
        platform,
        absolutePath: joinPath(
          '/',
          homeDirectory,
          'Library',
          'Application Support',
          UNITY_COMPANY_NAME,
          UNITY_PRODUCT_NAME,
          UNITY_SAVE_FILE_NAME,
        ),
      }),
      Object.freeze({
        kind: 'electron' as const,
        platform,
        absolutePath: joinPath(
          '/',
          homeDirectory,
          'Library',
          'Application Support',
          `unity.${UNITY_COMPANY_NAME}.${UNITY_PRODUCT_NAME}`,
          UNITY_SAVE_FILE_NAME,
        ),
      }),
    ])
  }

  const roots = [
    environment.xdgConfigHome,
    joinPath('/', homeDirectory, '.config'),
  ].filter((value): value is string =>
    value !== undefined && value.trim() !== '',
  )
  return Object.freeze(
    [...new Set(roots)].map((root) => Object.freeze({
      kind: 'electron' as const,
      platform,
      absolutePath: joinPath(
        '/',
        root,
        'unity3d',
        UNITY_COMPANY_NAME,
        UNITY_PRODUCT_NAME,
        UNITY_SAVE_FILE_NAME,
      ),
    })),
  )
}

interface MigrationProbeDefinition<Location> {
  readonly id: string
  readonly displayName: string
  readonly location: Readonly<Location>
  readonly provenance: Readonly<AutomaticSameDeviceUnityCandidateProvenance>
}

class ProbingNativeMigrationSource<Location>
  implements NativeMigrationSource
{
  private readonly definitions:
    readonly MigrationProbeDefinition<Location>[]
  private readonly probe: ReadOnlyNativeFileProbe<Location>
  private readonly firstExistingOnly: boolean

  constructor(
    definitions: readonly MigrationProbeDefinition<Location>[],
    probe: ReadOnlyNativeFileProbe<Location>,
    firstExistingOnly = false,
  ) {
    this.definitions = definitions
    this.probe = probe
    this.firstExistingOnly = firstExistingOnly
  }

  async discoverCandidates(): Promise<readonly LegacySaveCandidate[]> {
    const candidates: LegacySaveCandidate[] = []
    for (const definition of this.definitions) {
      const text = await this.probe.readTextIfExists(definition.location)
      if (text === null) continue
      candidates.push(Object.freeze({
        id: definition.id,
        sourcePath: `unity-readonly:${definition.id}`,
        text,
        provenance: definition.provenance,
      }))
      if (this.firstExistingOnly) break
    }
    return Object.freeze(candidates)
  }
}

function automaticUnityProvenance(
  platform: AutomaticUnityPlatform,
  opaqueSourceIdentifier: string,
  pathClass: AutomaticUnityPathClass,
): Readonly<AutomaticSameDeviceUnityCandidateProvenance> {
  return Object.freeze({
    kind: 'automatic-same-device-unity' as const,
    platform,
    sourceClass: 'unity-persistent-data-save' as const,
    opaqueSourceIdentifier,
    pathClass,
  })
}

function desktopAuditPlatform(
  platform: DesktopPathEnvironment['platform'],
): AutomaticUnityPlatform {
  if (platform === 'win32') return 'windows'
  if (platform === 'darwin') return 'macos'
  return 'linux'
}

function desktopPathClass(
  platform: DesktopPathEnvironment['platform'],
  index: number,
): AutomaticUnityPathClass {
  if (platform === 'win32') return 'unity-local-low'
  if (platform === 'darwin') {
    return index === 0
      ? 'unity-application-support-editor'
      : 'unity-application-support-player'
  }
  return 'unity-xdg-config'
}

function joinPath(separator: '\\' | '/', ...parts: string[]): string {
  if (separator === '/') {
    const [first = '', ...rest] = parts
    return [first.replace(/\/+$/g, ''), ...rest.map(trimPathPart)]
      .filter((part, index) => part !== '' || index === 0)
      .join('/')
  }
  return parts
    .map((part, index) =>
      index === 0
        ? part.replace(/[\\/]+$/g, '')
        : part.replace(/[\\/]+/g, '\\').replace(/^\\|\\$/g, ''),
    )
    .join('\\')
}

function trimPathPart(part: string): string {
  return part.replace(/^\/+|\/+$/g, '')
}

function desktopPlatformName(
  platform: DesktopPathEnvironment['platform'],
): string {
  switch (platform) {
    case 'win32':
      return 'Windows'
    case 'darwin':
      return 'macOS'
    case 'linux':
      return 'Linux'
  }
}
