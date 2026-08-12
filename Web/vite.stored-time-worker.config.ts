import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const RELEASE_ROOT_FILES = Object.freeze([
  'package.json',
  'package-lock.json',
  'vite.stored-time-worker.config.ts',
] as const)

export function listStoredTimeWorkerReleaseSourceFilesV2(): readonly string[] {
  const sourceFiles = listReleaseSourceFiles(resolve(import.meta.dirname, 'src'), 'src')
  return Object.freeze([...RELEASE_ROOT_FILES, ...sourceFiles].sort())
}

export function createStoredTimeWorkerReleaseBuildIdV2(
  readSource: (absolutePath: string, relativePath: string) => Uint8Array =
    (absolutePath) => readFileSync(absolutePath),
): string {
  const hash = createHash('sha256')
  for (const relativePath of listStoredTimeWorkerReleaseSourceFilesV2()) {
    hash.update(relativePath)
    hash.update('\0')
    hash.update(readSource(resolve(import.meta.dirname, relativePath), relativePath))
    hash.update('\0')
  }
  return `stage4d-source-sha256:${hash.digest('hex')}`
}

function listReleaseSourceFiles(absoluteDirectory: string, relativeDirectory: string): string[] {
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(absoluteDirectory, entry.name)
    const relativePath = `${relativeDirectory}/${entry.name}`
    if (entry.isDirectory()) return listReleaseSourceFiles(absolutePath, relativePath)
    return /\.(?:json|ts|tsx)$/u.test(entry.name) ? [relativePath] : []
  })
}

/** Dedicated Stage 4D build. This config is not part of the production graph. */
export default defineConfig(({ mode }) => ({
  base: mode === 'native' ? './' : '/play/',
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      createStoredTimeWorkerReleaseBuildIdV2(),
    ),
  },
  build: {
    outDir: mode === 'native'
      ? 'dist-stored-time-worker-harness-native'
      : 'dist-stored-time-worker-harness',
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'worker-harness/stored-time-v2.html'),
    },
  },
}))
