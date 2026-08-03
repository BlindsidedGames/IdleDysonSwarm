import { defineConfig, type Plugin } from 'vite'
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

function nativeRelativeHtmlPlugin(): Plugin {
  return {
    name: 'idle-dyson-swarm-native-relative-html',
    transformIndexHtml(html) {
      return html.replaceAll('/play/', './')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const nativeBuild = mode === 'native'
  return {
    base: nativeBuild ? './' : PWA_BASE_PATH,
    plugins: [
      stripMessageAuthoringMetadataPlugin(),
      react(),
      ...(nativeBuild
        ? [nativeRelativeHtmlPlugin()]
        : [pwaPackagePlugin()]),
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
          if (nativeBuild) return
          this.emitFile({
            type: 'asset',
            fileName: '_headers',
            source: renderStaticSecurityHeaders('/play/*'),
          })
        },
      },
    ],
    build: {
      // Native schemes and Electron's file loader require relative asset URLs.
      outDir: nativeBuild ? 'dist-native' : 'dist',
      // The repeatable initial-request budget report consumes this graph instead
      // of assuming Vite's hashed filenames or manual chunk layout.
      manifest: true,
      sourcemap: false,
    },
    preview: {
      headers: SECURITY_HEADERS,
    },
  }
})
