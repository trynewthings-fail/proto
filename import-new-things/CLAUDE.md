# Import New Things

Native macOS app (SwiftUI, Swift Package Manager, macOS 14+). Not a web demo: there is no
`index.html`, so it does not appear in proto's demo list.

- The owner is a photographer, not a developer. Talk to them in plain Swedish, no jargon.
- Build: `./build-app.sh` on a Mac (universal arm64 + x86_64, ad hoc-signed, zipped into `dist/`).
  CI: `.github/workflows/import-new-things-mac.yml` runs on every push touching this folder and
  uploads the app as the artifact `Import-New-Things-mac`. There is no Mac in the cloud sessions,
  so CI is the compiler: push, then read the job log.
- Keep `swift-tools-version:5.10` (Swift 5 language mode) unless you are ready to fix strict
  concurrency errors.
- RAW: thumbnails via ImageIO (embedded preview), large view via `CIRAWFilter`.
- Ratings live in `.importnewthings.json` in the opened folder, keyed by relative path.
- Roadmap is in `README.md`. The owner shoots RAW on a Sony A7R III and wants direct USB
  tethering (not a hot folder), basic adjustments (WB, highlights, shadows, contrast,
  sharpening with user default ~0.8), and export to PSD/TIFF/JPEG plus "Open in Photoshop".
