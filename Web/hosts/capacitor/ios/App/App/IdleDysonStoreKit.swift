import Foundation
import Security
import StoreKit

struct DurableOwnership {
    let doubleInfinityPoints: Bool
    let developerOptions: Bool
}

struct NativeProductListing {
    let productId: String
    let localizedPrice: String?
    let available: Bool
}

struct NativePurchaseResult {
    let accepted: Bool
    let productId: String
    let code: String?
}

struct NativeBoundUnityEvidence {
    let opaqueSourceIdentifier: String
    let contentSha256: String
}

/** App-private offline continuity. Shared/imported saves never read or write it. */
final class NativeEntitlementCache {
    private struct Record: Codable {
        var providerDoubleIp = false
        var providerDeveloperOptions = false
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
        let record = readRecord()
        return DurableOwnership(
            doubleInfinityPoints:
                record.providerDoubleIp || record.legacyDoubleIp,
            developerOptions: record.providerDeveloperOptions
        )
    }

    func writeProviderOwnership(_ ownership: DurableOwnership) {
        var record = readRecord()
        record.providerDoubleIp = ownership.doubleInfinityPoints
        record.providerDeveloperOptions = ownership.developerOptions
        record.providerVerifiedAtUtc = Date().timeIntervalSince1970
        _ = writeRecord(record)
    }

    func promoteAutomaticUnityDoubleIpEvidence(
        _ evidence: NativeBoundUnityEvidence
    ) -> Bool {
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

/** First-party StoreKit 2 adapter. Native Store objects never cross the bridge. */
final class IdleDysonStoreKit {
    private let entitlementCache: NativeEntitlementCache
    private var productsById: [String: Product] = [:]
    private var updatesTask: Task<Void, Never>?

    init(entitlementCache: NativeEntitlementCache) {
        self.entitlementCache = entitlementCache
    }

    deinit { updatesTask?.cancel() }

    func start() {
        guard updatesTask == nil else { return }
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                guard !Task.isCancelled else { return }
                await self?.processStoreUpdate(update)
            }
        }
        Task { _ = try? await refreshDurableOwnership() }
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
                if Self.durableIds.contains(productId) {
                    _ = try await refreshDurableOwnership()
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
            let ownership = try await verifiedDurableProductIds()
            writeProviderOwnership(ownership)
            return (ownership.sorted(), true)
        } catch {
            return ([], false)
        }
    }

    func refreshDurableOwnership() async throws -> DurableOwnership {
        let productIds = try await verifiedDurableProductIds()
        let ownership = writeProviderOwnership(productIds)
        return ownership
    }

    private func verifiedDurableProductIds() async throws -> Set<String> {
        var productIds = Set<String>()
        for await verification in Transaction.currentEntitlements {
            switch verification {
            case let .verified(transaction):
                if
                    Self.durableIds.contains(transaction.productID),
                    transaction.revocationDate == nil
                {
                    productIds.insert(transaction.productID)
                }
            case .unverified:
                continue
            }
        }
        return productIds
    }

    private func writeProviderOwnership(_ productIds: Set<String>) -> DurableOwnership {
        let ownership = DurableOwnership(
            doubleInfinityPoints: productIds.contains(Self.doubleIp),
            developerOptions: productIds.contains(Self.developerOptions)
        )
        entitlementCache.writeProviderOwnership(ownership)
        return ownership
    }

    private func processStoreUpdate(
        _ verification: VerificationResult<Transaction>
    ) async {
        guard case let .verified(transaction) = verification else { return }
        if Self.durableIds.contains(transaction.productID) {
            _ = try? await refreshDurableOwnership()
        }
        // Tips are repeatable consumables with no gameplay delivery. Finishing
        // them (and durable transactions after caching ownership) is the only
        // native delivery acknowledgement required by this client-only design.
        await transaction.finish()
    }

    private static let doubleIp = "ids.doubleip"
    private static let developerOptions = "ids.devoptions"
    private static let durableIds: Set<String> = [doubleIp, developerOptions]
    private static let productIds: [String] = [
        "ids.tiptier1",
        "ids.tiptier2",
        "ids.tiptier3",
        developerOptions,
        doubleIp,
    ]
}
