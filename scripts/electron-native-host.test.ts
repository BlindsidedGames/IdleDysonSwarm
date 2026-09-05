import { inventoryBinding } from '../hosts/electron/steam/client.mjs'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  readPackagedReleaseMetadata,
  runtimeMetadata,
  validateReleaseMetadata,
} from '../hosts/electron/releaseMetadata.mjs'
import { selectElectronSmokeMode } from '../hosts/electron/smokeMode.mjs'

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

describe('Electron native host hardening', () => {
  it('packages and validates runtime release metadata', () => {
    const source = JSON.parse(read('hosts/electron/release-version.json'))
    const release = validateReleaseMetadata(source)

    expect(runtimeMetadata('4.1.7', release)).toEqual({
      applicationVersion: '4.1.7',
      buildNumber: '2026090503',
    })
    expect(() => runtimeMetadata('4.0.1', release)).toThrow(
      'does not match',
    )
    const builder = read('hosts/electron/electron-builder.yml')
    expect(builder).toContain(
      'extends: hosts/electron/release-version.json',
    )
    expect(builder).toContain('hosts/electron/release-version.json')
    expect(builder).not.toContain('hosts/native-release.json')
    expect(builder).toContain('hosts/electron/releaseMetadata.mjs')
    expect(builder).toContain('hosts/electron/smokeMode.mjs')
    expect(builder).toContain('hosts/electron/steamInventoryBinding.mjs')
    expect(builder).toContain('hosts/electron/steamInventoryStore.mjs')
    expect(builder).toContain('hosts/electron/steam-inventory.json')
    expect(JSON.parse(read('hosts/electron/host.config.json')))
      .toMatchObject({ releaseMetadata: 'release-version.json' })
  })

  it('rejects missing, malformed, and internally inconsistent packaged metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ids-electron-release-'))
    try {
      await expect(readPackagedReleaseMetadata(
        join(directory, 'missing.json'),
      )).rejects.toThrow()
      const malformed = join(directory, 'malformed.json')
      await writeFile(malformed, '{', 'utf8')
      await expect(readPackagedReleaseMetadata(malformed)).rejects.toThrow()
      expect(() => validateReleaseMetadata({
        buildVersion: '2026083007',
        extraMetadata: {
          version: '4.1.5',
          buildVersion: '2026083006',
        },
      })).toThrow('Electron release metadata is invalid.')
      expect(() => validateReleaseMetadata({
        buildVersion: '2026023000',
        extraMetadata: {
          version: '4.1.5',
          buildVersion: '2026023000',
        },
      })).toThrow('Electron release metadata is invalid.')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('selects ordinary and suspend/resume smoke modes from explicit arguments', () => {
    expect(selectElectronSmokeMode(['--overlay-smoke']).smokeTest).toBe(true)
    expect(selectElectronSmokeMode(['--close-smoke'])).toEqual({
      smokeTest: true, suspendResumeSmoke: false, closeSmoke: true,
    })
    expect(selectElectronSmokeMode([])).toEqual({
      smokeTest: false,
      suspendResumeSmoke: false,
      closeSmoke: false,
    })
    expect(selectElectronSmokeMode(['--smoke-test'])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: false,
      closeSmoke: false,
    })
    expect(selectElectronSmokeMode(['--suspend-resume-smoke'])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: true,
      closeSmoke: false,
    })
    expect(selectElectronSmokeMode([
      '--smoke-test',
      '--suspend-resume-smoke',
    ])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: true,
      closeSmoke: false,
    })
    expect(selectElectronSmokeMode(['--smoke-test-disabled'])).toEqual({
      smokeTest: false,
      suspendResumeSmoke: false,
      closeSmoke: false,
    })
  })

  it('keeps ordinary smoke stable and exposes suspend/resume smoke directly', () => {
    const packageJson = JSON.parse(read('package.json'))
    expect(packageJson.scripts['native:electron:smoke']).toBe(
      'npm run build:native && electron hosts/electron/main.mjs --smoke-test',
    )
    expect(packageJson.scripts['native:electron:smoke:suspend-resume']).toBe(
      'npm run build:native && electron hosts/electron/main.mjs --suspend-resume-smoke',
    )
  })

  it('enforces one writer process and refocuses the owned window', () => {
    const main = read('hosts/electron/main.mjs')
    expect(main).toContain('app.requestSingleInstanceLock()')
    expect(main).toContain("app.on('second-instance'")
    expect(main).toContain('mainWindow.restore()')
    expect(main).toContain('mainWindow.focus()')
  })

  it('awaits a bounded close checkpoint before falling back', () => {
    const main = read('hosts/electron/main.mjs')
    const preload = read('hosts/electron/preload.cjs')
    expect(main).toContain('closeCheckpointTimeoutMilliseconds')
    expect(main).toContain('event.preventDefault()')
    expect(main).toContain('requestRendererCheckpoint(window)')
    expect(main).toContain('last durable save')
    expect(main).toContain("mkdtemp(join(tmpdir(), 'idle-dyson-swarm-smoke-'))")
    expect(main).toContain('scheduleOwnedSmokeCleanup()')
    expect(main).toContain("ELECTRON_RUN_AS_NODE: '1'")
    expect(main).toContain('process.kill(parentPid, 0)')
    expect(main).not.toContain('removeStaleSmokeProfiles')
    expect(main).not.toContain('readdir(temporaryRoot')
    expect(main).not.toContain("sendLifecycle(window, 'terminating')")
    expect(preload).toContain('installTerminationCheckpoint')
    expect(preload).toContain('terminationCheckpointHandler')
    expect(preload.indexOf("publishLifecycle('terminating')"))
      .toBeLessThan(preload.indexOf('await terminationCheckpointHandler()'))
  })

  it('fsyncs staged writes, copies, publication and supported directories', () => {
    const main = read('hosts/electron/main.mjs')
    expect(main).toContain('await handle.sync()')
    expect(main).toContain('await syncFile(temporary)')
    expect(main).toContain('await syncFile(destination)')
    expect(main).toContain('await syncDirectory(dirname(destination))')
  })

  it('does not accept renderer-authored Unity purchase evidence', () => {
    const main = read('hosts/electron/main.mjs')
    const preload = read('hosts/electron/preload.cjs')
    expect(main).not.toContain('promoteAutomaticUnityPurchaseEvidence')
    expect(preload).not.toContain('promoteAutomaticUnityPurchaseEvidence')
  })

  it('keeps verified Steam Inventory mappings in main and requires the native provider', () => {
    const main = read('hosts/electron/main.mjs')
    const preload = read('hosts/electron/preload.cjs')
    const binding = read('hosts/electron/steamInventoryBinding.mjs')
    const config = JSON.parse(read('hosts/electron/steam-inventory.json'))

    expect(main).toContain('createElectronSteamInventoryStore()')
    expect(main).toContain('steamInventoryStore.purchase(productId)')
    expect(main).toContain('steamInventoryStore.readEntitlements')
    expect(main).toContain('createSafeStorageProtector(safeStorage)')
    expect(preload).not.toContain('itemDefId')
    expect(inventoryBinding(null)).toBe(null)
    expect(binding).not.toContain("from 'steamworks.js'")
    expect(config.enabled).toBe(true)
    expect(config.products).toEqual({
      'ids.tiptier1': 1001, 'ids.tiptier2': 1002, 'ids.tiptier3': 1003,
      'ids.devoptions': 1004, 'ids.doubleip': 1005,
    })
  })
})
