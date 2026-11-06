import AppKit
import SwiftUI

enum ViewMode: Hashable {
    case viewer, grid
}

/// Allt som rör den öppna mappen: bilderna, urvalet och betygen.
@MainActor
@Observable
final class Library {
    var folder: URL?
    var photos: [Photo] = []
    var selection: URL?
    var ratings: [String: Int] = [:]
    var minRating = 0
    var mode: ViewMode = .viewer
    var showInfo = true
    var isScanning = false
    var gridColumns = 1

    @ObservationIgnored private var keyMonitor: Any?

    var visible: [Photo] {
        minRating == 0 ? photos : photos.filter { rating(of: $0) >= minRating }
    }

    var selected: Photo? {
        guard let selection else { return nil }
        return photos.first { $0.id == selection }
    }

    func rating(of photo: Photo) -> Int {
        ratings[photo.key] ?? 0
    }

    // MARK: Öppna mapp

    func openFolder() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.prompt = "Öppna"
        panel.message = "Välj en mapp eller ett minneskort med bilder"
        if panel.runModal() == .OK, let url = panel.url {
            load(url)
        }
    }

    func load(_ url: URL) {
        folder = url
        photos = []
        selection = nil
        ratings = Self.readRatings(in: url)
        isScanning = true
        Task {
            let found = await Task.detached(priority: .userInitiated) {
                Library.scan(url)
            }.value
            guard self.folder == url else { return }
            self.photos = found
            self.selection = found.first?.id
            self.isScanning = false
        }
    }

    nonisolated static func scan(_ folder: URL) -> [Photo] {
        let base = folder.resolvingSymlinksInPath().path
        let keys: [URLResourceKey] = [.isRegularFileKey, .contentModificationDateKey]
        guard let enumerator = FileManager.default.enumerator(
            at: folder,
            includingPropertiesForKeys: keys,
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else { return [] }

        var found: [Photo] = []
        for case let url as URL in enumerator {
            guard Photo.isSupported(url) else { continue }
            let values = try? url.resourceValues(forKeys: Set(keys))
            guard values?.isRegularFile == true else { continue }
            let full = url.resolvingSymlinksInPath().path
            let key = full.hasPrefix(base + "/")
                ? String(full.dropFirst(base.count + 1))
                : url.lastPathComponent
            found.append(Photo(url: url, key: key, date: values?.contentModificationDate ?? .distantPast))
        }
        return found.sorted { ($0.date, $0.key) < ($1.date, $1.key) }
    }

    // MARK: Betyg

    func setRating(_ value: Int) {
        guard let photo = selected else { return }
        ratings[photo.key] = value == 0 ? nil : value
        saveRatings()
        fixSelection()
    }

    private struct Store: Codable {
        var version: Int
        var ratings: [String: Int]
    }

    private nonisolated static let ratingsFile = ".importnewthings.json"

    private static func readRatings(in folder: URL) -> [String: Int] {
        let url = folder.appendingPathComponent(ratingsFile)
        guard let data = try? Data(contentsOf: url),
              let store = try? JSONDecoder().decode(Store.self, from: data)
        else { return [:] }
        return store.ratings
    }

    private func saveRatings() {
        guard let folder else { return }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(Store(version: 1, ratings: ratings)) else { return }
        try? data.write(to: folder.appendingPathComponent(Self.ratingsFile), options: .atomic)
    }

    // MARK: Navigering

    func move(by delta: Int) {
        let vis = visible
        guard !vis.isEmpty else { return }
        let index = vis.firstIndex { $0.id == selection } ?? 0
        selection = vis[max(0, min(vis.count - 1, index + delta))].id
    }

    /// Om den valda bilden har filtrerats bort: välj nästa synliga.
    func fixSelection() {
        let vis = visible
        if let selection, vis.contains(where: { $0.id == selection }) { return }
        guard !vis.isEmpty else {
            selection = nil
            return
        }
        if let selection, let index = photos.firstIndex(where: { $0.id == selection }) {
            let ids = Set(vis.map(\.id))
            if let next = photos[index...].first(where: { ids.contains($0.id) }) {
                self.selection = next.id
                return
            }
            self.selection = vis.last?.id
            return
        }
        self.selection = vis.first?.id
    }

    // MARK: Tangentbord

    func installKeyMonitor() {
        guard keyMonitor == nil else { return }
        keyMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            let handled = MainActor.assumeIsolated { self?.handle(event) ?? false }
            return handled ? nil : event
        }
    }

    private func handle(_ event: NSEvent) -> Bool {
        guard folder != nil, NSApp.modalWindow == nil, !(event.window is NSPanel) else { return false }
        guard event.modifierFlags.intersection([.command, .control, .option]).isEmpty else { return false }
        if event.window?.firstResponder is NSText { return false }

        switch event.keyCode {
        case 123: move(by: -1); return true                                  // ←
        case 124: move(by: 1); return true                                   // →
        case 125: move(by: mode == .grid ? gridColumns : 1); return true     // ↓
        case 126: move(by: mode == .grid ? -gridColumns : -1); return true   // ↑
        case 36, 76: mode = .viewer; return true                             // Retur
        case 53: mode = .grid; return true                                   // Esc
        default: break
        }

        switch event.charactersIgnoringModifiers?.lowercased() {
        case let c? where c.count == 1 && "012345".contains(c):
            setRating(Int(c) ?? 0)
            return true
        case "g":
            mode = mode == .grid ? .viewer : .grid
            return true
        case "i":
            showInfo.toggle()
            return true
        default:
            return false
        }
    }
}
