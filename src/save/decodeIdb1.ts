import { Gunzip } from 'fflate'
import { decodeOdinBinary, type OdinDecodedDocument } from './odinBinary'

const IDB1_PREFIX = 'IDB1:'
export const GZIP_INPUT_CHUNK_BYTES = 64
export const MAXIMUM_GZIP_CALLBACK_BYTES = 128 * 1024

export interface SaveImportLimits {
  readonly suppliedTextBytes: number
  readonly decodedPayloadBytes: number
  readonly inflatedBinaryBytes: number
}

export const DEFAULT_SAVE_IMPORT_LIMITS: Readonly<SaveImportLimits> =
  Object.freeze({
    suppliedTextBytes: 2 * 1024 * 1024,
    decodedPayloadBytes: 1 * 1024 * 1024,
    inflatedBinaryBytes: 8 * 1024 * 1024,
  })

export type SaveImportLimitStage =
  | 'supplied-text'
  | 'decoded-payload'
  | 'inflated-binary'

export class SaveImportLimitError extends Error {
  readonly stage: SaveImportLimitStage
  readonly limitBytes: number

  constructor(stage: SaveImportLimitStage, limitBytes: number) {
    super(
      `Imported save exceeds the ${stage} limit of ${limitBytes} bytes.`,
    )
    this.name = 'SaveImportLimitError'
    this.stage = stage
    this.limitBytes = limitBytes
  }
}

export interface DecodedIdleDysonSave extends OdinDecodedDocument {
  envelope: 'IDB1'
  compressedBytes: number
  binaryBytes: number
}

export type InflatedBufferAllocator = (bytes: number) => Uint8Array

export interface BoundedInflateProgress {
  readonly compressedBytesFed: number
  readonly callbackBytes: number
  readonly emittedBytes: number
}

/**
 * Test-only diagnostic invoked before the observed callback is validated or
 * copied. An observer exception propagates and leaves that chunk unapplied.
 */
export type BoundedInflateObserver = (
  progress: Readonly<BoundedInflateProgress>,
) => void

export function decodeIdb1Save(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
  allocateInflatedBuffer: InflatedBufferAllocator = (bytes) =>
    new Uint8Array(bytes),
  observeInflate?: BoundedInflateObserver,
): DecodedIdleDysonSave {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (!trimmed.toUpperCase().startsWith(IDB1_PREFIX)) {
    throw new Error('Save does not begin with the IDB1 envelope')
  }

  const payload = trimmed.slice(IDB1_PREFIX.length)
  if (!payload) throw new Error('IDB1 save payload is empty')
  const compressed = decodeBase64Bounded(
    payload,
    limits.decodedPayloadBytes,
    'IDB1',
  )
  const binary =
    compressed[0] === 0x1f && compressed[1] === 0x8b
      ? gunzipBounded(
          compressed,
          limits.inflatedBinaryBytes,
          allocateInflatedBuffer,
          observeInflate,
          'IDB1',
        )
      : compressed
  if (binary.byteLength > limits.inflatedBinaryBytes) {
    throw new SaveImportLimitError(
      'inflated-binary',
      limits.inflatedBinaryBytes,
    )
  }
  const decoded = decodeOdinBinary(binary)
  return {
    ...decoded,
    envelope: 'IDB1',
    compressedBytes: compressed.byteLength,
    binaryBytes: binary.byteLength,
  }
}

/**
 * Decodes the canonical Unity payload to the player save graph consumed by
 * migration. The surrounding Odin document contains decoder diagnostics and
 * type metadata; it is not itself game state.
 */
export function decodeIdb1SaveRoot(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): unknown {
  return decodeIdb1Save(text, limits).root
}

export function assertSuppliedSaveTextLimit(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): number {
  const byteLength = boundedUtf8ByteLength(
    text,
    limits.suppliedTextBytes,
  )
  if (byteLength > limits.suppliedTextBytes) {
    throw new SaveImportLimitError(
      'supplied-text',
      limits.suppliedTextBytes,
    )
  }
  return byteLength
}

export function decodeBase64Bounded(
  value: string,
  limitBytes: number,
  envelopeName = 'save',
): Uint8Array {
  const decodedLength = base64DecodedLength(value, envelopeName)
  if (decodedLength > limitBytes) {
    throw new SaveImportLimitError('decoded-payload', limitBytes)
  }

  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw new Error(`${envelopeName} payload is not valid base64`)
  }
  const decoded = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    decoded[index] = binary.charCodeAt(index)
  }
  return decoded
}

function base64DecodedLength(
  value: string,
  envelopeName: string,
): number {
  if (value.length % 4 === 1) {
    throw new Error(`${envelopeName} payload is not valid base64`)
  }
  const padding =
    value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor((value.length * 3) / 4) - padding
}

export function gunzipBounded(
  compressed: Uint8Array,
  limitBytes: number,
  allocateInflatedBuffer: InflatedBufferAllocator,
  observeInflate: BoundedInflateObserver | undefined,
  envelopeName = 'save',
): Uint8Array {
  if (compressed.byteLength < 18) {
    throw new Error(`${envelopeName} payload contains invalid gzip data`)
  }
  const advertisedBytes = new DataView(
    compressed.buffer,
    compressed.byteOffset + compressed.byteLength - 4,
    4,
  ).getUint32(0, true)
  if (advertisedBytes > limitBytes) {
    throw new SaveImportLimitError('inflated-binary', limitBytes)
  }

  /*
   * Do not trust ISIZE as an allocation or work bound: it is attacker
   * controlled and only the low 32 bits of the real size. Streaming at 64
   * compressed bytes per push forces fflate to return control after each
   * small unit of DEFLATE work. The callback throws as soon as cumulative
   * output crosses the approved ceiling, and the input loop consequently
   * never feeds the remainder of a forged high-ratio stream.
   *
   * DEFLATE's maximum ratio is 1,032 output bytes per compressed byte.
   * Including fflate's retained 32 KiB history, the conservative callback
   * ceiling below is 128 KiB. The retained allocation is only the valid
   * stream's advertised size, never the global ceiling, and malformed-stream
   * overflow work/allocation is capped at one 128 KiB callback. Tests
   * instrument both compressed input consumed and callback overshoot to lock
   * this behavior to the bundled fflate version.
   */
  const output = allocateInflatedBuffer(advertisedBytes)
  if (output.byteLength !== advertisedBytes) {
    throw new Error(
      `${envelopeName} bounded-inflation allocator returned an unexpected size.`,
    )
  }
  let emittedBytes = 0
  let compressedBytesFed = 0
  const gunzip = new Gunzip((chunk) => {
    const nextEmittedBytes = emittedBytes + chunk.byteLength
    observeInflate?.(
      Object.freeze({
        compressedBytesFed,
        callbackBytes: chunk.byteLength,
        emittedBytes: nextEmittedBytes,
      }),
    )
    if (chunk.byteLength > MAXIMUM_GZIP_CALLBACK_BYTES) {
      throw new SaveImportLimitError('inflated-binary', limitBytes)
    }
    if (nextEmittedBytes > limitBytes) {
      throw new SaveImportLimitError('inflated-binary', limitBytes)
    }
    if (nextEmittedBytes > advertisedBytes) {
      throw new Error(
        `${envelopeName} gzip output exceeds its advertised binary size.`,
      )
    }
    output.set(chunk, emittedBytes)
    emittedBytes = nextEmittedBytes
  })
  for (
    let offset = 0;
    offset < compressed.byteLength;
    offset += GZIP_INPUT_CHUNK_BYTES
  ) {
    const end = Math.min(
      compressed.byteLength,
      offset + GZIP_INPUT_CHUNK_BYTES,
    )
    compressedBytesFed = end
    gunzip.push(
      compressed.subarray(offset, end),
      end === compressed.byteLength,
    )
  }
  if (emittedBytes !== advertisedBytes) {
    throw new Error(
      `${envelopeName} gzip output does not match its advertised binary size.`,
    )
  }
  return output.subarray(0, emittedBytes)
}

function boundedUtf8ByteLength(
  value: string,
  maximum: number,
): number {
  let bytes = 0
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code < 0x80) {
      bytes += 1
    } else if (code < 0x800) {
      bytes += 2
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length
    ) {
      const low = value.charCodeAt(index + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4
        index += 1
      } else {
        bytes += 3
      }
    } else {
      bytes += 3
    }
    if (bytes > maximum) return bytes
  }
  return bytes
}

export function getSavePath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (value === null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[segment]
  }, root)
}

export function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Uint8Array) return `[${value.byteLength} bytes]`
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, jsonSafe(entry)]),
    )
  }
  return value
}
