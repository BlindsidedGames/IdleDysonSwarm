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

function developmentTelemetryPlugin(): Plugin {
  const entries: string[] = []
  return {
    name: 'idle-dyson-swarm-development-telemetry',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        '/__ids_dev_telemetry',
        (request, response, next) => {
          if (request.method === 'GET') {
            response.statusCode = 200
            response.setHeader('content-type', 'application/x-ndjson')
            response.end(entries.join('\n'))
            return
          }
          if (request.method !== 'POST') {
            next()
            return
          }
          let body = ''
          request.setEncoding('utf8')
          request.on('data', (chunk: string) => {
            body += chunk
          })
          request.on('end', () => {
            if (body.trim().length > 0) {
              entries.push(body)
              if (entries.length > 1_000) entries.shift()
            }
            response.statusCode = 204
            response.end()
          })
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const nativeBuild = mode === 'native'
  return {
    base: nativeBuild ? './' : PWA_BASE_PATH,
    plugins: [
      developmentTelemetryPlugin(),
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
