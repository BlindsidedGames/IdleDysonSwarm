import Capacitor
import CryptoKit
import Foundation
import GameKit
import StoreKit
import UIKit

private final class NativeStoreComponents: @unchecked Sendable {
    let entitlementCache: NativeEntitlementCache
    let storeKit: IdleDysonStoreKit

    init() {
        let entitlementCache = NativeEntitlementCache()
        self.entitlementCache = entitlementCache
        storeKit = IdleDysonStoreKit(entitlementCache: entitlementCache)
    }

    func refreshOwnership() async -> NativeOwnershipResponse {
        do {
            let refresh = try await storeKit.refreshDurableOwnership()
            return NativeOwnershipResponse(
                ownership: refresh.ownership,
                providerAvailable: true
            )
        } catch {
            return NativeOwnershipResponse(
                ownership: entitlementCache.read(),
                providerAvailable: false
            )
        }
    }

    func refreshOwnership(reply: SendablePluginCall) {
        Task { [self, reply] in
            let refresh = await refreshOwnership()
            await reply.resolveOwnership(refresh)
        }
    }
}

private struct NativeOwnershipResponse: Sendable {
    let ownership: DurableOwnership
    let providerAvailable: Bool
}

private final class SendablePluginCall: @unchecked Sendable {
    private let value: CAPPluginCall

    init(_ value: CAPPluginCall) {
        self.value = value
    }

    @MainActor
    func resolveProducts(_ products: [NativeProductListing]) {
        value.resolve([
            "listings": products.map { product in
                [
                    "productId": product.productId,
                    "localizedPrice": product.localizedPrice ?? NSNull(),
                    "available": product.available,
                ] as [String: Any]
            },
        ])
    }

    @MainActor
    func resolvePurchase(_ result: NativePurchaseResult) {
        var response: [String: Any] = [
            "accepted": result.accepted,
            "productId": result.productId,
        ]
        if let code = result.code { response["code"] = code }
        value.resolve(response)
    }

    @MainActor
    func resolveRestore(_ productIds: [String]) {
        value.resolve(["restoredProductIds": productIds])
    }

    @MainActor
    func resolveOwnership(_ response: NativeOwnershipResponse) {
        value.resolve([
            "doubleInfinityPoints": response.ownership.doubleInfinityPoints,
            "developerOptions": response.ownership.developerOptions,
            "supporterCatGallery": response.ownership.supporterCatGallery,
            "providerAvailable": response.providerAvailable,
        ])
    }
}

@objc(IdleDysonNativePlugin)
public final class IdleDysonNativePlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "IdleDysonNativePlugin"
    public let jsName = "IdleDysonNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "achievementStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitAchievements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "metadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentLifecycle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "fileExists", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "replaceAtomically", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discoverUnitySaveCandidates", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportDiagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStoreProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseStoreProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restoreStorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readEntitlementOwnership", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshEntitlementOwnership", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "promoteAutomaticUnityPurchaseEvidence", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestStoreReview", returnType: CAPPluginReturnPromise),
    ]

    private var lifecyclePhase = "active"
    private var lifecycleObservers: [NSObjectProtocol] = []
    private let nativeStore = NativeStoreComponents()
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
        authenticateGameCenter()
        let storeKit = nativeStore.storeKit
        Task { await storeKit.start() }
    }

    deinit {
        for observer in lifecycleObservers {
            NotificationCenter.default.removeObserver(observer)
        }
    }


    // Mirrors hosts/capacitor/achievement-map.json; account identity stays native.
    private let achievementIds: [String: String] = [
        "achievement.first_bot": "ids.first_bot",
        "achievement.first_assembly_line": "ids.first_assembly_line",
        "achievement.first_data_center": "ids.first_data_center",
        "achievement.first_planet": "ids.first_planet",
        "achievement.first_influence": "ids.first_influence",
        "achievement.first_infinity_point": "ids.first_infinity_point",
        "achievement.first_quantum_shard": "ids.first_quantum_shard",
        "achievement.first_strange_matter": "ids.first_strange_matter",
        "achievement.first_ai_manager": "ids.first_ai_manager",
        "achievement.first_server": "ids.first_server",
        "achievement.secrets_of_universe_maxed": "ids.secrets_maxed",
        "achievement.divisions_complete": "ids.divisions_complete",
        "achievement.unlock_terra": "ids.unlock_terra",
        "achievement.unlock_purity": "ids.unlock_purity",
        "achievement.unlock_power": "ids.unlock_power",
        "achievement.unlock_stellar": "ids.unlock_stellar",
        "achievement.unlock_paragade": "ids.unlock_paragade",
        "achievement.unlock_avocato": "ids.unlock_avocato",
        "achievement.counteractions_complete": "ids.all_counteractions",
        "achievement.speed_upgrades_complete": "ids.all_speed_upgrades",
        "achievement.translation_upgrades_complete": "ids.all_translation_upgrades",
        "achievement.simulation_upgrades_complete": "ids.all_simulation_upgrades",
        "achievement.developer_options": "ids.dev_options",
        "achievement.avotation_secrets_complete": "ids.easter_secrets",
        "achievement.avocados_skill": "ids.easter_avocados",
        "achievement.bots_42qi": "ids.bots_42qi",
        "achievement.skill_points_42": "ids.skills_assigned",
    ]
    private var achievementPresentationCall: CAPPluginCall?
    private var achievementPlayer: String?
    private var reportedAchievements = Set<String>()

    private func authenticateGameCenter() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] controller, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                if let controller, let presenter = self.bridge?.viewController,
                   presenter.presentedViewController == nil {
                    presenter.present(controller, animated: true)
                    return
                }
                let account = GKLocalPlayer.local.isAuthenticated ? GKLocalPlayer.local.gamePlayerID : nil
                if self.achievementPlayer != account {
                    self.achievementPlayer = account
                    self.reportedAchievements.removeAll()
                }
                if let call = self.achievementPresentationCall {
                    self.achievementPresentationCall = nil
                    if account != nil { self.presentAchievements(call) }
                    else { call.reject("Game Center sign-in unavailable.", "achievement-unavailable") }
                }
            }
        }
    }

    @objc public func showAchievements(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [self] in
            if GKLocalPlayer.local.isAuthenticated { presentAchievements(call) }
            else {
                guard achievementPresentationCall == nil else {
                    call.reject("Game Center is already opening.", "achievement-unavailable")
                    return
                }
                achievementPresentationCall = call
                DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
                    if self?.achievementPresentationCall === call {
                        self?.achievementPresentationCall = nil
                        call.reject("Game Center sign-in unavailable.", "achievement-unavailable")
                    }
                }
                authenticateGameCenter()
            }
        }
    }

    private func presentAchievements(_ call: CAPPluginCall) {
        guard let presenter = bridge?.viewController, presenter.presentedViewController == nil else {
            call.reject("Game Center cannot open right now.", "achievement-unavailable")
            return
        }
        let controller = GKGameCenterViewController(state: .achievements)
        controller.gameCenterDelegate = self
        presenter.present(controller, animated: true) { call.resolve() }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }

    @objc public func achievementStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["available": GKLocalPlayer.local.isAuthenticated])
        }
    }

    @objc public func submitAchievements(_ call: CAPPluginCall) {
        guard let evidence = call.getArray("unlocked", String.self), evidence.count <= achievementIds.count,
              evidence.allSatisfy({ achievementIds[$0] != nil }) else {
            call.reject("Invalid achievement evidence.", "achievement-invalid")
            return
        }
        DispatchQueue.main.async { [self] in
            let player = GKLocalPlayer.local
            guard player.isAuthenticated else {
                achievementPlayer = nil
                reportedAchievements.removeAll()
                call.reject("Game Center unavailable.", "achievement-unavailable")
                return
            }
            let account = player.gamePlayerID
            if achievementPlayer != account {
                achievementPlayer = account
                reportedAchievements.removeAll()
            }
            let pending = Set(evidence.compactMap { achievementIds[$0] }).subtracting(reportedAchievements)
            if pending.isEmpty { call.resolve(); return }
            let achievements = pending.map { id in
                let achievement = GKAchievement(identifier: id)
                achievement.percentComplete = 100
                achievement.showsCompletionBanner = true
                return achievement
            }
            GKAchievement.report(achievements) { [weak self] error in
                DispatchQueue.main.async {
                    guard error == nil else {
                        call.reject("Achievement reporting unavailable.", "achievement-unavailable")
                        return
                    }
                    if GKLocalPlayer.local.isAuthenticated,
                       GKLocalPlayer.local.gamePlayerID == account,
                       self?.achievementPlayer == account {
                        self?.reportedAchievements.formUnion(pending)
                    }
                    call.resolve()
                }
            }
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

    @objc public func requestStoreReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let defaults = UserDefaults.standard
            if defaults.bool(forKey: Self.reviewRequestedKey) {
                call.resolve([
                    "requested": false,
                    "reason": "already-requested",
                ])
                return
            }
            guard let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }) else {
                call.reject(
                    "The review flow requires an active window scene.",
                    "review-unavailable"
                )
                return
            }
            defaults.set(true, forKey: Self.reviewRequestedKey)
            if #available(iOS 18.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve([
                "requested": true,
                "reason": "requested",
            ])
        }
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
        let storeKit = nativeStore.storeKit
        let response = SendablePluginCall(call)
        Task { [storeKit, response] in
            let (products, _) = await storeKit.products()
            await response.resolveProducts(products)
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
        let storeKit = nativeStore.storeKit
        let responseCall = SendablePluginCall(call)
        Task {
            let result = await storeKit.purchase(productId: productId)
            await responseCall.resolvePurchase(result)
        }
    }

    @objc public func restoreStorePurchases(_ call: CAPPluginCall) {
        let storeKit = nativeStore.storeKit
        let response = SendablePluginCall(call)
        Task {
            let (productIds, _) = await storeKit.restore()
            await response.resolveRestore(productIds)
        }
    }

    @objc public func readEntitlementOwnership(_ call: CAPPluginCall) {
        resolveOwnership(
            call,
            ownership: nativeStore.entitlementCache.read(),
            providerAvailable: false
        )
    }

    @objc public func refreshEntitlementOwnership(_ call: CAPPluginCall) {
        nativeStore.refreshOwnership(reply: SendablePluginCall(call))
    }

    @objc public func promoteAutomaticUnityPurchaseEvidence(_ call: CAPPluginCall) {
        // Renderer booleans, provenance, hashes and schema claims are ignored.
        // Only a one-use token minted after native Unity PlayerPrefs discovery
        // can select the native-bound content hash recorded here.
        let token = call.getString("opaqueSourceIdentifier")
        let evidence = token.flatMap { automaticUnityEvidenceTokens.removeValue(forKey: $0) }
        let promoted = evidence.map {
            nativeStore.entitlementCache.promoteAutomaticUnityDoubleIpEvidence($0)
        } ?? false
        call.resolve([
            "promoted": promoted,
            "doubleInfinityPoints": nativeStore.entitlementCache.read().doubleInfinityPoints,
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
            "supporterCatGallery": ownership.supporterCatGallery,
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
    private static let reviewRequestedKey = "review_requested_v1"
    private static let maxFileBytes = 32 * 1024 * 1024
    private static let maxDiagnosticBytes = 64 * 1024
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
