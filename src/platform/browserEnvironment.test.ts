import { afterEach, describe, expect, test, vi } from 'vitest'
import type { BrowserSaveDatabase } from './browserSaveDatabase'
import { IndexedDbBrowserSaveDatabase } from './browserSaveDatabase'
import {
  BrowserCapabilityUnavailableError,
  requireBrowserCapability,
} from './browserEnvironment'
import { BrowserLifecycleAdapter } from './browserLifecycle'
import { BrowserTextDownloadAdapter } from './browserSaveTransfer'
import { BrowserStorageStatusAdapter } from './browserStorageStatus'
import {
  BrowserClipboardAdapter,
  BrowserExternalNavigationAdapter,
} from './browserSystemPorts'
import {
  BrowserBroadcastOwnershipChannel,
  BrowserWriterLease,
} from './browserWriterLease'

describe.sequential('non-browser capability guards', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('uses a typed error instead of dereferencing an absent capability', () => {
    expect(() =>
      requireBrowserCapability('IndexedDB', undefined),
    ).toThrowError(BrowserCapabilityUnavailableError)
  })

  test('guards IndexedDB, document, clipboard, crypto, and BroadcastChannel defaults', () => {
    vi.stubGlobal('indexedDB', undefined)
    expect(
      () => new IndexedDbBrowserSaveDatabase('test'),
    ).toThrow('IndexedDB')

    vi.stubGlobal('document', undefined)
    expect(() => new BrowserLifecycleAdapter()).toThrow(
      'Document',
    )

    vi.stubGlobal('navigator', undefined)
    expect(() => new BrowserClipboardAdapter()).toThrow(
      'Clipboard',
    )

    vi.stubGlobal('crypto', undefined)
    expect(
      () =>
        new BrowserWriterLease({
          database: {} as BrowserSaveDatabase,
        }),
    ).toThrow('Crypto')

    vi.stubGlobal('BroadcastChannel', undefined)
    expect(
      () => new BrowserBroadcastOwnershipChannel('test'),
    ).toThrow('BroadcastChannel')
  })

  test('reports unsupported storage and deliberately fails unavailable download/navigation calls', async () => {
    vi.stubGlobal('navigator', undefined)
    await expect(
      new BrowserStorageStatusAdapter().inspect(true),
    ).resolves.toMatchObject({
      persistenceSupported: false,
      persisted: false,
    })

    vi.stubGlobal('document', undefined)
    expect(() =>
      new BrowserTextDownloadAdapter().downloadText(
        'save.txt',
        'save',
        'text/plain',
      ),
    ).toThrow('Document')

    vi.stubGlobal('window', undefined)
    await expect(
      new BrowserExternalNavigationAdapter([
        'https://example.com',
      ]).openUrl('https://example.com/save'),
    ).rejects.toThrow('Navigation')
  })
})
