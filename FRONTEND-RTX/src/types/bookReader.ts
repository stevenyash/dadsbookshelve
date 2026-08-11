export interface LibraryBooks {
  soft_copy?: string
  book_key?: string
  book_keysignature?: string
  readium_manifest?: string
}

export interface Book {
  book_id: number
  title: string
  author: string
  image_url: string
  final_copy?: string
  librarybooks?: LibraryBooks | null
}

export interface TocItem {
  label: string
  href: string
  subitems?: TocItem[]
}

export interface ReaderSettings {
  fontSize: number
  fontFamily: import('./config/readerConfig').FontFamily
  theme: import('./config/readerConfig').ThemeMode
  lineHeight: number
  margin: number
  readingMode: import('./config/readerConfig').ReadingMode
}

export interface ReadingProgress {
  currentPage: number
  totalPages: number
  progress: number
  lastRead: string
}