import SwiftUI

struct ViewerView: View {
    @Environment(Library.self) private var library
    let photo: Photo
    @State private var image: CGImage?
    @State private var isFull = false

    var body: some View {
        ZStack(alignment: .topLeading) {
            Group {
                if let image {
                    Image(decorative: image, scale: 1)
                        .resizable()
                        .interpolation(.high)
                        .scaledToFit()
                } else {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(16)

            HStack(spacing: 10) {
                Text(photo.name).font(.system(size: 12, weight: .medium))
                StarsView(rating: library.rating(of: photo), size: 11)
                if !isFull && image != nil {
                    ProgressView().controlSize(.mini)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.black.opacity(0.45), in: RoundedRectangle(cornerRadius: 6))
            .padding(12)
        }
        .task(id: photo.id) {
            isFull = false
            if let full = ImageCache.previews.cached(photo.url) {
                image = full
                isFull = true
                return
            }
            // Visa den lilla bilden direkt, framkalla den stora strax efter.
            image = ImageCache.thumbnails.cached(photo.url)
            if image == nil {
                image = await ImageCache.thumbnails.image(for: photo.url)
            }
            // Vänta lite så att snabb bläddring inte framkallar varje bild.
            try? await Task.sleep(for: .milliseconds(120))
            if Task.isCancelled { return }
            let full = await ImageCache.previews.image(for: photo.url)
            if Task.isCancelled { return }
            if let full { image = full }
            isFull = true
        }
    }
}

struct InfoPanel: View {
    @Environment(Library.self) private var library
    let photo: Photo
    @State private var rows: [InfoRow] = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(photo.name)
                    .font(.headline)
                    .lineLimit(2)
                StarsView(rating: library.rating(of: photo), size: 14)
                Divider()
                ForEach(rows) { row in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.label)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(row.value)
                            .font(.callout)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color.black.opacity(0.2))
        .task(id: photo.id) {
            let url = photo.url
            rows = await Task.detached(priority: .utility) { ImageLoader.metadata(url: url) }.value
        }
    }
}
