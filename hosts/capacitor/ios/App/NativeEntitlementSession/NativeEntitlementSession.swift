import Foundation

struct DurableOwnership: Equatable, Sendable {
    let doubleInfinityPoints: Bool
    let developerOptions: Bool
    let supporterCatGallery: Bool
}

enum NativeDurableEntitlementSnapshotError: Error, Equatable {
    case unverifiedDurableTransaction
}

/**
 * Reduces one StoreKit current-entitlements pass without turning a failed
 * durable-transaction verification into authoritative negative ownership.
 */
struct NativeDurableEntitlementSnapshot: Equatable, Sendable {
    private let durableProductIds: Set<String>
    private(set) var verifiedProductIds = Set<String>()

    init(durableProductIds: Set<String>) {
        self.durableProductIds = durableProductIds
    }

    mutating func observeVerified(
        productId: String,
        revoked: Bool
    ) {
        guard durableProductIds.contains(productId), !revoked else { return }
        verifiedProductIds.insert(productId)
    }

    func observeUnverified(productId: String) throws {
        guard durableProductIds.contains(productId) else { return }
        throw NativeDurableEntitlementSnapshotError.unverifiedDurableTransaction
    }
}

/**
 * Process-local authority for the latest successful Store ownership snapshot.
 * Keychain state remains the offline fallback, but cannot overrule a newer
 * live result from StoreKit during the same process lifetime.
 */
final class NativeEntitlementSession: @unchecked Sendable {
    private let lock = NSRecursiveLock()
    private var authoritativeOwnership: DurableOwnership?
    private var pendingPersistence: DurableOwnership?
    private var nextProviderRefreshSequence: UInt64 = 0
    private var latestAppliedProviderRefreshSequence: UInt64 = 0

    /**
     * Serializes the process authority and every backing-store operation that
     * participates in the same entitlement record. The recursive lock permits
     * cache operations to call the helpers below while holding this boundary.
     */
    func withSerializedAccess<T>(
        _ operation: () throws -> T
    ) rethrows -> T {
        lock.lock()
        defer { lock.unlock() }
        return try operation()
    }

    func beginProviderRefresh() -> UInt64 {
        withSerializedAccess {
            precondition(
                nextProviderRefreshSequence < UInt64.max,
                "Native entitlement refresh sequence exhausted."
            )
            nextProviderRefreshSequence += 1
            return nextProviderRefreshSequence
        }
    }

    func resolve(
        persistedProviderOwnership: DurableOwnership,
        legacyDoubleInfinityPoints: Bool
    ) -> DurableOwnership {
        withSerializedAccess {
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
    }

    func applyProviderOwnership(
        _ ownership: DurableOwnership,
        persist: (DurableOwnership) -> Bool
    ) -> Bool {
        withSerializedAccess {
            applyProviderOwnership(
                ownership,
                refreshSequence: beginProviderRefresh(),
                persist: persist
            )
        }
    }

    func applyProviderOwnership(
        _ ownership: DurableOwnership,
        refreshSequence: UInt64,
        persist: (DurableOwnership) -> Bool
    ) -> Bool {
        withSerializedAccess {
            guard
                refreshSequence >= latestAppliedProviderRefreshSequence
            else { return false }
            latestAppliedProviderRefreshSequence = refreshSequence
            authoritativeOwnership = ownership
            pendingPersistence = ownership
            return persistPending(using: persist)
        }
    }

    func retryPendingPersistence(
        persist: (DurableOwnership) -> Bool
    ) -> Bool {
        withSerializedAccess {
            guard pendingPersistence != nil else { return true }
            return persistPending(using: persist)
        }
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
