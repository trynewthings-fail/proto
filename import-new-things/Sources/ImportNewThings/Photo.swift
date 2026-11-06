import Foundation

struct Photo: Identifiable, Hashable, Sendable {
    let url: URL
    /// Sökväg relativt den öppnade mappen. Används som nyckel för betyg.
    let key: String
    let date: Date

    var id: URL { url }
    var name: String { url.lastPathComponent }
    var isRaw: Bool { Photo.isRaw(url) }

    static let rawExtensions: Set<String> = [
        "arw", "srf", "sr2", "cr2", "cr3", "crw", "nef", "nrw", "raf", "dng",
        "orf", "rw2", "pef", "srw", "3fr", "iiq", "fff", "erf", "mos", "x3f",
    ]
    static let otherExtensions: Set<String> = [
        "jpg", "jpeg", "tif", "tiff", "png", "heic", "heif", "psd",
    ]

    static func isRaw(_ url: URL) -> Bool {
        rawExtensions.contains(url.pathExtension.lowercased())
    }

    static func isSupported(_ url: URL) -> Bool {
        let ext = url.pathExtension.lowercased()
        return rawExtensions.contains(ext) || otherExtensions.contains(ext)
    }
}
