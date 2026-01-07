import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS, CONFIG } from '../../constants/config';
import { useBook } from '../../hooks/useBook';
import { useAppContext } from '../../contexts/AppContext';
import TableOfContents from './TableOfContents';
import ProgressBar from './ProgressBar';
import ChapterContent from './ChapterContent';
import { useReadingTimer } from '../../hooks/useReadingTimer';
import NotesSidebar from '../Notebook/NotesSidebar';
import SelectionMenu from '../Notebook/SelectionMenu';
import SettingsMenu from './SettingsMenu';
import SelectionWire from '../Assistant/SelectionWire';
import { ArrowLeft } from 'lucide-react';
import { zh } from '../../locales/zh';

export default function Reader() {
    const { bookId } = useParams();
    const [searchParams] = useSearchParams();
    const source = searchParams.get('source') as 'local' | 'server' || null;
    const dataFile = searchParams.get('file');

    const { book, loading, error, loadChapter } = useBook(bookId, source, dataFile);
    const { setCurrentBook, fontSize, getHighlights, citationTarget, clearCitationTarget, removeHighlight, getProgress } = useAppContext();
    const [activeId, setActiveId] = useState<string>('');
    const [showToast, setShowToast] = useState(false);
    const [isReadyToView, setIsReadyToView] = useState(false);
    const restoredRef = useRef(false);

    // Sync book to AppContext for RAG
    useEffect(() => {
        if (book) {
            setCurrentBook(book);
        }
        return () => setCurrentBook(null); // Clear on unmount
    }, [book, setCurrentBook]);

    // Lazy load chapters when meta is ready
    useEffect(() => {
        if (book && book.toc && book.toc.length > 0 && loadChapter) {
            // Load first 3 chapters for initial render
            book.toc.slice(0, 3).forEach(tocItem => {
                loadChapter(tocItem.id);
            });
        }
    }, [book?.toc, loadChapter]);

    // Manual Scroll Restoration to prevent Jitter
    useEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        let scrollTimer: ReturnType<typeof setTimeout>;

        // Restore scroll when book is fully loaded
        if (book && !loading && bookId) {
            // Prevent double restoration
            if (restoredRef.current) return;

            const progress = getProgress(bookId);

            // If we have progress, we wait for layout then scroll
            if (progress && progress.percent > 0) {
                // Short timeout to ensure layout is stable (images/fonts)
                scrollTimer = setTimeout(() => {
                    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    const targetScroll = Math.floor(docHeight * (progress.percent / 100));

                    if (targetScroll > 0) {
                        window.scrollTo({ top: targetScroll, behavior: 'auto' });
                    }
                    // Reveal content after scroll
                    setIsReadyToView(true);
                }, 100);
            } else {
                // No progress to restore, just show immediately
                setIsReadyToView(true);
            }
            restoredRef.current = true;
        }

        return () => {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'auto';
            }
            clearTimeout(scrollTimer);
        };
    }, [book, loading, bookId, getProgress]);

    // Show toast for local books on first open
    const toastKey = bookId ? `${STORAGE_KEYS.TOAST_PREFIX}${bookId}` : 'temp_toast';
    const [hasSeenToast, setHasSeenToast] = useLocalStorage<boolean>(toastKey, false);

    useEffect(() => {
        if (book && book.type === 'local' && bookId && !hasSeenToast) {
            setHasSeenToast(true);
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), CONFIG.TOAST_DURATION);
            return () => clearTimeout(timer);
        }
    }, [book, bookId, hasSeenToast, setHasSeenToast]);

    // Start reading timer
    useReadingTimer(!loading && !error);

    // Intersection Observer for TOC
    useEffect(() => {
        if (!book || loading || !isReadyToView) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                rootMargin: '-20% 0px -60% 0px',
                threshold: 0
            }
        );

        document.querySelectorAll('.chapter-section').forEach((section) => {
            observer.observe(section);
        });

        return () => observer.disconnect();
    }, [book, loading, isReadyToView]);

    const scrollToChapter = useCallback((id: string) => {
        // Lazy load the clicked chapter and next 2 chapters
        if (loadChapter && book?.toc) {
            const clickedIndex = book.toc.findIndex(t => t.id === id);
            if (clickedIndex >= 0) {
                [clickedIndex, clickedIndex + 1, clickedIndex + 2].forEach(i => {
                    if (book.toc![i]) loadChapter(book.toc![i].id);
                });
            }
        }

        const element = document.getElementById(id);
        if (element) {
            const headerHeight = 60;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - headerHeight - 20,
                behavior: 'smooth'
            });
            setActiveId(id);
        }
    }, [book?.toc, loadChapter]);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!book?.toc) return;

            // Find current index
            const currentIndex = book.toc.findIndex(item => item.id === activeId);

            if (e.key === 'ArrowRight') {
                if (currentIndex < book.toc.length - 1) {
                    scrollToChapter(book.toc[currentIndex + 1].id);
                }
            } else if (e.key === 'ArrowLeft') {
                if (currentIndex > 0) {
                    scrollToChapter(book.toc[currentIndex - 1].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [book, activeId]);

    // Memoize highlights
    const highlights = bookId ? getHighlights(bookId) : [];

    // Render loading state with same layout structure to prevent CLS
    if (loading) {
        return (
            <div className="flex justify-center relative max-w-full mx-auto">
                {/* Left Sidebar Placeholder */}
                <aside className="hidden lg:block w-[250px] sticky top-[60px] h-[calc(100vh-60px)] border-r border-dashed border-gray-200 dark:border-gray-800" />

                {/* Main Content Loading */}
                <main className="flex-1 max-w-[75ch] min-w-0 px-8 py-16 mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mx-auto" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mx-auto" />
                        <div className="mt-16 space-y-3">
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded" />
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-3/4" />
                        </div>
                    </div>
                </main>

                {/* Right Sidebar Placeholder */}
                <aside className="hidden xl:block w-[350px] sticky top-[60px] h-[calc(100vh-60px)] border-l border-gray-100 dark:border-gray-800" />
            </div>
        );
    }

    if (error || !book) return <div className="p-20 text-center text-red-500">{error || 'Book not found'}</div>;

    return (
        <div className={`flex justify-center relative max-w-full mx-auto transition-opacity duration-300 ${isReadyToView ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress Bar */}
            <ProgressBar bookId={bookId || ''} activeChapterId={activeId} />

            {/* Navigation: Back to Library */}
            <Link
                to="/library"
                className="fixed top-4 left-4 z-50 p-2 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-full shadow-sm text-gray-500 hover:text-amber-500 hover:scale-110 transition-all group"
                title={zh.common.back}
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            {/* Left Sidebar (Desktop) */}
            <aside className="hidden lg:block w-[250px] sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto p-8 border-r border-dashed border-gray-200 dark:border-gray-800">
                <TableOfContents
                    items={book.toc || []}
                    activeId={activeId}
                    onSelect={scrollToChapter}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-[75ch] min-w-0 px-8 py-16 mx-auto bg-paper">
                <header className="mb-12 text-center">
                    <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">{book.title}</h1>
                    <p className="text-secondary">{book.author}</p>
                </header>

                <ChapterContent
                    chapters={book.content || []}
                    fontSize={fontSize}
                    highlights={highlights}
                    citationTarget={citationTarget}
                    onClearCitationTarget={clearCitationTarget}
                    onRemoveHighlight={removeHighlight}
                />
            </main>

            {/* Right Sidebar (Notes) */}
            <NotesSidebar bookId={bookId || ''} book={book} activeChapterId={activeId} />

            {/* Float Menu */}
            <SelectionMenu />

            {/* Dynamic Connector (Magic Mode) */}
            <SelectionWire />

            {/* Settings FAB */}
            <SettingsMenu />

            {/* Typography Optimization Toast */}
            {showToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                        <span className="text-lg">✨</span>
                        <span>已为您自动优化排版</span>
                    </div>
                </div>
            )}
        </div>
    );
}
