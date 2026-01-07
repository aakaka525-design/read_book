import type { Book, Note } from '../types/core';

export type ExportPlatform = 'notion' | 'obsidian' | 'clipboard';
export type ExportStyle = 'minimal' | 'detailed';

export interface ExportOptions {
    platform: ExportPlatform;
    style: ExportStyle;
    includeMetadata: boolean;
    includeAiSummary: boolean;
    includeNotes: boolean;
    includeHighlights: boolean;
    includeBacklink: boolean;
    backlinkUrl?: string;
    aiSummary?: string;
    keywords?: string[];
}

const clean = (text: string) => text.trim();

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const generateMarkdown = (
    book: Book,
    notes: Note[],
    highlights: string[],
    options: ExportOptions
): string => {
    const lines: string[] = [];
    const isObsidian = options.platform === 'obsidian';
    const isNotion = options.platform === 'notion';

    // 1. Metadata / Frontmatter
    if (options.includeMetadata) {
        if (isObsidian) {
            // YAML Frontmatter for Obsidian
            lines.push('---');
            lines.push(`title: "${clean(book.title)}"`);
            lines.push(`author: "${clean(book.author)}"`);
            lines.push(`type: reading-note`);
            lines.push(`status: reading`);
            lines.push(`tags: [${(options.keywords || ['reading']).join(', ')}]`);
            lines.push(`created: ${new Date().toISOString().split('T')[0]}`);
            lines.push('---');
            lines.push('');
        } else {
            // Standard Header for Notion/Clipboard
            lines.push(`# ${clean(book.title)}`);
            lines.push(`**👤 作者**: ${clean(book.author)}`);
            lines.push(`**📅 导出时间**: ${formatDate(Date.now())}`);
            lines.push(`**📊 统计**: ${notes.length} 笔记 | ${highlights.length} 高亮`);
            if (options.keywords && options.keywords.length > 0) {
                lines.push(`**🏷️ 标签**: ${options.keywords.map(k => `#${k}`).join(' ')}`);
            }
            lines.push('---');
            lines.push('');
        }
    }

    // 2. AI Summary
    if (options.includeAiSummary && options.aiSummary) {
        lines.push('## 🧠 AI 核心摘要');
        if (isNotion) {
            // Notion Callout block simulation (or just quote)
            lines.push('> ' + options.aiSummary.replace(/\n/g, '\n> '));
        } else {
            lines.push(options.aiSummary);
        }
        lines.push('');
    }

    // 3. Content Logic
    lines.push('## 📝 阅读记录');
    lines.push('');

    // Map Items
    type Item =
        | { type: 'note'; data: Note; timestamp: number }
        | { type: 'highlight'; text: string; idx: number };

    const groupedItems = new Map<string, Item[]>();
    const generalItems: Item[] = [];

    // Process Notes
    if (options.includeNotes) {
        notes.forEach(note => {
            if (!groupedItems.has(note.chapterId)) groupedItems.set(note.chapterId, []);
            groupedItems.get(note.chapterId)!.push({ type: 'note', data: note, timestamp: note.createdAt });
        });
    }

    // Process Highlights
    if (options.includeHighlights) {
        highlights.forEach(hText => {
            let found = false;
            const sections = book.content || [];
            for (const section of sections) {
                if (section.body.includes(hText)) {
                    if (!groupedItems.has(section.id)) groupedItems.set(section.id, []);
                    groupedItems.get(section.id)!.push({ type: 'highlight', text: hText, idx: section.body.indexOf(hText) });
                    found = true;
                    break;
                }
            }
            if (!found) generalItems.push({ type: 'highlight', text: hText, idx: 0 });
        });
    }

    // Sort Items
    groupedItems.forEach(items => {
        items.sort((a, b) => {
            if (a.type === b.type) {
                if (a.type === 'highlight') return (a as any).idx - (b as any).idx;
                return (a as any).timestamp - (b as any).timestamp;
            }
            return a.type === 'highlight' ? -1 : 1;
        });
    });

    // Render Chapters
    const toc = book.toc || [];
    const chaptersToRender = [...toc.map(t => t.id), ...Array.from(groupedItems.keys()).filter(k => !toc.some(t => t.id === k))]; // Unique chapters

    // Helper: Backlink
    const getBacklink = () => {
        if (!options.includeBacklink) return '';
        // In real app, generate deep link e.g. readbook://book/{id} or web link
        return ` [⚓️ 回书本]`;
    };

    chaptersToRender.forEach(chId => {
        const items = groupedItems.get(chId);
        if (!items || items.length === 0) return;

        // Chapter Header
        const chTitle = book.toc?.find(t => t.id === chId)?.title || '未知章节';
        lines.push(`### ${chTitle}`);

        items.forEach(item => {
            const isHighlight = item.type === 'highlight';

            if (options.style === 'detailed') {
                // Detailed Card Style
                if (isHighlight) {
                    lines.push(`> 💡 **原文**`);
                    lines.push(`> ${clean((item as any).text)}`);
                    lines.push(`> ${getBacklink()}`);
                } else {
                    const n = (item as any).data as Note;
                    lines.push(`- **💭 想法 (${formatDate(n.createdAt)})**`);
                    lines.push(`  ${clean(n.content)}`);
                }
            } else {
                // Minimal List Style
                if (isHighlight) {
                    lines.push(`*   **原文**: "${clean((item as any).text)}"${getBacklink()}`);
                } else {
                    const n = (item as any).data as Note;
                    lines.push(`*   **笔记**: ${clean(n.content)}`);
                }
            }
            lines.push('');
        });
    });

    // General Items
    if (generalItems.length > 0) {
        lines.push('### 其他');
        generalItems.forEach(item => {
            lines.push(`> ${clean((item as any).text)}`);
            lines.push('');
        });
    }

    // 4. Footer
    if (options.platform !== 'clipboard') {
        lines.push('---');
        lines.push('> *Generated by ReadBook*');
    }

    return lines.join('\n');
};

export const downloadMarkdown = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
