import XCTest
@testable import IdleDysonNativeEntitlementSession

final class NativeEntitlementSessionTests: XCTestCase {
    private let staleDisk = DurableOwnership(
        doubleInfinityPoints: true,
        developerOptions: true,
        supporterCatGallery: true
    )

    func testAuthoritativeRevocationWinsWhenPersistenceFails() {
        let session = NativeEntitlementSession()
        let revoked = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: true
        )

        XCTAssertFalse(session.applyProviderOwnership(revoked) { _ in false })
        XCTAssertEqual(
            revoked,
            session.resolve(
                persistedProviderOwnership: staleDisk,
                legacyDoubleInfinityPoints: false
            )
        )
    }

    func testProviderFailureRetainsLatestVerifiedSessionOwnership() {
        let session = NativeEntitlementSession()
        let current = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: true,
            supporterCatGallery: true
        )
        _ = session.applyProviderOwnership(current) { _ in false }

        XCTAssertEqual(
            current,
            session.resolve(
                persistedProviderOwnership: staleDisk,
                legacyDoubleInfinityPoints: false
            )
        )
    }

    func testPendingPersistenceRetriesWithoutRestoringStaleDisk() {
        let session = NativeEntitlementSession()
        let revoked = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: true
        )
        var persisted: DurableOwnership?
        _ = session.applyProviderOwnership(revoked) { _ in false }

        XCTAssertTrue(session.retryPendingPersistence {
            persisted = $0
            return true
        })
        XCTAssertEqual(revoked, persisted)
        XCTAssertEqual(
            revoked,
            session.resolve(
                persistedProviderOwnership: staleDisk,
                legacyDoubleInfinityPoints: false
            )
        )
    }

    func testLegacyNativeEvidenceRemainsIndependent() {
        let session = NativeEntitlementSession()
        let revoked = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: false
        )
        _ = session.applyProviderOwnership(revoked) { _ in true }

        XCTAssertTrue(session.resolve(
            persistedProviderOwnership: staleDisk,
            legacyDoubleInfinityPoints: true
        ).doubleInfinityPoints)
        XCTAssertFalse(session.resolve(
            persistedProviderOwnership: staleDisk,
            legacyDoubleInfinityPoints: false
        ).doubleInfinityPoints)
    }

    func testStaleConcurrentRefreshCannotOverrideNewerRevocation() {
        let session = NativeEntitlementSession()
        let staleOwned = DurableOwnership(
            doubleInfinityPoints: true,
            developerOptions: true,
            supporterCatGallery: true
        )
        let revoked = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: true
        )
        let staleSequence = session.beginProviderRefresh()
        let revokedSequence = session.beginProviderRefresh()
        let revokedApplied = DispatchSemaphore(value: 0)
        let newerResult = LockedBox(false)
        let staleResult = LockedBox(true)
        let group = DispatchGroup()

        group.enter()
        DispatchQueue.global().async {
            newerResult.set(session.applyProviderOwnership(
                revoked,
                refreshSequence: revokedSequence,
                persist: { _ in true }
            ))
            revokedApplied.signal()
            group.leave()
        }
        group.enter()
        DispatchQueue.global().async {
            guard revokedApplied.wait(timeout: .now() + 5) == .success else {
                group.leave()
                return
            }
            staleResult.set(session.applyProviderOwnership(
                staleOwned,
                refreshSequence: staleSequence,
                persist: { _ in true }
            ))
            group.leave()
        }

        XCTAssertEqual(group.wait(timeout: .now() + 5), .success)
        XCTAssertTrue(newerResult.get())
        XCTAssertFalse(staleResult.get())
        XCTAssertEqual(
            revoked,
            session.resolve(
                persistedProviderOwnership: staleDisk,
                legacyDoubleInfinityPoints: false
            )
        )
    }

    func testConcurrentRetryPersistsNewestPendingOwnershipNotStaleRefresh() {
        let session = NativeEntitlementSession()
        let staleOwned = DurableOwnership(
            doubleInfinityPoints: true,
            developerOptions: true,
            supporterCatGallery: true
        )
        let revoked = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: true
        )
        let staleSequence = session.beginProviderRefresh()
        let revokedSequence = session.beginProviderRefresh()
        let persisted = LockedBox<DurableOwnership?>(nil)
        let retryResult = LockedBox(false)
        let staleResult = LockedBox(true)

        XCTAssertFalse(session.applyProviderOwnership(
            revoked,
            refreshSequence: revokedSequence,
            persist: { _ in false }
        ))

        let start = DispatchSemaphore(value: 0)
        let group = DispatchGroup()
        group.enter()
        DispatchQueue.global().async {
            _ = start.wait(timeout: .now() + 5)
            retryResult.set(session.retryPendingPersistence { ownership in
                persisted.set(ownership)
                return true
            })
            group.leave()
        }
        group.enter()
        DispatchQueue.global().async {
            _ = start.wait(timeout: .now() + 5)
            staleResult.set(session.applyProviderOwnership(
                staleOwned,
                refreshSequence: staleSequence
            ) { ownership in
                persisted.set(ownership)
                return true
            })
            group.leave()
        }
        start.signal()
        start.signal()

        XCTAssertEqual(group.wait(timeout: .now() + 5), .success)
        XCTAssertTrue(retryResult.get())
        XCTAssertFalse(staleResult.get())
        XCTAssertEqual(revoked, persisted.get())
        XCTAssertEqual(
            revoked,
            session.resolve(
                persistedProviderOwnership: staleDisk,
                legacyDoubleInfinityPoints: false
            )
        )
    }

    func testSerializedProviderWriteCannotEraseConcurrentStickySupporterGrant() {
        let session = NativeEntitlementSession()
        let provider = DurableOwnership(
            doubleInfinityPoints: false,
            developerOptions: false,
            supporterCatGallery: false
        )
        let providerSequence = session.beginProviderRefresh()
        let persisted = LockedBox(provider)
        let refreshResult = LockedBox(false)
        let start = DispatchSemaphore(value: 0)
        let group = DispatchGroup()

        group.enter()
        DispatchQueue.global().async {
            _ = start.wait(timeout: .now() + 5)
            session.withSerializedAccess {
                persisted.update {
                    DurableOwnership(
                        doubleInfinityPoints: $0.doubleInfinityPoints,
                        developerOptions: $0.developerOptions,
                        supporterCatGallery: true
                    )
                }
            }
            group.leave()
        }
        group.enter()
        DispatchQueue.global().async {
            _ = start.wait(timeout: .now() + 5)
            refreshResult.set(session.applyProviderOwnership(
                provider,
                refreshSequence: providerSequence
            ) { ownership in
                persisted.update { current in
                    DurableOwnership(
                        doubleInfinityPoints: ownership.doubleInfinityPoints,
                        developerOptions: ownership.developerOptions,
                        supporterCatGallery:
                            ownership.supporterCatGallery ||
                                current.supporterCatGallery
                    )
                }
                return true
            })
            group.leave()
        }
        start.signal()
        start.signal()

        XCTAssertEqual(group.wait(timeout: .now() + 5), .success)
        XCTAssertTrue(refreshResult.get())
        XCTAssertTrue(persisted.get().supporterCatGallery)
        XCTAssertTrue(session.resolve(
            persistedProviderOwnership: persisted.get(),
            legacyDoubleInfinityPoints: false
        ).supporterCatGallery)
    }

    func testDurableSnapshotRejectsUnverifiedDurableTransaction() {
        var snapshot = NativeDurableEntitlementSnapshot(
            durableProductIds: ["ids.doubleip", "ids.devoptions"]
        )
        snapshot.observeVerified(
            productId: "ids.doubleip",
            revoked: false
        )

        XCTAssertThrowsError(try snapshot.observeUnverified(
            productId: "ids.devoptions"
        )) { error in
            XCTAssertEqual(
                error as? NativeDurableEntitlementSnapshotError,
                .unverifiedDurableTransaction
            )
        }
    }

    func testDurableSnapshotIgnoresUnverifiedConsumableAndRevokedDurable() throws {
        var snapshot = NativeDurableEntitlementSnapshot(
            durableProductIds: ["ids.doubleip", "ids.devoptions"]
        )
        snapshot.observeVerified(
            productId: "ids.doubleip",
            revoked: false
        )
        snapshot.observeVerified(
            productId: "ids.devoptions",
            revoked: true
        )
        try snapshot.observeUnverified(productId: "ids.tiptier1")

        XCTAssertEqual(snapshot.verifiedProductIds, ["ids.doubleip"])
    }
}

private final class LockedBox<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value

    init(_ value: Value) {
        self.value = value
    }

    func get() -> Value {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    func set(_ value: Value) {
        lock.lock()
        self.value = value
        lock.unlock()
    }

    func update(_ transform: (Value) -> Value) {
        lock.lock()
        value = transform(value)
        lock.unlock()
    }
}
