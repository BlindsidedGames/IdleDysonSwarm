import {
  assertSuppliedSaveTextLimit,
  DEFAULT_SAVE_IMPORT_LIMITS,
  SaveImportLimitError,
  type SaveImportLimits,
} from '../save/decodeIdb1'
import type { LegacySaveCandidate } from '../save/repository'
import { requireBrowserCapability } from './browserEnvironment'

export interface BrowserSuppliedFile {
  readonly name: string
  readonly size: number
  text(): Promise<string>
}

export interface BrowserDropData {
  readonly files: ArrayLike<BrowserSuppliedFile>
  getData(format: string): string
}

export interface BrowserSuppliedSave {
  readonly source: 'file' | 'paste' | 'drop'
  readonly name?: string
  readonly text: string
  readonly suppliedBytes: number
}

export class BrowserSaveImportReader {
  private readonly limits: Readonly<SaveImportLimits>

  constructor(
    limits: Readonly<SaveImportLimits> =
      DEFAULT_SAVE_IMPORT_LIMITS,
  ) {
    this.limits = limits
  }

  async readFile(
    file: BrowserSuppliedFile,
    source: 'file' | 'drop' = 'file',
  ): Promise<BrowserSuppliedSave> {
    if (file.size > this.limits.suppliedTextBytes) {
      throw new SaveImportLimitError(
        'supplied-text',
        this.limits.suppliedTextBytes,
      )
    }
    const text = await file.text()
    const suppliedBytes = assertSuppliedSaveTextLimit(
      text,
      this.limits,
    )
    return Object.freeze({
      source,
      name: file.name,
      text,
      suppliedBytes,
    })
  }

  readPaste(text: string): BrowserSuppliedSave {
    return this.fromText('paste', text)
  }

  async readDrop(
    transfer: BrowserDropData,
  ): Promise<BrowserSuppliedSave> {
    const file = transfer.files[0]
    if (file !== undefined) return this.readFile(file, 'drop')
    return this.fromText(
      'drop',
      transfer.getData('text/plain'),
    )
  }

  private fromText(
    source: 'paste' | 'drop',
    text: string,
  ): BrowserSuppliedSave {
    const suppliedBytes = assertSuppliedSaveTextLimit(
      text,
      this.limits,
    )
    return Object.freeze({
      source,
      text,
      suppliedBytes,
    })
  }
}

export interface BrowserLegacyRecoveryStore {
  retainLegacyCandidate(
    text: string,
    id?: string,
  ): Promise<LegacySaveCandidate>
}

export class BrowserRecoveryBlobRetainer {
  private readonly storage: BrowserLegacyRecoveryStore

  constructor(storage: BrowserLegacyRecoveryStore) {
    this.storage = storage
  }

  retainOriginal(
    supplied: BrowserSuppliedSave,
  ): Promise<LegacySaveCandidate> {
    return this.storage.retainLegacyCandidate(supplied.text)
  }
}

export interface TextDownloadPort {
  downloadText(
    fileName: string,
    text: string,
    mediaType: string,
  ): void
}

export interface RecoveryBlobReadPort {
  readText(path: string): Promise<string>
}

export class BrowserRecoveryBlobExporter {
  private readonly storage: RecoveryBlobReadPort
  private readonly downloads: TextDownloadPort

  constructor(
    storage: RecoveryBlobReadPort,
    downloads: TextDownloadPort = new BrowserTextDownloadAdapter(),
  ) {
    this.storage = storage
    this.downloads = downloads
  }

  async export(
    recoveryPath: string,
    fileName = 'idle-dyson-swarm-original-idb1.txt',
  ): Promise<void> {
    const text = await this.storage.readText(recoveryPath)
    this.downloads.downloadText(
      fileName,
      text,
      'text/plain;charset=utf-8',
    )
  }
}

export interface BrowserDownloadEnvironment {
  createBlob(
    parts: BlobPart[],
    options: BlobPropertyBag,
  ): Blob
  createObjectUrl(blob: Blob): string
  revokeObjectUrl(url: string): void
  activateDownload(url: string, fileName: string): void
}

export class BrowserTextDownloadAdapter implements TextDownloadPort {
  private readonly environment: BrowserDownloadEnvironment

  constructor(
    environment: BrowserDownloadEnvironment =
      defaultDownloadEnvironment,
  ) {
    this.environment = environment
  }

  downloadText(
    fileName: string,
    text: string,
    mediaType: string,
  ): void {
    const blob = this.environment.createBlob([text], {
      type: mediaType,
    })
    const url = this.environment.createObjectUrl(blob)
    try {
      this.environment.activateDownload(url, fileName)
    } finally {
      this.environment.revokeObjectUrl(url)
    }
  }
}

const defaultDownloadEnvironment: BrowserDownloadEnvironment = {
  createBlob: (parts, options) => {
    const BlobConstructor = requireBrowserCapability(
      'Download',
      globalThis.Blob,
    )
    return new BlobConstructor(parts, options)
  },
  createObjectUrl: (blob) =>
    requireBrowserCapability(
      'Download',
      globalThis.URL?.createObjectURL,
    ).call(globalThis.URL, blob),
  revokeObjectUrl: (url) => {
    requireBrowserCapability(
      'Download',
      globalThis.URL?.revokeObjectURL,
    ).call(globalThis.URL, url)
  },
  activateDownload: (url, fileName) => {
    const anchor = requireBrowserCapability(
      'Document',
      globalThis.document,
    ).createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    anchor.click()
  },
}
