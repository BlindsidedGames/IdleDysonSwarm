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
}
