import { create, StateStorage } from 'zustand/middleware'

const DB_NAME = 'dbs-offline-storage'
const DB_VERSION = 1
const STORE_NAME = 'storage'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

export const IndexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(name)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result ?? null)
      })
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(value, name)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  },
  removeItem: async (name: string): Promise<void> => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(name)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  },
}

export const essentialPublicRoutes = ['/', '/dbslibrary', '/ebook', '/books/shop', '/login'] as const

export function isEssentialPublicRoute(path: string): boolean {
  const cleanPath = path.replace(/^\/|\/$/g, '')
  return essentialPublicRoutes.includes(cleanPath as typeof essentialPublicRoutes[number])
}