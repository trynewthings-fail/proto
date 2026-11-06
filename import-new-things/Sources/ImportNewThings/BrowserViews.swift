import SwiftUI

struct StarsView: View {
    let rating: Int
    var size: CGFloat = 9

    var body: some View {
        HStack(spacing: 1) {
            ForEach(1...5, id: \.self) { i in
                Image(systemName: i <= rating ? "star.fill" : "star")
                    .font(.system(size: size))
                    .foregroundStyle(i <= rating ? Color.yellow : Color.white.opacity(0.22))
            }
        }
    }
}

struct ThumbnailView: View {
    let photo: Photo
    @State private var image: CGImage?

    var body: some View {
        ZStack {
            if let image {
                Image(decorative: image, scale: 1)
                    .resizable()
                    .interpolation(.high)
                    .scaledToFit()
            } else {
                RoundedRectangle(cornerRadius: 3).fill(Color.white.opacity(0.05))
                ProgressView().controlSize(.small)
            }
        }
        .task(id: photo.id) {
            image = ImageCache.thumbnails.cached(photo.url)
            if image == nil {
                image = await ImageCache.thumbnails.image(for: photo.url)
            }
        }
    }
}

struct PhotoCell: View {
    @Environment(Library.self) private var library
    let photo: Photo
    let size: CGFloat
    let selected: Bool

    var body: some View {
        VStack(spacing: 4) {
            ThumbnailView(photo: photo)
                .frame(width: size, height: size)
            Text(photo.name)
                .font(.system(size: 10))
                .lineLimit(1)
                .truncationMode(.middle)
                .foregroundStyle(.secondary)
                .frame(width: size)
            StarsView(rating: library.rating(of: photo))
        }
        .padding(6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(selected ? Color.accentColor.opacity(0.22) : Color.white.opacity(0.04))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(selected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .contentShape(Rectangle())
    }
}

struct Filmstrip: View {
    @Environment(Library.self) private var library

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal) {
                LazyHStack(spacing: 6) {
                    ForEach(library.visible) { photo in
                        PhotoCell(photo: photo, size: 100, selected: photo.id == library.selection)
                            .id(photo.id)
                            .onTapGesture { library.selection = photo.id }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
            }
            .onChange(of: library.selection) { _, new in
                guard let new else { return }
                withAnimation(.easeOut(duration: 0.15)) { proxy.scrollTo(new, anchor: .center) }
            }
            .onAppear {
                if let selection = library.selection { proxy.scrollTo(selection, anchor: .center) }
            }
        }
        .background(Color.black.opacity(0.25))
    }
}

struct GridBrowser: View {
    @Environment(Library.self) private var library
    private let cell: CGFloat = 176
    private let spacing: CGFloat = 10

    var body: some View {
        GeometryReader { geo in
            let columns = max(1, Int((geo.size.width - 20 + spacing) / (cell + spacing)))
            ScrollViewReader { proxy in
                ScrollView {
                    if library.visible.isEmpty {
                        EmptyFolderView().frame(height: geo.size.height)
                    }
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.flexible(), spacing: spacing), count: columns),
                        spacing: spacing
                    ) {
                        ForEach(library.visible) { photo in
                            PhotoCell(photo: photo, size: cell - 16, selected: photo.id == library.selection)
                                .id(photo.id)
                                .onTapGesture(count: 2) {
                                    library.selection = photo.id
                                    library.mode = .viewer
                                }
                                .onTapGesture { library.selection = photo.id }
                        }
                    }
                    .padding(10)
                }
                .onChange(of: library.selection) { _, new in
                    guard let new else { return }
                    withAnimation(.easeOut(duration: 0.15)) { proxy.scrollTo(new) }
                }
                .onChange(of: columns) { _, value in library.gridColumns = value }
                .onAppear {
                    library.gridColumns = columns
                    if let selection = library.selection { proxy.scrollTo(selection, anchor: .center) }
                }
            }
        }
    }
}
