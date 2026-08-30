import Foundation

struct DurableOwnership: Equatable {
    let doubleInfinityPoints: Bool
    let developerOptions: Bool
    let supporterCatGallery: Bool
}

/**
 * Process-local authority for the latest successful Store ownership snapshot.
 * Keychain state remains the offline fallback, but cannot overrule a newer
 * live result from StoreKit during the same process lifetime.
 */
final class NativeEntitlementSession {
    private var authoritativeOwnership: DurableOwnership?
    private var pendingPersistence: DurableOwnership?

    func resolve(
        persistedProviderOwnership: DurableOwnership,
        legacyDoubleInfinityPoints: Bool
    ) -> DurableOwnership {
        let provider = authoritativeOwnership ?? persistedProviderOwnership
        return DurableOwnership(
            doubleInfinityPoints:
                provider.doubleInfinityPoints || legacyDoubleInfinityPoints,
            developerOptions: provider.developerOptions,
            supporterCatGallery:
                provider.supporterCatGallery ||
                    persistedProviderOwnership.supporterCatGallery
        )
    }

    func applyProviderOwnership(
        _ ownership: DurableOwnership,
        persist: (DurableOwnership) -> Bool
    ) -> Bool {
        authoritativeOwnership = ownership
        pendingPersistence = ownership
        return persistPending(using: persist)
    }

    func retryPendingPersistence(
        persist: (DurableOwnership) -> Bool
    ) -> Bool {
        guard pendingPersistence != nil else { return true }
        return persistPending(using: persist)
    }

    private func persistPending(
        using persist: (DurableOwnership) -> Bool
    ) -> Bool {
        guard let pending = pendingPersistence else { return true }
        guard persist(pending) else { return false }
        if pendingPersistence == pending { pendingPersistence = nil }
        return true
    }
}
