import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchServerBooks } from '../../services/bookData';
import { getAllLocalBooks, deleteBook } from '../../services/db';
import type { Book } from '../../types/core';
import StatsCard from './StatsCard';
import ImportCard from './ImportCard';
import BookCard from './BookCard';
import { useAppContext } from '../../contexts/AppContext';
import ImportStatusWidget from './ImportStatusWidget';
import { zh } from '../../locales/zh';

export default function Library() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const { setImportState, favorites, toggleFavorite } = useAppContext();
    const navigate = useNavigate();

    const loadBooks = useCallback(async () => {
        setLoading(true);
        try {
            const [serverBooks, localBooks] = await Promise.all([
                fetchServerBooks(),
                getAllLocalBooks()
            ]);
            setBooks([...serverBooks, ...localBooks] as Book[]);
        } catch (e) {
            console.error('Library load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

    const handleImportStart = useCallback(() => {
        setImportState({ status: 'loading' });
    }, [setImportState]);

    const handleImportComplete = useCallback((newBook: Book) => {
        setBooks(prev => [...prev, newBook]);
        setImportState({
            status: 'success',
            message: `Successfully imported "${newBook.title}".`
        });
    }, [setImportState]);

    const handleBookClick = useCallback((book: Book) => {
        navigate(`/book/${book.id}?source=${book.type}${book.dataFile ? `&file=${encodeURIComponent(book.dataFile)}` : ''}`);
    }, [navigate]);

    const handleDeleteBook = useCallback(async (bookId: string) => {
        try {
            await deleteBook(bookId);
            setBooks(prev => prev.filter(b => b.id !== bookId));
            if (favorites.includes(bookId)) {
                toggleFavorite(bookId);
            }
        } catch (e) {
            console.error('Failed to delete book:', e);
        }
    }, [favorites, toggleFavorite]);

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-60px)] p-6 md:p-10 animate-pulse">
                <div className="mb-10 space-y-4">
                    <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded" />
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-[240px] bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-60px)] p-6 md:p-10">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="font-serif text-4xl font-bold mb-2 text-[var(--text-primary)]">{zh.library.title}</h1>
                    <p className="text-[var(--text-secondary)]">{zh.library.subtitle}</p>
                </div>
                <div className="hidden md:block">
                    <ImportStatusWidget />
                </div>
            </header>

            <div className="md:hidden mb-6">
                <ImportStatusWidget />
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 auto-rows-[240px]">
                <StatsCard />
                <ImportCard onImport={handleImportComplete} onStart={handleImportStart} />
                {books.map(book => (
                    <BookCard
                        key={book.id}
                        book={book}
                        onClick={() => handleBookClick(book)}
                        onDelete={book.type === 'local' ? handleDeleteBook : undefined}
                    />
                ))}
            </div>
        </div>
    );
}
