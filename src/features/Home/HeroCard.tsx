import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '../../types';
import { Play, BookOpen } from 'lucide-react';
import SafeImage from '../../components/UI/SafeImage';

interface HeroCardProps {
    book?: Book;
    progress?: number; // 0-100
    timeLeft?: string;
    lastSnippet?: string;
}

const HeroCard = memo(function HeroCard({ book, progress = 0, timeLeft = "2小时15分钟", lastSnippet }: HeroCardProps) {
    const navigate = useNavigate();

    const handleContinue = () => {
        if (book) {
            navigate(`/book/${book.id}?source=${book.type}${book.dataFile ? `&file=${encodeURIComponent(book.dataFile)}` : ''}`);
        }
    };

    if (!book) {
        // Empty State / AI Recommendation Placeholder
        return (
            <div className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 flex flex-col justify-center items-center text-center group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 transition-opacity group-hover:opacity-100 opacity-50" />
                <BookOpen size={48} className="text-zinc-300 dark:text-zinc-600 mb-4 group-hover:scale-110 transition-transform duration-500" />
                <h2 className="text-xl font-bold mb-2">你的书架还是空的</h2>
                <p className="text-secondary mb-6 max-w-xs">导入你的第一本书，开始一段新的旅程。</p>
                <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl opacity-50" />
            </div>
        );
    }

    return (
        <div className="col-span-2 row-span-2 relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-8 group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-amber-200/20 to-orange-200/20 dark:from-amber-900/20 dark:to-orange-900/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />

            <div className="relative z-10 flex h-full gap-8 items-center">
                {/* 3D Cover */}
                <div className="shrink-0 relative w-[180px] aspect-[2/3] perspective-[1000px] group-hover:scale-105 transition-transform duration-500 ease-out">
                    <div className="w-full h-full rounded-lg shadow-xl relative preserve-3d rotate-y-[-15deg] group-hover:rotate-y-[-10deg] transition-transform duration-500 ml-4">
                        {/* Spine effect */}
                        <div className="absolute left-0 top-1 bottom-1 w-3 bg-white/20 -translate-x-full rounded-l-sm transform origin-right rotate-y-[90deg] brightness-75" />

                        {/* Front Cover */}
                        <div className="absolute inset-0 rounded-r-lg overflow-hidden bg-zinc-200">
                            {book.cover ? (
                                <SafeImage src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
                                    <span className="font-serif font-bold text-gray-400 text-center leading-tight">{book.title}</span>
                                </div>
                            )}
                            {/* Gloss */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/20 pointer-events-none" />
                        </div>
                    </div>
                    {/* Shadow */}
                    <div className="absolute -bottom-8 left-4 w-full h-4 bg-black/20 blur-xl rotate-[5deg]" />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                On Reading
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 truncate leading-tight tracking-tight text-gray-900 dark:text-white">
                            {book.title}
                        </h1>
                        <p className="text-lg text-secondary font-medium">{book.author}</p>
                    </div>

                    {/* Quick Snippet */}
                    <div className="mb-8 relative pl-4 border-l-2 border-amber-500/30 dark:border-amber-500/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 leading-relaxed">
                            {lastSnippet || "“所有的光芒，最终都要回归黑暗，但在此之前，它们必须照亮些什么。”"}
                        </p>
                    </div>

                    {/* Progress Info */}
                    <div className="mb-8">
                        <div className="flex items-end gap-2 mb-2 text-sm font-medium">
                            <span className="text-3xl font-bold font-mono text-gray-900 dark:text-gray-100">{progress}%</span>
                            <span className="text-secondary mb-1.5">· 预计还剩 {timeLeft}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <div>
                        <button
                            onClick={handleContinue}
                            className="group/btn relative inline-flex items-center gap-3 px-8 py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                        >
                            <span className="relative z-10">继续阅读</span>
                            <Play size={18} fill="currentColor" className="relative z-10" />
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default HeroCard;
