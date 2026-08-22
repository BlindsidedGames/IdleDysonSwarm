package com.blindsidedgames.idledysonswarm

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener

internal data class NativeProductListing(
    val productId: String,
    val localizedPrice: String?,
    val available: Boolean,
)

internal data class NativePurchaseResult(
    val accepted: Boolean,
    val productId: String,
    val code: String? = null,
)

/** First-party Google Play Billing adapter. No receipt or purchase token crosses the bridge. */
internal class GooglePlayStore(
    context: Context,
    private val entitlementCache: NativeEntitlementCache,
) : PurchasesUpdatedListener {
    private val productDetails = mutableMapOf<String, ProductDetails>()
    private val connectionWaiters = mutableListOf<(Boolean) -> Unit>()
    private var connectionStarting = false
    private var pendingPurchase: Pair<String, (NativePurchaseResult) -> Unit>? = null

    private val billingClient = BillingClient.newBuilder(context.applicationContext)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .enableAutoServiceReconnection()
        .build()

    fun warmUp() {
        ensureConnected { available ->
            if (!available) return@ensureConnected
            refreshDurableOwnership { _, _ -> }
            drainUnfinishedTips()
        }
    }

    fun providerAvailable(): Boolean = billingClient.isReady

    fun products(callback: (List<NativeProductListing>, Boolean) -> Unit) {
        queryProductDetails { details, available ->
            if (!available) {
                callback(PRODUCT_IDS.map { NativeProductListing(it, null, false) }, false)
                return@queryProductDetails
            }
            val byId = details.associateBy { it.productId }
            callback(PRODUCT_IDS.map { productId ->
                val detail = byId[productId]
                NativeProductListing(
                    productId = productId,
                    localizedPrice = detail?.oneTimePurchaseOfferDetailsList
                        ?.firstOrNull()?.formattedPrice,
                    available = detail != null,
                )
            }, true)
        }
    }

    fun purchase(
        activity: Activity,
        productId: String,
        callback: (NativePurchaseResult) -> Unit,
    ) {
        if (pendingPurchase != null) {
            callback(NativePurchaseResult(false, productId, "purchase-failed"))
            return
        }
        queryProductDetails { _, available ->
            val detail = productDetails[productId]
            val offer = detail?.oneTimePurchaseOfferDetailsList?.firstOrNull()
            if (!available || detail == null || offer == null) {
                callback(NativePurchaseResult(false, productId, "store-unavailable"))
                return@queryProductDetails
            }
            pendingPurchase = productId to callback
            val productParamsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(detail)
            offer.offerToken?.let(productParamsBuilder::setOfferToken)
            val productParams = productParamsBuilder.build()
            val result = billingClient.launchBillingFlow(
                activity,
                BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(listOf(productParams))
                    .build(),
            )
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                resolvePending(false, mapBillingFailure(result.responseCode))
            }
        }
    }

    fun restore(callback: (List<String>, Boolean) -> Unit) {
        queryOwnedPurchases { purchases, available ->
            if (!available) {
                callback(emptyList(), false)
                return@queryOwnedPurchases
            }
            val durableIds = purchases.asSequence()
                .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                .flatMap { it.products.asSequence() }
                .filter { DURABLE_IDS.contains(it) }
                .distinct()
                .toList()
            processDurablePurchases(purchases)
            val persisted = writeProviderOwnership(durableIds)
            callback(if (persisted) durableIds else emptyList(), persisted)
        }
    }

    fun refreshDurableOwnership(callback: (DurableOwnership?, Boolean) -> Unit) {
        queryOwnedPurchases { purchases, available ->
            if (!available) {
                callback(null, false)
                return@queryOwnedPurchases
            }
            val durableIds = purchases.asSequence()
                .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                .flatMap { it.products.asSequence() }
                .filter { DURABLE_IDS.contains(it) }
                .toSet()
            processDurablePurchases(purchases)
            val ownership = DurableOwnership(
                doubleInfinityPoints = durableIds.contains(DOUBLE_IP),
                developerOptions = durableIds.contains(DEV_OPTIONS),
                supporterCatGallery = entitlementCache.read().supporterCatGallery,
            )
            val persisted = entitlementCache.writeProviderOwnership(ownership)
            callback(if (persisted) entitlementCache.read() else null, persisted)
        }
    }

    override fun onPurchasesUpdated(
        billingResult: BillingResult,
        purchases: MutableList<Purchase>?,
    ) {
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            resolvePending(false, mapBillingFailure(billingResult.responseCode))
            return
        }
        val updatedPurchases = purchases.orEmpty()
        if (updatedPurchases.isEmpty()) {
            resolvePending(false, "purchase-failed")
            return
        }
        updatedPurchases.forEach { purchase ->
            val requestedProduct = pendingPurchase?.first
                ?.takeIf(purchase.products::contains)
            when (purchase.purchaseState) {
                Purchase.PurchaseState.PENDING -> {
                    if (requestedProduct != null) {
                        resolvePending(false, "purchase-pending")
                    }
                }
                Purchase.PurchaseState.PURCHASED -> {
                    if (requestedProduct != null) {
                        deliverPurchase(purchase, requestedProduct)
                    } else {
                        deliverDetachedPurchase(purchase)
                    }
                }
                else -> {
                    if (requestedProduct != null) {
                        resolvePending(false, "purchase-failed")
                    }
                }
            }
        }
    }

    /**
     * Provider updates outlive renderer calls. A pending purchase can complete
     * after its JS promise was resolved or the Web view restarted, so native
     * delivery must acknowledge/consume and refresh ownership independently.
     */
    private fun deliverDetachedPurchase(purchase: Purchase) {
        if (purchase.products.any(TIP_IDS::contains)) {
            if (!entitlementCache.grantSupporterCatGallery()) return
            billingClient.consumeAsync(
                ConsumeParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build(),
            ) { _, _ -> }
            return
        }
        if (!purchase.products.any(DURABLE_IDS::contains)) return
        val refresh = { refreshDurableOwnership { _, _ -> } }
        if (purchase.isAcknowledged) {
            refresh()
            return
        }
        billingClient.acknowledgePurchase(
            AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build(),
        ) { result ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) refresh()
        }
    }

    private fun deliverPurchase(purchase: Purchase, productId: String) {
        if (TIP_IDS.contains(productId)) {
            if (!entitlementCache.grantSupporterCatGallery()) {
                resolvePending(false, "purchase-failed")
                return
            }
            billingClient.consumeAsync(
                ConsumeParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build(),
            ) { result, _ ->
                resolvePending(
                    result.responseCode == BillingClient.BillingResponseCode.OK,
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) null
                    else "purchase-failed",
                )
            }
            return
        }
        if (purchase.isAcknowledged) {
            refreshDurableOwnership { _, available ->
                resolvePending(available, if (available) null else "purchase-failed")
            }
            return
        }
        billingClient.acknowledgePurchase(
            AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build(),
        ) { result ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                resolvePending(false, "purchase-failed")
                return@acknowledgePurchase
            }
            refreshDurableOwnership { _, available ->
                resolvePending(available, if (available) null else "purchase-failed")
            }
        }
    }

    private fun queryProductDetails(
        callback: (List<ProductDetails>, Boolean) -> Unit,
    ) {
        ensureConnected { available ->
            if (!available) {
                callback(emptyList(), false)
                return@ensureConnected
            }
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(PRODUCT_IDS.map { productId ->
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                })
                .build()
            billingClient.queryProductDetailsAsync(params) { result, queryResult ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    callback(emptyList(), false)
                    return@queryProductDetailsAsync
                }
                productDetails.clear()
                queryResult.productDetailsList.forEach { detail ->
                    productDetails[detail.productId] = detail
                }
                callback(queryResult.productDetailsList, true)
            }
        }
    }

    private fun queryOwnedPurchases(callback: (List<Purchase>, Boolean) -> Unit) {
        ensureConnected { available ->
            if (!available) {
                callback(emptyList(), false)
                return@ensureConnected
            }
            billingClient.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build(),
            ) { result, purchases ->
                callback(
                    purchases,
                    result.responseCode == BillingClient.BillingResponseCode.OK,
                )
            }
        }
    }

    private fun ensureConnected(callback: (Boolean) -> Unit) {
        if (billingClient.isReady) {
            callback(true)
            return
        }
        connectionWaiters.add(callback)
        if (connectionStarting) return
        connectionStarting = true
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connectionStarting = false
                flushConnectionWaiters(
                    result.responseCode == BillingClient.BillingResponseCode.OK,
                )
            }

            override fun onBillingServiceDisconnected() {
                connectionStarting = false
                flushConnectionWaiters(false)
            }
        })
    }

    private fun flushConnectionWaiters(available: Boolean) {
        val waiters = connectionWaiters.toList()
        connectionWaiters.clear()
        waiters.forEach { it(available) }
    }

    private fun processDurablePurchases(purchases: List<Purchase>) {
        purchases.filter {
            it.purchaseState == Purchase.PurchaseState.PURCHASED &&
                it.products.any(DURABLE_IDS::contains) &&
                !it.isAcknowledged
        }.forEach { purchase ->
            billingClient.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build(),
            ) { }
        }
    }

    private fun drainUnfinishedTips() {
        queryOwnedPurchases { purchases, available ->
            if (!available) return@queryOwnedPurchases
            purchases.filter {
                it.purchaseState == Purchase.PurchaseState.PURCHASED &&
                    it.products.any(TIP_IDS::contains)
            }.forEach { purchase ->
                if (!entitlementCache.grantSupporterCatGallery()) {
                    return@forEach
                }
                billingClient.consumeAsync(
                    ConsumeParams.newBuilder()
                        .setPurchaseToken(purchase.purchaseToken)
                        .build(),
                ) { _, _ -> }
            }
        }
    }

    private fun writeProviderOwnership(productIds: Collection<String>): Boolean =
        entitlementCache.writeProviderOwnership(DurableOwnership(
            doubleInfinityPoints = productIds.contains(DOUBLE_IP),
            developerOptions = productIds.contains(DEV_OPTIONS),
            supporterCatGallery = entitlementCache.read().supporterCatGallery,
        ))

    private fun resolvePending(accepted: Boolean, code: String?) {
        val pending = pendingPurchase ?: return
        pendingPurchase = null
        pending.second(NativePurchaseResult(accepted, pending.first, code))
    }

    private fun mapBillingFailure(responseCode: Int): String = when (responseCode) {
        BillingClient.BillingResponseCode.USER_CANCELED -> "purchase-cancelled"
        else -> "purchase-failed"
    }

    private companion object {
        private const val DOUBLE_IP = "ids.doubleip"
        private const val DEV_OPTIONS = "ids.devoptions"
        private val TIP_IDS = setOf("ids.tiptier1", "ids.tiptier2", "ids.tiptier3")
        private val DURABLE_IDS = setOf(DOUBLE_IP, DEV_OPTIONS)
        private val PRODUCT_IDS = (TIP_IDS + DURABLE_IDS).toList().sorted()
    }
}
