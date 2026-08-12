package com.blindsidedgames.idledysonswarm

import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.charset.StandardCharsets
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.Locale
import java.util.UUID

@CapacitorPlugin(name = "IdleDysonNative")
class IdleDysonNativePlugin : Plugin() {
    private var lifecyclePhase = "active"
    private lateinit var entitlementCache: NativeEntitlementCache
    private lateinit var googlePlayStore: GooglePlayStore
    private val automaticUnityEvidenceTokens = mutableMapOf<String, NativeBoundUnityEvidence>()

    override fun load() {
        entitlementCache = NativeEntitlementCache(context)
        googlePlayStore = GooglePlayStore(context, entitlementCache)
        googlePlayStore.warmUp()
    }

    @PluginMethod
    fun metadata(call: PluginCall) {
        try {
            val packageInfo = if (android.os.Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0),
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            call.resolve(JSObject().apply {
                put("applicationVersion", packageInfo.versionName ?: "0.0.0")
                put("buildNumber", packageInfo.longVersionCode.toString())
                put("platform", "android")
                put("locale", Locale.getDefault().toLanguageTag())
            })
        } catch (error: Exception) {
            call.reject("Unable to read application metadata.", "metadata-unavailable", error)
        }
    }

    @PluginMethod
    fun currentLifecycle(call: PluginCall) {
        call.resolve(JSObject().apply { put("phase", lifecyclePhase) })
    }

    @PluginMethod
    fun fileExists(call: PluginCall) = withNativeFailure(call) {
        val target = rootedFile(requireRelativePath(call, "relativePath"))
        call.resolve(JSObject().apply { put("exists", target.isFile) })
    }

    @PluginMethod
    fun readText(call: PluginCall) = withNativeFailure(call) {
        val target = rootedFile(requireRelativePath(call, "relativePath"))
        if (!target.isFile) {
            call.reject("The requested Web save file does not exist.", "file-not-found")
            return@withNativeFailure
        }
        requireReadableSize(target)
        call.resolve(JSObject().apply {
            put("text", target.readText(StandardCharsets.UTF_8))
        })
    }

    @PluginMethod
    fun writeText(call: PluginCall) = withNativeFailure(call) {
        val target = rootedFile(requireRelativePath(call, "relativePath"))
        val contents = requireContents(call)
        target.parentFile?.mkdirs()
        FileOutputStream(target, false).use { output ->
            output.write(contents.toByteArray(StandardCharsets.UTF_8))
            output.flush()
            output.fd.sync()
        }
        call.resolve()
    }

    @PluginMethod
    fun replaceAtomically(call: PluginCall) = withNativeFailure(call) {
        val source = rootedFile(requireRelativePath(call, "temporaryRelativePath"))
        val destination = rootedFile(requireRelativePath(call, "destinationRelativePath"))
        if (!source.isFile) {
            call.reject("The temporary Web save does not exist.", "file-not-found")
            return@withNativeFailure
        }
        destination.parentFile?.mkdirs()
        atomicMove(source, destination)
        call.resolve()
    }

    @PluginMethod
    fun copy(call: PluginCall) = withNativeFailure(call) {
        val source = rootedFile(requireRelativePath(call, "sourceRelativePath"))
        val destination = rootedFile(requireRelativePath(call, "destinationRelativePath"))
        if (!source.isFile) {
            call.reject("The Web save source does not exist.", "file-not-found")
            return@withNativeFailure
        }
        requireReadableSize(source)
        destination.parentFile?.mkdirs()
        val staged = File(destination.parentFile, ".${destination.name}.${UUID.randomUUID()}.tmp")
        try {
            FileOutputStream(staged, false).use { output ->
                source.inputStream().use { input -> input.copyTo(output) }
                output.flush()
                output.fd.sync()
            }
            atomicMove(staged, destination)
        } finally {
            staged.delete()
        }
        call.resolve()
    }

    @PluginMethod
    fun certificationDeviceContext(call: PluginCall) {
        if (!BuildConfig.STAGE7_V2_CERTIFICATION) {
            call.reject("Certification context is unavailable.", "certification-unavailable")
            return
        }
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        val emulator = android.os.Build.FINGERPRINT.startsWith("generic") ||
            android.os.Build.MODEL.contains("Emulator") || android.os.Build.MODEL.contains("sdk_gphone")
        val matrixId = when (android.os.Build.VERSION.SDK_INT) {
            26 -> "android-api26-emulator"
            36 -> "android-api36-emulator"
            else -> null
        }
        if (!emulator || matrixId == null) {
            call.reject("This build certifies only Android API 26/36 emulators.", "certification-target-unsupported")
            return
        }
        call.resolve(JSObject().apply {
            put("matrixId", matrixId)
            put("physicalDevice", false)
            put("osApiLevel", android.os.Build.VERSION.SDK_INT)
            put("deviceModel", android.os.Build.MODEL)
            put("osVersion", android.os.Build.VERSION.RELEASE)
            put("applicationVersion", packageInfo.versionName ?: "0.0.0")
            put("buildNumber", packageInfo.longVersionCode.toString())
        })
    }

    @PluginMethod
    fun removeCertificationFiles(call: PluginCall) = withNativeFailure(call) {
        val paths = call.getArray("relativePaths")
            ?: throw IllegalArgumentException("Certification cleanup requires paths.")
        val admitted = (0 until paths.length()).map { index ->
            val relativePath = paths.getString(index)
            requireCertificationCleanupPath(relativePath)
            rootedFile(relativePath)
        }
        admitted.forEach { target ->
            if (target.exists() && (!target.isFile || !target.delete())) {
                throw IllegalStateException("Certification cleanup could not remove an owned file.")
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun discoverUnitySaveCandidates(call: PluginCall) = withNativeFailure(call) {
        val candidates = JSArray()
        val unitySave = context.getExternalFilesDir(null)?.resolve(UNITY_SAVE_FILE_NAME)
        if (unitySave?.isFile == true) {
            requireReadableSize(unitySave)
            val stableId = "android-retained-container"
            val text = unitySave.readText(StandardCharsets.UTF_8)
            automaticUnityEvidenceTokens.clear()
            val candidateId = if (legacyUnityDoubleIpOwned()) {
                val token = UUID.randomUUID().toString()
                automaticUnityEvidenceTokens[token] = NativeBoundUnityEvidence(
                    opaqueSourceIdentifier = token,
                    contentSha256 = sha256(text),
                )
                token
            } else {
                stableId
            }
            candidates.put(JSObject().apply {
                put("id", candidateId)
                put("sourcePath", "unity-readonly:$candidateId")
                put("text", text)
                put("provenance", JSObject().apply {
                    put("kind", "automatic-same-device-unity")
                    put("platform", "android")
                    put("sourceClass", "unity-persistent-data-save")
                    put("opaqueSourceIdentifier", candidateId)
                    put("pathClass", "capacitor-external-files")
                })
            })
        }
        call.resolve(JSObject().apply { put("candidates", candidates) })
    }

    @PluginMethod
    fun exportDiagnostics(call: PluginCall) = withNativeFailure(call) {
        val fileName = call.getString("fileName")
            ?: throw IllegalArgumentException("Diagnostics require a file name.")
        val mimeType = call.getString("mimeType")
        val text = call.getString("text")
            ?: throw IllegalArgumentException("Diagnostics require JSON text.")
        if (!DIAGNOSTIC_FILE_NAME.matches(fileName) || mimeType != "application/json") {
            throw IllegalArgumentException("Diagnostics require a safe JSON file name and MIME type.")
        }
        requireValidDiagnostics(text)
        val exportDirectory = File(context.cacheDir, "diagnostic-exports").apply { mkdirs() }
        val exportFile = File(exportDirectory, fileName)
        exportFile.writeText(text, StandardCharsets.UTF_8)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            exportFile,
        )
        val share = Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.runOnUiThread {
            try {
                activity.startActivity(Intent.createChooser(share, "Export diagnostics"))
                call.resolve(JSObject().apply { put("exported", true) })
            } catch (_: Exception) {
                call.resolve(JSObject().apply {
                    put("exported", false)
                    put("code", "export-unavailable")
                })
            }
        }
    }

    @PluginMethod
    fun getStoreProducts(call: PluginCall) {
        googlePlayStore.products { products, _ ->
            val listings = JSArray()
            products.forEach { product ->
                listings.put(JSObject().apply {
                    put("productId", product.productId)
                    put("localizedPrice", product.localizedPrice ?: JSONObject.NULL)
                    put("available", product.available)
                })
            }
            call.resolve(JSObject().apply { put("listings", listings) })
        }
    }

    @PluginMethod
    fun purchaseStoreProduct(call: PluginCall) {
        val productId = call.getString("productId")
        if (productId == null || !PRODUCT_IDS.contains(productId)) {
            call.reject("Unknown Store product.", "unknown-product")
            return
        }
        activity.runOnUiThread {
            googlePlayStore.purchase(activity, productId) { result ->
                call.resolve(JSObject().apply {
                    put("accepted", result.accepted)
                    put("productId", result.productId)
                    if (result.code != null) put("code", result.code)
                })
            }
        }
    }

    @PluginMethod
    fun restoreStorePurchases(call: PluginCall) {
        googlePlayStore.restore { productIds, _ ->
            call.resolve(JSObject().apply {
                put("restoredProductIds", JSArray(productIds))
            })
        }
    }

    @PluginMethod
    fun readEntitlementOwnership(call: PluginCall) = resolveOwnership(
        call,
        entitlementCache.read(),
        providerAvailable = googlePlayStore.providerAvailable(),
    )

    @PluginMethod
    fun refreshEntitlementOwnership(call: PluginCall) {
        googlePlayStore.refreshDurableOwnership { liveOwnership, providerAvailable ->
            resolveOwnership(
                call,
                liveOwnership ?: entitlementCache.read(),
                providerAvailable,
            )
        }
    }

    @PluginMethod
    fun promoteAutomaticUnityPurchaseEvidence(call: PluginCall) {
        // Every renderer-provided entitlement claim, provenance field, schema
        // and hash is untrusted. Only a one-use token minted during native
        // discovery after reading Unity's same-container PlayerPrefs is valid.
        val token = call.getString("opaqueSourceIdentifier")
        val boundEvidence = token?.let(automaticUnityEvidenceTokens::remove)
        val promoted = boundEvidence != null &&
            entitlementCache.promoteAutomaticUnityDoubleIpEvidence(boundEvidence)
        call.resolve(JSObject().apply {
            put("promoted", promoted)
            put("doubleInfinityPoints", entitlementCache.read().doubleInfinityPoints)
        })
    }

    override fun handleOnResume() = publishLifecycle("active")

    override fun handleOnPause() = publishLifecycle("focus-lost")

    override fun handleOnStop() = publishLifecycle("background")

    override fun handleOnDestroy() {
        // Activity recreation is not application termination. Android does not
        // promise a final process callback, so durable checkpoints belong to
        // focus-lost/background; terminating is best-effort for a real finish.
        if (activity.isFinishing) publishLifecycle("terminating")
    }

    private fun resolveOwnership(
        call: PluginCall,
        ownership: DurableOwnership,
        providerAvailable: Boolean,
    ) {
        call.resolve(JSObject().apply {
            put("doubleInfinityPoints", ownership.doubleInfinityPoints)
            put("developerOptions", ownership.developerOptions)
            put("providerAvailable", providerAvailable)
        })
    }

    private fun publishLifecycle(phase: String) {
        if (lifecyclePhase == phase) return
        lifecyclePhase = phase
        notifyListeners("lifecycleChanged", JSObject().apply { put("phase", phase) })
    }

    private fun legacyUnityDoubleIpOwned(): Boolean = context.getSharedPreferences(
        "${context.packageName}.v2.playerprefs",
        android.content.Context.MODE_PRIVATE,
    ).getInt("doubleip", 0) == 1

    private fun sha256(text: String): String = MessageDigest.getInstance("SHA-256")
        .digest(text.toByteArray(StandardCharsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }

    private fun rootedFile(relativePath: String): File {
        val root = File(context.filesDir, WEB_SAVE_ROOT).apply { mkdirs() }.canonicalFile
        val target = File(root, relativePath).canonicalFile
        val prefix = root.path + File.separator
        if (!target.path.startsWith(prefix)) {
            throw IllegalArgumentException("Native Web save paths must remain below the app-owned root.")
        }
        var cursor: File? = target
        while (cursor != null && cursor.path.startsWith(prefix)) {
            if (Files.isSymbolicLink(cursor.toPath())) {
                throw IllegalArgumentException("Symbolic links are not accepted in native Web save paths.")
            }
            cursor = cursor.parentFile
        }
        return target
    }

    private fun requireRelativePath(call: PluginCall, key: String): String {
        val value = call.getString(key)
            ?: throw IllegalArgumentException("Missing native Web save path.")
        val normalized = value.replace('\\', '/')
        val segments = normalized.split('/')
        if (
            normalized.isEmpty() ||
            normalized.startsWith('/') ||
            DRIVE_PREFIX.containsMatchIn(normalized) ||
            normalized.contains('\u0000') ||
            segments.any { it.isEmpty() || it == "." || it == ".." }
        ) {
            throw IllegalArgumentException("Native Web save paths must be safe relative paths.")
        }
        return segments.joinToString(File.separator)
    }

    private fun requireContents(call: PluginCall): String {
        val contents = call.getString("contents")
            ?: throw IllegalArgumentException("Native Web save writes require text contents.")
        if (contents.toByteArray(StandardCharsets.UTF_8).size > MAX_FILE_BYTES) {
            throw IllegalArgumentException("Native Web save exceeds the supported size limit.")
        }
        return contents
    }

    private fun requireCertificationCleanupPath(relativePath: String) {
        val normalized = relativePath.replace('\\', '/')
        val segments = normalized.split('/')
        if (segments.size < 3 || segments[0] != CERTIFICATION_NAMESPACE ||
            !CERTIFICATION_BUILD_SCOPE.matches(segments[1]) ||
            !CERTIFICATION_CLEANUP_SUFFIXES.contains(segments.drop(2).joinToString("/"))) {
            throw IllegalArgumentException("Certification cleanup accepts only enumerated owned files.")
        }
    }

    private fun requireReadableSize(file: File) {
        if (file.length() < 0 || file.length() > MAX_FILE_BYTES) {
            throw IllegalArgumentException("Native save exceeds the supported size limit.")
        }
    }

    private fun atomicMove(source: File, destination: File) {
        try {
            Files.move(
                source.toPath(),
                destination.toPath(),
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING,
            )
        } catch (error: AtomicMoveNotSupportedException) {
            throw IllegalStateException("This device cannot atomically replace the Web save.", error)
        }
    }

    private fun requireValidDiagnostics(text: String) {
        if (text.toByteArray(StandardCharsets.UTF_8).size > MAX_DIAGNOSTIC_BYTES) {
            throw IllegalArgumentException("Diagnostics exceed the supported size limit.")
        }
        val objectValue = JSONObject(text)
        val keys = objectValue.keys()
        while (keys.hasNext()) {
            if (!DIAGNOSTIC_KEYS.contains(keys.next())) {
                throw IllegalArgumentException("Diagnostics contain an unsupported field.")
            }
        }
    }

    private inline fun withNativeFailure(call: PluginCall, operation: () -> Unit) {
        try {
            operation()
        } catch (error: Exception) {
            call.reject("The native host could not complete the request.", "native-operation-failed", error)
        }
    }

    companion object {
        private const val WEB_SAVE_ROOT = "web-runtime-v1"
        private const val UNITY_SAVE_FILE_NAME = "idle_dyson_swarm_save.txt"
        private const val MAX_FILE_BYTES = 32 * 1024 * 1024
        private const val MAX_DIAGNOSTIC_BYTES = 64 * 1024
        private const val CERTIFICATION_NAMESPACE = "stage7-v2-certification"
        private val CERTIFICATION_BUILD_SCOPE = Regex("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
        private val CERTIFICATION_CLEANUP_SUFFIXES = setOf(
            "checkpoint/current.json",
            "checkpoint/current.json.tmp",
            "checkpoint/backups/current.1.json",
            "checkpoint/backups/current.2.json",
            "checkpoint/backups/current.3.json",
            "recovery/import-original.idsw",
            "recovery/import-original.idsw.tmp",
            "local/stored-time-policy.json",
            "evidence/draft.json",
            "evidence/draft.json.tmp",
        )
        private val DRIVE_PREFIX = Regex("^[a-zA-Z]:")
        private val DIAGNOSTIC_FILE_NAME = Regex("^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}\\.json$")
        private val DIAGNOSTIC_KEYS = setOf(
            "phase",
            "code",
            "buildId",
            "hostKind",
            "locale",
            "saveSchemaVersion",
            "frontendRevision",
            "canonicalRevision",
            "errorKind",
            "matrixId", "performedAtUtc", "tester", "deviceModel", "physicalDevice", "osApiLevel",
            "osVersion", "webViewVersion", "appVersion", "workerBuildId",
            "workerCatalogHash", "workerTuningHash", "policy", "schemaBefore",
            "schemaAfter", "initialRevision", "finalRevision", "saveReadback",
            "reloadReadback", "corruptionRecovery", "lifecyclePauseReturn",
            "forcedReloadRecovery", "longOfflineSeconds", "extremeDecimalCanonical",
            "updateIdentityRecovery", "platformStateIsLocal", "portableSaveExcludesPlatform",
            "maximumChunkMilliseconds", "maximumAtomicEventMilliseconds", "result", "notes",
            "fastRawTicks", "balancedRawTicks", "exactRawTicks",
            "fastCompleted", "balancedCompleted", "exactCompleted",
            "developerPurchaseVerified", "developerFreeEnableVerified",
            "developerShardDebit", "developerStrangeMatterDebit", "developerLifetimeShardDelta",
            "preAckRecovery", "postCheckpointRecovery", "forwardSchemaRecovery",
            "extremeAdvanceVerified",
            "updateBuildAId", "updateBuildBId", "updateBaselineRevision",
            "updateBaselineStoredTimeSeconds", "updatePortableHash",
        )
        private val PRODUCT_IDS = setOf(
            "ids.tiptier1",
            "ids.tiptier2",
            "ids.tiptier3",
            "ids.devoptions",
            "ids.doubleip",
        )
    }
}
