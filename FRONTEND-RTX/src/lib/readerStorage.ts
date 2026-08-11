import { SETTINGS_KEY, BOOKMARKS_KEY, PROGRESS_KEY } from '../config/readerConfig'
import type { ReaderSettings, ReadingProgress } from '../types/bookReader'

export function loadSettings(): ReaderSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    fontSize: 18,
    fontFamily: 'Georgia',
    theme: 'light',
    lineHeight: 1.6,
    margin: 20,
    readingMode: 'paginated'
  }
}

export function saveSettings(settings: ReaderSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function loadBookmarks(bookId: number): number[] {
  try {
    const saved = localStorage.getItem(`${BOOKMARKS_KEY}_${bookId}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

export function saveBookmarks(bookId: number, bookmarks: number[]) {
  localStorage.setItem(`${BOOKMARKS_KEY}_${bookId}`, JSON.stringify(bookmarks))
}

export function loadProgress(bookId: number): ReadingProgress | null {
  try {
    const saved = localStorage.getItem(`${PROGRESS_KEY}_${bookId}`)
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

export function saveProgress(bookId: number, progress: ReadingProgress) {
  localStorage.setItem(`${PROGRESS_KEY}_${bookId}`, JSON.stringify(progress))
}