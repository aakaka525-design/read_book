import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../constants/config';

interface ImportState {
    status: 'idle' | 'loading' | 'success';
    message?: string;
}

interface LibraryState {
    favorites: string[];
    importState: ImportState;
}

interface LibraryContextValue extends LibraryState {
    toggleFavorite: (bookId: string) => void;
    setImportState: (state: ImportState) => void;
    isFavorite: (bookId: string) => boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
    // --- Favorites ---
    const [favorites, setFavorites] = useLocalStorage<string[]>(STORAGE_KEYS.FAVORITES, []);

    // --- Import State ---
    const [importState, setImportState] = useState<ImportState>({ status: 'idle' });

    // Persistence handled by hook automatically

    const toggleFavorite = (bookId: string) => {
        setFavorites((prev: string[]) => {
            if (prev.includes(bookId)) {
                return prev.filter((id: string) => id !== bookId);
            } else {
                return [...prev, bookId];
            }
        });
    };

    const isFavorite = (bookId: string) => favorites.includes(bookId);

    return (
        <LibraryContext.Provider value={{
            favorites,
            importState,
            toggleFavorite,
            setImportState,
            isFavorite
        }}>
            {children}
        </LibraryContext.Provider>
    );
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibrary must be used within LibraryProvider');
    }
    return context;
}
