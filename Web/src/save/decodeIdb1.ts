import { gunzipSync } from 'fflate'
import { decodeOdinBinary, type OdinDecodedDocument } from './odinBinary'

const IDB1_PREFIX = 'IDB1:'

export interface DecodedIdleDysonSave extends OdinDecodedDocument {
  envelope: 'IDB1'
  compressedBytes: number
  binaryBytes: number
}

export function decodeIdb1Save(text: string): DecodedIdleDysonSave {
  const trimmed = text.trim()
  if (!trimmed.toUpperCase().startsWith(IDB1_PREFIX)) {
    throw new Error('Save does not begin with the IDB1 envelope')
  }

  const payload = trimmed.slice(IDB1_PREFIX.length)
  if (!payload) throw new Error('IDB1 save payload is empty')
  const compressed = decodeBase64(payload)
  const binary =
    compressed[0] === 0x1f && compressed[1] === 0x8b
      ? gunzipSync(compressed)
      : compressed
  const decoded = decodeOdinBinary(binary)
  return {
    ...decoded,
    envelope: 'IDB1',
    compressedBytes: compressed.byteLength,
    binaryBytes: binary.byteLength,
  }
}

function decodeBase64(value: string): Uint8Array {
  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw new Error('IDB1 payload is not valid base64')
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
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
