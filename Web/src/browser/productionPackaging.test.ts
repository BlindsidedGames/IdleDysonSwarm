import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative, resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { build } from 'vite'
import { describe, expect, test } from 'vitest'
import {
  HTML_CONTENT_SECURITY_POLICY,
  renderStaticSecurityHeaders,
} from '../../securityHeaders'

describe('production browser package', () => {
  test('excludes developer fixtures and source maps while retaining the exact CSP', async () => {
    const outputDirectory = mkdtempSync(
      join(tmpdir(), 'idle-dyson-swarm-package-'),
    )
    try {
      await build({
        configFile: resolve(
          import.meta.dirname,
          '../../vite.config.ts',
        ),
        logLevel: 'silent',
        build: {
          outDir: outputDirectory,
          emptyOutDir: true,
        },
      })

      const outputFiles = listFiles(outputDirectory)
      const outputRelativePaths = outputFiles.map((file) =>
        relative(outputDirectory, file).replaceAll('\\', '/'),
      )
      const fixtureNames = readdirSync(
        resolve(import.meta.dirname, '../../test/fixtures'),
      )
      const outputText = outputFiles
        .filter((file) =>
          /\.(?:css|html|js|json|txt|webmanifest)$/.test(file),
        )
        .map((file) => readFileSync(file, 'utf8'))
        .join('\n')

      expect(outputRelativePaths).not.toEqual([])
      expect(
        outputRelativePaths.some((file) =>
          file.split('/').includes('fixtures'),
        ),
      ).toBe(false)
      expect(
        outputRelativePaths.some((file) => file.endsWith('.map')),
      ).toBe(false)
      expect(
        outputRelativePaths.some((file) => /\.test\.[cm]?[jt]sx?$/.test(file)),
      ).toBe(false)
      for (const fixtureName of fixtureNames) {
        expect(
          outputFiles.some((file) => basename(file) === fixtureName),
        ).toBe(false)
        const fixturePrefix = readFileSync(
          resolve(
            import.meta.dirname,
            '../../test/fixtures',
            fixtureName,
          ),
          'utf8',
        ).slice(0, 512)
        expect(outputText).not.toContain(fixturePrefix)
      }

      expect(
        readFileSync(resolve(outputDirectory, '_headers'), 'utf8'),
      ).toBe(renderStaticSecurityHeaders())
      const html = readFileSync(
        resolve(outputDirectory, 'index.html'),
        'utf8',
      )
      const document = new JSDOM(html).window.document
      expect(
        document
          .querySelector(
            'meta[http-equiv="Content-Security-Policy"]',
          )
          ?.getAttribute('content'),
      ).toBe(HTML_CONTENT_SECURITY_POLICY)
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true })
    }
  })
})

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? listFiles(path) : [path]
  })
}
