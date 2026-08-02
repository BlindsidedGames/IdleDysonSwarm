import { describe, expect, test } from 'vitest'
import {
  PERMANENT_DOUBLE_IP_META_NAME,
  readBrowserHostEntitlements,
  type BrowserEntitlementDocument,
} from './browserEntitlementAuthority'

describe('browser entitlement authority', () => {
  test.each([
    ['false', false],
    ['true', true],
  ] as const)('reads the explicit %s host declaration', (content, expected) => {
    const entitlements = readBrowserHostEntitlements(
      entitlementDocument([content]),
    )
    expect(entitlements).toEqual({
      permanentDoubleIp: expected,
    })
    expect(Object.isFrozen(entitlements)).toBe(true)
  })

  test.each([
    [[], 'exactly one'],
    [['false', 'false'], 'exactly one'],
    [['False'], 'exactly "true" or "false"'],
    [[' yes '], 'exactly "true" or "false"'],
    [[null], 'exactly "true" or "false"'],
  ] as const)('fails closed for declarations %#', (values, message) => {
    expect(() =>
      readBrowserHostEntitlements(
        entitlementDocument(values),
      ),
    ).toThrow(message)
  })
})

function entitlementDocument(
  values: readonly (string | null)[],
): BrowserEntitlementDocument {
  return {
    querySelectorAll(selector: string) {
      expect(selector).toBe(
        `meta[name="${PERMANENT_DOUBLE_IP_META_NAME}"]`,
      )
      return values.map((content) => ({
        getAttribute(name: string) {
          expect(name).toBe('content')
          return content
        },
      }))
    },
  }
}
