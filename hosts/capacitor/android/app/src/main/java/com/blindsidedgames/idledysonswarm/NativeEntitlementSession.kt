package com.blindsidedgames.idledysonswarm

internal data class DurableOwnership(
    val doubleInfinityPoints: Boolean,
    val developerOptions: Boolean,
    val supporterCatGallery: Boolean,
)

/**
 * Process-local authority for the latest successful Store ownership snapshot.
 * Disk remains the offline fallback, but cannot overrule a newer live result.
 */
internal class NativeEntitlementSession {
    private var authoritativeOwnership: DurableOwnership? = null
    private var pendingPersistence: DurableOwnership? = null

    fun resolve(
        persistedProviderOwnership: DurableOwnership,
        legacyDoubleInfinityPoints: Boolean,
    ): DurableOwnership {
        val provider = authoritativeOwnership ?: persistedProviderOwnership
        return DurableOwnership(
            doubleInfinityPoints =
                provider.doubleInfinityPoints || legacyDoubleInfinityPoints,
            developerOptions = provider.developerOptions,
            supporterCatGallery =
                provider.supporterCatGallery ||
                    persistedProviderOwnership.supporterCatGallery,
        )
    }

    fun applyProviderOwnership(
        ownership: DurableOwnership,
        persist: (DurableOwnership) -> Boolean,
    ): Boolean {
        authoritativeOwnership = ownership
        pendingPersistence = ownership
        return persistPending(persist)
    }

    fun retryPendingPersistence(
        persist: (DurableOwnership) -> Boolean,
    ): Boolean = pendingPersistence?.let { persistPending(persist) } ?: true

    private fun persistPending(
        persist: (DurableOwnership) -> Boolean,
    ): Boolean {
        val pending = pendingPersistence ?: return true
        if (!persist(pending)) return false
        if (pendingPersistence == pending) pendingPersistence = null
        return true
    }
}
