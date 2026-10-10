import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate'
import { serializeSharedWebSave } from '../save/serialization'

/** Historical public transport fixtures only; never a gameplay downgrade API. */
export function publicCloudFixture(save: Parameters<typeof serializeSharedWebSave>[0]): string {
  const compressed = Uint8Array.from(atob(serializeSharedWebSave(save).slice('IDLEDS:'.length)), char => char.charCodeAt(0))
  const envelope = JSON.parse(strFromU8(gunzipSync(compressed)))
  envelope.format = 'IDSWEB1'
  // Explicit future inputs must still test future-schema refusal.
  if (envelope.schema <= 21) envelope.schema = envelope.state.saveVersion = 20
  const encoded = gzipSync(strToU8(JSON.stringify(envelope)), { mtime: 0 })
  return `IDSWEB1:${btoa(Array.from(encoded, byte => String.fromCharCode(byte)).join(''))}`
}
