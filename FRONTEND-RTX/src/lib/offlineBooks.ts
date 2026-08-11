const DB_NAME = 'dbs-offline-books'
const DB_VERSION = 1
const STORE_NAME = 'books'
const BOOK_KEYS_STORE = 'book-keys'

interface OfflineBook {
  bookId: number
  title: string
  author: string
  coverImage: string
  encryptedData: ArrayBuffer
  downloadedAt: string
}

interface BookKey {
  bookId: number
  key: string
  iv: string
}

let db: IDBDatabase | null = null

async function openDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'bookId' })
      }

      if (!database.objectStoreNames.contains(BOOK_KEYS_STORE)) {
        database.createObjectStore(BOOK_KEYS_STORE, { keyPath: 'bookId' })
      }
    }
  })
}

export async function saveOfflineBook(book: OfflineBook): Promise<void> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(book)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getOfflineBook(bookId: number): Promise<OfflineBook | null> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(bookId)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

export async function hasOfflineBook(bookId: number): Promise<boolean> {
  const book = await getOfflineBook(bookId)
  return book !== null
}

export async function deleteOfflineBook(bookId: number): Promise<void> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(bookId)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function saveBookKey(bookKey: BookKey): Promise<void> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BOOK_KEYS_STORE], 'readwrite')
    const store = transaction.objectStore(BOOK_KEYS_STORE)
    const request = store.put(bookKey)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getBookKey(bookId: number): Promise<BookKey | null> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BOOK_KEYS_STORE], 'readonly')
    const store = transaction.objectStore(BOOK_KEYS_STORE)
    const request = store.get(bookId)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

export async function deleteBookKey(bookId: number): Promise<void> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BOOK_KEYS_STORE], 'readwrite')
    const store = transaction.objectStore(BOOK_KEYS_STORE)
    const request = store.delete(bookId)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function getAllOfflineBookIds(): Promise<number[]> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as number[])
  })
}

export async function clearAllOfflineBooks(): Promise<void> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, BOOK_KEYS_STORE], 'readwrite')
    const bookStore = transaction.objectStore(STORE_NAME)
    const keyStore = transaction.objectStore(BOOK_KEYS_STORE)
    
    bookStore.clear()
    keyStore.clear()
    
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getOfflineStorageSize(): Promise<number> {
  const database = await openDB()
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const books = request.result as OfflineBook[]
      const totalSize = books.reduce((acc, book) => {
        return acc + (book.encryptedData?.byteLength || 0)
      }, 0)
      resolve(totalSize)
    }
  })
}