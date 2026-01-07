import { useState, useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';

interface PagedContentProps {
    html: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    className?: string;
    chunkSize?: number; // Characters per page, default 30k
}

export function PagedContent({ html, onClick, className, chunkSize = 30000 }: PagedContentProps) {
    const [page, setPage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // 0. Security: Sanitize HTML before processing
    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html), [html]);

    // 1. Analyze content length
    const isLarge = useMemo(() => sanitizedHtml.length > chunkSize, [sanitizedHtml, chunkSize]);

    // 2. Chunking Logic (Memoized)
    const chunks = useMemo(() => {
        if (!isLarge) return [sanitizedHtml];

        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitizedHtml, 'text/html');
        const nodes = Array.from(doc.body.childNodes);

        const pages: string[] = [];
        let currentChunk = document.createElement('div');
        let currentSize = 0;

        nodes.forEach((node) => {
            const nodeSize = node.textContent?.length || 0;
            // If adding this node exceeds chunk size (and we have content), push page
            if (currentSize + nodeSize > chunkSize && currentSize > 0) {
                pages.push(currentChunk.innerHTML);
                currentChunk = document.createElement('div');
                currentSize = 0;
            }
            currentChunk.appendChild(node.cloneNode(true));
            currentSize += nodeSize;
        });

        // Push last chunk
        if (currentChunk.childNodes.length > 0) {
            pages.push(currentChunk.innerHTML);
        }

        return pages.length > 0 ? pages : [sanitizedHtml];
    }, [sanitizedHtml, isLarge, chunkSize]);

    // Reset page on content change
    useEffect(() => {
        setPage(0);
    }, [html]);

    // Scroll to top when page changes internally
    useEffect(() => {
        if (page > 0 && containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [page]);

    if (!isLarge) {
        return (
            <div
                ref={containerRef}
                className={className}
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                onClick={onClick}
            />
        );
    }

    return (
        <div className="safe-html-container relative">
            <div
                ref={containerRef}
                className={className}
                dangerouslySetInnerHTML={{ __html: chunks[page] }}
                onClick={onClick}
            />

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-4 py-8 border-t border-gray-100 dark:border-gray-800 mt-8">
                <button
                    onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(0, p - 1)); }}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                    上一页
                </button>
                <span className="text-sm text-gray-500 font-mono">
                    {page + 1} / {chunks.length}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(chunks.length - 1, p + 1)); }}
                    disabled={page === chunks.length - 1}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                    下一页
                </button>
            </div>

            <div className="text-center text-xs text-gray-400 mb-4">
                (本章内容较长，已自动分页优化性能)
            </div>
        </div>
    );
}
