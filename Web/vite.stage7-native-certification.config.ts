import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createStoredTimeWorkerReleaseBuildIdV2 } from './vite.stored-time-worker.config.js'

/** Internal-only native certification package. It is never a production input. */
export default defineConfig({
  base: './',
  define: {
    __STAGE7_NATIVE_CERTIFICATION__: JSON.stringify(true),
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(
      createStoredTimeWorkerReleaseBuildIdV2(),
    ),
  },
  plugins: [
    react(),
    {
      name: 'stage7-certification-native-entry',
      enforce: 'post',
      buildStart() {
        rmSync(resolve(import.meta.dirname, 'dist-stage7-native-certification'), {
          recursive: true,
          force: true,
        })
      },
      generateBundle(_options, bundle) {
        this.emitFile({
          type: 'asset',
          fileName: 'stage7-certification.marker',
          source: 'stage7-v2-certification\n',
        })
        for (const output of Object.values(bundle)) {
          if (output.type === 'asset' &&
            output.fileName.endsWith('stage7-native-certification.html')) {
            output.fileName = 'index.html'
            if (typeof output.source === 'string') {
              output.source = output.source.replaceAll('../assets/', './assets/')
            }
          }
        }
      },
    },
  ],
  build: {
    outDir: 'dist-stage7-native-certification/public',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'worker-harness/stage7-native-certification.html'),
      },
    },
  },
})
