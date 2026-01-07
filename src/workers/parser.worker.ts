/**
 * Parser Worker - 文本处理
 * 使用 WorkerClient 的响应协议
 */

import type { TextChunk, BookSection } from '../types/core';

// ============== Types ==============
interface WorkerMessage<T = any> {
    id: string;
    type: string;
    payload: T;
}

const ctx: Worker = self as any;

// ============== Helper ==============
function reply<T>(id: string, type: string, payload: T): void {
    ctx.postMessage({ id, type, payload });
}

function replyError(id: string, message: string): void {
    ctx.postMessage({ id, type: 'ERROR', payload: null, error: message });
}

// ============== Message Handler ==============
ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = e.data;

    try {
        switch (type) {
            case 'CHUNK_BOOK': {
                const { chapters, chunkSize, overlap } = payload as {
                    chapters: Chapter[];
                    chunkSize: number;
                    overlap: number
                };

                const chunks = chunkBookContent(chapters, chunkSize, overlap);
                reply(id, 'CHUNK_BOOK_RESULT', { chunks });
                break;
            }

            case 'PARSE_TEXT': {
                const { text } = payload as { text: string };
                const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
                reply(id, 'PARSE_TEXT_RESULT', { paragraphs });
                break;
            }


            case 'PROCESS_CHAPTER': {
                const { html, highlights } = payload as { html: string; highlights: string[] };
                const processed = processHighlights(html, highlights);
                reply(id, 'PROCESS_CHAPTER_RESULT', { html: processed });
                break;
            }

            default:
                replyError(id, `Unknown message type: ${type}`);
        }
    } catch (err: any) {
        replyError(id, err.message || 'Parser worker error');
    }
};

// Alias core type for local clarity if needed, or update usage
type Chapter = BookSection;

// ============== Core Logic ==============
function chunkBookContent(
    chapters: Chapter[],
    chunkSize: number = 800,
    overlap: number = 100
): TextChunk[] {
    const chunks: TextChunk[] = [];

    for (const chapter of chapters) {
        // 清洗 HTML
        const plainText = chapter.body
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (plainText.length < 50) continue;

        let start = 0;
        let chunkIndex = 0;

        while (start < plainText.length) {
            const end = Math.min(start + chunkSize, plainText.length);
            const content = plainText.slice(start, end);

            chunks.push({
                id: `${chapter.id}-chunk-${chunkIndex}`,
                chapterId: chapter.id,
                chapterTitle: chapter.title,
                content: content
            });

            start += (chunkSize - overlap);
            chunkIndex++;
        }
    }

    return chunks;
}

// Highlight Logic
function processHighlights(html: string, highlights: string[]): string {
    if (!highlights || highlights.length === 0) return html;

    let processed = html;

    // Sort highlights by length desc to prevent partial replacement issues (greedy)
    const sorted = [...highlights].sort((a, b) => b.length - a.length);

    for (const text of sorted) {
        // Escape special chars
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Allow matches to span across <br>, <p>, and whitespace
        const flexiblePattern = escapedText
            .split(/\s+/)
            .join('(?:\\s*<[^>]+>\\s*|\\s+)+');

        try {
            const regex = new RegExp(`(${flexiblePattern})`, 'gi');
            const mark = `<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit decoration-clone cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-900/70 transition-colors" data-highlight="$1">$1</mark>`;
            processed = processed.replace(regex, mark);
        } catch (e) {
            // Ignore invalid regex
        }
    }
    return processed;
}

export { };
