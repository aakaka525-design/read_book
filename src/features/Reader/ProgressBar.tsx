import { useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';

interface ProgressBarProps {
    bookId: string;
    activeChapterId: string;
}

export default function ProgressBar({ bookId, activeChapterId }: ProgressBarProps) {
    const { setProgress } = useAppContext();

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.body.scrollHeight - window.innerHeight;
            if (docHeight > 0) {
                const scrollPercent = Math.round((scrollTop / docHeight) * 100);
                const progressBar = document.getElementById('reading-progress-bar');
                if (progressBar) {
                    progressBar.style.width = `${scrollPercent}%`;
                }
                // Save progress to context (persisted to localStorage)
                setProgress(bookId, { chapter: activeChapterId, percent: scrollPercent });
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [bookId, activeChapterId, setProgress]);

    return (
        <div
            className="fixed top-0 left-0 h-[3px] bg-[var(--accent-color)] z-[1001] transition-all duration-100"
            style={{ width: '0%' }}
            id="reading-progress-bar"
        />
    );
}
