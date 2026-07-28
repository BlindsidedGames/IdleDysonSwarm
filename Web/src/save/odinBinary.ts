/*
 * Binary protocol reader derived from Team Sirenix's Apache-2.0 Odin Serializer
 * BinaryDataReader and BinaryEntryType implementations.
 *
 * This is a clean TypeScript compatibility reader. It does not instantiate old
 * C# types; it reconstructs their serialized data as plain JavaScript values.
 */

export type OdinPrimitive = null | boolean | number | string | bigint

interface OdinEntryBase {
  name: string | null
}

interface OdinPrimitiveEntry extends OdinEntryBase {
  kind: 'primitive'
  value: OdinPrimitive | Uint8Array
}

interface OdinNodeEntry extends OdinEntryBase {
  kind: 'node'
  typeName: string | null
  referenceId: number | null
  children: OdinEntry[]
}

interface OdinArrayEntry extends OdinEntryBase {
  kind: 'array'
  declaredLength: bigint
  items: OdinEntry[]
}

interface OdinPrimitiveArrayEntry extends OdinEntryBase {
  kind: 'primitive-array'
  elementCount: number
  bytesPerElement: number
  bytes: Uint8Array
}

interface OdinInternalReferenceEntry extends OdinEntryBase {
  kind: 'internal-reference'
  referenceId: number
}

export type OdinEntry =
  | OdinPrimitiveEntry
  | OdinNodeEntry
  | OdinArrayEntry
  | OdinPrimitiveArrayEntry
  | OdinInternalReferenceEntry

export interface OdinDecodedDocument {
  root: unknown
  rootType: string | null
  bytesRead: number
  byteLength: number
}

const BinaryEntryType = {
  Invalid: 0x00,
  NamedStartOfReferenceNode: 0x01,
  UnnamedStartOfReferenceNode: 0x02,
  NamedStartOfStructNode: 0x03,
  UnnamedStartOfStructNode: 0x04,
  EndOfNode: 0x05,
  StartOfArray: 0x06,
  EndOfArray: 0x07,
  PrimitiveArray: 0x08,
  NamedInternalReference: 0x09,
  UnnamedInternalReference: 0x0a,
  NamedExternalReferenceByIndex: 0x0b,
  UnnamedExternalReferenceByIndex: 0x0c,
  NamedExternalReferenceByGuid: 0x0d,
  UnnamedExternalReferenceByGuid: 0x0e,
  NamedSByte: 0x0f,
  UnnamedSByte: 0x10,
  NamedByte: 0x11,
  UnnamedByte: 0x12,
  NamedShort: 0x13,
  UnnamedShort: 0x14,
  NamedUShort: 0x15,
  UnnamedUShort: 0x16,
  NamedInt: 0x17,
  UnnamedInt: 0x18,
  NamedUInt: 0x19,
  UnnamedUInt: 0x1a,
  NamedLong: 0x1b,
  UnnamedLong: 0x1c,
  NamedULong: 0x1d,
  UnnamedULong: 0x1e,
  NamedFloat: 0x1f,
  UnnamedFloat: 0x20,
  NamedDouble: 0x21,
  UnnamedDouble: 0x22,
  NamedDecimal: 0x23,
  UnnamedDecimal: 0x24,
  NamedChar: 0x25,
  UnnamedChar: 0x26,
  NamedString: 0x27,
  UnnamedString: 0x28,
  NamedGuid: 0x29,
  UnnamedGuid: 0x2a,
  NamedBoolean: 0x2b,
  UnnamedBoolean: 0x2c,
  NamedNull: 0x2d,
  UnnamedNull: 0x2e,
  TypeName: 0x2f,
  TypeId: 0x30,
  EndOfStream: 0x31,
  NamedExternalReferenceByString: 0x32,
  UnnamedExternalReferenceByString: 0x33,
} as const

const namedEntryTypes = new Set<number>([
  BinaryEntryType.NamedStartOfReferenceNode,
  BinaryEntryType.NamedStartOfStructNode,
  BinaryEntryType.NamedInternalReference,
  BinaryEntryType.NamedExternalReferenceByIndex,
  BinaryEntryType.NamedExternalReferenceByGuid,
  BinaryEntryType.NamedSByte,
  BinaryEntryType.NamedByte,
  BinaryEntryType.NamedShort,
  BinaryEntryType.NamedUShort,
  BinaryEntryType.NamedInt,
  BinaryEntryType.NamedUInt,
  BinaryEntryType.NamedLong,
  BinaryEntryType.NamedULong,
  BinaryEntryType.NamedFloat,
  BinaryEntryType.NamedDouble,
  BinaryEntryType.NamedDecimal,
  BinaryEntryType.NamedChar,
  BinaryEntryType.NamedString,
  BinaryEntryType.NamedGuid,
  BinaryEntryType.NamedBoolean,
  BinaryEntryType.NamedNull,
  BinaryEntryType.NamedExternalReferenceByString,
])

export class OdinBinaryDecodeError extends Error {
  readonly offset: number

  constructor(message: string, offset: number) {
    super(`${message} (offset ${offset})`)
    this.name = 'OdinBinaryDecodeError'
    this.offset = offset
  }
}

class OdinBinaryReader {
  private readonly bytes: Uint8Array
  private readonly view: DataView
  private offset = 0
  private readonly types = new Map<number, string | null>()
  private readonly referenceNodes = new Map<number, OdinNodeEntry>()
  private readonly materializedReferences = new Map<number, unknown>()

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  decode(): OdinDecodedDocument {
    const rootEntry = this.readEntry()
    if (!rootEntry) {
      throw this.error('The Odin stream did not contain a root value')
    }

    const root = this.materialize(rootEntry)
    return {
      root,
      rootType: rootEntry.kind === 'node' ? rootEntry.typeName : null,
      bytesRead: this.offset,
      byteLength: this.bytes.byteLength,
    }
  }

  private readEntry(): OdinEntry | null {
    const tagOffset = this.offset
    const tag = this.readUint8()
    if (tag === BinaryEntryType.EndOfStream) return null
    if (tag === BinaryEntryType.EndOfNode || tag === BinaryEntryType.EndOfArray) {
      this.offset = tagOffset
      return null
    }

    if (tag === BinaryEntryType.TypeName || tag === BinaryEntryType.TypeId) {
      throw this.error('Type metadata appeared outside a node')
    }

    const name = namedEntryTypes.has(tag) ? this.readStringValue() : null

    switch (tag) {
      case BinaryEntryType.NamedStartOfReferenceNode:
      case BinaryEntryType.UnnamedStartOfReferenceNode:
        return this.readNode(name, true)

      case BinaryEntryType.NamedStartOfStructNode:
      case BinaryEntryType.UnnamedStartOfStructNode:
        return this.readNode(name, false)

      case BinaryEntryType.StartOfArray:
        return this.readArray()

      case BinaryEntryType.PrimitiveArray:
        return this.readPrimitiveArray()

      case BinaryEntryType.NamedInternalReference:
      case BinaryEntryType.UnnamedInternalReference:
        return { kind: 'internal-reference', name, referenceId: this.readInt32() }

      case BinaryEntryType.NamedExternalReferenceByIndex:
      case BinaryEntryType.UnnamedExternalReferenceByIndex:
        return this.primitive(name, this.readInt32())

      case BinaryEntryType.NamedExternalReferenceByGuid:
      case BinaryEntryType.UnnamedExternalReferenceByGuid:
      case BinaryEntryType.NamedGuid:
      case BinaryEntryType.UnnamedGuid:
        return this.primitive(name, this.readGuid())

      case BinaryEntryType.NamedExternalReferenceByString:
      case BinaryEntryType.UnnamedExternalReferenceByString:
        return this.primitive(name, this.readStringValue())

      case BinaryEntryType.NamedSByte:
      case BinaryEntryType.UnnamedSByte:
        return this.primitive(name, this.readInt8())

      case BinaryEntryType.NamedByte:
      case BinaryEntryType.UnnamedByte:
        return this.primitive(name, this.readUint8())

      case BinaryEntryType.NamedShort:
      case BinaryEntryType.UnnamedShort:
        return this.primitive(name, this.readInt16())

      case BinaryEntryType.NamedUShort:
      case BinaryEntryType.UnnamedUShort:
        return this.primitive(name, this.readUint16())

      case BinaryEntryType.NamedInt:
      case BinaryEntryType.UnnamedInt:
        return this.primitive(name, this.readInt32())

      case BinaryEntryType.NamedUInt:
      case BinaryEntryType.UnnamedUInt:
        return this.primitive(name, this.readUint32())

      case BinaryEntryType.NamedLong:
      case BinaryEntryType.UnnamedLong:
        return this.primitive(name, this.readBigInt64())

      case BinaryEntryType.NamedULong:
      case BinaryEntryType.UnnamedULong:
        return this.primitive(name, this.readBigUint64())

      case BinaryEntryType.NamedFloat:
      case BinaryEntryType.UnnamedFloat:
        return this.primitive(name, this.readFloat32())

      case BinaryEntryType.NamedDouble:
      case BinaryEntryType.UnnamedDouble:
        return this.primitive(name, this.readFloat64())

      case BinaryEntryType.NamedDecimal:
      case BinaryEntryType.UnnamedDecimal:
        return this.primitive(name, this.readDecimal())

      case BinaryEntryType.NamedChar:
      case BinaryEntryType.UnnamedChar:
        return this.primitive(name, String.fromCharCode(this.readUint16()))

      case BinaryEntryType.NamedString:
      case BinaryEntryType.UnnamedString:
        return this.primitive(name, this.readStringValue())

      case BinaryEntryType.NamedBoolean:
      case BinaryEntryType.UnnamedBoolean:
        return this.primitive(name, this.readUint8() === 1)

      case BinaryEntryType.NamedNull:
      case BinaryEntryType.UnnamedNull:
        return this.primitive(name, null)

      default:
        throw this.error(`Unsupported Odin binary entry 0x${tag.toString(16)}`)
    }
  }

  private readNode(name: string | null, isReference: boolean): OdinNodeEntry {
    const typeName = this.readTypeEntry()
    const referenceId = isReference ? this.readInt32() : null
    const node: OdinNodeEntry = {
      kind: 'node',
      name,
      typeName,
      referenceId,
      children: [],
    }

    if (referenceId !== null) this.referenceNodes.set(referenceId, node)

    while (this.peekUint8() !== BinaryEntryType.EndOfNode) {
      if (this.peekUint8() === BinaryEntryType.EndOfStream) {
        throw this.error('Unexpected end of stream inside an Odin node')
      }
      const child = this.readEntry()
      if (!child) throw this.error('Invalid node child')
      node.children.push(child)
    }
    this.readUint8()
    return node
  }

  private readArray(): OdinArrayEntry {
    const declaredLength = this.readBigInt64()
    if (declaredLength < 0n) throw this.error('Negative Odin array length')
    const items: OdinEntry[] = []
    while (this.peekUint8() !== BinaryEntryType.EndOfArray) {
      if (this.peekUint8() === BinaryEntryType.EndOfStream) {
        throw this.error('Unexpected end of stream inside an Odin array')
      }
      const item = this.readEntry()
      if (!item) throw this.error('Invalid array item')
      items.push(item)
    }
    this.readUint8()
    return { kind: 'array', name: null, declaredLength, items }
  }

  private readPrimitiveArray(): OdinPrimitiveArrayEntry {
    const elementCount = this.readInt32()
    const bytesPerElement = this.readInt32()
    if (elementCount < 0 || bytesPerElement <= 0) {
      throw this.error('Invalid Odin primitive array dimensions')
    }
    const byteCount = elementCount * bytesPerElement
    return {
      kind: 'primitive-array',
      name: null,
      elementCount,
      bytesPerElement,
      bytes: this.readBytes(byteCount),
    }
  }

  private readTypeEntry(): string | null {
    const tag = this.readUint8()
    if (tag === BinaryEntryType.UnnamedNull) return null
    const id = this.readInt32()
    if (tag === BinaryEntryType.TypeId) {
      if (!this.types.has(id)) throw this.error(`Unknown Odin type id ${id}`)
      return this.types.get(id) ?? null
    }
    if (tag !== BinaryEntryType.TypeName) {
      throw this.error(`Expected Odin type metadata, received 0x${tag.toString(16)}`)
    }
    const typeName = this.readStringValue()
    this.types.set(id, typeName)
    return typeName
  }

  private materialize(entry: OdinEntry, parentType: string | null = null): unknown {
    if (entry.kind === 'primitive') return entry.value
    if (entry.kind === 'internal-reference') {
      if (this.materializedReferences.has(entry.referenceId)) {
        return this.materializedReferences.get(entry.referenceId)
      }
      const target = this.referenceNodes.get(entry.referenceId)
      if (!target) throw this.error(`Unknown internal reference ${entry.referenceId}`)
      return this.materialize(target)
    }
    if (entry.kind === 'array') {
      return entry.items.map((item) => this.materialize(item, parentType))
    }
    if (entry.kind === 'primitive-array') {
      return this.materializePrimitiveArray(entry, parentType)
    }

    const placeholder: Record<string, unknown> = {}
    if (entry.referenceId !== null) {
      const existing = this.materializedReferences.get(entry.referenceId)
      if (existing !== undefined) return existing
      this.materializedReferences.set(entry.referenceId, placeholder)
    }

    if (isDictionaryType(entry.typeName)) {
      const arrayChild = entry.children.find((child) => child.kind === 'array')
      const pairs = arrayChild
        ? (this.materialize(arrayChild, entry.typeName) as unknown[])
        : []
      for (const pair of pairs) {
        if (pair === null || typeof pair !== 'object') continue
        const record = pair as Record<string, unknown>
        if (!Object.hasOwn(record, '$k')) continue
        placeholder[String(record.$k)] = record.$v
      }
      return placeholder
    }

    if (isCollectionType(entry.typeName)) {
      const collectionChild = entry.children.find(
        (child) => child.kind === 'array' || child.kind === 'primitive-array',
      )
      const collection = collectionChild
        ? this.materialize(collectionChild, entry.typeName)
        : []
      if (entry.referenceId !== null) {
        this.materializedReferences.set(entry.referenceId, collection)
      }
      return collection
    }

    for (const child of entry.children) {
      if (child.name !== null) {
        placeholder[child.name] = this.materialize(child, entry.typeName)
      }
    }

    const unnamed = entry.children.filter((child) => child.name === null)
    if (unnamed.length > 0) {
      placeholder.$values = unnamed.map((child) =>
        this.materialize(child, entry.typeName),
      )
    }
    Object.defineProperty(placeholder, '$type', {
      value: entry.typeName,
      enumerable: false,
    })
    return placeholder
  }

  private materializePrimitiveArray(
    entry: OdinPrimitiveArrayEntry,
    parentType: string | null,
  ): unknown[] | Uint8Array {
    const type = arrayElementType(parentType)
    if (type === 'Byte' && entry.bytesPerElement === 1) return entry.bytes.slice()
    const view = new DataView(
      entry.bytes.buffer,
      entry.bytes.byteOffset,
      entry.bytes.byteLength,
    )
    const values: unknown[] = []
    for (let index = 0; index < entry.elementCount; index += 1) {
      const offset = index * entry.bytesPerElement
      switch (type) {
        case 'Boolean':
          values.push(view.getUint8(offset) !== 0)
          break
        case 'SByte':
          values.push(view.getInt8(offset))
          break
        case 'Int16':
          values.push(view.getInt16(offset, true))
          break
        case 'UInt16':
        case 'Char':
          values.push(view.getUint16(offset, true))
          break
        case 'Int32':
          values.push(view.getInt32(offset, true))
          break
        case 'UInt32':
          values.push(view.getUint32(offset, true))
          break
        case 'Int64':
          values.push(view.getBigInt64(offset, true))
          break
        case 'UInt64':
          values.push(view.getBigUint64(offset, true))
          break
        case 'Single':
          values.push(view.getFloat32(offset, true))
          break
        case 'Double':
          values.push(view.getFloat64(offset, true))
          break
        default:
          values.push(entry.bytes.slice(offset, offset + entry.bytesPerElement))
      }
    }
    return values
  }

  private primitive(
    name: string | null,
    value: OdinPrimitive | Uint8Array,
  ): OdinPrimitiveEntry {
    return { kind: 'primitive', name, value }
  }

  private readStringValue(): string {
    const usesUtf16 = this.readUint8() !== 0
    const length = this.readInt32()
    if (length < 0) throw this.error('Negative Odin string length')
    if (!usesUtf16) {
      const bytes = this.readBytes(length)
      let result = ''
      for (const byte of bytes) result += String.fromCharCode(byte)
      return result
    }
    const bytes = this.readBytes(length * 2)
    let result = ''
    for (let index = 0; index < bytes.length; index += 2) {
      result += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8))
    }
    return result
  }

  private readDecimal(): number | string {
    const lo = this.readUint32()
    const mid = this.readUint32()
    const hi = this.readUint32()
    const flags = this.readUint32()
    const scale = (flags >> 16) & 0x7f
    const negative = (flags & 0x80000000) !== 0
    const integer = (BigInt(hi) << 64n) | (BigInt(mid) << 32n) | BigInt(lo)
    const text = decimalText(integer, scale, negative)
    const numeric = Number(text)
    return Number.isSafeInteger(numeric) || text.includes('.') ? numeric : text
  }

  private readGuid(): string {
    const bytes = this.readBytes(16)
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  private ensure(count: number): void {
    if (this.offset + count > this.bytes.byteLength) {
      throw this.error(`Unexpected end of Odin stream while reading ${count} bytes`)
    }
  }

  private readBytes(count: number): Uint8Array {
    this.ensure(count)
    const result = this.bytes.slice(this.offset, this.offset + count)
    this.offset += count
    return result
  }

  private peekUint8(): number {
    this.ensure(1)
    return this.view.getUint8(this.offset)
  }

  private readUint8(): number {
    this.ensure(1)
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  private readInt8(): number {
    this.ensure(1)
    const value = this.view.getInt8(this.offset)
    this.offset += 1
    return value
  }

  private readInt16(): number {
    this.ensure(2)
    const value = this.view.getInt16(this.offset, true)
    this.offset += 2
    return value
  }

  private readUint16(): number {
    this.ensure(2)
    const value = this.view.getUint16(this.offset, true)
    this.offset += 2
    return value
  }

  private readInt32(): number {
    this.ensure(4)
    const value = this.view.getInt32(this.offset, true)
    this.offset += 4
    return value
  }

  private readUint32(): number {
    this.ensure(4)
    const value = this.view.getUint32(this.offset, true)
    this.offset += 4
    return value
  }

  private readBigInt64(): bigint {
    this.ensure(8)
    const value = this.view.getBigInt64(this.offset, true)
    this.offset += 8
    return value
  }

  private readBigUint64(): bigint {
    this.ensure(8)
    const value = this.view.getBigUint64(this.offset, true)
    this.offset += 8
    return value
  }

  private readFloat32(): number {
    this.ensure(4)
    const value = this.view.getFloat32(this.offset, true)
    this.offset += 4
    return value
  }

  private readFloat64(): number {
    this.ensure(8)
    const value = this.view.getFloat64(this.offset, true)
    this.offset += 8
    return value
  }

  private error(message: string): OdinBinaryDecodeError {
    return new OdinBinaryDecodeError(message, this.offset)
  }
}

function isCollectionType(typeName: string | null): boolean {
  if (!typeName) return false
  return (
    typeName.includes('System.Collections.Generic.List`1') ||
    typeName.includes('System.Collections.Generic.HashSet`1') ||
    typeName.trimStart().startsWith('System.') && typeName.includes('[],')
  )
}

function isDictionaryType(typeName: string | null): boolean {
  return typeName?.includes('System.Collections.Generic.Dictionary`2') ?? false
}

function arrayElementType(typeName: string | null): string | null {
  if (!typeName) return null
  const match = typeName.match(/System\.([A-Za-z0-9]+)\[\]/)
  return match?.[1] ?? null
}

function decimalText(integer: bigint, scale: number, negative: boolean): string {
  let digits = integer.toString()
  if (scale > 0) {
    digits = digits.padStart(scale + 1, '0')
    digits = `${digits.slice(0, -scale)}.${digits.slice(-scale)}`
  }
  return negative && integer !== 0n ? `-${digits}` : digits
}

export function decodeOdinBinary(bytes: Uint8Array): OdinDecodedDocument {
  return new OdinBinaryReader(bytes).decode()
}
