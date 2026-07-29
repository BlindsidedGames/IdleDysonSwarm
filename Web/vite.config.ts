import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
  SECURITY_HEADERS,
} from './securityHeaders.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
          source: renderStaticSecurityHeaders(),
        })
      },
    },
  ],
  build: {
    sourcemap: false,
  },
  preview: {
    headers: SECURITY_HEADERS,
  },
})
