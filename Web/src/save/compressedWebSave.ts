import { gzipSync } from 'fflate'
import type { SaveRecord } from './graph'
import {
  assertSuppliedSaveTextLimit,
  decodeBase64Bounded,
  DEFAULT_SAVE_IMPORT_LIMITS,
  gunzipBounded,
  type SaveImportLimits,
} from './decodeIdb1'
import {
  deserializeWebSaveBounded,
  serializeWebSave,
} from './serialization'

export const COMPRESSED_WEB_SAVE_PREFIX = 'IDSWEB1:'

export function serializeCompressedWebSave(save: SaveRecord): string {
  const canonicalText = serializeWebSave(save)
  const compressed = gzipSync(new TextEncoder().encode(canonicalText))
  return `${COMPRESSED_WEB_SAVE_PREFIX}${encodeBase64(compressed)}`
}

export function deserializeCompressedWebSave(
  text: string,
  limits: Readonly<SaveImportLimits> = DEFAULT_SAVE_IMPORT_LIMITS,
): SaveRecord {
  assertSuppliedSaveTextLimit(text, limits)
  const trimmed = text.trim()
  if (!trimmed.toUpperCase().startsWith(COMPRESSED_WEB_SAVE_PREFIX)) {
    throw new Error(
      `Save does not begin with the ${COMPRESSED_WEB_SAVE_PREFIX.slice(0, -1)} envelope`,
    )
  }
  const payload = trimmed.slice(COMPRESSED_WEB_SAVE_PREFIX.length)
  if (payload.length === 0) {
    throw new Error('Compressed Web save payload is empty')
  }
  const compressed = decodeBase64Bounded(
    payload,
    limits.decodedPayloadBytes,
    'IDSWEB1',
  )
  const canonicalBytes = gunzipBounded(
    compressed,
    limits.suppliedTextBytes,
    (bytes) => new Uint8Array(bytes),
    undefined,
    'IDSWEB1',
  )
  let canonicalText: string
  try {
    canonicalText = new TextDecoder('utf-8', { fatal: true }).decode(
      canonicalBytes,
    )
  } catch {
    throw new Error('IDSWEB1 payload is not valid UTF-8')
  }
  return deserializeWebSaveBounded(canonicalText, limits)
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = []
  const chunkBytes = 32 * 1024
  for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
    chunks.push(
      String.fromCharCode(...bytes.subarray(offset, offset + chunkBytes)),
    )
  }
  return btoa(chunks.join(''))
}
