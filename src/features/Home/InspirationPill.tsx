import { Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InspirationPillProps {
    quote?: string;
    source?: string;
    bookId?: string;
}

export default function InspirationPill({
    quote = "给岁月以文明，而不是给文明以岁月。",
    source = "三体II：黑暗森林",
    bookId
}: InspirationPillProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (bookId) {
            navigate(`/book/${bookId}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="col-span-3 h-[80px] relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800/50 p-4 flex items-center gap-6 cursor-pointer group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
        >
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Quote size={18} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-sm md:text-base font-serif font-medium text-gray-900 dark:text-gray-100 truncate">
                    “{quote}”
                </p>
                <p className="text-xs font-bold text-indigo-500/80 uppercase tracking-wider truncate">
                    — {source}
                </p>
            </div>

            {/* Arrow Hint */}
            <div className="shrink-0 text-indigo-300 dark:text-indigo-700 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                ➔
            </div>
        </div>
    );
}
