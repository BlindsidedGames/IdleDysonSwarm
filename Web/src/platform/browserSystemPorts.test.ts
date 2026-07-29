import { describe, expect, test } from 'vitest'
import {
  BrowserClipboardAdapter,
  BrowserExternalNavigationAdapter,
} from './browserSystemPorts'

describe('browser clipboard and external navigation ports', () => {
  test('delegates clipboard operations through an injectable browser port', async () => {
    let clipboardText = 'import'
    const adapter = new BrowserClipboardAdapter({
      readText: async () => clipboardText,
      writeText: async (value) => {
        clipboardText = value
      },
    })

    await expect(adapter.readText()).resolves.toBe('import')
    await adapter.writeText('recovery')
    await expect(adapter.readText()).resolves.toBe('recovery')
  })

  test('opens only allowlisted HTTPS origins with opener isolation', async () => {
    const opened: string[] = []
    const adapter = new BrowserExternalNavigationAdapter(
      ['https://blindsidedgames.com/support'],
      (url, target, features) => {
        opened.push(`${url}|${target}|${features}`)
      },
    )

    await adapter.openUrl(
      'https://blindsidedgames.com/wiki/getting-started',
    )
    await expect(
      adapter.openUrl('http://blindsidedgames.com'),
    ).rejects.toThrow('not approved')
    await expect(
      adapter.openUrl('https://example.com'),
    ).rejects.toThrow('not approved')

    expect(opened).toEqual([
      'https://blindsidedgames.com/wiki/getting-started|_blank|noopener,noreferrer',
    ])
  })
})
