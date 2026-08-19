// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  STORE_PRODUCT_IDS,
  type EntitlementAuthority,
  type StoreAdapter,
  type StoreProductId,
} from '../../../store/contracts'
import { StorefrontController } from '../../../store/storefront'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import { StoreSurface } from './StoreSurface'

afterEach(cleanup)

describe('StoreSurface', () => {
  test('has no serious or critical automated accessibility violations', async () => {
    const { container } = renderStore(storeAdapter())
    await screen.findByRole('button', { name: 'Tip A$1.49' })
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })

  test('renders only adapter-supplied localized prices and repeatable tip actions', async () => {
    const user = userEvent.setup()
    const store = storeAdapter()
    renderStore(store)

    expect(await screen.findByRole('button', { name: 'Tip A$1.49' }))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Purchase A$8.99' }))
      .toBeInTheDocument()
    expect(screen.queryByText(/USD|\$9\.99/)).not.toBeInTheDocument()

    const tip = screen.getByRole('button', { name: 'Tip A$1.49' })
    await user.click(tip)
    await waitFor(() => expect(store.purchase).toHaveBeenCalledTimes(1))
    await user.click(tip)
    await waitFor(() => expect(store.purchase).toHaveBeenCalledTimes(2))
  })

  test('restores permanent purchases and explains that tips are excluded', async () => {
    const user = userEvent.setup()
    const store = storeAdapter()
    renderStore(store, {
      readOwnership: async () => ({
        doubleInfinityPoints: false,
        developerOptions: false,
      }),
      refreshOwnership: async () => ({
        doubleInfinityPoints: true,
        developerOptions: false,
      }),
    })

    expect(await screen.findByText(/Tips are consumable and are not restored/))
      .toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore Purchases' }))
    await waitFor(() => expect(store.restorePurchases).toHaveBeenCalledOnce())
    expect(await screen.findByText('One permanent purchase was restored.'))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Owned' })).toBeDisabled()
  })

  test('presents the existing in-game Developer Options unlock as an alternative', async () => {
    renderStore(storeAdapter(), undefined, true)

    expect(await screen.findByRole('button', { name: 'Unlocked in game' }))
      .toBeDisabled()
    expect(screen.getByText(/existing in-game unlock remains available/))
      .toBeInTheDocument()
  })

  test('announces a failed or cancelled purchase assertively', async () => {
    const user = userEvent.setup()
    const store = storeAdapter()
    store.purchase.mockResolvedValue({
      accepted: false,
      productId: STORE_PRODUCT_IDS.tipTier1,
      code: 'purchase-cancelled',
    })
    renderStore(store)

    await user.click(await screen.findByRole('button', { name: 'Tip A$1.49' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Purchase cancelled.',
    )
  })

  test('keeps product cards as the only visual panel layer in each section', async () => {
    const { container } = renderStore(storeAdapter())

    await screen.findByRole('heading', { name: 'Support the developer' })
    const sections = container.querySelectorAll('.store-product-section')
    expect(sections).toHaveLength(2)
    for (const section of sections) {
      expect(
        section.querySelector(':scope > .store-product-section__header'),
      ).not.toBeNull()
      expect(
        section.querySelectorAll(':scope > ul > li > .store-product-card'),
      ).not.toHaveLength(0)
      expect(
        section.querySelector(':scope > ul > li > .store-product-section'),
      ).toBeNull()
    }
  })
})

function renderStore(
  store: StoreAdapter,
  entitlements: EntitlementAuthority = {
    readOwnership: async () => ({
      doubleInfinityPoints: false,
      developerOptions: false,
    }),
    refreshOwnership: async () => ({
      doubleInfinityPoints: false,
      developerOptions: false,
    }),
  },
  localDeveloperOptionsPurchased = false,
) {
  const controller = new StorefrontController({ store, entitlements })
  return render(
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as SharedMessageCatalog}
    >
      <StoreSurface
        controller={controller}
        localDeveloperOptionsPurchased={localDeveloperOptionsPurchased}
      />
    </PresentationIntlProvider>,
  )
}

function storeAdapter(): StoreAdapter & {
  readonly purchase: ReturnType<typeof vi.fn>
  readonly restorePurchases: ReturnType<typeof vi.fn>
} {
  return {
    products: vi.fn(async () => [
      listing(STORE_PRODUCT_IDS.tipTier1, 'A$1.49'),
      listing(STORE_PRODUCT_IDS.tipTier2, 'A$3.99'),
      listing(STORE_PRODUCT_IDS.tipTier3, 'A$7.99'),
      listing(STORE_PRODUCT_IDS.developerOptions, 'A$8.99'),
      listing(STORE_PRODUCT_IDS.doubleInfinityPoints, 'A$2.99'),
    ]),
    purchase: vi.fn(async (productId: StoreProductId) => ({
      accepted: true as const,
      productId,
    })),
    restorePurchases: vi.fn(async () => ({
      restoredProductIds: [STORE_PRODUCT_IDS.doubleInfinityPoints],
    })),
  }
}

function listing(productId: StoreProductId, localizedPrice: string) {
  return { productId, localizedPrice, available: true }
}
