import XCTest
@testable import IdleDysonNativeEntitlementSession

final class NativeSaveExportTests: XCTestCase {
    func testPreparesExactUtf8PayloadInIndependentTemporaryFiles() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let text = "IDSWEB1:café\nunchanged-payload"
        let first = try NativeSaveExport.prepare(fileName: "idle-dyson-swarm-save.idsw", text: text, temporaryRoot: root)
        let second = try NativeSaveExport.prepare(fileName: "idle-dyson-swarm-save-2026-10-04T12-00-00-000Z.idsw", text: "independent-save", temporaryRoot: root)
        XCTAssertEqual(try Data(contentsOf: first), Data(text.utf8))
        XCTAssertEqual(first.lastPathComponent, "idle-dyson-swarm-save.idsw")
        XCTAssertEqual(second.lastPathComponent, "idle-dyson-swarm-save-2026-10-04T12-00-00-000Z.idsw")
        NativeSaveExport.discard(first)
        XCTAssertFalse(FileManager.default.fileExists(atPath: first.path))
        XCTAssertEqual(try String(contentsOf: second, encoding: .utf8), "independent-save")
        NativeSaveExport.discard(second)
        XCTAssertFalse(FileManager.default.fileExists(atPath: second.path))
    }
    func testRejectsUnsafeNamesWithoutCreatingTemporaryFiles() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        for name in ["../idle-dyson-swarm-save.idsw", "idle-dyson-swarm-save.idsw\n", "save.exe", "idle-dyson-swarm-save-random.idsw"] {
            XCTAssertThrowsError(try NativeSaveExport.prepare(fileName: name, text: "valid-payload", temporaryRoot: root))
        }
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.path))
    }
    func testBoundsUtf8BytesAndRejectsEmptyPayload() {
        XCTAssertThrowsError(try NativeSaveExport.prepare(fileName: "idle-dyson-swarm-save.idsw", text: ""))
        XCTAssertThrowsError(try NativeSaveExport.prepare(fileName: "idle-dyson-swarm-save.idsw", text: String(repeating: "é", count: 16 * 1024 * 1024 + 1)))
    }
}
