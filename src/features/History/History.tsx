import { useEffect, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { fetchServerBooks } from '../../services/bookData';
import { getAllLocalBooks } from '../../services/db';
import type { Book } from '../../types';
import { useNavigate } from 'react-router-dom';
import SafeImage from '../../components/UI/SafeImage';

export default function History() {
    const { dailyReading, getStreak, readingProgress, getTotalReadingTime } = useAppContext();
    const [books, setBooks] = useState<Book[]>([]);
    const navigate = useNavigate();

    const streak = getStreak();
    const totalMinutes = getTotalReadingTime();
    const totalHours = Math.floor(totalMinutes / 60);

    // Calculate Average
    const daysWithReading = Object.values(dailyReading).filter(m => m > 0).length;
    const averageMinutes = daysWithReading > 0 ? Math.round(totalMinutes / daysWithReading) : 0;

    useEffect(() => {
        // Load books to show "Started Books"
        async function load() {
            const [s, l] = await Promise.all([fetchServerBooks(), getAllLocalBooks()]);
            setBooks([...s, ...l] as Book[]);
        }
        load();
    }, []);

    // Filter books with progress
    const activeBooks = books.filter(b => readingProgress[b.id]?.percent > 0).sort((a, b) => {
        // Mock sort: higher progress first? Or filtering logic
        // Without timestamp, we just show them.
        return (readingProgress[b.id]?.percent || 0) - (readingProgress[a.id]?.percent || 0);
    });

    const handleBookClick = (book: Book) => {
        navigate(`/book/${book.id}?source=${book.type}${book.dataFile ? `&file=${encodeURIComponent(book.dataFile)}` : ''}`);
    };

    return (
        <div className="max-w-[1000px] mx-auto p-6 md:p-10 space-y-12">
            <header>
                <h1 className="text-4xl font-serif font-bold mb-2">Reading History</h1>
                <p className="text-secondary">Insights into your reading habits.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatBox label="Current Streak" value={`${streak} Days`} icon="🔥" color="text-orange-500" />
                <StatBox label="Total Time" value={`${totalHours} Hrs`} icon="⏳" color="text-blue-500" />
                <StatBox label="Daily Average" value={`${averageMinutes} Min`} icon="📊" color="text-green-500" />
            </div>

            {/* Heatmap Section */}
            <section className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 p-6 rounded-2xl shadow-sm">
                <h2 className="font-bold text-lg mb-6">Activity Log (Last 365 Days)</h2>
                <HeatmapYear data={dailyReading} />
            </section>

            {/* Continuously Reading */}
            <section>
                <h2 className="font-bold text-lg mb-6">In Progress</h2>
                <div className="space-y-4">
                    {activeBooks.length === 0 ? (
                        <div className="text-secondary italic">No books in progress yet.</div>
                    ) : (
                        activeBooks.map(book => (
                            <div key={book.id}
                                onClick={() => handleBookClick(book)}
                                className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 hover:border-indigo-500/30 cursor-pointer transition-colors"
                            >
                                <div className="w-12 h-16 bg-gray-200 dark:bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                                    {book.cover ? <SafeImage src={book.cover} alt={book.title} className="w-full h-full object-cover" /> : null}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold truncate">{book.title}</h3>
                                    <p className="text-sm text-secondary">{book.author}</p>
                                </div>
                                <div className="w-32">
                                    <div className="flex justify-between text-xs mb-1 font-bold text-secondary">
                                        <span>Progress</span>
                                        <span>{Math.round(readingProgress[book.id]?.percent || 0)}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500"
                                            style={{ width: `${Math.min(readingProgress[book.id]?.percent || 0, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

function StatBox({ label, value, icon, color }: { label: string, value: string, icon: string, color: string }) {
    return (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className={`text-3xl ${color}`}>{icon}</div>
            <div>
                <p className="text-sm text-secondary font-medium">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    );
}

function HeatmapYear({ data }: { data: Record<string, number> }) {
    // Generate last 365 days dates
    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    return (
        <div className="flex flex-wrap gap-1">
            {days.map(date => {
                const mins = data[date] || 0;
                let bgClass = 'bg-gray-100 dark:bg-zinc-800';
                if (mins > 0) bgClass = 'bg-green-200 dark:bg-green-900/30';
                if (mins > 15) bgClass = 'bg-green-300 dark:bg-green-800/50';
                if (mins > 30) bgClass = 'bg-green-400 dark:bg-green-600';
                if (mins > 60) bgClass = 'bg-green-500 dark:bg-green-500';

                return (
                    <div
                        key={date}
                        className={`w-3 h-3 rounded-sm ${bgClass}`}
                        title={`${date}: ${mins} mins`}
                    />
                );
            })}
        </div>
    );
}
