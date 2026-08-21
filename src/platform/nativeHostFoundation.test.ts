import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { IndexedDbSaveStorageAdapter } from './indexedDbSaveStorage'
import {
  createCapacitorNativeMigrationSource,
  createElectronNativeMigrationSource,
  desktopUnityLocations,
  UNITY_APPLICATION_ID,
  UNITY_SAVE_FILE_NAME,
  type CapacitorReadOnlyLocation,
  type ElectronReadOnlyLocation,
  type ReadOnlyNativeFileProbe,
} from './nativeMigration'
import {
  NativeDiagnosticsExporter,
  NativeLifecycleAdapter,
  NativePlatformMetadataSource,
  NativeShareAdapter,
} from './nativeSystemPorts'
import {
  BrowserPlatformSaveStorageAdapter,
  CapacitorPlatformSaveStorageAdapter,
  ElectronPlatformSaveStorageAdapter,
  NATIVE_WEB_SAVE_PATHS,
  NATIVE_WEB_SAVE_ROOT,
  type NativeMigrationSource,
  type RootedNativeFileBridge,
} from './platformSaveStorage'

describe('native host save foundation', () => {
  test('keeps browser and native Web-save locations separate from Unity', () => {
    expect(BrowserPlatformSaveStorageAdapter).toBe(
      IndexedDbSaveStorageAdapter,
    )
    expect(NATIVE_WEB_SAVE_ROOT).toBe('web-runtime-v1')
    expect(NATIVE_WEB_SAVE_PATHS.current).toBe(
      'save/idle_dyson_swarm_web_save.idsw',
    )
    expect(NATIVE_WEB_SAVE_PATHS.temporary).not.toBe(
      NATIVE_WEB_SAVE_PATHS.current,
    )
    expect(NATIVE_WEB_SAVE_PATHS.legacyRecovery).not.toContain(
      UNITY_SAVE_FILE_NAME,
    )
    expect(new Set(NATIVE_WEB_SAVE_PATHS.backups)).toHaveLength(3)
    for (const path of [
      NATIVE_WEB_SAVE_PATHS.current,
      NATIVE_WEB_SAVE_PATHS.temporary,
      NATIVE_WEB_SAVE_PATHS.legacyRecovery,
      ...NATIVE_WEB_SAVE_PATHS.backups,
    ]) {
      expect(path.startsWith('/')).toBe(false)
      expect(path).not.toContain('..')
    }
  })

  test.each([
    {
      name: 'Capacitor',
      create: (
        files: RootedNativeFileBridge,
        migration: NativeMigrationSource,
      ) => new CapacitorPlatformSaveStorageAdapter(files, migration),
    },
    {
      name: 'Electron',
      create: (
        files: RootedNativeFileBridge,
        migration: NativeMigrationSource,
      ) => new ElectronPlatformSaveStorageAdapter(files, migration),
    },
  ])('$name storage confines writes and retains a read-only Unity copy', async ({ create }) => {
    const files = new MemoryRootedFileBridge()
    const migration: NativeMigrationSource = {
      discoverCandidates: async () => Object.freeze([Object.freeze({
        id: 'retained-unity',
        sourcePath: 'unity-readonly:retained-unity',
        text: 'idb1:original',
        provenance: {
          kind: 'automatic-same-device-unity',
          platform: 'windows',
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: 'retained-unity',
          pathClass: 'unity-local-low',
        },
      })]),
    }
    const storage = create(files, migration)

    const candidates = await storage.discoverLegacyCandidates()
    await storage.copy(
      candidates[0]!.sourcePath,
      NATIVE_WEB_SAVE_PATHS.legacyRecovery,
    )
    await storage.writeText(
      NATIVE_WEB_SAVE_PATHS.temporary,
      'IDSWEB1:verified',
    )
    await storage.replaceAtomically(
      NATIVE_WEB_SAVE_PATHS.temporary,
      NATIVE_WEB_SAVE_PATHS.current,
    )

    expect(files.files.get(NATIVE_WEB_SAVE_PATHS.legacyRecovery)).toBe(
      'idb1:original',
    )
    expect(files.files.get(NATIVE_WEB_SAVE_PATHS.current)).toBe(
      'IDSWEB1:verified',
    )
    expect(files.mutations).toEqual(expect.arrayContaining([
      NATIVE_WEB_SAVE_PATHS.legacyRecovery,
      NATIVE_WEB_SAVE_PATHS.temporary,
      NATIVE_WEB_SAVE_PATHS.current,
    ]))
    expect(files.mutations).not.toContain(UNITY_SAVE_FILE_NAME)
    expect(() =>
      storage.writeText('../idle_dyson_swarm_save.txt', 'overwrite'),
    ).toThrow('application-owned root')
    expect(() =>
      storage.replaceAtomically(
        NATIVE_WEB_SAVE_PATHS.temporary,
        'C:\\Unity\\idle_dyson_swarm_save.txt',
      ),
    ).toThrow('application-owned root')
  })

  test('rejects migration handles that could be treated as writable paths', async () => {
    const files = new MemoryRootedFileBridge()
    const unsafeMigration: NativeMigrationSource = {
      discoverCandidates: async () => [{
        id: 'unsafe',
        sourcePath: '../idle_dyson_swarm_save.txt',
        text: 'IDB1:original',
      }],
    }

    await expect(new ElectronPlatformSaveStorageAdapter(
      files,
      unsafeMigration,
    ).discoverLegacyCandidates()).rejects.toThrow('opaque read-only')
    expect(files.mutations).toEqual([])
  })

  test('probes retained Android and iOS containers read-only', async () => {
    const locations: CapacitorReadOnlyLocation[] = []
    const probe: ReadOnlyNativeFileProbe<CapacitorReadOnlyLocation> = {
      readTextIfExists: async (location) => {
        locations.push(location)
        return `IDB1:${location.platform}`
      },
    }

    await expect(
      createCapacitorNativeMigrationSource(
        'android',
        probe,
      ).discoverCandidates(),
    ).resolves.toEqual([expect.objectContaining({
      sourcePath: 'unity-readonly:android-retained-container',
      text: 'IDB1:android',
      provenance: {
        kind: 'automatic-same-device-unity',
        platform: 'android',
        sourceClass: 'unity-persistent-data-save',
        opaqueSourceIdentifier: 'android-retained-container',
        pathClass: 'capacitor-external-files',
      },
    })])
    await createCapacitorNativeMigrationSource(
      'ios',
      probe,
    ).discoverCandidates()

    expect(locations).toEqual([
      {
        kind: 'capacitor',
        platform: 'android',
        directory: 'external',
        path: UNITY_SAVE_FILE_NAME,
      },
      {
        kind: 'capacitor',
        platform: 'ios',
        directory: 'documents',
        path: UNITY_SAVE_FILE_NAME,
      },
    ])
  })

  test('uses the canonical desktop Unity persistent-data locations', async () => {
    expect(desktopUnityLocations({
      platform: 'win32',
      homeDirectory: 'C:\\Users\\player',
    })).toEqual([expect.objectContaining({
      absolutePath:
        'C:\\Users\\player\\AppData\\LocalLow\\BlindsidedGames\\Idle Dyson Swarm\\idle_dyson_swarm_save.txt',
    })])
    expect(desktopUnityLocations({
      platform: 'darwin',
      homeDirectory: '/Users/player',
    }).map((location) => location.absolutePath)).toEqual([
      '/Users/player/Library/Application Support/BlindsidedGames/Idle Dyson Swarm/idle_dyson_swarm_save.txt',
      '/Users/player/Library/Application Support/unity.BlindsidedGames.Idle Dyson Swarm/idle_dyson_swarm_save.txt',
    ])
    expect(desktopUnityLocations({
      platform: 'linux',
      homeDirectory: '/home/player',
      xdgConfigHome: '/state/config',
    }).map((location) => location.absolutePath)).toEqual([
      '/state/config/unity3d/BlindsidedGames/Idle Dyson Swarm/idle_dyson_swarm_save.txt',
      '/home/player/.config/unity3d/BlindsidedGames/Idle Dyson Swarm/idle_dyson_swarm_save.txt',
    ])

    const readTextIfExists = vi.fn(
      async (_location: Readonly<ElectronReadOnlyLocation>) => null,
    )
    await expect(createElectronNativeMigrationSource(
      {
        platform: 'linux',
        homeDirectory: '/home/player',
      },
      { readTextIfExists },
    ).discoverCandidates()).resolves.toEqual([])
    expect(readTextIfExists).toHaveBeenCalledTimes(1)
  })

  test('prefers an existing macOS Editor path before probing the Player fallback', async () => {
    const editorPath =
      '/Users/player/Library/Application Support/BlindsidedGames/Idle Dyson Swarm/idle_dyson_swarm_save.txt'
    const playerPath =
      '/Users/player/Library/Application Support/unity.BlindsidedGames.Idle Dyson Swarm/idle_dyson_swarm_save.txt'
    const readTextIfExists = vi.fn(
      async (location: Readonly<ElectronReadOnlyLocation>) =>
        location.absolutePath === editorPath ? 'IDB1:editor' : 'IDB1:player',
    )

    await expect(createElectronNativeMigrationSource(
      { platform: 'darwin', homeDirectory: '/Users/player' },
      { readTextIfExists },
    ).discoverCandidates()).resolves.toEqual([
      expect.objectContaining({ text: 'IDB1:editor' }),
    ])
    expect(readTextIfExists).toHaveBeenCalledTimes(1)
    expect(readTextIfExists).not.toHaveBeenCalledWith(
      expect.objectContaining({ absolutePath: playerPath }),
    )

    readTextIfExists.mockResolvedValueOnce(null)
    readTextIfExists.mockResolvedValueOnce('IDB1:player')
    await expect(createElectronNativeMigrationSource(
      { platform: 'darwin', homeDirectory: '/Users/player' },
      { readTextIfExists },
    ).discoverCandidates()).resolves.toEqual([
      expect.objectContaining({ text: 'IDB1:player' }),
    ])
    expect(readTextIfExists).toHaveBeenLastCalledWith(
      expect.objectContaining({ absolutePath: playerPath }),
    )
  })
})

describe('native host system-port boundaries', () => {
  test('pins host skeletons to the retained identity and safe renderer posture', () => {
    const capacitor = JSON.parse(readFileSync(new URL(
      '../../hosts/capacitor/capacitor.config.json',
      import.meta.url,
    ), 'utf8')) as Record<string, unknown>
    const electron = JSON.parse(readFileSync(new URL(
      '../../hosts/electron/host.config.json',
      import.meta.url,
    ), 'utf8')) as {
      appId: string
      webSaveRoot: string
      browserWindow: Record<string, boolean>
      signingConfigured: boolean
    }

    expect(capacitor).toMatchObject({
      appId: UNITY_APPLICATION_ID,
      webDir: '../../dist-native',
      zoomEnabled: false,
      server: { cleartext: false },
      android: { allowMixedContent: false },
    })
    expect(electron).toMatchObject({
      appId: UNITY_APPLICATION_ID,
      webSaveRoot: NATIVE_WEB_SAVE_ROOT,
      browserWindow: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
      rendererFilesystemAccess: 'rooted-preload-bridge-only',
      signingConfigured: false,
    })
  })

  test('preserves lifecycle, share, diagnostics, and fixed app identity seams', async () => {
    const lifecycleListener = vi.fn()
    const lifecycle = new NativeLifecycleAdapter({
      currentPhase: () => 'background',
      subscribe: (listener) => {
        listener('active')
        return () => undefined
      },
    })
    expect(lifecycle.currentPhase()).toBe('background')
    lifecycle.subscribe(lifecycleListener)
    expect(lifecycleListener).toHaveBeenCalledWith('active')

    const share = vi.fn(async () => ({ shared: true as const }))
    await expect(new NativeShareAdapter({ share }).share({
      title: 'Idle Dyson Swarm save',
      text: 'IDSWEB1:share',
      fileName: 'idle-dyson-swarm.idsw',
      mimeType: 'text/plain',
    })).resolves.toEqual({ shared: true })
    expect(() => new NativeShareAdapter({ share }).share({
      title: 'Idle Dyson Swarm save',
      text: 'IDSWEB1:share',
      fileName: '../idle-dyson-swarm.idsw',
      mimeType: 'text/plain',
    })).toThrow('safe .idsw base file name')
    expect(() => new NativeShareAdapter({ share }).share({
      title: 'Idle Dyson Swarm save',
      text: 'IDSWEB1:share',
      fileName: 'idle-dyson-swarm.txt',
      mimeType: 'text/plain',
    })).toThrow('safe .idsw base file name')
    expect(() => new NativeShareAdapter({ share }).share({
      title: 'Idle Dyson Swarm save',
      text: 'IDSWEB1:share',
      fileName: 'idle-dyson-swarm.idsw',
      mimeType: 'application/json',
    } as never)).toThrow('approved MIME type')
    expect(() => new NativeShareAdapter({ share }).share({
      title: 'Idle Dyson Swarm save',
      text: 'IDSWEB1:share',
    } as never)).toThrow('both a file name and an approved MIME type')
    expect(share).toHaveBeenCalledTimes(1)

    const exportText = vi.fn(async () => ({ exported: true as const }))
    await expect(new NativeDiagnosticsExporter({ exportText }).export({
      fileName: 'idle-dyson-diagnostics.json',
      payload: {
        phase: 'error',
        code: 'startup-failed',
        buildId: 'C:\\Users\\player\\save.idsw',
        hostKind: 'desktop-native',
        locale: 'en-AU',
        saveSchemaVersion: 11,
        errorKind: 'TypeError',
        save: 'IDSWEB1:secret-save',
        path: '/Users/player/private',
        rawError: 'credential=secret',
      } as never,
    })).resolves.toEqual({ exported: true })
    expect(exportText).toHaveBeenCalledWith({
      fileName: 'idle-dyson-diagnostics.json',
      mimeType: 'application/json',
      text: JSON.stringify({
        phase: 'error',
        code: 'startup-failed',
        buildId: '[redacted]',
        hostKind: 'desktop-native',
        locale: 'en-AU',
        saveSchemaVersion: 11,
        errorKind: 'TypeError',
      }, null, 2),
    })
    const exportedText = exportText.mock.calls[0]?.[0].text ?? ''
    expect(exportedText).not.toContain('IDSWEB1')
    expect(exportedText).not.toContain('/Users/player')
    expect(exportedText).not.toContain('credential=secret')
    expect(() => new NativeDiagnosticsExporter({ exportText }).export({
      fileName: '../save.json',
      payload: { phase: 'error', code: 'startup-failed' },
    })).toThrow('safe JSON file name')
    expect(exportText).toHaveBeenCalledTimes(1)

    await new NativeDiagnosticsExporter({ exportText }).export({
      fileName: 'forged-host.json',
      payload: {
        phase: 'idle',
        code: 'none',
        hostKind: 'electron-with-filesystem-access',
      } as never,
    })
    expect(exportText).toHaveBeenLastCalledWith(expect.objectContaining({
      text: JSON.stringify({
        phase: 'idle',
        code: 'none',
        hostKind: '[redacted]',
      }, null, 2),
    }))

    await expect(new NativePlatformMetadataSource(
      'desktop-native',
      {
        metadata: async () => ({
          applicationVersion: '4.0.0',
          buildNumber: '2026080201',
        }),
      },
    ).metadata()).resolves.toEqual({
      hostKind: 'desktop-native',
      applicationId: UNITY_APPLICATION_ID,
      applicationVersion: '4.0.0',
      applicationBuild: '2026080201',
      supportsNativeFilesystemMigration: true,
    })
  })
})

class MemoryRootedFileBridge implements RootedNativeFileBridge {
  readonly files = new Map<string, string>()
  readonly mutations: string[] = []

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    this.mutations.push(path)
    this.files.set(path, contents)
  }

  async replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    const contents = await this.readText(temporaryPath)
    this.mutations.push(destinationPath)
    this.files.set(destinationPath, contents)
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    await this.writeText(destinationPath, await this.readText(sourcePath))
  }
}
