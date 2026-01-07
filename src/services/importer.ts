import * as pdfjsLib from 'pdfjs-dist';
import { saveBook } from './db';
import type { Book, BookSection } from '../types/core';

// For pdfjs-dist v5+, use the worker from the package itself
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function importPDF(file: File): Promise<Book> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

    const pages: string[] = [];
    const totalPages = pdf.numPages;

    // Extract text page by page with layout preservation
    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Advanced Extraction: Reconstruct spacing based on geometry
        let lastY = -1;
        let lastX = -1;
        let pageText = '';

        // Sort items by Y (descending) then X (ascending) to ensure reading order
        const items = textContent.items.map((item: any) => ({
            str: item.str,
            hasEOL: item.hasEOL,
            y: item.transform[5], // Transform matrix [a, b, c, d, x, y]
            x: item.transform[4],
            height: item.height || 0
        })).sort((a: any, b: any) => {
            if (Math.abs(a.y - b.y) > (a.height || 5)) { // Tolerance for same line
                return b.y - a.y; // Top to bottom
            }
            return a.x - b.x; // Left to right
        });

        for (const item of items) {
            if (lastY === -1) {
                pageText += item.str;
            } else {
                const dy = Math.abs(item.y - lastY);
                // Heuristic: If Y difference is significant, insert newline
                // Typically line height is ~10-15 units.
                if (dy > 10) { // New line
                    // valid paragraph gap? (e.g. > 1.5x line height)
                    if (dy > 20) {
                        pageText += '\n\n';
                    } else {
                        pageText += '\n';
                    }
                } else if (item.x > lastX + 10) {
                    // Significant horizontal gap -> space
                    pageText += ' ';
                }

                pageText += item.str;
            }
            lastY = item.y;
            lastX = item.x + (item.str.length * 5); // Approximate end X
        }

        pages.push(pageText);
    }

    // Extract Cover from Page 1
    let coverImage = '';
    try {
        coverImage = await extractCover(pdf);
    } catch (e) {
        console.warn('Failed to extract cover:', e);
    }

    const bookData = parseTextToBook(file.name, pages);
    bookData.cover = coverImage; // Assign generated cover

    await saveBook(bookData);
    return bookData;
}

// Render first page to image for cover
async function extractCover(pdf: any): Promise<string> {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for good thumbnail quality

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) return '';

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob failed'));
        }, 'image/jpeg', 0.8);
    }) as any; // Cast to any to avoid type mismatch in intermediate steps if necessary, but we'll update types next
}

function parseTextToBook(filename: string, pages: string[]): Book {
    const title = filename.replace(/\.pdf$/i, '');
    const bookId = 'local-' + Date.now();

    // First: try chapter-based parsing
    const fullText = pages.join('\n\n');
    const chapterResult = tryChapterParsing(fullText);

    if (chapterResult.sections.length > 1) {
        // Found chapters, use this result
        return {
            id: bookId,
            title: title,
            author: "本地导入",
            coverAccent: "#636e72",
            progress: 0,
            type: 'local',
            toc: chapterResult.toc,
            content: chapterResult.sections
        };
    }

    // Fallback: page-based splitting
    const pageResult = pageBasedSplitting(pages);

    return {
        id: bookId,
        title: title,
        author: "本地导入",
        coverAccent: "#636e72",
        progress: 0,
        type: 'local',
        toc: pageResult.toc,
        content: pageResult.sections
    };
}

// Try to detect chapters using regex patterns
export function tryChapterParsing(text: string): { sections: BookSection[], toc: { id: string; title: string }[] } {
    const lines = text.split('\n');
    const content: BookSection[] = [];
    const toc: { id: string; title: string }[] = [];

    // Extended regex to catch more chapter patterns (Chinese & English)
    // Added support for patterns with/without spaces, and common variations
    const headerPatterns = [
        /^第[一二三四五六七八九十百零〇0-9]+[章节部回篇幕卷集]/,  // 第X章
        /^[第]?\s*\d+\s*[章节部回篇幕卷集]/,                      // 第1章 or 1章
        /^Chapter\s+\d+/i,                                         // Chapter 1
        /^Part\s+\d+/i,                                            // Part 1
        /^[一二三四五六七八九十]+\s*[、.．:：]/,                   // 一、
        /^\d{1,2}\s*[、.．:：]/,                                   // 1、 or 1.
        /^[一二三四五六七八九十百]+$/,                             // Standalone: 一 二 三 (NEW)
        /^(前言|序|序言|序章|引言|导言|后记|尾声|跋|引子|楔子|终章|番外|上|中|下|上篇|中篇|下篇|上卷|中卷|下卷)$/,   // Standalone keywords
        /^(Preface|Introduction|Prologue|Epilogue|Conclusion|Afterword)$/i
    ];

    const isChapterHeader = (line: string): boolean => {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.length > 60) return false;
        return headerPatterns.some(pattern => pattern.test(trimmed));
    };

    let currentSection: BookSection = {
        id: 'preface',
        title: '正文',
        body: ''
    };



    lines.forEach(line => {
        const trimmed = line.trim();
        if (isChapterHeader(trimmed)) {


            // Save previous section if it has content
            if (currentSection.body.length > 50) {
                currentSection.body = textToHtml(currentSection.body);
                content.push(currentSection);
                toc.push({ id: currentSection.id, title: currentSection.title });
            }

            // Start new section
            currentSection = {
                id: `sec-${content.length + 1}`,
                title: trimmed,
                body: ''
            };
        } else {
            currentSection.body += line + '\n';
        }
    });

    // Push last section
    if (currentSection.body.length > 50) {
        currentSection.body = textToHtml(currentSection.body);
        content.push(currentSection);
        toc.push({ id: currentSection.id, title: currentSection.title });
    }

    // console.log(`[Chapter Detection] Total sections: ${content.length}`);
    return { sections: content, toc };
}

// Split by pages when no chapters are found
function pageBasedSplitting(pages: string[]): { sections: BookSection[], toc: { id: string; title: string }[] } {
    const content: BookSection[] = [];
    const toc: { id: string; title: string }[] = [];

    // Skip largely empty pages at the start (cover, title pages)
    let startIdx = 0;
    for (let i = 0; i < Math.min(5, pages.length); i++) {
        if (pages[i].trim().length < 100) {
            startIdx = i + 1;
        } else {
            break;
        }
    }

    const contentPages = pages.slice(startIdx);
    if (contentPages.length === 0) {
        // No content found, return everything as one section
        return {
            sections: [{
                id: 'content',
                title: '正文',
                body: textToHtml(pages.join('\n\n'))
            }],
            toc: [{ id: 'content', title: '正文' }]
        };
    }

    // Split into ~10 sections
    const TARGET_SECTIONS = 10;
    const pagesPerSection = Math.max(1, Math.ceil(contentPages.length / TARGET_SECTIONS));

    const sectionNames = [
        "第一节", "第二节", "第三节", "第四节", "第五节",
        "第六节", "第七节", "第八节", "第九节", "第十节",
        "第十一节", "第十二节", "第十三节", "第十四节", "第十五节"
    ];

    for (let i = 0; i < contentPages.length; i += pagesPerSection) {
        const sectionIdx = Math.floor(i / pagesPerSection);
        const sectionId = `section-${sectionIdx + 1}`;
        const sectionTitle = sectionNames[Math.min(sectionIdx, sectionNames.length - 1)];

        const chunk = contentPages.slice(i, i + pagesPerSection);
        const sectionBody = textToHtml(chunk.join('\n\n'));

        content.push({
            id: sectionId,
            title: sectionTitle,
            body: sectionBody
        });
        toc.push({ id: sectionId, title: sectionTitle });
    }

    return { sections: content, toc };
}

// Convert plain text to HTML paragraphs
// New approach: Preserve original line structure, remove page numbers
function textToHtml(text: string): string {
    // 1. Minimal cleanup: Only remove control chars and normalize invisible stuff
    let cleanedText = text;
    cleanedText = cleanedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    cleanedText = cleanedText.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

    // 2. Remove lines that are just page numbers (standalone digits only)
    cleanedText = cleanedText.replace(/^\s*\d{1,4}\s*$/gm, '');

    // 3. Split by double-newlines (paragraph breaks)
    const paragraphs = cleanedText
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

    // 4. For each paragraph, preserve internal line breaks with <br>
    return paragraphs.map(p => {
        // Filter out lines that are just numbers within paragraphs too
        const lines = p.split('\n')
            .map(l => l.trim())
            .filter(l => l && !/^\d{1,4}$/.test(l));
        if (lines.length === 0) return '';
        return `<p>${lines.join('<br/>')}</p>`;
    }).filter(p => p).join('');
}

