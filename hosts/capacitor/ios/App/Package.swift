// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "IdleDysonNativeEntitlementSession",
    defaultLocalization: "en",
    platforms: [.iOS(.v15), .macOS(.v13)],
    products: [
        .library(
            name: "IdleDysonNativeEntitlementSession",
            targets: ["IdleDysonNativeEntitlementSession"]
        ),
    ],
    targets: [
        .target(
            name: "IdleDysonNativeEntitlementSession",
            path: "NativeEntitlementSession",
            sources: ["NativeEntitlementSession.swift"]
        ),
        .testTarget(
            name: "IdleDysonNativeEntitlementSessionTests",
            dependencies: ["IdleDysonNativeEntitlementSession"],
            path: "Tests"
        ),
    ]
)
