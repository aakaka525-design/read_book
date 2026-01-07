import { useState, useEffect, useRef, memo } from 'react';
import type { BookSection } from '../../types/core';
import { useParams } from 'react-router-dom';
import { PagedContent } from './PagedContent';
import { processChapterWithHighlights } from '../../services/parser';

interface ChapterContentProps {
    chapters: BookSection[];
    fontSize: number;
    highlights: string[];
    citationTarget: { chapterId: string; textSnippet: string } | null;
    onClearCitationTarget: () => void;
    onRemoveHighlight: (bookId: string, text: string) => void;
}

function ChapterContent({
    chapters,
    fontSize,
    highlights,
    citationTarget,
    onClearCitationTarget,
    onRemoveHighlight
}: ChapterContentProps) {
    const { bookId } = useParams();
    const contentRef = useRef<HTMLDivElement>(null);

    // State for the delete popover
    const [activeMark, setActiveMark] = useState<{ text: string; top: number; left: number } | null>(null);

    // Async Processed Content Cache: chapterId -> html
    const [processedMap, setProcessedMap] = useState<Record<string, string>>({});

    // Effect: Offload highligting to Worker
    useEffect(() => {
        let mounted = true;

        const processAll = async () => {
            const newMap: Record<string, string> = {};
            let localChanges = false;

            // Only process if we have highlights, otherwise raw body is fine (if trusted)
            // But checking persistence requires processing.

            // Optimization: If no highlights, skip worker?
            // Actually, we might want to sanitize in worker too. But for now, focus on highlights.
            if (!highlights || highlights.length === 0) {
                // Optimization: Just use raw body if no highlights
                // But wait, PagedContent expects HTML.
                // We can just output raw.
                // But cleaning cache is needed.
                if (Object.keys(processedMap).length > 0) {
                    setProcessedMap({});
                }
                return;
            }

            // Parallel processing
            await Promise.all(chapters.map(async (chapter) => {
                // Check cache first? (Complicated with highlights changing)
                // For now, simple re-process on highlight change.
                try {
                    const result = await processChapterWithHighlights(chapter.body, highlights);
                    if (mounted) {
                        newMap[chapter.id] = result.html;
                        localChanges = true;
                    }
                } catch (e) {
                    console.error('Highlight processing failed', e);
                    if (mounted) newMap[chapter.id] = chapter.body; // Fallback
                }
            }));

            if (mounted && localChanges) {
                setProcessedMap(newMap);
            }
        };

        processAll();

        return () => { mounted = false; };
    }, [chapters, highlights]); // Re-run when chapters or highlights change
    // Note: highlights change triggers re-run of all chapters. 
    // This is better done in worker than blocking main thread.

    // Hide popover when clicking elsewhere
    useEffect(() => {
        const handleClickOutside = () => setActiveMark(null);
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle citation scroll target from AI Assistant
    // Handle citation scroll target from AI Assistant
    useEffect(() => {
        if (!citationTarget || !contentRef.current) return;

        const chapterElement = document.getElementById(citationTarget.chapterId);
        let highlightTimer: ReturnType<typeof setTimeout>;
        let scrollTimer: ReturnType<typeof setTimeout>;

        if (chapterElement) {
            chapterElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            chapterElement.classList.add('citation-chapter-highlight');
            highlightTimer = setTimeout(() => chapterElement.classList.remove('citation-chapter-highlight'), 4000);
        } else {
            onClearCitationTarget();
            return;
        }

        const textToFind = citationTarget.textSnippet;

        if (textToFind && textToFind.length >= 2) {
            scrollTimer = setTimeout(() => {
                if (!contentRef.current) return;
                // Simplified scroll logic placeholder
            }, 500);
        }

        return () => {
            clearTimeout(highlightTimer);
            clearTimeout(scrollTimer);
        };
    }, [citationTarget, onClearCitationTarget, processedMap]);

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'MARK' && bookId) {
            e.stopPropagation();
            const rect = target.getBoundingClientRect();
            const text = target.innerText;

            setActiveMark({
                text,
                top: rect.top - 40,
                left: rect.left + (rect.width / 2)
            });
        }
    };

    const handleRemove = () => {
        if (activeMark && bookId) {
            onRemoveHighlight(bookId, activeMark.text);
            setActiveMark(null);
        }
    };

    return (
        <div ref={contentRef} className="reader-content relative" style={{ fontSize: `${fontSize}px` }}>
            {chapters.map((chapter) => (
                <section key={chapter.id} id={chapter.id} className="chapter-section mb-16">
                    <h2>{chapter.title}</h2>
                    <PagedContent
                        // Use processed html from worker, or fallback to raw (if waiting)
                        // If waiting and highlights exist, maybe show spinner? 
                        // Or just show raw text (better UX than blank).
                        html={processedMap[chapter.id] || chapter.body}
                        onClick={handleContentClick}
                        chunkSize={50000}
                    />
                </section>
            ))}

            {/* Delete Popover */}
            {activeMark && (
                <div
                    className="fixed z-50 transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: activeMark.top, left: activeMark.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={handleRemove}
                        className="bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 hover:scale-105 transition-transform text-xs font-bold cursor-pointer"
                    >
                        🗑️ 取消高亮
                    </button>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black dark:border-t-white"></div>
                </div>
            )}
        </div>
    );
}

export default memo(ChapterContent);
