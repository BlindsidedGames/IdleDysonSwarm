import Foundation
import Security
import StoreKit

struct NativeProductListing: Sendable {
    let productId: String
    let localizedPrice: String?
    let available: Bool
}

struct NativePurchaseResult: Sendable {
    let accepted: Bool
    let productId: String
    let code: String?
}

struct NativeBoundUnityEvidence {
    let opaqueSourceIdentifier: String
    let contentSha256: String
}

/** App-private offline continuity. Shared/imported saves never read or write it. */
final class NativeEntitlementCache: @unchecked Sendable {
    private let session = NativeEntitlementSession()

    private struct Record: Codable {
        var providerDoubleIp = false
        var providerDeveloperOptions = false
        var supporterCatGallery: Bool?
        var providerVerifiedAtUtc: TimeInterval?
        var legacyDoubleIp = false
        var legacyPlatform: String?
        var legacySourceClass: String?
        var legacyOpaqueId: String?
        var legacyPathClass: String?
        var legacyContentSha256: String?
        var legacyPromotedAtUtc: TimeInterval?
    }

    func read() -> DurableOwnership {
        session.withSerializedAccess {
            let record = readRecord()
            return session.resolve(
                persistedProviderOwnership: DurableOwnership(
                    doubleInfinityPoints: record.providerDoubleIp,
                    developerOptions: record.providerDeveloperOptions,
                    supporterCatGallery: record.supporterCatGallery == true
                ),
                legacyDoubleInfinityPoints: record.legacyDoubleIp
            )
        }
    }

    func beginProviderRefresh() -> UInt64 {
        session.beginProviderRefresh()
    }

    func writeProviderOwnership(_ ownership: DurableOwnership) -> Bool {
        session.withSerializedAccess {
            session.applyProviderOwnership(ownership) { [weak self] pending in
                self?.persistProviderOwnership(pending) == true
            }
        }
    }

    func writeProviderOwnership(
        _ ownership: DurableOwnership,
        refreshSequence: UInt64
    ) -> Bool {
        session.withSerializedAccess {
            session.applyProviderOwnership(
                ownership,
                refreshSequence: refreshSequence
            ) { [weak self] pending in
                self?.persistProviderOwnership(pending) == true
            }
        }
    }

    func retryPendingProviderOwnership() -> Bool {
        session.withSerializedAccess {
            session.retryPendingPersistence { [weak self] pending in
                self?.persistProviderOwnership(pending) == true
            }
        }
    }

    private func persistProviderOwnership(_ ownership: DurableOwnership) -> Bool {
        var record = readRecord()
        record.providerDoubleIp = ownership.doubleInfinityPoints
        record.providerDeveloperOptions = ownership.developerOptions
        record.supporterCatGallery =
            record.supporterCatGallery == true || ownership.supporterCatGallery
        record.providerVerifiedAtUtc = Date().timeIntervalSince1970
        return writeRecord(record)
    }

    func grantSupporterCatGallery() -> Bool {
        session.withSerializedAccess {
            var record = readRecord()
            record.supporterCatGallery = true
            record.providerVerifiedAtUtc = Date().timeIntervalSince1970
            return writeRecord(record)
        }
    }

    func promoteAutomaticUnityDoubleIpEvidence(
        _ evidence: NativeBoundUnityEvidence
    ) -> Bool {
        session.withSerializedAccess {
            var record = readRecord()
            if record.legacyDoubleIp { return false }

            record.legacyDoubleIp = true
            record.legacyPlatform = "ios"
            record.legacySourceClass = "unity-persistent-data-save"
            record.legacyOpaqueId = evidence.opaqueSourceIdentifier
            record.legacyPathClass = "capacitor-documents"
            record.legacyContentSha256 = evidence.contentSha256
            record.legacyPromotedAtUtc = Date().timeIntervalSince1970
            return writeRecord(record)
        }
    }

    private func readRecord() -> Record {
        var query = keychainQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard
            SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
            let data = result as? Data,
            let record = try? JSONDecoder().decode(Record.self, from: data)
        else { return Record() }
        return record
    }

    private func writeRecord(_ record: Record) -> Bool {
        guard let data = try? JSONEncoder().encode(record) else { return false }
        let query = keychainQuery()
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String:
                kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let updateStatus = SecItemUpdate(
            query as CFDictionary,
            attributes as CFDictionary
        )
        if updateStatus == errSecSuccess { return true }
        guard updateStatus == errSecItemNotFound else { return false }
        var insert = query
        attributes.forEach { insert[$0.key] = $0.value }
        return SecItemAdd(insert as CFDictionary, nil) == errSecSuccess
    }

    private func keychainQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String:
                "com.blindsidedgames.idledysonswarm.verified-entitlements",
            kSecAttrAccount as String: "store-cache-v1",
            kSecAttrSynchronizable as String: false,
        ]
    }
}

struct ProviderOwnershipRefresh: Sendable {
    let ownership: DurableOwnership
    let persisted: Bool
}

/** First-party StoreKit 2 adapter. Native Store objects never cross the bridge. */
actor IdleDysonStoreKit {
    private let entitlementCache: NativeEntitlementCache
    private var productsById: [String: Product] = [:]
    private var updatesTask: Task<Void, Never>?

    init(entitlementCache: NativeEntitlementCache) {
        self.entitlementCache = entitlementCache
    }

    deinit { updatesTask?.cancel() }

    func start() {
        guard updatesTask == nil else { return }
        _ = entitlementCache.retryPendingProviderOwnership()
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                guard !Task.isCancelled else { return }
                await self?.processStoreUpdate(update)
            }
        }
        Task { [weak self] in
            _ = try? await self?.refreshDurableOwnership()
        }
    }

    func products() async -> ([NativeProductListing], Bool) {
        do {
            let products = try await Product.products(for: Self.productIds)
            productsById = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })
            return (Self.productIds.map { productId in
                let product = productsById[productId]
                return NativeProductListing(
                    productId: productId,
                    localizedPrice: product?.displayPrice,
                    available: product != nil
                )
            }, true)
        } catch {
            return (Self.productIds.map {
                NativeProductListing(
                    productId: $0,
                    localizedPrice: nil,
                    available: false
                )
            }, false)
        }
    }

    func purchase(productId: String) async -> NativePurchaseResult {
        if productsById[productId] == nil { _ = await products() }
        guard let product = productsById[productId] else {
            return NativePurchaseResult(
                accepted: false,
                productId: productId,
                code: "store-unavailable"
            )
        }
        do {
            switch try await product.purchase() {
            case let .success(verification):
                guard case let .verified(transaction) = verification else {
                    return NativePurchaseResult(
                        accepted: false,
                        productId: productId,
                        code: "purchase-failed"
                    )
                }
                guard transaction.productID == productId else {
                    return NativePurchaseResult(
                        accepted: false,
                        productId: productId,
                        code: "purchase-failed"
                    )
                }
                if Self.supporterIds.contains(productId) {
                    guard entitlementCache.grantSupporterCatGallery() else {
                        return NativePurchaseResult(
                            accepted: false,
                            productId: productId,
                            code: "purchase-failed"
                        )
                    }
                } else if Self.durableIds.contains(productId) {
                    let refresh = try await refreshDurableOwnership()
                    guard refresh.persisted else {
                        return NativePurchaseResult(
                            accepted: false,
                            productId: productId,
                            code: "purchase-failed"
                        )
                    }
                }
                await transaction.finish()
                return NativePurchaseResult(
                    accepted: true,
                    productId: productId,
                    code: nil
                )
            case .pending:
                return NativePurchaseResult(
                    accepted: false,
                    productId: productId,
                    code: "purchase-pending"
                )
            case .userCancelled:
                return NativePurchaseResult(
                    accepted: false,
                    productId: productId,
                    code: "purchase-cancelled"
                )
            @unknown default:
                return NativePurchaseResult(
                    accepted: false,
                    productId: productId,
                    code: "purchase-failed"
                )
            }
        } catch {
            return NativePurchaseResult(
                accepted: false,
                productId: productId,
                code: "purchase-failed"
            )
        }
    }

    func restore() async -> ([String], Bool) {
        do {
            try await AppStore.sync()
            let refreshSequence = entitlementCache.beginProviderRefresh()
            let ownership = try await verifiedDurableProductIds()
            _ = writeProviderOwnership(
                ownership,
                refreshSequence: refreshSequence
            )
            return (ownership.sorted(), true)
        } catch {
            return ([], false)
        }
    }

    func refreshDurableOwnership() async throws -> ProviderOwnershipRefresh {
        _ = entitlementCache.retryPendingProviderOwnership()
        let refreshSequence = entitlementCache.beginProviderRefresh()
        let productIds = try await verifiedDurableProductIds()
        return writeProviderOwnership(
            productIds,
            refreshSequence: refreshSequence
        )
    }

    private func verifiedDurableProductIds() async throws -> Set<String> {
        var snapshot = NativeDurableEntitlementSnapshot(
            durableProductIds: Self.durableIds
        )
        for await verification in Transaction.currentEntitlements {
            switch verification {
            case let .verified(transaction):
                snapshot.observeVerified(
                    productId: transaction.productID,
                    revoked: transaction.revocationDate != nil
                )
            case let .unverified(transaction, _):
                try snapshot.observeUnverified(
                    productId: transaction.productID
                )
            }
        }
        return snapshot.verifiedProductIds
    }

    private func writeProviderOwnership(
        _ productIds: Set<String>,
        refreshSequence: UInt64
    ) -> ProviderOwnershipRefresh {
        let cached = entitlementCache.read()
        let ownership = DurableOwnership(
            doubleInfinityPoints: productIds.contains(Self.doubleIp),
            developerOptions: productIds.contains(Self.developerOptions),
            supporterCatGallery: cached.supporterCatGallery
        )
        let persisted = entitlementCache.writeProviderOwnership(
            ownership,
            refreshSequence: refreshSequence
        )
        return ProviderOwnershipRefresh(
            ownership: entitlementCache.read(),
            persisted: persisted
        )
    }

    private func processStoreUpdate(
        _ verification: VerificationResult<Transaction>
    ) async {
        guard case let .verified(transaction) = verification else { return }
        if Self.supporterIds.contains(transaction.productID) {
            guard entitlementCache.grantSupporterCatGallery() else { return }
        } else if Self.durableIds.contains(transaction.productID) {
            guard
                let refresh = try? await refreshDurableOwnership(),
                refresh.persisted
            else { return }
        } else {
            return
        }
        await transaction.finish()
    }

    private static let doubleIp = "ids.doubleip"
    private static let developerOptions = "ids.devoptions"
    private static let durableIds: Set<String> = [doubleIp, developerOptions]
    private static let supporterIds: Set<String> = [
        "ids.tiptier1", "ids.tiptier2", "ids.tiptier3",
    ]
    private static let productIds: [String] = [
        "ids.tiptier1",
        "ids.tiptier2",
        "ids.tiptier3",
        developerOptions,
        doubleIp,
    ]
}
