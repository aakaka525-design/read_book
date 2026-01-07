import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Book, Note } from '../types/core';
import { migrateUserData } from '../services/migration';
import {
    saveNote as dbSaveNote,
    deleteNote as dbDeleteNote,
    getBookNotes,
    saveHighlight as dbSaveHighlight,
    deleteHighlight as dbDeleteHighlight,
    getBookHighlights
} from '../services/db';

export interface MagicState {
    active: boolean;
    sourceRect: { top: number; left: number; width: number; height: number } | null;
    sourceRange?: Range;
    selectedText: string;
    status: 'idle' | 'loading' | 'success';
    data: {
        definition?: string;
        history?: string[];
        keyPoints?: string[];
    } | null;
}

interface ReadingState {
    currentBook: Book | null;
    notes: Record<string, Note[]>;
    highlights: Record<string, string[]>;
    citationTarget: { chapterId: string; textSnippet: string } | null;
    magicState: MagicState;
}

interface ReadingContextValue extends ReadingState {
    setCurrentBook: (book: Book | null) => void;
    addNote: (note: Note) => void;
    updateNote: (noteId: string, bookId: string, content: string) => void;
    deleteNote: (noteId: string, bookId: string) => void;
    getNotes: (bookId: string) => Note[];
    addHighlight: (bookId: string, text: string) => void;
    removeHighlight: (bookId: string, text: string) => void;
    getHighlights: (bookId: string) => string[];
    scrollToCitation: (chapterId: string, textSnippet: string) => void;
    clearCitationTarget: () => void;
    setMagicState: (state: Partial<MagicState>) => void;
}

const ReadingContext = createContext<ReadingContextValue | null>(null);

// Helper for Highlight IDs
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export function ReadingProvider({ children }: { children: ReactNode }) {
    // --- Current Book ---
    const [currentBook, setCurrentBook] = useState<Book | null>(null);

    // --- Data State (In-Memory Cache) ---
    const [notes, setNotes] = useState<Record<string, Note[]>>({});
    const [highlights, setHighlights] = useState<Record<string, string[]>>({});

    // --- Lifecycle: Migration & Initial Load ---
    useEffect(() => {
        // 1. Run Legacy Migration to IDB
        migrateUserData().then(result => {
            if (result.success && (result.notesCount > 0 || result.highlightsCount > 0)) {

            }
        });
    }, []);

    // Load Data when Book Changes
    useEffect(() => {
        if (!currentBook) return;

        const loadBookData = async () => {
            try {
                const [bookNotes, bookHighlights] = await Promise.all([
                    getBookNotes(currentBook.id),
                    getBookHighlights(currentBook.id)
                ]);

                setNotes(prev => ({
                    ...prev,
                    [currentBook.id]: bookNotes.sort((a, b) => b.createdAt - a.createdAt)
                }));

                // Convert highlight objects back to string[] for UI
                setHighlights(prev => ({
                    ...prev,
                    [currentBook.id]: bookHighlights.map(h => h.text)
                }));
            } catch (e) {
                console.error('[ReadingContext] Failed to load book data', e);
            }
        };

        loadBookData();
    }, [currentBook?.id]); // Only reload if ID changes

    // --- Basic State ---
    const [citationTarget, setCitationTarget] = useState<{ chapterId: string; textSnippet: string } | null>(null);
    const [magicState, setMagicStateInternal] = useState<MagicState>({
        active: false,
        sourceRect: null,
        selectedText: '',
        status: 'idle',
        data: null
    });

    // --- Actions with async DB persistence ---
    const addNote = (note: Note) => {
        // Optimistic Update
        setNotes(prev => {
            const bookNotes = prev[note.bookId] || [];
            if (bookNotes.some(n => n.id === note.id)) return prev;
            return {
                ...prev,
                [note.bookId]: [note, ...bookNotes]
            };
        });

        // Async Persist
        dbSaveNote(note).catch(e => console.error('[ReadingContext] Failed to save note:', e));
    };

    const updateNote = (noteId: string, bookId: string, content: string) => {
        setNotes(prev => {
            const bookNotes = prev[bookId] || [];
            // Find note to update to persist it
            const noteToUpdate = bookNotes.find(n => n.id === noteId);
            if (noteToUpdate) {
                dbSaveNote({ ...noteToUpdate, content }).catch(console.error);
            }
            return {
                ...prev,
                [bookId]: bookNotes.map(n => n.id === noteId ? { ...n, content } : n)
            };
        });
    };

    const deleteNote = (noteId: string, bookId: string) => {
        setNotes(prev => {
            const bookNotes = prev[bookId] || [];
            return {
                ...prev,
                [bookId]: bookNotes.filter(n => n.id !== noteId)
            };
        });
        dbDeleteNote(noteId).catch(console.error);
    };

    const getNotes = (bookId: string) => notes[bookId] || [];

    const addHighlight = (bookId: string, text: string) => {
        setHighlights(prev => {
            const current = prev[bookId] || [];
            if (current.includes(text)) return prev;
            return { ...prev, [bookId]: [...current, text] };
        });

        const id = `${bookId}_${hashString(text)}`;
        const highlightObj = { id, bookId, text, createdAt: Date.now() };
        dbSaveHighlight(highlightObj).catch(console.error);
    };

    const removeHighlight = (bookId: string, text: string) => {
        setHighlights(prev => {
            const current = prev[bookId] || [];
            if (!current.includes(text)) return prev;
            return { ...prev, [bookId]: current.filter(h => h !== text) };
        });

        const id = `${bookId}_${hashString(text)}`;
        dbDeleteHighlight(id).catch(console.error);
    };

    const getHighlights = (bookId: string) => highlights[bookId] || [];

    const scrollToCitation = (chapterId: string, textSnippet: string) => {
        setCitationTarget({ chapterId, textSnippet });
    };

    const clearCitationTarget = () => {
        setCitationTarget(null);
    };

    const setMagicState = (newState: Partial<MagicState>) => {
        setMagicStateInternal(prev => ({ ...prev, ...newState }));
    };

    const value = useMemo<ReadingContextValue>(() => ({
        currentBook,
        notes,
        highlights,
        citationTarget,
        magicState,
        setCurrentBook,
        addNote,
        updateNote,
        deleteNote,
        getNotes,
        addHighlight,
        removeHighlight,
        getHighlights,
        scrollToCitation,
        clearCitationTarget,
        setMagicState
    }), [currentBook, notes, highlights, citationTarget, magicState]);

    return (
        <ReadingContext.Provider value={value}>
            {children}
        </ReadingContext.Provider>
    );
}

export function useReading() {
    const context = useContext(ReadingContext);
    if (!context) {
        throw new Error('useReading must be used within ReadingProvider');
    }
    return context;
}
