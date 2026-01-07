import { useState, useEffect, useCallback } from 'react';
import { getLocalBook } from '../services/db';
import { fetchServerBooks } from '../services/bookData';
import type { Book, BookSection } from '../types/core';

interface UseBookResult {
    book: Book | null;
    loading: boolean;
    error: string | null;
    loadChapter: (chapterId: string) => Promise<void>;
}

// Cache for loaded chapters
const chapterCache: Record<string, BookSection> = {};

export function useBook(bookId: string | undefined, source: 'local' | 'server' | null, dataFile: string | null): UseBookResult {
    const [book, setBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Load a single chapter on demand
    const loadChapter = useCallback(async (chapterId: string) => {
        if (!book || !bookId) return;

        // Skip if already loaded
        if (book.content?.find(c => c.id === chapterId)) return;

        // Check cache first
        const cacheKey = `${bookId}:${chapterId}`;
        if (chapterCache[cacheKey]) {
            setBook(prev => prev ? {
                ...prev,
                content: [...(prev.content || []), chapterCache[cacheKey]]
            } : prev);
            return;
        }

        try {
            const chapterUrl = `/data/chapters/${bookId}/${chapterId}.json`;
            const response = await fetch(chapterUrl);
            if (response.ok) {
                const chapter: BookSection = await response.json();
                chapterCache[cacheKey] = chapter;
                setBook(prev => prev ? {
                    ...prev,
                    content: [...(prev.content || []), chapter]
                } : prev);
            }
        } catch (err) {
            console.warn(`Failed to load chapter ${chapterId}:`, err);
        }
    }, [book, bookId]);

    useEffect(() => {
        if (!bookId) {
            setLoading(false);
            return;
        }

        const abortController = new AbortController();
        const signal = abortController.signal;

        async function load() {
            setLoading(true);
            setError(null);
            try {
                let loadedBook: Book | undefined;

                if (source === 'local') {
                    // Local books are still loaded fully from IndexedDB
                    loadedBook = await getLocalBook(bookId!);
                } else if (source === 'server' && dataFile) {
                    // Check if we have a meta file (lazy loading) or full file (legacy)
                    const metaFile = dataFile.replace('.json', '-meta.json');
                    const metaResponse = await fetch(metaFile, { signal });

                    if (metaResponse.ok) {
                        // Lazy loading: load meta only, chapters loaded on demand
                        loadedBook = await metaResponse.json();
                        if (loadedBook) {
                            loadedBook.type = 'server';
                            loadedBook.content = []; // Start empty, chapters loaded lazily
                        }
                    } else {
                        // Fallback to full file (legacy/small books)
                        const response = await fetch(dataFile, { signal });
                        if (!response.ok) throw new Error('Failed to fetch book content');
                        loadedBook = await response.json();
                        if (loadedBook) loadedBook.type = 'server';
                    }
                } else if (source === 'server') {
                    const catalog = await fetchServerBooks();
                    if (signal.aborted) return;
                    const found = catalog.find(b => b.id === bookId);
                    if (found && found.dataFile) {
                        const response = await fetch(found.dataFile, { signal });
                        loadedBook = await response.json();
                        if (loadedBook) loadedBook.type = 'server';
                    }
                }

                if (signal.aborted) return;

                if (loadedBook) {
                    setBook(loadedBook);
                } else {
                    setError('Book not found');
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error(err);
                setError('Failed to load book');
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            abortController.abort();
        };
    }, [bookId, source, dataFile]);

    return { book, loading, error, loadChapter };
}
