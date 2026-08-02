import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
  SECURITY_HEADERS,
} from './securityHeaders.js'
import {
  stripMessageAuthoringMetadataPlugin,
} from './scripts/stripMessageAuthoringMetadata.js'
import {
  PWA_BASE_PATH,
  pwaPackagePlugin,
} from './scripts/pwaPackage.js'

// https://vite.dev/config/
export default defineConfig({
  base: PWA_BASE_PATH,
  plugins: [
    stripMessageAuthoringMetadataPlugin(),
    react(),
    pwaPackagePlugin(),
    {
      name: 'idle-dyson-swarm-security-headers',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: HTML_CONTENT_SECURITY_POLICY,
            },
            injectTo: 'head-prepend' as const,
          },
        ]
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: '_headers',
          source: renderStaticSecurityHeaders('/play/*'),
        })
      },
    },
  ],
  build: {
    // The repeatable initial-request budget report consumes this graph instead
    // of assuming Vite's hashed filenames or manual chunk layout.
    manifest: true,
    sourcemap: false,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
})
