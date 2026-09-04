import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  safeStorage,
  session,
  shell,
} from 'electron'
import { spawn } from 'node:child_process'
import {
  access,
  copyFile,
  lstat,
  mkdtemp,
  mkdir,
  open,
  readFile,
  rename,
  stat,
} from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  readPackagedReleaseMetadata,
  runtimeMetadata,
} from './releaseMetadata.mjs'
import { selectElectronSmokeMode } from './smokeMode.mjs'
import { loadSteamInventoryBinding } from './steamInventoryBinding.mjs'
import {
  AtomicSteamEntitlementCache,
  createSafeStorageProtector,
  disabledSteamInventoryConfig,
  readSteamInventoryConfig,
  SteamInventoryStore,
} from './steamInventoryStore.mjs'

const hostDirectory = dirname(fileURLToPath(import.meta.url))
const rendererEntry = join(hostDirectory, '../../dist-native/index.html')
const releaseMetadataPath = join(hostDirectory, 'release-version.json')
const steamInventoryConfigPath = join(
  hostDirectory,
  'steam-inventory.json',
)
const {
  smokeTest,
  suspendResumeSmoke,
} = selectElectronSmokeMode(process.argv)
const smokeUserData = smokeTest
  ? await mkdtemp(join(tmpdir(), 'idle-dyson-swarm-smoke-'))
  : null
if (smokeUserData !== null) app.setPath('userData', smokeUserData)
const webSaveRootName = 'web-runtime-v1'
const maximumTextBytes = 32 * 1024 * 1024
const maximumDiagnosticBytes = 64 * 1024
const steamAppId = 4348570

const channels = Object.freeze({
  exists: 'ids:native:files:exists',
  readText: 'ids:native:files:read-text',
  writeText: 'ids:native:files:write-text',
  replace: 'ids:native:files:replace',
  copy: 'ids:native:files:copy',
  discoverUnity: 'ids:native:unity:discover',
  metadata: 'ids:native:metadata',
  diagnostics: 'ids:native:diagnostics:export',
  exportSave: 'ids:native:save:export',
  storeProducts: 'ids:native:store:products',
  storePurchase: 'ids:native:store:purchase',
  storeRestore: 'ids:native:store:restore',
  entitlements: 'ids:native:entitlements:read',
  lifecycle: 'ids:native:lifecycle',
  prepareClose: 'ids:native:close:prepare',
  closePrepared: 'ids:native:close:prepared',
})

const closeCheckpointTimeoutMilliseconds = 5_000
const singleInstanceAcquired = app.requestSingleInstanceLock()
let mainWindow = null
let closeRequestSequence = 0
let packagedRuntimeMetadata
let smokeCleanupScheduled = false
let steamInventoryStore

if (smokeTest) scheduleOwnedSmokeCleanup()

function denyRendererPermissions(electronSession) {
  electronSession.setPermissionCheckHandler(() => false)
  electronSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  )
}

function webSaveRoot() {
  return join(app.getPath('userData'), webSaveRootName)
}

function rootedPath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath.includes('\0') ||
    isAbsolute(relativePath) ||
    /^[a-zA-Z]:/.test(relativePath)
  ) {
    throw new Error('Native save path is invalid.')
  }
  const segments = relativePath.replaceAll('\\', '/').split('/')
  if (segments.some((segment) =>
    segment === '' || segment === '.' || segment === '..')) {
    throw new Error('Native save path is invalid.')
  }
  const root = resolve(webSaveRoot())
  const candidate = resolve(root, ...segments)
  const traversal = relative(root, candidate)
  if (
    traversal === '..' ||
    traversal.startsWith(`..${sep}`) ||
    isAbsolute(traversal)
  ) {
    throw new Error('Native save path escaped its application root.')
  }
  return candidate
}

async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true })
}

async function syncFile(path) {
  // Windows rejects fsync on read-only handles; r+ requests a writable handle
  // without truncating the already-staged or copied file.
  const handle = await open(path, 'r+')
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function syncDirectory(path) {
  let handle
  try {
    handle = await open(path, 'r')
    await handle.sync()
  } catch (error) {
    if (!isUnsupportedDirectorySync(error)) throw error
  } finally {
    await handle?.close()
  }
}

function isUnsupportedDirectorySync(error) {
  return error?.code === 'EINVAL' ||
    error?.code === 'ENOTSUP' ||
    error?.code === 'EPERM' ||
    error?.code === 'EISDIR'
}

async function durableWriteText(path, contents) {
  await ensureParent(path)
  const handle = await open(path, 'w')
  try {
    await handle.writeFile(contents, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
  await syncDirectory(dirname(path))
}

async function rejectSymbolicLinks(path) {
  const root = resolve(webSaveRoot())
  let cursor = path
  while (true) {
    try {
      if ((await lstat(cursor)).isSymbolicLink()) {
        throw new Error(
          'Symbolic links are not accepted in native Web save paths.',
        )
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    if (cursor === root) return
    const parent = dirname(cursor)
    if (parent === cursor) {
      throw new Error('Native save path escaped its application root.')
    }
    cursor = parent
  }
}

async function readBoundedText(path) {
  const size = (await stat(path)).size
  if (size < 0 || size > maximumTextBytes) {
    throw new Error('Native save exceeds the supported size limit.')
  }
  return readFile(path, 'utf8')
}

function registerNativeHandlers() {
  ipcMain.handle(channels.exists, async (_event, relativePath) => {
    const target = rootedPath(relativePath)
    await rejectSymbolicLinks(target)
    try {
      await access(target)
      return true
    } catch (error) {
      if (error?.code === 'ENOENT') return false
      throw error
    }
  })
  ipcMain.handle(channels.readText, async (_event, relativePath) => {
    const target = rootedPath(relativePath)
    await rejectSymbolicLinks(target)
    return readBoundedText(target)
  })
  ipcMain.handle(
    channels.writeText,
    async (_event, relativePath, contents) => {
      if (typeof contents !== 'string') {
        throw new Error('Native save contents must be text.')
      }
      if (Buffer.byteLength(contents, 'utf8') > maximumTextBytes) {
        throw new Error('Native save exceeds the supported size limit.')
      }
      const destination = rootedPath(relativePath)
      await rejectSymbolicLinks(destination)
      await durableWriteText(destination, contents)
    },
  )
  ipcMain.handle(
    channels.replace,
    async (_event, temporaryRelativePath, destinationRelativePath) => {
      const temporary = rootedPath(temporaryRelativePath)
      const destination = rootedPath(destinationRelativePath)
      await rejectSymbolicLinks(temporary)
      await rejectSymbolicLinks(destination)
      if (temporary === destination) {
        throw new Error('Atomic replacement requires distinct paths.')
      }
      await ensureParent(destination)
      await syncFile(temporary)
      await rename(temporary, destination)
      await syncDirectory(dirname(destination))
      if (dirname(temporary) !== dirname(destination)) {
        await syncDirectory(dirname(temporary))
      }
    },
  )
  ipcMain.handle(
    channels.copy,
    async (_event, sourceRelativePath, destinationRelativePath) => {
      const source = rootedPath(sourceRelativePath)
      const destination = rootedPath(destinationRelativePath)
      await rejectSymbolicLinks(source)
      await rejectSymbolicLinks(destination)
      const sourceSize = (await stat(source)).size
      if (sourceSize < 0 || sourceSize > maximumTextBytes) {
        throw new Error('Native save exceeds the supported size limit.')
      }
      await ensureParent(destination)
      await copyFile(source, destination)
      await syncFile(destination)
      await syncDirectory(dirname(destination))
    },
  )
  ipcMain.handle(channels.discoverUnity, discoverUnitySaves)
  ipcMain.handle(channels.metadata, async () => {
    return packagedRuntimeMetadata ?? loadRuntimeMetadata()
  })
  ipcMain.handle(channels.exportSave, async (event, request) => {
    if (request?.fileName !== 'idle-dyson-swarm-save.idsw' ||
        typeof request.text !== 'string' || request.text.length === 0 ||
        Buffer.byteLength(request.text, 'utf8') > 32 * 1024 * 1024) {
      throw new Error('Invalid save export request.')
    }
    const owner = BrowserWindow.fromWebContents(event.sender)
    if (owner === null) throw new Error('Save export window unavailable.')
    const result = await dialog.showSaveDialog(owner, {
      defaultPath: request.fileName,
      filters: [{ name: 'Idle Dyson Swarm Save', extensions: ['idsw'] }],
    })
    if (result.canceled || !result.filePath) return 'cancelled'
    await durableWriteText(result.filePath, request.text)
    return 'saved'
  })
  ipcMain.handle(channels.diagnostics, async (_event, request) => {
    if (
      request === null ||
      typeof request !== 'object' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}\.json$/.test(request.fileName) ||
      request.mimeType !== 'application/json' ||
      typeof request.text !== 'string'
    ) {
      throw new Error('Native diagnostic export request is invalid.')
    }
    if (Buffer.byteLength(request.text, 'utf8') > maximumDiagnosticBytes) {
      throw new Error('Native diagnostics exceed the supported size limit.')
    }
    JSON.parse(request.text)
    const destination = rootedPath(`diagnostics/${request.fileName}`)
    await rejectSymbolicLinks(destination)
    await durableWriteText(destination, request.text)
    return Object.freeze({ exported: true })
  })
  ipcMain.handle(
    channels.storeProducts,
    () => steamInventoryStore.products(),
  )
  ipcMain.handle(
    channels.storePurchase,
    (_event, productId) => steamInventoryStore.purchase(productId),
  )
  ipcMain.handle(
    channels.storeRestore,
    () => steamInventoryStore.restorePurchases(),
  )
  ipcMain.handle(
    channels.entitlements,
    (_event, refresh) => steamInventoryStore.readEntitlements(refresh === true),
  )
}

async function loadRuntimeMetadata() {
  const release =
    await readPackagedReleaseMetadata(releaseMetadataPath)
  const metadata = runtimeMetadata(
    app.isPackaged ? app.getVersion() : release.marketingVersion,
    release,
  )
  packagedRuntimeMetadata = metadata
  return metadata
}

async function createElectronSteamInventoryStore() {
  const cache = new AtomicSteamEntitlementCache(
    join(app.getPath('userData'), 'steam-entitlements-v2.json'),
    steamAppId,
    createSafeStorageProtector(safeStorage),
  )
  let config
  try {
    config = await readSteamInventoryConfig(
      steamInventoryConfigPath,
      steamAppId,
    )
  } catch (error) {
    console.error(
      'Steam Inventory configuration is unavailable; Store is disabled.',
      error,
    )
    config = disabledSteamInventoryConfig(steamAppId)
  }
  let binding = null
  if (config.enabled) {
    try {
      binding = await loadSteamInventoryBinding({
        steamAppId,
        itemDefIds: config.products,
      })
    } catch (error) {
      console.error(
        'Steam Inventory binding is unavailable; Store is disabled.',
        error,
      )
    }
  }
  const store = new SteamInventoryStore({ config, binding, cache })
  await store.initialize()
  return store
}

async function discoverUnitySaves() {
  const definitions = unitySaveDefinitions()
  const candidates = []
  for (const definition of definitions) {
    try {
      const text = await readBoundedText(definition.absolutePath)
      candidates.push(Object.freeze({
        id: definition.id,
        text,
        provenance: Object.freeze({
          kind: 'automatic-same-device-unity',
          platform: definition.platform,
          sourceClass: 'unity-persistent-data-save',
          opaqueSourceIdentifier: definition.id,
          pathClass: definition.pathClass,
        }),
      }))
      if (process.platform === 'darwin') break
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return Object.freeze(candidates)
}

function unitySaveDefinitions() {
  const home = homedir()
  const fileName = 'idle_dyson_swarm_save.txt'
  if (process.platform === 'win32') {
    return [{
      id: 'win32-1',
      platform: 'windows',
      pathClass: 'unity-local-low',
      absolutePath: join(
        home,
        'AppData',
        'LocalLow',
        'BlindsidedGames',
        'Idle Dyson Swarm',
        fileName,
      ),
    }]
  }
  if (process.platform === 'darwin') {
    return [
      {
        id: 'darwin-1',
        platform: 'macos',
        pathClass: 'unity-application-support-editor',
        absolutePath: join(
          home,
          'Library',
          'Application Support',
          'BlindsidedGames',
          'Idle Dyson Swarm',
          fileName,
        ),
      },
      {
        id: 'darwin-2',
        platform: 'macos',
        pathClass: 'unity-application-support-player',
        absolutePath: join(
          home,
          'Library',
          'Application Support',
          'unity.BlindsidedGames.Idle Dyson Swarm',
          fileName,
        ),
      },
    ]
  }
  const configRoot = process.env.XDG_CONFIG_HOME || join(home, '.config')
  return [{
    id: 'linux-1',
    platform: 'linux',
    pathClass: 'unity-xdg-config',
    absolutePath: join(
      configRoot,
      'unity3d',
      'BlindsidedGames',
      'Idle Dyson Swarm',
      fileName,
    ),
  }]
}

async function waitForRendererReady(window) {
  try {
    const ready = await window.webContents.executeJavaScript(`
      new Promise((resolve) => {
        if (document.documentElement.dataset.idleDysonSwarmRuntime === 'ready') {
          resolve(true)
          return
        }
        const timeout = window.setTimeout(() => resolve(false), 15000)
        window.addEventListener('idle-dyson-swarm-runtime-ready', () => {
          window.clearTimeout(timeout)
          resolve(true)
        }, { once: true })
      })
    `)
    if (!ready) {
      await exitHost(1)
      return
    }
    if (suspendResumeSmoke) {
      window.minimize()
      await new Promise((resolve) => setTimeout(resolve, 20_000))
      window.restore()
      window.show()
      window.focus()
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      const resumedSafely = await window.webContents.executeJavaScript(`
        document.documentElement.dataset.idleDysonSwarmRuntime === 'ready' &&
          !document.body.textContent.includes('This tab stopped writing progress')
      `)
      await exitHost(resumedSafely ? 0 : 1)
      return
    }
    await exitHost(0)
  } catch (error) {
    console.error('Packaged renderer readiness check failed.', error)
    await exitHost(1)
  }
}

async function exitHost(code) {
  scheduleOwnedSmokeCleanup()
  app.exit(code)
}

function scheduleOwnedSmokeCleanup() {
  if (smokeUserData === null || smokeCleanupScheduled) return
  smokeCleanupScheduled = true
  const cleanupProgram = [
    "const { rm } = require('node:fs/promises')",
    'const parentPid = Number(process.argv[1])',
    'const ownedPath = process.argv[2]',
    'const waitForParent = () => {',
    '  try { process.kill(parentPid, 0); setTimeout(waitForParent, 100) }',
    '  catch { void rm(ownedPath, { recursive: true, force: true }) }',
    '}',
    'waitForParent()',
  ].join('\n')
  try {
    spawn(
      process.execPath,
      ['-e', cleanupProgram, String(process.pid), smokeUserData],
      {
        detached: true,
        windowsHide: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
        },
      },
    ).unref()
  } catch (error) {
    console.error('Smoke profile cleanup could not be scheduled.', error)
  }
}

function sendLifecycle(window, phase) {
  if (!window.isDestroyed()) {
    window.webContents.send(channels.lifecycle, phase)
  }
}

function requestRendererCheckpoint(window) {
  if (window.isDestroyed() || window.webContents.isDestroyed()) {
    return Promise.resolve(Object.freeze({
      checkpointed: false,
      reason: 'renderer-unavailable',
    }))
  }
  const requestId = `${process.pid}-${++closeRequestSequence}`
  return new Promise((resolveRequest) => {
    let settled = false
    const settle = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      ipcMain.removeListener(channels.closePrepared, onPrepared)
      resolveRequest(Object.freeze(result))
    }
    const onPrepared = (event, responseId, checkpointed) => {
      if (
        event.sender.id !== window.webContents.id ||
        responseId !== requestId
      ) return
      settle({
        checkpointed: checkpointed === true,
        reason: checkpointed === true
          ? 'checkpointed'
          : 'checkpoint-rejected',
      })
    }
    const timeout = setTimeout(() => settle({
      checkpointed: false,
      reason: 'checkpoint-timeout',
    }), closeCheckpointTimeoutMilliseconds)
    ipcMain.on(channels.closePrepared, onPrepared)
    window.webContents.send(channels.prepareClose, requestId)
  })
}

async function closeAfterCheckpoint(window) {
  const result = await requestRendererCheckpoint(window)
  if (!result.checkpointed) {
    console.warn(
      `Closing with the last durable save after ${result.reason}.`,
    )
  }
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 360,
    minHeight: 640,
    backgroundColor: '#2f1738',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(hostDirectory, 'preload.cjs'),
    },
  })
  mainWindow = window
  let closeAllowed = false
  let closePending = false

  window.once('ready-to-show', () => window.show())
  window.on('focus', () => sendLifecycle(window, 'active'))
  window.on('blur', () => sendLifecycle(window, 'focus-lost'))
  window.on('minimize', () => sendLifecycle(window, 'background'))
  window.on('restore', () => sendLifecycle(
    window,
    window.isFocused() ? 'active' : 'focus-lost',
  ))
  window.on('close', (event) => {
    if (closeAllowed) return
    event.preventDefault()
    if (closePending) return
    closePending = true
    void closeAfterCheckpoint(window).finally(() => {
      closeAllowed = true
      if (!window.isDestroyed()) window.close()
    })
  })
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })
  if (smokeTest) {
    window.webContents.on(
      'console-message',
      (_event, level, message, line, sourceId) => {
        if (level >= 2) {
          console.error(
            `Renderer console (${sourceId}:${line}): ${message}`,
          )
        }
      },
    )
    window.webContents.once('did-finish-load', () => {
      void waitForRendererReady(window)
    })
    window.webContents.once(
      'did-fail-load',
      (_event, code, description) => {
        console.error(
          `Packaged renderer failed to load (${code}): ${description}`,
        )
        void exitHost(1)
      },
    )
  }
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })
  void window.loadFile(rendererEntry).catch((error) => {
    console.error('Electron renderer failed to load.', error)
    void exitHost(1)
  })
}

if (!singleInstanceAcquired) {
  if (smokeTest) void exitHost(1)
  else app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow === null || mainWindow.isDestroyed()) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
  app.whenReady().then(async () => {
    await loadRuntimeMetadata()
    steamInventoryStore = await createElectronSteamInventoryStore()
    registerNativeHandlers()
    denyRendererPermissions(session.defaultSession)
    createMainWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  }).catch((error) => {
    console.error('Electron native host startup failed.', error)
    void exitHost(1)
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
