import Capacitor
import CryptoKit
import Foundation
import UIKit

@objc(IdleDysonNativePlugin)
public final class IdleDysonNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IdleDysonNativePlugin"
    public let jsName = "IdleDysonNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "metadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "certificationDeviceContext", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentLifecycle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fileExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "replaceAtomically", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeCertificationFiles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discoverUnitySaveCandidates", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportDiagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStoreProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseStoreProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreStorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readEntitlementOwnership", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshEntitlementOwnership", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "promoteAutomaticUnityPurchaseEvidence", returnType: CAPPluginReturnPromise),
    ]

    private var lifecyclePhase = "active"
    private var lifecycleObservers: [NSObjectProtocol] = []
    private let entitlementCache = NativeEntitlementCache()
    private lazy var storeKit = IdleDysonStoreKit(entitlementCache: entitlementCache)
    private var automaticUnityEvidenceTokens: [String: NativeBoundUnityEvidence] = [:]

    @objc override public func load() {
        switch UIApplication.shared.applicationState {
        case .active:
            lifecyclePhase = "active"
        case .inactive:
            lifecyclePhase = "focus-lost"
        case .background:
            lifecyclePhase = "background"
        @unknown default:
            lifecyclePhase = "focus-lost"
        }
        let center = NotificationCenter.default
        lifecycleObservers = [
            center.addObserver(
                forName: UIApplication.didBecomeActiveNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in self?.publishLifecycle("active") },
            center.addObserver(
                forName: UIApplication.willResignActiveNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in self?.publishLifecycle("focus-lost") },
            center.addObserver(
                forName: UIApplication.didEnterBackgroundNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in self?.publishLifecycle("background") },
            center.addObserver(
                forName: UIApplication.willTerminateNotification,
                object: nil,
                queue: .main
            ) { [weak self] _ in self?.publishLifecycle("terminating") },
        ]
        Task { @MainActor [weak self] in self?.storeKit.start() }
    }

    deinit {
        for observer in lifecycleObservers {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    @objc public func metadata(_ call: CAPPluginCall) {
        let bundle = Bundle.main
        call.resolve([
            "applicationVersion": bundle.object(
                forInfoDictionaryKey: "CFBundleShortVersionString"
            ) as? String ?? "0.0.0",
            "buildNumber": bundle.object(
                forInfoDictionaryKey: "CFBundleVersion"
            ) as? String ?? "0",
            "platform": "ios",
            "locale": Locale.current.identifier.replacingOccurrences(
                of: "_",
                with: "-"
            ),
        ])
    }

    @objc public func currentLifecycle(_ call: CAPPluginCall) {
        call.resolve(["phase": lifecyclePhase])
    }

    @objc public func fileExists(_ call: CAPPluginCall) {
        perform(call) {
            let target = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "relativePath")
            )
            var isDirectory: ObjCBool = false
            let exists = FileManager.default.fileExists(
                atPath: target.path,
                isDirectory: &isDirectory
            ) && !isDirectory.boolValue
            call.resolve(["exists": exists])
        }
    }

    @objc public func readText(_ call: CAPPluginCall) {
        perform(call) {
            let target = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "relativePath")
            )
            guard FileManager.default.fileExists(atPath: target.path) else {
                call.reject("The requested Web save file does not exist.", "file-not-found")
                return
            }
            let data = try self.readBoundedData(from: target)
            guard let text = String(data: data, encoding: .utf8) else {
                throw NativeBridgeError.invalidText
            }
            call.resolve(["text": text])
        }
    }

    @objc public func writeText(_ call: CAPPluginCall) {
        perform(call) {
            let target = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "relativePath")
            )
            let data = try self.requireContents(call)
            try FileManager.default.createDirectory(
                at: target.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try data.write(to: target, options: [.atomic])
            call.resolve()
        }
    }

    @objc public func replaceAtomically(_ call: CAPPluginCall) {
        perform(call) {
            let source = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "temporaryRelativePath")
            )
            let destination = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "destinationRelativePath")
            )
            guard FileManager.default.fileExists(atPath: source.path) else {
                call.reject("The temporary Web save does not exist.", "file-not-found")
                return
            }
            try FileManager.default.createDirectory(
                at: destination.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try self.replace(source: source, destination: destination)
            call.resolve()
        }
    }

    @objc public func copy(_ call: CAPPluginCall) {
        perform(call) {
            let source = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "sourceRelativePath")
            )
            let destination = try self.rootedURL(
                relativePath: self.requireRelativePath(call, key: "destinationRelativePath")
            )
            guard FileManager.default.fileExists(atPath: source.path) else {
                call.reject("The Web save source does not exist.", "file-not-found")
                return
            }
            let data = try self.readBoundedData(from: source)
            try FileManager.default.createDirectory(
                at: destination.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            let staged = destination.deletingLastPathComponent().appendingPathComponent(
                ".\(destination.lastPathComponent).\(UUID().uuidString).tmp"
            )
            defer { try? FileManager.default.removeItem(at: staged) }
            try data.write(to: staged, options: [.atomic])
            try self.replace(source: staged, destination: destination)
            call.resolve()
        }
    }

    @objc public func certificationDeviceContext(_ call: CAPPluginCall) {
        let bundle = Bundle.main
        guard bundle.bundleIdentifier?.hasSuffix(".stage7certification") == true else {
            call.reject("Certification context is unavailable.", "certification-unavailable")
            return
        }
        #if !targetEnvironment(simulator)
        call.reject("This build certifies only the unsigned iOS simulator.", "certification-target-unsupported")
        return
        #endif
        call.resolve([
            "matrixId": "ios-current-simulator",
            "physicalDevice": false,
            "osApiLevel": NSNull(),
            "deviceModel": UIDevice.current.model,
            "osVersion": UIDevice.current.systemVersion,
            "applicationVersion": bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0",
            "buildNumber": bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0",
        ])
    }

    @objc public func removeCertificationFiles(_ call: CAPPluginCall) {
        perform(call) {
            guard let paths = call.getArray("relativePaths", String.self) else {
                throw NativeBridgeError.invalidPath
            }
            let admitted = try paths.map { relativePath -> URL in
                try self.requireCertificationCleanupPath(relativePath)
                return try self.rootedURL(relativePath: relativePath)
            }
            for target in admitted where FileManager.default.fileExists(atPath: target.path) {
                let values = try target.resourceValues(forKeys: [.isRegularFileKey])
                guard values.isRegularFile == true else { throw NativeBridgeError.invalidPath }
                try FileManager.default.removeItem(at: target)
            }
            call.resolve()
        }
    }

    @objc public func discoverUnitySaveCandidates(_ call: CAPPluginCall) {
        perform(call) {
            let documents = try self.documentsDirectory()
            let unitySave = documents.appendingPathComponent(
                Self.unitySaveFileName,
                isDirectory: false
            )
            var candidates: [[String: Any]] = []
            if FileManager.default.fileExists(atPath: unitySave.path) {
                let data = try self.readBoundedData(from: unitySave)
                guard let text = String(data: data, encoding: .utf8) else {
                    throw NativeBridgeError.invalidText
                }
                let stableId = "ios-retained-container"
                self.automaticUnityEvidenceTokens.removeAll()
                let candidateId: String
                if UserDefaults.standard.integer(forKey: "doubleip") == 1 {
                    let token = UUID().uuidString
                    let contentSha256 = SHA256.hash(data: data)
                        .map { String(format: "%02x", $0) }
                        .joined()
                    self.automaticUnityEvidenceTokens[token] = NativeBoundUnityEvidence(
                        opaqueSourceIdentifier: token,
                        contentSha256: contentSha256
                    )
                    candidateId = token
                } else {
                    candidateId = stableId
                }
                candidates.append([
                    "id": candidateId,
                    "sourcePath": "unity-readonly:\(candidateId)",
                    "text": text,
                    "provenance": [
                        "kind": "automatic-same-device-unity",
                        "platform": "ios",
                        "sourceClass": "unity-persistent-data-save",
                        "opaqueSourceIdentifier": candidateId,
                        "pathClass": "capacitor-documents",
                    ],
                ])
            }
            call.resolve(["candidates": candidates])
        }
    }

    @objc public func exportDiagnostics(_ call: CAPPluginCall) {
        perform(call) {
            guard
                let fileName = call.getString("fileName"),
                let mimeType = call.getString("mimeType"),
                let text = call.getString("text"),
                Self.diagnosticFileName.wholeMatch(in: fileName) != nil,
                mimeType == "application/json"
            else {
                throw NativeBridgeError.invalidDiagnostics
            }
            try self.requireValidDiagnostics(text)
            let exportDirectory = FileManager.default.temporaryDirectory
                .appendingPathComponent("diagnostic-exports", isDirectory: true)
            try FileManager.default.createDirectory(
                at: exportDirectory,
                withIntermediateDirectories: true
            )
            let exportURL = exportDirectory.appendingPathComponent(fileName)
            try Data(text.utf8).write(to: exportURL, options: [.atomic])

            DispatchQueue.main.async {
                guard let viewController = self.bridge?.viewController else {
                    call.resolve(["exported": false, "code": "export-unavailable"])
                    return
                }
                let activity = UIActivityViewController(
                    activityItems: [exportURL],
                    applicationActivities: nil
                )
                if let popover = activity.popoverPresentationController {
                    popover.sourceView = viewController.view
                    popover.sourceRect = CGRect(
                        x: viewController.view.bounds.midX,
                        y: viewController.view.bounds.midY,
                        width: 1,
                        height: 1
                    )
                }
                viewController.present(activity, animated: true)
                call.resolve(["exported": true])
            }
        }
    }

    @objc public func getStoreProducts(_ call: CAPPluginCall) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            let (products, _) = await storeKit.products()
            call.resolve([
                "listings": products.map { product in
                    [
                        "productId": product.productId,
                        "localizedPrice": product.localizedPrice ?? NSNull(),
                        "available": product.available,
                    ] as [String: Any]
                },
            ])
        }
    }

    @objc public func purchaseStoreProduct(_ call: CAPPluginCall) {
        guard
            let productId = call.getString("productId"),
            Self.productIds.contains(productId)
        else {
            call.reject("Unknown Store product.", "unknown-product")
            return
        }
        Task { @MainActor [weak self] in
            guard let self else { return }
            let result = await storeKit.purchase(productId: productId)
            var response: [String: Any] = [
                "accepted": result.accepted,
                "productId": result.productId,
            ]
            if let code = result.code { response["code"] = code }
            call.resolve(response)
        }
    }

    @objc public func restoreStorePurchases(_ call: CAPPluginCall) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            let (productIds, _) = await storeKit.restore()
            call.resolve(["restoredProductIds": productIds])
        }
    }

    @objc public func readEntitlementOwnership(_ call: CAPPluginCall) {
        resolveOwnership(call, ownership: entitlementCache.read(), providerAvailable: false)
    }

    @objc public func refreshEntitlementOwnership(_ call: CAPPluginCall) {
        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                let ownership = try await storeKit.refreshDurableOwnership()
                resolveOwnership(call, ownership: ownership, providerAvailable: true)
            } catch {
                resolveOwnership(
                    call,
                    ownership: entitlementCache.read(),
                    providerAvailable: false
                )
            }
        }
    }

    @objc public func promoteAutomaticUnityPurchaseEvidence(_ call: CAPPluginCall) {
        // Renderer booleans, provenance, hashes and schema claims are ignored.
        // Only a one-use token minted after native Unity PlayerPrefs discovery
        // can select the native-bound content hash recorded here.
        let token = call.getString("opaqueSourceIdentifier")
        let evidence = token.flatMap { automaticUnityEvidenceTokens.removeValue(forKey: $0) }
        let promoted = evidence.map {
            entitlementCache.promoteAutomaticUnityDoubleIpEvidence($0)
        } ?? false
        call.resolve([
            "promoted": promoted,
            "doubleInfinityPoints": entitlementCache.read().doubleInfinityPoints,
        ])
    }

    private func resolveOwnership(
        _ call: CAPPluginCall,
        ownership: DurableOwnership,
        providerAvailable: Bool
    ) {
        call.resolve([
            "doubleInfinityPoints": ownership.doubleInfinityPoints,
            "developerOptions": ownership.developerOptions,
            "providerAvailable": providerAvailable,
        ])
    }

    private func publishLifecycle(_ phase: String) {
        guard lifecyclePhase != phase else { return }
        lifecyclePhase = phase
        notifyListeners("lifecycleChanged", data: ["phase": phase])
    }

    private func webSaveRoot() throws -> URL {
        let root = try documentsDirectory().appendingPathComponent(
            Self.webSaveRootName,
            isDirectory: true
        )
        try FileManager.default.createDirectory(
            at: root,
            withIntermediateDirectories: true
        )
        return root.standardizedFileURL
    }

    private func documentsDirectory() throws -> URL {
        guard let documents = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first else {
            throw NativeBridgeError.storageUnavailable
        }
        return documents.standardizedFileURL
    }

    private func rootedURL(relativePath: String) throws -> URL {
        let root = try webSaveRoot()
        let target = root.appendingPathComponent(relativePath).standardizedFileURL
        let rootPrefix = root.path.hasSuffix("/") ? root.path : root.path + "/"
        guard target.path.hasPrefix(rootPrefix) else {
            throw NativeBridgeError.invalidPath
        }
        var cursor = target
        while cursor.path.hasPrefix(rootPrefix) {
            if FileManager.default.fileExists(atPath: cursor.path) {
                let values = try cursor.resourceValues(forKeys: [.isSymbolicLinkKey])
                if values.isSymbolicLink == true {
                    throw NativeBridgeError.invalidPath
                }
            }
            cursor.deleteLastPathComponent()
        }
        return target
    }

    private func requireRelativePath(
        _ call: CAPPluginCall,
        key: String
    ) throws -> String {
        guard let raw = call.getString(key) else {
            throw NativeBridgeError.invalidPath
        }
        let normalized = raw.replacingOccurrences(of: "\\", with: "/")
        let segments = normalized.split(separator: "/", omittingEmptySubsequences: false)
        guard
            !normalized.isEmpty,
            !normalized.hasPrefix("/"),
            normalized.range(of: "^[a-zA-Z]:", options: .regularExpression) == nil,
            !normalized.contains("\0"),
            segments.allSatisfy({ !$0.isEmpty && $0 != "." && $0 != ".." })
        else {
            throw NativeBridgeError.invalidPath
        }
        return segments.map(String.init).joined(separator: "/")
    }

    private func requireContents(_ call: CAPPluginCall) throws -> Data {
        guard let contents = call.getString("contents") else {
            throw NativeBridgeError.invalidText
        }
        let data = Data(contents.utf8)
        guard data.count <= Self.maxFileBytes else {
            throw NativeBridgeError.fileTooLarge
        }
        return data
    }

    private func requireCertificationCleanupPath(_ relativePath: String) throws {
        let segments = relativePath.split(separator: "/", omittingEmptySubsequences: false)
        guard segments.count >= 3,
              segments[0] == Substring(Self.certificationNamespace),
              Self.certificationBuildScope.wholeMatch(in: String(segments[1])) != nil,
              Self.certificationCleanupSuffixes.contains(
                segments.dropFirst(2).map(String.init).joined(separator: "/")
              ) else {
            throw NativeBridgeError.invalidPath
        }
    }

    private func readBoundedData(from url: URL) throws -> Data {
        let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
        guard values.isRegularFile == true else {
            throw NativeBridgeError.invalidPath
        }
        guard (values.fileSize ?? 0) <= Self.maxFileBytes else {
            throw NativeBridgeError.fileTooLarge
        }
        return try Data(contentsOf: url, options: [.mappedIfSafe])
    }

    private func replace(source: URL, destination: URL) throws {
        if FileManager.default.fileExists(atPath: destination.path) {
            _ = try FileManager.default.replaceItemAt(
                destination,
                withItemAt: source,
                backupItemName: nil,
                options: []
            )
        } else {
            try FileManager.default.moveItem(at: source, to: destination)
        }
    }

    private func requireValidDiagnostics(_ text: String) throws {
        let data = Data(text.utf8)
        guard data.count <= Self.maxDiagnosticBytes else {
            throw NativeBridgeError.invalidDiagnostics
        }
        guard
            let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            Set(object.keys).isSubset(of: Self.diagnosticKeys)
        else {
            throw NativeBridgeError.invalidDiagnostics
        }
    }

    private func perform(_ call: CAPPluginCall, operation: () throws -> Void) {
        do {
            try operation()
        } catch {
            call.reject(
                "The native host could not complete the request.",
                "native-operation-failed",
                error
            )
        }
    }

    private static let webSaveRootName = "web-runtime-v1"
    private static let unitySaveFileName = "idle_dyson_swarm_save.txt"
    private static let maxFileBytes = 32 * 1024 * 1024
    private static let maxDiagnosticBytes = 64 * 1024
    private static let certificationNamespace = "stage7-v2-certification"
    private static let certificationBuildScope = try! NSRegularExpression(
        pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$"
    )
    private static let certificationCleanupSuffixes: Set<String> = [
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
    ]
    private static let diagnosticFileName = try! NSRegularExpression(
        pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,90}\\.json$"
    )
    private static let diagnosticKeys: Set<String> = [
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
    ]
    private static let productIds: [String] = [
        "ids.tiptier1",
        "ids.tiptier2",
        "ids.tiptier3",
        "ids.devoptions",
        "ids.doubleip",
    ]
}

private enum NativeBridgeError: Error {
    case fileTooLarge
    case invalidDiagnostics
    case invalidPath
    case invalidText
    case storageUnavailable
}

private extension NSRegularExpression {
    func wholeMatch(in value: String) -> NSTextCheckingResult? {
        let range = NSRange(value.startIndex..<value.endIndex, in: value)
        guard
            let match = firstMatch(in: value, options: [], range: range),
            match.range == range
        else {
            return nil
        }
        return match
    }
}
