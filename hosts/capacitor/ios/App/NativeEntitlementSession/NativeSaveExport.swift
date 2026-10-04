import Foundation

enum NativeSaveExport {
    enum Failure: Error { case invalidRequest }
    private static let fileNamePattern = try! Regex("idle-dyson-swarm-save(?:-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z)?\\.idsw")

    static func prepare(fileName: String?, text: String?, temporaryRoot: URL = FileManager.default.temporaryDirectory) throws -> URL {
        guard let fileName, let text, !text.isEmpty,
              fileName.wholeMatch(of: fileNamePattern) != nil,
              text.utf8.count <= 32 * 1024 * 1024 else {
            throw Failure.invalidRequest
        }
        let directory = temporaryRoot.appendingPathComponent("ids-save-export-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent(fileName)
        do { try Data(text.utf8).write(to: url, options: [.atomic]) }
        catch { try? FileManager.default.removeItem(at: directory); throw error }
        return url
    }

    static func discard(_ url: URL) {
        try? FileManager.default.removeItem(at: url.deletingLastPathComponent())
    }
}
