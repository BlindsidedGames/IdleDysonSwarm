import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  runtimeMetadata,
  validateReleaseMetadata,
} from '../hosts/electron/releaseMetadata.mjs'
import { selectElectronSmokeMode } from '../hosts/electron/smokeMode.mjs'

function read(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

describe('Electron native host hardening', () => {
  it('packages and validates runtime release metadata', () => {
    const source = JSON.parse(read('hosts/native-release.json'))
    const release = validateReleaseMetadata(source)

    expect(runtimeMetadata('4.1.5', release)).toEqual({
      applicationVersion: '4.1.5',
      buildNumber: '2026082902',
    })
    expect(() => runtimeMetadata('4.0.1', release)).toThrow(
      'does not match',
    )
    const builder = read('hosts/electron/electron-builder.yml')
    expect(builder).toContain('hosts/native-release.json')
    expect(builder).toContain('hosts/electron/releaseMetadata.mjs')
    expect(builder).toContain('hosts/electron/smokeMode.mjs')
    expect(builder).toContain('hosts/electron/steamInventoryBinding.mjs')
    expect(builder).toContain('hosts/electron/steamInventoryStore.mjs')
    expect(builder).toContain('hosts/electron/steam-inventory.json')
  })

  it('selects ordinary and suspend/resume smoke modes from explicit arguments', () => {
    expect(selectElectronSmokeMode([])).toEqual({
      smokeTest: false,
      suspendResumeSmoke: false,
    })
    expect(selectElectronSmokeMode(['--smoke-test'])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: false,
    })
    expect(selectElectronSmokeMode(['--suspend-resume-smoke'])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: true,
    })
    expect(selectElectronSmokeMode([
      '--smoke-test',
      '--suspend-resume-smoke',
    ])).toEqual({
      smokeTest: true,
      suspendResumeSmoke: true,
    })
    expect(selectElectronSmokeMode(['--smoke-test-disabled'])).toEqual({
      smokeTest: false,
      suspendResumeSmoke: false,
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

  it('keeps Steam Inventory authority in main and fails closed by default', () => {
    const main = read('hosts/electron/main.mjs')
    const preload = read('hosts/electron/preload.cjs')
    const binding = read('hosts/electron/steamInventoryBinding.mjs')
    const config = JSON.parse(read('hosts/electron/steam-inventory.json'))

    expect(main).toContain('createElectronSteamInventoryStore()')
    expect(main).toContain('steamInventoryStore.purchase(productId)')
    expect(main).toContain('steamInventoryStore.readEntitlements')
    expect(main).toContain('createSafeStorageProtector(safeStorage)')
    expect(preload).not.toContain('itemDefId')
    expect(binding).toContain('return null')
    expect(binding).not.toContain("from 'steamworks.js'")
    expect(config.enabled).toBe(false)
    expect(Object.values(config.products).every((value) => value === null))
      .toBe(true)
  })
})
