export const SETTINGS_KEY = 'dbs_reader_settings'
export const BOOKMARKS_KEY = 'dbs_bookmarks'
export const PROGRESS_KEY = 'dbs_reading_progress'

export const themes = {
  light: { bg: '#ffffff', text: '#333333', name: 'Light' },
  dark: { bg: '#1a1a1a', text: '#e0e0e0', name: 'Dark' },
  sepia: { bg: '#f4ecd8', text: '#5b4636', name: 'Sepia' },
} as const

export const fontFamilies = {
  Georgia: 'Georgia, serif',
  Merriweather: '"Merriweather", serif',
  OpenDyslexic: '"OpenDyslexic", sans-serif',
  System: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const

export type ThemeMode = 'light' | 'dark' | 'sepia'
export type FontFamily = 'Georgia' | 'Merriweather' | 'OpenDyslexic' | 'System'
export type ReadingMode = 'paginated' | 'scrolled'
export type AutoScrollSpeed = 0 | 1 | 2 | 3 | 4