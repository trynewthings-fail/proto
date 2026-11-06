import CoreImage
import Foundation
import ImageIO

/// Läser bilder och bildinformation från disk. Allt här kan köras i bakgrunden.
enum ImageLoader {
    private static let context = CIContext(options: [.cacheIntermediates: false])

    /// Liten bild för rutnät och filmremsa. Använder kamerans inbäddade förhandsbild om den är stor nog.
    static func thumbnail(url: URL, maxPixel: Int) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }

        func make(always: Bool) -> CGImage? {
            var options: [CFString: Any] = [
                kCGImageSourceThumbnailMaxPixelSize: maxPixel,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true,
            ]
            if always {
                options[kCGImageSourceCreateThumbnailFromImageAlways] = true
            } else {
                options[kCGImageSourceCreateThumbnailFromImageIfAbsent] = true
            }
            return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
        }

        if let image = make(always: false), max(image.width, image.height) >= maxPixel / 2 {
            return image
        }
        return make(always: true)
    }

    /// Stor bild för visningsläget. RAW-filer framkallas med macOS egen RAW-motor.
    static func preview(url: URL, maxPixel: CGFloat) -> CGImage? {
        guard Photo.isRaw(url) else {
            return thumbnail(url: url, maxPixel: Int(maxPixel))
        }
        guard let raw = CIRAWFilter(imageURL: url) else {
            return thumbnail(url: url, maxPixel: Int(maxPixel))
        }
        let longEdge = max(raw.nativeSize.width, raw.nativeSize.height)
        if longEdge > maxPixel {
            raw.scaleFactor = Float(maxPixel / longEdge)
        }
        guard let image = raw.outputImage else { return nil }
        return context.createCGImage(
            image,
            from: image.extent.integral,
            format: .RGBA8,
            colorSpace: CGColorSpace(name: CGColorSpace.displayP3)
        )
    }

    // MARK: Bildinformation

    static func metadata(url: URL) -> [InfoRow] {
        var rows: [InfoRow] = []
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
        else { return rows }

        let exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any] ?? [:]
        let tiff = props[kCGImagePropertyTIFFDictionary] as? [CFString: Any] ?? [:]
        let exifAux = props[kCGImagePropertyExifAuxDictionary] as? [CFString: Any] ?? [:]

        if let model = tiff[kCGImagePropertyTIFFModel] as? String {
            rows.append(InfoRow("Kamera", cameraName(make: tiff[kCGImagePropertyTIFFMake] as? String, model: model)))
        }
        if let lens = (exif[kCGImagePropertyExifLensModel] as? String) ?? (exifAux[kCGImagePropertyExifAuxLensModel] as? String),
           !lens.trimmingCharacters(in: .whitespaces).isEmpty {
            rows.append(InfoRow("Objektiv", lens))
        }
        if let focal = exif[kCGImagePropertyExifFocalLength] as? Double {
            rows.append(InfoRow("Brännvidd", "\(Int(focal.rounded())) mm"))
        }
        if let fNumber = exif[kCGImagePropertyExifFNumber] as? Double {
            rows.append(InfoRow("Bländare", String(format: "f/%.1f", fNumber).replacingOccurrences(of: ".0", with: "")))
        }
        if let time = exif[kCGImagePropertyExifExposureTime] as? Double, time > 0 {
            let text = time >= 1 ? String(format: "%.1f s", time) : "1/\(Int((1 / time).rounded())) s"
            rows.append(InfoRow("Slutartid", text))
        }
        if let iso = (exif[kCGImagePropertyExifISOSpeedRatings] as? [NSNumber])?.first {
            rows.append(InfoRow("ISO", "\(iso.intValue)"))
        }
        if let date = exif[kCGImagePropertyExifDateTimeOriginal] as? String {
            rows.append(InfoRow("Tagen", prettyDate(date)))
        }
        if let w = props[kCGImagePropertyPixelWidth] as? Int, let h = props[kCGImagePropertyPixelHeight] as? Int {
            let megapixels = Double(w * h) / 1_000_000
            rows.append(InfoRow("Storlek", "\(w) × \(h) px (\(String(format: "%.1f", megapixels)) MP)"))
        }
        if let bytes = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize {
            rows.append(InfoRow("Filstorlek", ByteCountFormatter.string(fromByteCount: Int64(bytes), countStyle: .file)))
        }
        rows.append(InfoRow("Format", url.pathExtension.uppercased()))
        return rows
    }

    private static let knownCameras: [String: String] = [
        "ILCE-7RM3": "Sony α7R III",
        "ILCE-7RM3A": "Sony α7R IIIA",
        "ILCE-7RM4": "Sony α7R IV",
        "ILCE-7RM5": "Sony α7R V",
        "ILCE-7M3": "Sony α7 III",
        "ILCE-7M4": "Sony α7 IV",
    ]

    private static func cameraName(make: String?, model: String) -> String {
        let model = model.trimmingCharacters(in: .whitespaces)
        if let known = knownCameras[model] { return known }
        guard let make = make?.trimmingCharacters(in: .whitespaces), !make.isEmpty,
              !model.lowercased().hasPrefix(make.lowercased())
        else { return model }
        return "\(make.capitalized) \(model)"
    }

    /// "2026:11:06 14:03:22" → "2026-11-06 14:03"
    private static func prettyDate(_ exif: String) -> String {
        let parts = exif.split(separator: " ")
        guard parts.count == 2 else { return exif }
        let day = parts[0].replacingOccurrences(of: ":", with: "-")
        return "\(day) \(parts[1].prefix(5))"
    }
}

struct InfoRow: Identifiable, Sendable {
    let label: String
    let value: String
    var id: String { label }

    init(_ label: String, _ value: String) {
        self.label = label
        self.value = value
    }
}

/// Minne för redan inlästa bilder så att bläddring går snabbt.
final class ImageCache: @unchecked Sendable {
    static let thumbnails = ImageCache(limit: 600, maxPixel: 480)
    static let previews = ImageCache(limit: 6, maxPixel: 3200)

    private let cache = NSCache<NSURL, CGImage>()
    private let maxPixel: Int

    private init(limit: Int, maxPixel: Int) {
        cache.countLimit = limit
        self.maxPixel = maxPixel
    }

    func cached(_ url: URL) -> CGImage? {
        cache.object(forKey: url as NSURL)
    }

    func image(for url: URL) async -> CGImage? {
        if let hit = cached(url) { return hit }
        let size = maxPixel
        let isPreview = self === ImageCache.previews
        let image = await Task.detached(priority: .userInitiated) {
            isPreview
                ? ImageLoader.preview(url: url, maxPixel: CGFloat(size))
                : ImageLoader.thumbnail(url: url, maxPixel: size)
        }.value
        if let image { cache.setObject(image, forKey: url as NSURL) }
        return image
    }
}
