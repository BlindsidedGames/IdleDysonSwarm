package com.blindsidedgames.idledysonswarm

import android.content.Context

internal data class NativeBoundUnityEvidence(
    val opaqueSourceIdentifier: String,
    val contentSha256: String,
)

/**
 * App-private offline continuity for Store-verified durable ownership.
 *
 * This cache is deliberately outside the transferable game save. It is not a
 * substitute for live Store verification and contains no receipt, purchase
 * token, Unity save contents, or absolute source path.
 */
internal class NativeEntitlementCache(context: Context) {
    private val preferences = context.getSharedPreferences(
        "verified-store-entitlements-v1",
        Context.MODE_PRIVATE,
    )
    private val session = NativeEntitlementSession()

    fun read(): DurableOwnership = session.resolve(
        persistedProviderOwnership = readPersistedProviderOwnership(),
        legacyDoubleInfinityPoints =
            preferences.getBoolean(KEY_LEGACY_DOUBLE_IP, false),
    )

    fun writeProviderOwnership(ownership: DurableOwnership): Boolean =
        session.applyProviderOwnership(ownership, ::persistProviderOwnership)

    fun retryPendingProviderOwnership(): Boolean =
        session.retryPendingPersistence(::persistProviderOwnership)

    private fun readPersistedProviderOwnership(): DurableOwnership = DurableOwnership(
        doubleInfinityPoints = preferences.getBoolean(KEY_PROVIDER_DOUBLE_IP, false),
        developerOptions = preferences.getBoolean(KEY_PROVIDER_DEV_OPTIONS, false),
        supporterCatGallery = preferences.getBoolean(KEY_SUPPORTER_CAT_GALLERY, false),
    )

    private fun persistProviderOwnership(ownership: DurableOwnership): Boolean =
        preferences.edit()
            .putBoolean(KEY_PROVIDER_DOUBLE_IP, ownership.doubleInfinityPoints)
            .putBoolean(KEY_PROVIDER_DEV_OPTIONS, ownership.developerOptions)
            .putBoolean(
                KEY_SUPPORTER_CAT_GALLERY,
                ownership.supporterCatGallery ||
                    preferences.getBoolean(KEY_SUPPORTER_CAT_GALLERY, false),
            )
            .putLong(KEY_VERIFIED_AT_UTC_MS, System.currentTimeMillis())
            .commit()

    fun grantSupporterCatGallery(): Boolean =
        preferences.edit()
            .putBoolean(KEY_SUPPORTER_CAT_GALLERY, true)
            .putLong(KEY_VERIFIED_AT_UTC_MS, System.currentTimeMillis())
            .commit()

    fun promoteAutomaticUnityDoubleIpEvidence(
        evidence: NativeBoundUnityEvidence,
    ): Boolean {
        if (preferences.getBoolean(KEY_LEGACY_DOUBLE_IP, false)) return false

        return preferences.edit()
            .putBoolean(KEY_LEGACY_DOUBLE_IP, true)
            .putString(KEY_LEGACY_KIND, "automatic-same-device-unity")
            .putString(KEY_LEGACY_PLATFORM, "android")
            .putString(KEY_LEGACY_SOURCE_CLASS, "unity-persistent-data-save")
            .putString(KEY_LEGACY_OPAQUE_ID, evidence.opaqueSourceIdentifier)
            .putString(KEY_LEGACY_PATH_CLASS, "capacitor-external-files")
            .putString(KEY_LEGACY_CONTENT_SHA256, evidence.contentSha256)
            .putLong(KEY_LEGACY_PROMOTED_AT_UTC_MS, System.currentTimeMillis())
            .commit()
    }

    private companion object {
        private const val KEY_PROVIDER_DOUBLE_IP = "provider.double-ip"
        private const val KEY_PROVIDER_DEV_OPTIONS = "provider.developer-options"
        private const val KEY_SUPPORTER_CAT_GALLERY = "provider.supporter-cat-gallery"
        private const val KEY_VERIFIED_AT_UTC_MS = "provider.verified-at-utc-ms"
        private const val KEY_LEGACY_DOUBLE_IP = "legacy.double-ip"
        private const val KEY_LEGACY_KIND = "legacy.kind"
        private const val KEY_LEGACY_PLATFORM = "legacy.platform"
        private const val KEY_LEGACY_SOURCE_CLASS = "legacy.source-class"
        private const val KEY_LEGACY_OPAQUE_ID = "legacy.opaque-source-id"
        private const val KEY_LEGACY_PATH_CLASS = "legacy.path-class"
        private const val KEY_LEGACY_CONTENT_SHA256 = "legacy.content-sha256"
        private const val KEY_LEGACY_PROMOTED_AT_UTC_MS = "legacy.promoted-at-utc-ms"
    }
}
