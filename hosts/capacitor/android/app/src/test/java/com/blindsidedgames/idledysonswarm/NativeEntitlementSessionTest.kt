package com.blindsidedgames.idledysonswarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

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

    @Test
    fun staleConcurrentRefreshCannotOverrideNewerRevocation() {
        val session = NativeEntitlementSession()
        val staleOwned = DurableOwnership(true, true, true)
        val revoked = DurableOwnership(false, false, true)
        val staleSequence = session.beginProviderRefresh()
        val revokedSequence = session.beginProviderRefresh()
        val revokedApplied = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        try {
            val newer = executor.submit<Boolean> {
                session.applyProviderOwnership(revoked, revokedSequence) { true }
                    .also { revokedApplied.countDown() }
            }
            val stale = executor.submit<Boolean> {
                check(revokedApplied.await(5, TimeUnit.SECONDS))
                session.applyProviderOwnership(staleOwned, staleSequence) { true }
            }

            assertTrue(newer.get(5, TimeUnit.SECONDS))
            assertFalse(stale.get(5, TimeUnit.SECONDS))
            assertEquals(revoked, session.resolve(staleDisk, false))
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun concurrentRetryPersistsNewestPendingOwnershipNotStaleRefresh() {
        val session = NativeEntitlementSession()
        val staleOwned = DurableOwnership(true, true, true)
        val revoked = DurableOwnership(false, false, true)
        val staleSequence = session.beginProviderRefresh()
        val revokedSequence = session.beginProviderRefresh()
        val persisted = AtomicReference<DurableOwnership?>()

        assertFalse(session.applyProviderOwnership(revoked, revokedSequence) { false })
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val retry = executor.submit<Boolean> {
                check(start.await(5, TimeUnit.SECONDS))
                session.retryPendingPersistence {
                    persisted.set(it)
                    true
                }
            }
            val stale = executor.submit<Boolean> {
                check(start.await(5, TimeUnit.SECONDS))
                session.applyProviderOwnership(staleOwned, staleSequence) {
                    persisted.set(it)
                    true
                }
            }
            start.countDown()

            assertTrue(retry.get(5, TimeUnit.SECONDS))
            assertFalse(stale.get(5, TimeUnit.SECONDS))
            assertEquals(revoked, persisted.get())
            assertEquals(revoked, session.resolve(staleDisk, false))
        } finally {
            executor.shutdownNow()
        }
    }

    @Test
    fun serializedProviderWriteCannotEraseConcurrentStickySupporterGrant() {
        val session = NativeEntitlementSession()
        val provider = DurableOwnership(false, false, false)
        val providerSequence = session.beginProviderRefresh()
        val persisted = AtomicReference(provider)
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)

        try {
            val grant = executor.submit {
                check(start.await(5, TimeUnit.SECONDS))
                session.serialized {
                    persisted.set(persisted.get().copy(supporterCatGallery = true))
                }
            }
            val refresh = executor.submit<Boolean> {
                check(start.await(5, TimeUnit.SECONDS))
                session.applyProviderOwnership(provider, providerSequence) { pending ->
                    persisted.set(pending.copy(
                        supporterCatGallery =
                            pending.supporterCatGallery ||
                                persisted.get().supporterCatGallery,
                    ))
                    true
                }
            }
            start.countDown()

            grant.get(5, TimeUnit.SECONDS)
            assertTrue(refresh.get(5, TimeUnit.SECONDS))
            assertTrue(persisted.get().supporterCatGallery)
            assertTrue(session.resolve(persisted.get(), false).supporterCatGallery)
        } finally {
            executor.shutdownNow()
        }
    }
}
