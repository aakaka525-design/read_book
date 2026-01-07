import { describe, it, expect, vi } from 'vitest';
import { tryChapterParsing } from '../../services/importer';

// Mock dependencies to avoid Node.js environment issues
vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn()
}));

vi.mock('./db', () => ({
    saveBook: vi.fn()
}));

describe('Importer Logic', () => {
    it('should detect standard Chinese chapters', async () => {
        const content = `
Title

第1章 Start
Content here must be longer than fifty characters to ensure strictly valid sections are preserved by the importer logic. We need a bit more text here.

第二章 Middle
More content here as well. This should be long enough to pass the threshold of fifty characters easily.
        `;
        const result = tryChapterParsing(content);
        expect(result.toc).toHaveLength(2);
        expect(result.toc[0].title).toContain('第1章');
        expect(result.toc[1].title).toContain('第二章');
    });

    it('should detect standalone numerals if supported', async () => {
        const content = `
Preface content must also be long enough to be considered valid, otherwise it might be skipped if the logic requires the *previous* section to be valid.

一
Chapter One Content must be long enough. adding filler text to reach the fifty character limit required by the heuristic.

二
Chapter Two Content is also long enough now. We are testing the standalone numeral detection.
        `;
        const result = tryChapterParsing(content);
        expect(result.toc.length).toBeGreaterThanOrEqual(2);
        expect(result.toc.some(t => t.title.trim() === '一')).toBe(true);
    });

    it('should ignore false positives', async () => {
        const content = `
He ate 1 apple.
The 2nd day was good.
        `;
        // These generally shouldn't trigger chapter detection unless newlines are specific
        const result = tryChapterParsing(content);
        // Should likely only have 1 default section if no valid headers found
        expect(result.sections.length).toBeLessThan(3);
    });
});
