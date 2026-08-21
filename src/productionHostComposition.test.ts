// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { selectBrowserStoreAdapterKind } from './store/developmentStoreSelection'

const source = readFileSync(
  resolve(process.cwd(), 'src/productionHostComposition.ts'),
  'utf8',
)

describe('browser Store build selection', () => {
  test('uses development commerce only in a development build', () => {
    expect(selectBrowserStoreAdapterKind({
      developmentBuild: true,
      mode: 'development',
    })).toBe('development')
  })

  test('retains an explicit local path to the real Stripe adapter', () => {
    expect(selectBrowserStoreAdapterKind({
      developmentBuild: true,
      mode: 'development-stripe',
    })).toBe('stripe')
  })

  test('selects Stripe whenever the build is not development', () => {
    expect(selectBrowserStoreAdapterKind({
      developmentBuild: false,
      mode: 'development',
    })).toBe('stripe')
  })

  test('places the fake selection behind Vite’s compile-time DEV guard', () => {
    expect(source).toMatch(
      /const storeKind = import\.meta\.env\.DEV\s*\? selectBrowserStoreAdapterKind/,
    )
    expect(source).toMatch(/:\s*'stripe'/)
  })
})
