import { openDB, type DBSchema } from 'idb';
import type { Book } from '../types/core';

interface BookDB extends DBSchema {
    books: {
        key: string;
        value: Book;
    };
    // V2: Embeddings
    embeddings: {
        key: string; // bookId:chunkId
        value: {
            bookId: string;
            chunkId: string;
            embedding: Int8Array; // Optimization #6: Int8Array
            model?: string;       // Metadata for validation
            dimensions?: number;  // Metadata for validation
        };
        indexes: { 'by-book': string };
    };
    // V3: User Data (Migration #36)
    notes: {
        key: string; // id
        value: any; // Note type
        indexes: { 'by-book': string };
    };
    highlights: {
        key: string; // id (hash)
        value: any;
        indexes: { 'by-book': string };
    };
    reading_progress: {
        key: string; // bookId
        value: {
            bookId: string;
            chapter: string;
            percent: number;
            updatedAt: number;
        };
    };
    stats: {
        key: string;
        value: any;
    };
}

const DB_NAME = 'WebReaderDB';
const DB_VERSION = 3; // Bumped for User Data stores

/**
 * 请求持久化存储（防止浏览器自动清理）
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
            const granted = await navigator.storage.persist();

            return granted;
        }
        return true;
    }
    return false;
}

/**
 * 检查存储配额
 */
export async function checkStorageQuota(): Promise<{ used: number; quota: number; percentUsed: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentUsed = quota > 0 ? (used / quota) * 100 : 0;

        if (percentUsed > 80) {
            console.warn(`[Storage] WARNING: ${percentUsed.toFixed(1)}% storage used (${(used / 1024 / 1024).toFixed(1)}MB / ${(quota / 1024 / 1024).toFixed(1)}MB)`);
        }

        return { used, quota, percentUsed };
    }
    return null;
}

export async function getDB() {
    return openDB<BookDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains('books')) {
                db.createObjectStore('books', { keyPath: 'id' });
            }
            // Add embeddings store (v2)
            if (oldVersion < 2 && !db.objectStoreNames.contains('embeddings')) {
                const store = db.createObjectStore('embeddings', { keyPath: ['bookId', 'chunkId'] });
                store.createIndex('by-book', 'bookId');
            }
            // Add User Data stores (v3)
            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains('notes')) {
                    const store = db.createObjectStore('notes', { keyPath: 'id' });
                    store.createIndex('by-book', 'bookId');
                }
                if (!db.objectStoreNames.contains('highlights')) {
                    const store = db.createObjectStore('highlights', { keyPath: 'id' });
                    store.createIndex('by-book', 'bookId');
                }
                if (!db.objectStoreNames.contains('reading_progress')) {
                    db.createObjectStore('reading_progress', { keyPath: 'bookId' });
                }
                if (!db.objectStoreNames.contains('stats')) {
                    db.createObjectStore('stats');
                }
            }
        },
    });
}

export async function saveBook(bookData: Book) {
    const db = await getDB();
    return db.put('books', bookData);
}

export async function getAllLocalBooks() {
    const db = await getDB();
    return db.getAll('books');
}

export async function getLocalBook(id: string) {
    const db = await getDB();
    return db.get('books', id);
}

export async function deleteBook(id: string) {
    const db = await getDB();
    await clearBookEmbeddings(id);
    return db.delete('books', id);
}

export async function clearBookEmbeddings(bookId: string) {
    const db = await getDB();
    const tx = db.transaction('embeddings', 'readwrite');
    const index = tx.store.index('by-book');
    for await (const cursor of index.iterate(bookId)) {
        await cursor.delete();
    }
    await tx.done;
}

// ============== Embedding Cache ==============

export async function saveEmbedding(bookId: string, chunkId: string, embedding: number[] | Int8Array, model?: string) {
    const db = await getDB();
    // Convert to Int8Array if it's a regular number array (Cost saving)
    const val = embedding instanceof Int8Array ? embedding : new Int8Array(embedding);
    return db.put('embeddings', {
        bookId,
        chunkId,
        embedding: val,
        model,
        dimensions: val.length
    });
}

export async function saveEmbeddingsBatch(bookId: string, embeddings: { chunkId: string; embedding: number[] }[], model?: string) {
    const db = await getDB();
    const tx = db.transaction('embeddings', 'readwrite');
    for (const e of embeddings) {
        // Convert Float32 -> Int8
        const val = new Int8Array(e.embedding);
        tx.store.put({
            bookId,
            chunkId: e.chunkId,
            embedding: val,
            model,
            dimensions: val.length
        });
    }
    await tx.done;
}

export async function getEmbeddingMetadata(bookId: string): Promise<{ model?: string; dimensions?: number } | null> {
    const db = await getDB();
    const index = db.transaction('embeddings').store.index('by-book');
    const first = await index.get(bookId);
    if (!first) return null;
    return { model: first.model, dimensions: first.dimensions };
}

export async function getBookEmbeddings(bookId: string): Promise<Map<string, number[]>> {
    const db = await getDB();
    const index = db.transaction('embeddings').store.index('by-book');
    const results = await index.getAll(bookId);
    const map = new Map<string, number[]>();
    for (const r of results) {
        // Hydrate Int8Array back to number[] for calculations (Float32 compatible)
        // Note: We lost precision in Int8 conversion, but it's fine for cosine sim ranking
        map.set(r.chunkId, Array.from(r.embedding));
    }
    return map;
}


// ============== User Data (Notes) ==============
export async function saveNote(note: any) {
    const db = await getDB();
    return db.put('notes', note);
}

export async function getBookNotes(bookId: string): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction('notes').store.index('by-book');
    return index.getAll(bookId);
}

export async function deleteNote(id: string) {
    const db = await getDB();
    return db.delete('notes', id);
}

// ============== User Data (Highlights) ==============
export async function saveHighlight(highlight: any) {
    const db = await getDB();
    return db.put('highlights', highlight);
}

export async function getBookHighlights(bookId: string): Promise<any[]> {
    const db = await getDB();
    const index = db.transaction('highlights').store.index('by-book');
    return index.getAll(bookId);
}

export async function deleteHighlight(id: string) {
    const db = await getDB();
    return db.delete('highlights', id);
}

// ============== User Data (Progress) ==============
export async function saveReadingProgress(progress: { bookId: string; chapter: string; percent: number; updatedAt: number }) {
    const db = await getDB();
    return db.put('reading_progress', progress);
}

export async function getReadingProgress(bookId: string) {
    const db = await getDB();
    return db.get('reading_progress', bookId);
}

// ============== User Data (Stats) ==============
export async function saveStats(key: string, value: any) {
    const db = await getDB();
    return db.put('stats', value, key);
}

export async function getStats(key: string) {
    const db = await getDB();
    return db.get('stats', key);
}

export async function getAllReadingProgress() {
    const db = await getDB();
    return db.getAll('reading_progress');
}

