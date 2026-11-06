import SwiftUI

struct ContentView: View {
    @Environment(Library.self) private var library

    var body: some View {
        @Bindable var lib = library

        Group {
            if library.folder == nil {
                WelcomeView()
            } else {
                HStack(spacing: 0) {
                    VStack(spacing: 0) {
                        if library.mode == .grid {
                            GridBrowser()
                        } else {
                            if let photo = library.selected {
                                ViewerView(photo: photo)
                            } else {
                                EmptyFolderView()
                            }
                            Divider()
                            Filmstrip().frame(height: 168)
                        }
                        StatusBar()
                    }
                    if library.showInfo, let photo = library.selected {
                        Divider()
                        InfoPanel(photo: photo).frame(width: 260)
                    }
                }
            }
        }
        .background(Color(white: 0.11))
        .navigationTitle(library.folder?.lastPathComponent ?? "Import New Things")
        .toolbar {
            ToolbarItemGroup {
                Button { library.openFolder() } label: {
                    Label("Öppna mapp", systemImage: "folder")
                }
                .help("Öppna mapp (⌘O)")

                if library.folder != nil {
                    Picker("Visa", selection: $lib.minRating) {
                        Text("Alla bilder").tag(0)
                        ForEach(1...5, id: \.self) { n in
                            Text(String(repeating: "★", count: n) + (n < 5 ? " eller mer" : "")).tag(n)
                        }
                    }
                    .pickerStyle(.menu)
                    .help("Visa bara bilder med minst så många stjärnor")

                    Picker("Läge", selection: $lib.mode) {
                        Image(systemName: "rectangle").tag(ViewMode.viewer)
                        Image(systemName: "square.grid.3x3").tag(ViewMode.grid)
                    }
                    .pickerStyle(.segmented)
                    .help("Stor bild eller rutnät (G)")

                    Button { library.showInfo.toggle() } label: {
                        Label("Info", systemImage: "info.circle")
                    }
                    .help("Visa eller dölj bildinformation (I)")
                }
            }
        }
        .onAppear { library.installKeyMonitor() }
        .onChange(of: library.minRating) { library.fixSelection() }
    }
}

struct WelcomeView: View {
    @Environment(Library.self) private var library

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "camera.aperture")
                .font(.system(size: 64, weight: .thin))
                .foregroundStyle(.secondary)
            Text("Import New Things")
                .font(.system(size: 34, weight: .semibold))
            Text("Öppna en mapp eller ett minneskort för att börja.")
                .foregroundStyle(.secondary)
            Button("Öppna mapp…") { library.openFolder() }
                .controlSize(.large)
                .keyboardShortcut(.defaultAction)
                .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct EmptyFolderView: View {
    @Environment(Library.self) private var library

    var body: some View {
        VStack(spacing: 10) {
            if library.isScanning {
                ProgressView()
                Text("Letar efter bilder…").foregroundStyle(.secondary)
            } else if library.photos.isEmpty {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.system(size: 40, weight: .thin))
                    .foregroundStyle(.secondary)
                Text("Inga bilder i den här mappen.").foregroundStyle(.secondary)
            } else {
                Text("Inga bilder matchar filtret.").foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct StatusBar: View {
    @Environment(Library.self) private var library

    var body: some View {
        HStack(spacing: 14) {
            if library.isScanning {
                ProgressView().controlSize(.small)
                Text("Letar efter bilder…")
            } else if library.minRating > 0 {
                Text("\(library.visible.count) av \(library.photos.count) bilder")
            } else {
                Text("\(library.photos.count) bilder")
            }
            Spacer()
            Text("1–5 stjärnor · 0 ta bort · ← → bläddra · G rutnät · I info")
                .foregroundStyle(.secondary)
        }
        .font(.system(size: 11))
        .padding(.horizontal, 12)
        .frame(height: 26)
        .background(Color.black.opacity(0.3))
    }
}
