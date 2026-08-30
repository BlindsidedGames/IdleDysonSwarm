package com.blindsidedgames.idledysonswarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeEntitlementSessionTest {
    private val staleDisk = DurableOwnership(
        doubleInfinityPoints = true,
        developerOptions = true,
        supporterCatGallery = true,
    )

    @Test
    fun authoritativeRevocationWinsImmediatelyWhenPersistenceFails() {
        val session = NativeEntitlementSession()
        val revoked = DurableOwnership(false, false, true)

        assertFalse(session.applyProviderOwnership(revoked) { false })
        assertEquals(revoked, session.resolve(staleDisk, false))
    }

    @Test
    fun providerFailureKeepsLatestVerifiedSessionOwnership() {
        val session = NativeEntitlementSession()
        val current = DurableOwnership(false, true, true)
        session.applyProviderOwnership(current) { false }

        assertEquals(current, session.resolve(staleDisk, false))
        assertEquals(current, session.resolve(staleDisk, false))
    }

    @Test
    fun pendingPersistenceRetriesWithoutRestoringStaleDisk() {
        val session = NativeEntitlementSession()
        val revoked = DurableOwnership(false, false, true)
        var persisted: DurableOwnership? = null
        session.applyProviderOwnership(revoked) { false }

        assertTrue(session.retryPendingPersistence {
            persisted = it
            true
        })
        assertEquals(revoked, persisted)
        assertEquals(revoked, session.resolve(staleDisk, false))
    }

    @Test
    fun nativeLegacyEvidenceRemainsIndependentOfProviderRevocation() {
        val session = NativeEntitlementSession()
        val revoked = DurableOwnership(false, false, false)
        session.applyProviderOwnership(revoked) { true }

        assertTrue(session.resolve(staleDisk, true).doubleInfinityPoints)
        assertFalse(session.resolve(staleDisk, false).doubleInfinityPoints)
    }
}
