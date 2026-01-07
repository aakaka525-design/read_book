import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { fetchServerBooks } from '../../services/bookData';
import { getAllLocalBooks } from '../../services/db';
import type { Book } from '../../types';
import BookCard from '../Library/BookCard';
import { Heart } from 'lucide-react';

export default function Favorites() {
    const { favorites } = useAppContext();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function load() {
            try {
                const [s, l] = await Promise.all([fetchServerBooks(), getAllLocalBooks()]);
                setBooks([...s, ...l] as Book[]);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const favoriteBooks = books.filter(b => favorites.includes(b.id));

    const handleBookClick = (book: Book) => {
        navigate(`/book/${book.id}?source=${book.type}${book.dataFile ? `&file=${encodeURIComponent(book.dataFile)}` : ''}`);
    };

    if (loading) {
        return <div className="p-20 text-center text-secondary">Loading...</div>;
    }

    return (
        <div className="max-w-[1400px] mx-auto min-h-[calc(100vh-60px)] p-6 md:p-10">
            <header className="mb-10">
                <h1 className="flex items-center gap-3 font-serif text-4xl font-bold mb-2 text-[var(--text-primary)]">
                    <Heart className="fill-red-500 text-red-500" /> Favorites
                </h1>
                <p className="text-[var(--text-secondary)]">Your collection of loved books.</p>
            </header>

            {favoriteBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <Heart size={64} className="mb-4 text-gray-300" />
                    <h2 className="text-xl font-bold mb-2">No favorites yet</h2>
                    <p>Mark books as favorites to see them here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 auto-rows-[240px]">
                    {favoriteBooks.map(book => (
                        <BookCard
                            key={book.id}
                            book={book}
                            onClick={() => handleBookClick(book)}
                        // We don't expose delete on Favorites page, only on Library
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
