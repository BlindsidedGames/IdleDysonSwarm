const GZIP_TRAILER_BYTES = 8

const crc32Table = new Uint32Array(256)
for (let index = 0; index < crc32Table.length; index += 1) {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1
      ? 0xedb88320 ^ (value >>> 1)
      : value >>> 1
  }
  crc32Table[index] = value >>> 0
}

function crc32(value: Uint8Array): number {
  let checksum = 0xffffffff
  for (const byte of value) {
    checksum = crc32Table[(checksum ^ byte) & 0xff]! ^ (checksum >>> 8)
  }
  return (checksum ^ 0xffffffff) >>> 0
}

/** Verifies the integrity trailer of one bounded, already-inflated gzip member. */
export function assertGzipTrailerIntegrity(
  compressed: Uint8Array,
  inflated: Uint8Array,
  envelopeName: string,
): void {
  if (compressed.byteLength < GZIP_TRAILER_BYTES) {
    throw new Error(`${envelopeName} contains invalid gzip data.`)
  }
  const trailer = new DataView(
    compressed.buffer,
    compressed.byteOffset + compressed.byteLength - GZIP_TRAILER_BYTES,
    GZIP_TRAILER_BYTES,
  )
  const expectedChecksum = trailer.getUint32(0, true)
  const expectedSize = trailer.getUint32(4, true)
  if (inflated.byteLength !== expectedSize) {
    throw new Error(`${envelopeName} gzip size does not match its trailer.`)
  }
  if (crc32(inflated) !== expectedChecksum) {
    throw new Error(`${envelopeName} gzip checksum does not match its trailer.`)
  }
}
