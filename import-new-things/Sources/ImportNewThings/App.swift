import SwiftUI

@main
struct ImportNewThingsApp: App {
    @State private var library = Library()

    var body: some Scene {
        WindowGroup("Import New Things") {
            ContentView()
                .environment(library)
                .preferredColorScheme(.dark)
                .frame(minWidth: 900, minHeight: 600)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Öppna mapp…") { library.openFolder() }
                    .keyboardShortcut("o")
            }
        }
    }
}
