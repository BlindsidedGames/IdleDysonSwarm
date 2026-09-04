const { contextBridge, ipcRenderer } = require('electron')

const channels = Object.freeze({
  exists: 'ids:native:files:exists',
  readText: 'ids:native:files:read-text',
  writeText: 'ids:native:files:write-text',
  replace: 'ids:native:files:replace',
  copy: 'ids:native:files:copy',
  discoverUnity: 'ids:native:unity:discover',
  metadata: 'ids:native:metadata',
  diagnostics: 'ids:native:diagnostics:export',
  storeProducts: 'ids:native:store:products',
  storePurchase: 'ids:native:store:purchase',
  storeRestore: 'ids:native:store:restore',
  entitlements: 'ids:native:entitlements:read',
  lifecycle: 'ids:native:lifecycle',
  prepareClose: 'ids:native:close:prepare',
  closePrepared: 'ids:native:close:prepared',
})

let currentPhase = 'active'
let terminationCheckpointHandler
const lifecycleListeners = new Set()
ipcRenderer.on(channels.lifecycle, (_event, phase) => {
  publishLifecycle(phase)
})

ipcRenderer.on(channels.prepareClose, async (_event, requestId) => {
  let checkpointed = false
  try {
    // Admission of the terminating lifecycle save happens synchronously before
    // the handler queues its fenced checkpoint. The runtime router therefore
    // drains the quit timestamp first and cannot race a parallel close path.
    publishLifecycle('terminating')
    checkpointed = terminationCheckpointHandler === undefined
      ? false
      : await terminationCheckpointHandler() === true
  } catch {
    checkpointed = false
  }
  ipcRenderer.send(channels.closePrepared, requestId, checkpointed)
})

contextBridge.exposeInMainWorld(
  'idleDysonSwarmNativeHost',
  Object.freeze({
    target: 'electron',
    ...(process.argv.includes('--ids-steam-cloud') ? { cloud: Object.freeze({
      read: () => ipcRenderer.invoke('ids:cloud:read'),
      readBackups: () => ipcRenderer.invoke('ids:cloud:backups'),
      choose: (local,remote) => ipcRenderer.invoke('ids:cloud:choose',local,remote),
      acknowledge: text => ipcRenderer.invoke('ids:cloud:acknowledge',text),
      publish: text => ipcRenderer.invoke('ids:cloud:publish',text),
    }) } : {}),
    ...(process.argv.includes('--ids-steam') ? { achievements: Object.freeze({
      available: () => ipcRenderer.invoke('ids:achievements:available'),
      submit: facts => ipcRenderer.invoke('ids:achievements:submit', facts),
      flush: () => ipcRenderer.invoke('ids:achievements:flush'),
    }) } : {}),
    exists: (relativePath) =>
      ipcRenderer.invoke(channels.exists, relativePath),
    readText: (relativePath) =>
      ipcRenderer.invoke(channels.readText, relativePath),
    writeText: (relativePath, contents) =>
      ipcRenderer.invoke(channels.writeText, relativePath, contents),
    replaceAtomically: (
      temporaryRelativePath,
      destinationRelativePath,
    ) => ipcRenderer.invoke(
      channels.replace,
      temporaryRelativePath,
      destinationRelativePath,
    ),
    copy: (sourceRelativePath, destinationRelativePath) =>
      ipcRenderer.invoke(
        channels.copy,
        sourceRelativePath,
        destinationRelativePath,
      ),
    discoverUnitySaves: () =>
      ipcRenderer.invoke(channels.discoverUnity),
    currentLifecyclePhase: () => currentPhase,
    subscribeLifecycle: (listener) => {
      if (typeof listener !== 'function') {
        throw new TypeError('Lifecycle listener must be a function.')
      }
      lifecycleListeners.add(listener)
      return () => lifecycleListeners.delete(listener)
    },
    installTerminationCheckpoint: (handler) => {
      if (typeof handler !== 'function') {
        throw new TypeError(
          'Termination checkpoint handler must be a function.',
        )
      }
      terminationCheckpointHandler = handler
      return () => {
        if (terminationCheckpointHandler === handler) {
          terminationCheckpointHandler = undefined
        }
      }
    },
    metadata: () => ipcRenderer.invoke(channels.metadata),
    exportDiagnostics: (request) =>
      ipcRenderer.invoke(channels.diagnostics, request),
    storeProducts: () =>
      ipcRenderer.invoke(channels.storeProducts),
    storePurchase: (productId) =>
      ipcRenderer.invoke(channels.storePurchase, productId),
    storeRestorePurchases: () =>
      ipcRenderer.invoke(channels.storeRestore),
    readEntitlements: (refresh) =>
      ipcRenderer.invoke(channels.entitlements, refresh === true),
  }),
)

function isLifecyclePhase(value) {
  return value === 'active' ||
    value === 'background' ||
    value === 'focus-lost' ||
    value === 'terminating'
}

function publishLifecycle(phase) {
  if (!isLifecyclePhase(phase)) return
  currentPhase = phase
  for (const listener of [...lifecycleListeners]) {
    try {
      listener(phase)
    } catch {
      // A renderer listener cannot suppress native lifecycle delivery.
    }
  }
}
