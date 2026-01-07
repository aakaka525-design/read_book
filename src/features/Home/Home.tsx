import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { getAllLocalBooks } from '../../services/db';
import { fetchServerBooks } from '../../services/bookData';
import type { Book } from '../../types';
import HeroCard from './HeroCard';
import MotivationCard from './MotivationCard';
import InspirationPill from './InspirationPill';
import { zh } from '../../locales/zh';

export default function Home() {
    const {
        readingProgress,
        dailyReading,
        getStreak
    } = useAppContext();

    const [recentBook, setRecentBook] = useState<Book | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const [local, server] = await Promise.all([
                    getAllLocalBooks(),
                    fetchServerBooks()
                ]);
                const allBooks = [...local, ...server];

                if (allBooks.length > 0) {
                    // Find book with most recent progress or just first book
                    const bookIdsWithProgress = Object.keys(readingProgress);
                    const lastBookId = bookIdsWithProgress[bookIdsWithProgress.length - 1];
                    const found = allBooks.find(b => b.id === lastBookId) || allBooks[0];
                    setRecentBook(found);
                }
            } catch (e) {
                console.error('Home load error:', e);
            } finally {
                setLoading(false);
            }
        };
        loadRecent();
    }, [readingProgress]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return {
            todayMinutes: Math.round(dailyReading[today] || 0),
            streak: getStreak(),
            dailyReading
        };
    }, [dailyReading, getStreak]);

    const progress = useMemo(() => {
        if (!recentBook) return 0;
        return readingProgress[recentBook.id]?.percent || 0;
    }, [recentBook, readingProgress]);

    if (loading) {
        return <div className="p-10 animate-pulse bg-[var(--bg-body)] min-h-screen" />;
    }

    return (
        <div className="max-w-[1400px] mx-auto p-6 md:p-10 space-y-10">
            <header>
                <h1 className="font-serif text-4xl font-bold mb-2 text-gray-900 dark:text-white">
                    {zh.common.back}, 👋
                </h1>
                <p className="text-secondary">今天也是读书的好日子。</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HeroCard
                    book={recentBook || undefined}
                    progress={progress}
                />
                <MotivationCard
                    streak={stats.streak}
                    todayMinutes={stats.todayMinutes}
                    dailyReading={stats.dailyReading}
                />
                <InspirationPill />
            </div>
        </div>
    );
}
