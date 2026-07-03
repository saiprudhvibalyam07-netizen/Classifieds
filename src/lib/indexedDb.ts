const DB_NAME = 'valclassifieds'
const DB_VERSION = 1

type StoreConfig = {
  name: string
  keyPath: string
  indexes?: { name: string; keyPath: string; options?: IDBIndexParameters }[]
}

const STORES: StoreConfig[] = [
  {
    name: 'media_cache',
    keyPath: 'key',
  },
  {
    name: 'offline_queue',
    keyPath: 'id',
    indexes: [
      { name: 'by_type', keyPath: 'type' },
      { name: 'by_created', keyPath: 'createdAt' },
    ],
  },
]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store.name)) {
          const os = db.createObjectStore(store.name, { keyPath: store.keyPath })
          for (const idx of store.indexes ?? []) {
            os.createIndex(idx.name, idx.keyPath, idx.options)
          }
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb()
  try {
    return await fn(db)
  } finally {
    db.close()
  }
}

export async function getItem<T>(storeName: string, key: string): Promise<T | null> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result?.value ?? null)
      request.onerror = () => reject(request.error)
    })
  })
}

export async function setItem<T>(storeName: string, key: string, value: T): Promise<void> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const keyPath = store.keyPath as string
      store.put({ [keyPath]: key, value })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function removeItem(storeName: string, key: string): Promise<void> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result.map((r: Record<string, unknown>) => r.value as T))
      request.onerror = () => reject(request.error)
    })
  })
}

export async function getAllFromIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)
      request.onsuccess = () => resolve(request.result.map((r: Record<string, unknown>) => r.value as T))
      request.onerror = () => reject(request.error)
    })
  })
}

export async function getCount(storeName: string): Promise<number> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

export async function clearStore(storeName: string): Promise<void> {
  return withDb(async (db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  })
}
