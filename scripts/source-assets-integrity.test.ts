import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const webRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(resolve(webRoot, path))).digest('hex')
}

describe('preserved source assets', () => {
  test('retains the application, soundtrack, and Steam icon masters byte-for-byte', () => {
    expect(sha256('source-assets/branding/unity-app-icon.png')).toBe(
      '47064cffd68541f3e75560352ba6333d7cf849279e7213fb8806a155d3eccfcd',
    )
    expect(sha256('source-assets/audio/IDS-master.wav')).toBe(
      '2ab4636ee5970a729ece6106dfbb8b8252ae44a8b1fa89a780f224b4e4296602',
    )
    expect(sha256('source-assets/platform/steam/steam-icon.png')).toBe(
      'a391b690a3ab357e609d38b96d1e4eb01ac33f435536acaeb5993ae2809af317',
    )
  })

  test('retains all 27 achievement PNG masters byte-for-byte', () => {
    const directory = resolve(webRoot, 'source-assets/achievements/legacy-unity')
    const names = readdirSync(directory).filter((name) => name.endsWith('.png')).sort()
    expect(names).toHaveLength(27)
    const manifest = names
      .map((name) => {
        const path = `source-assets/achievements/legacy-unity/${name}`
        return `${sha256(path)}  ${path}\n`
      })
      .join('')
    expect(createHash('sha256').update(manifest).digest('hex')).toBe(
      '94db716f62d992c4f60e369f80547a62fc302bbbb2148dacb3aa76aa03981b4a',
    )
  })
})
