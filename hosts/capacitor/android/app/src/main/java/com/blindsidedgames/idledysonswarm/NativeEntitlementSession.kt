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
    private val monitor = Any()
    private var authoritativeOwnership: DurableOwnership? = null
    private var pendingPersistence: DurableOwnership? = null
    private var nextProviderRefreshSequence = 0L
    private var latestAppliedProviderRefreshSequence = 0L

    /**
     * Serializes the process authority and every backing-store operation that
     * participates in the same entitlement record. Java monitors are
     * re-entrant, so cache operations may call the helpers below while holding
     * this boundary.
     */
    fun <T> serialized(operation: () -> T): T = synchronized(monitor, operation)

    fun beginProviderRefresh(): Long = serialized {
        check(nextProviderRefreshSequence < Long.MAX_VALUE) {
            "Native entitlement refresh sequence exhausted."
        }
        nextProviderRefreshSequence += 1
        nextProviderRefreshSequence
    }

    fun resolve(
        persistedProviderOwnership: DurableOwnership,
        legacyDoubleInfinityPoints: Boolean,
    ): DurableOwnership = serialized {
        val provider = authoritativeOwnership ?: persistedProviderOwnership
        DurableOwnership(
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
    ): Boolean = serialized {
        applyProviderOwnership(
            ownership,
            beginProviderRefresh(),
            persist,
        )
    }

    fun applyProviderOwnership(
        ownership: DurableOwnership,
        refreshSequence: Long,
        persist: (DurableOwnership) -> Boolean,
    ): Boolean = serialized {
        if (refreshSequence < latestAppliedProviderRefreshSequence) {
            return@serialized false
        }
        latestAppliedProviderRefreshSequence = refreshSequence
        authoritativeOwnership = ownership
        pendingPersistence = ownership
        persistPending(persist)
    }

    fun retryPendingPersistence(
        persist: (DurableOwnership) -> Boolean,
    ): Boolean = serialized {
        pendingPersistence?.let { persistPending(persist) } ?: true
    }

    private fun persistPending(
        persist: (DurableOwnership) -> Boolean,
    ): Boolean {
        val pending = pendingPersistence ?: return true
        if (!persist(pending)) return false
        if (pendingPersistence == pending) pendingPersistence = null
        return true
    }
}
