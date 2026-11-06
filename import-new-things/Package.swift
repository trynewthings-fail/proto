// swift-tools-version:5.10
import PackageDescription

let package = Package(
    name: "ImportNewThings",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "ImportNewThings", path: "Sources/ImportNewThings")
    ]
)
