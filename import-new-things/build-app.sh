#!/usr/bin/env bash
# Bygger "Import New Things.app" (Apple Silicon + Intel) och packar den i en zip.
# Körs på en Mac med Xcode, t.ex. i GitHub Actions.
set -euo pipefail
cd "$(dirname "$0")"

APP="Import New Things.app"
ARCHS=(--arch arm64 --arch x86_64)

swift build -c release "${ARCHS[@]}"
BIN_DIR="$(swift build -c release "${ARCHS[@]}" --show-bin-path)"

rm -rf dist
mkdir -p "dist/$APP/Contents/MacOS" "dist/$APP/Contents/Resources"
cp "$BIN_DIR/ImportNewThings" "dist/$APP/Contents/MacOS/ImportNewThings"
cp Info.plist "dist/$APP/Contents/Info.plist"

if [[ -n "${BUILD_NUMBER:-}" ]]; then
  plutil -replace CFBundleVersion -string "$BUILD_NUMBER" "dist/$APP/Contents/Info.plist"
fi

# Ad hoc-signering: krävs för att appen ska starta på Apple Silicon.
codesign --force --deep --sign - "dist/$APP"

(cd dist && ditto -c -k --keepParent "$APP" "Import-New-Things.zip")
echo "Klar: dist/Import-New-Things.zip"
