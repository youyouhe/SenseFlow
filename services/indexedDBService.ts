/**
 * IndexedDB Core Service
 *
 * Provides low-level IndexedDB operations for SenseFlow.
 * Handles database initialization, CRUD operations, and schema management.
 */

const DB_NAME = 'SenseFlowDB'
const DB_VERSION = 1

export interface AudioCacheEntry {
  cacheKey: string
  audioBuffer: ArrayBuffer
  text: string
  speaker?: string
  mode?: string
  speed?: number
  timestamp: number
  size: number
}

export interface TextCacheEntry {
  cacheKey: string
  content: string
  language?: string
  timestamp: number
  size: number
}

export interface ExchangeContent {
  id: string
  type: 'material' | 'progress' | 'config' | 'audio'
  data: any
  version: number
  timestamp: number
}

export interface StoreStats {
  count: number
  totalSize: number
  oldestTimestamp: number
  newestTimestamp: number
}

export class IndexedDBService {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.db) return

    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error || new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB initialized:', DB_NAME, 'v', DB_VERSION)
        resolve()
      }

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('IndexedDB upgrade needed, creating stores...')

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('materials')) {
          const materialsStore = db.createObjectStore('materials', { keyPath: 'id' })
          materialsStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        if (!db.objectStoreNames.contains('audioCache')) {
          const audioStore = db.createObjectStore('audioCache', { keyPath: 'cacheKey' })
          audioStore.createIndex('timestamp', 'timestamp', { unique: false })
          audioStore.createIndex('text', 'text', { unique: false })
        }

        if (!db.objectStoreNames.contains('textCache')) {
          const textStore = db.createObjectStore('textCache', { keyPath: 'cacheKey' })
          textStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('exchangeData')) {
          const exchangeStore = db.createObjectStore('exchangeData', { keyPath: 'id' })
          exchangeStore.createIndex('type', 'type', { unique: false })
          exchangeStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        console.log('IndexedDB stores created successfully')
      }
    })

    return this.initPromise
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('IndexedDB not initialized. Call init() first.')
    }
    return this.db
  }

  private async operateOnStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest | void
  ): Promise<T> {
    const db = this.ensureDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const store = transaction.objectStore(storeName)

      transaction.onerror = () => {
        console.error(`Transaction failed for store ${storeName}:`, transaction.error)
        reject(transaction.error || new Error('Transaction failed'))
      }

      transaction.oncomplete = () => {
        // Transaction completed
      }

      const request = operation(store)

      if (request) {
        request.onsuccess = () => resolve(request.result as T)
        request.onerror = () => {
          console.error(`Operation failed on store ${storeName}:`, request.error)
          reject(request.error)
        }
      } else {
        resolve(undefined as T)
      }
    })
  }

  async put<T>(storeName: string, value: T, key?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      const request = key ? store.put(value, key) : store.put(value)

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve(request.result || null)
    })
  }

  async delete(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve(request.result || [])
    })
  }

  async clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDB()
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve(request.result)
    })
  }

  async getStats(storeName: string): Promise<StoreStats> {
    const entries = await this.getAll<any>(storeName)

    if (entries.length === 0) {
      return { count: 0, totalSize: 0, oldestTimestamp: 0, newestTimestamp: 0 }
    }

    const timestamps = entries.map(e => e.timestamp || 0).filter(t => t > 0)
    const sizes = entries.map(e => e.size || 0)

    return {
      count: entries.length,
      totalSize: sizes.reduce((sum, s) => sum + s, 0),
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps),
    }
  }

  async deleteOldestEntries(storeName: string, keepCount: number): Promise<number> {
    const entries = await this.getAll<any>(storeName)

    if (entries.length <= keepCount) return 0

    const sorted = entries.filter(e => e.timestamp).sort((a, b) => a.timestamp - b.timestamp)

    const toDelete = sorted.slice(0, entries.length - keepCount)

    for (const entry of toDelete) {
      const key = entry.cacheKey || entry.id
      if (key) {
        await this.delete(storeName, key)
      }
    }

    return toDelete.length
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initPromise = null
    }
  }
}

export const idbService = new IndexedDBService()
