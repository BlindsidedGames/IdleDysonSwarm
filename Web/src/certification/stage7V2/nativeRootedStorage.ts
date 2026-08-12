import type { RootedNativeFileBridge } from '../../platform/platformSaveStorage'
import {
  createStage7V2CertificationPaths,
  type Stage7V2CertificationStorage,
} from './contracts'

/** Test/certification-only extension; production native roots remain unchanged. */
export interface Stage7V2NativeCertificationRootedPort
  extends RootedNativeFileBridge {
  removeExactly(relativePaths: readonly string[]): Promise<void>
  withExclusiveMutation<T>(buildRoot: string, operation: () => Promise<T>): Promise<T>
}

export interface Stage7V2NativeHostCertificationBridge
  extends RootedNativeFileBridge {
  removeCertificationFiles(relativePaths: readonly string[]): Promise<void>
}

const nativeWriterLanes = new WeakMap<object, Map<string, Promise<void>>>()

/** Connects the real rooted native bridge without exposing general deletion. */
export function createStage7V2NativeCertificationStorage(
  buildScope: string,
  bridge: Readonly<Stage7V2NativeHostCertificationBridge>,
): Stage7V2InjectedNativeRootedStorage {
  const root = createStage7V2CertificationPaths(buildScope).root
  let byBuild = nativeWriterLanes.get(bridge)
  if (byBuild === undefined) {
    byBuild = new Map()
    nativeWriterLanes.set(bridge, byBuild)
  }
  const lanes = byBuild
  const exists = captureBoundMethod(bridge, 'exists')
  const readText = captureBoundMethod(bridge, 'readText')
  const writeText = captureBoundMethod(bridge, 'writeText')
  const replaceAtomically = captureBoundMethod(bridge, 'replaceAtomically')
  const copy = captureBoundMethod(bridge, 'copy')
  const removeCertificationFiles = captureBoundMethod(
    bridge,
    'removeCertificationFiles',
  )
  return new Stage7V2InjectedNativeRootedStorage(buildScope, {
    exists: exists as Stage7V2NativeCertificationRootedPort['exists'],
    readText: readText as Stage7V2NativeCertificationRootedPort['readText'],
    writeText: writeText as Stage7V2NativeCertificationRootedPort['writeText'],
    replaceAtomically: replaceAtomically as Stage7V2NativeCertificationRootedPort['replaceAtomically'],
    copy: copy as Stage7V2NativeCertificationRootedPort['copy'],
    removeExactly: removeCertificationFiles as Stage7V2NativeCertificationRootedPort['removeExactly'],
    withExclusiveMutation: <T>(buildRoot: string, operation: () => Promise<T>) => {
      if (buildRoot !== root) {
        return Promise.reject(new TypeError('Native certification writer root mismatch.'))
      }
      const prior = lanes.get(root) ?? Promise.resolve()
      const run = prior.then(operation)
      lanes.set(root, run.then(() => undefined, () => undefined))
      return run
    },
  })
}

function captureBoundMethod(object: object, key: PropertyKey): Function {
  let owner: object | null = object
  try {
    while (owner !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      if (descriptor !== undefined) {
        if ('value' in descriptor && typeof descriptor.value === 'function') {
          return descriptor.value.bind(object) as Function
        }
        break
      }
      owner = Object.getPrototypeOf(owner) as object | null
    }
  } catch { /* hostile proxy */ }
  throw new TypeError('Stage 7 native certification bridge is invalid.')
}

/**
 * Binds an injected, already-rooted native port to one build namespace. The
 * native port remains responsible for rejecting symbolic links before I/O.
 */
export class Stage7V2InjectedNativeRootedStorage
  implements Stage7V2CertificationStorage {
  readonly #port: Readonly<Stage7V2NativeCertificationRootedPort>
  readonly #root: string

  constructor(
    buildScope: string,
    port: Readonly<Stage7V2NativeCertificationRootedPort>,
  ) {
    this.#root = createStage7V2CertificationPaths(buildScope).root
    this.#port = captureNativePort(port)
  }

  exists(path: string): Promise<boolean> {
    return this.#port.exists(this.#path(path))
  }

  readText(path: string): Promise<string> {
    return this.#port.readText(this.#path(path))
  }

  writeText(path: string, text: string): Promise<void> {
    return this.#port.writeText(this.#path(path), text)
  }

  replaceAtomically(temporaryPath: string, destinationPath: string): Promise<void> {
    return this.#port.replaceAtomically(
      this.#path(temporaryPath),
      this.#path(destinationPath),
    )
  }

  copy(sourcePath: string, destinationPath: string): Promise<void> {
    return this.#port.copy(this.#path(sourcePath), this.#path(destinationPath))
  }

  removeExactly(paths: readonly string[]): Promise<void> {
    return this.#port.removeExactly(Object.freeze(
      [...new Set(paths.map((path) => this.#path(path)))],
    ))
  }

  withExclusiveMutation<T>(operation: () => Promise<T>): Promise<T> {
    return this.#port.withExclusiveMutation(this.#root, operation)
  }

  #path(path: string): string {
    const normalized = path.replaceAll('\\', '/')
    if (normalized !== path || normalized.startsWith('/') ||
      /^[a-zA-Z]:/u.test(normalized) || normalized.includes('\0') ||
      normalized.split('/').some((part) => part === '' || part === '.' || part === '..') ||
      !normalized.startsWith(`${this.#root}/`)) {
      throw new TypeError('Stage 7 native certification path escaped its build namespace.')
    }
    return normalized
  }
}

function captureNativePort(
  port: unknown,
): Readonly<Stage7V2NativeCertificationRootedPort> {
  if (port === null || typeof port !== 'object') {
    throw new TypeError('Stage 7 native certification port is invalid.')
  }
  const keys = [
    'exists', 'readText', 'writeText', 'replaceAtomically', 'copy', 'removeExactly',
    'withExclusiveMutation',
  ] as const
  const methods = new Map<string, (...args: never[]) => unknown>()
  try {
    for (const key of keys) {
      let owner: object | null = port
      while (owner !== null) {
        const descriptor = Object.getOwnPropertyDescriptor(owner, key)
        if (descriptor !== undefined) {
          if (!('value' in descriptor) || typeof descriptor.value !== 'function') break
          methods.set(key, descriptor.value.bind(port) as (...args: never[]) => unknown)
          break
        }
        owner = Object.getPrototypeOf(owner) as object | null
      }
      if (!methods.has(key)) throw new TypeError()
    }
  } catch {
    throw new TypeError('Stage 7 native certification port is invalid.')
  }
  return Object.freeze(Object.fromEntries(methods)) as unknown as
    Readonly<Stage7V2NativeCertificationRootedPort>
}
