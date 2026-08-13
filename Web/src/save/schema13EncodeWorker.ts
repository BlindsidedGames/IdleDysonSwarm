import { encodeSchema13WebSave, type Schema13WebSaveSource } from './schema13'
import { restoreGameDecimal } from '../math/gameDecimal'

interface EncodeRequest {
  readonly id: number
  readonly source: Readonly<Schema13WebSaveSource>
}

interface EncodeResponse {
  readonly id: number
  readonly portableSaveBlob?: Blob
  readonly error?: string
}

self.onmessage = (event: MessageEvent<EncodeRequest>) => {
  const request = event.data
  let response: EncodeResponse
  try {
    response = Object.freeze({
      id: request.id,
      portableSaveBlob: new Blob(
        [encodeSchema13WebSave(
          deepFreeze(restoreTransferredGameDecimals(request.source)),
        )],
        { type: 'text/plain;charset=utf-8' },
      ),
    })
  } catch (error) {
    response = Object.freeze({
      id: request.id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  self.postMessage(response)
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function restoreTransferredGameDecimals<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  const names = Object.getOwnPropertyNames(value).sort()
  if (
    names.length === 2 && names[0] === 'exponent' && names[1] === 'mantissa' &&
    typeof (value as { mantissa?: unknown }).mantissa === 'number' &&
    typeof (value as { exponent?: unknown }).exponent === 'number'
  ) {
    return restoreGameDecimal(value) as T
  }
  for (const key of Object.keys(value)) {
    const record = value as Record<string, unknown>
    record[key] = restoreTransferredGameDecimals(record[key])
  }
  return value
}
