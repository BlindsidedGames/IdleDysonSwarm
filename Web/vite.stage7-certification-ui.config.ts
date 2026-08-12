import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Dormant Stage 7D browser harness; never imported by production composition. */
export default defineConfig({
  base: '/play/',
  plugins: [react()],
  build: {
    outDir: 'dist-stage7-certification-ui',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'worker-harness/stage7-certification-ui.html'),
    },
  },
})
