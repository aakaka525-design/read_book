import { saveNote, saveHighlight, saveReadingProgress, saveStats } from './db';
const STORAGE_KEY_STATS = 'webReaderStats';

const STORAGE_KEY_NOTES = 'webReaderNotes';
const STORAGE_KEY_HIGHLIGHTS = 'webReaderHighlights';
const STORAGE_KEY_PROGRESS = 'webReaderProgress';
const MIGRATION_FLAG = 'webReader_v3_migrated';

export interface MigrationResult {
    success: boolean;
    notesCount: number;
    highlightsCount: number;
    progressCount: number;
    error?: string;
}

/**
 * Migrate User Data from LocalStorage to IndexedDB
 */
export async function migrateUserData(): Promise<MigrationResult> {
    // 1. Check if already migrated
    if (localStorage.getItem(MIGRATION_FLAG)) {
        return { success: true, notesCount: 0, highlightsCount: 0, progressCount: 0 };
    }

    const result: MigrationResult = {
        success: false,
        notesCount: 0,
        highlightsCount: 0,
        progressCount: 0
    };



    try {
        // 2. Migrate Notes
        const rawNotes = localStorage.getItem(STORAGE_KEY_NOTES);
        if (rawNotes) {
            const parsed = JSON.parse(rawNotes);
            const notes: any[] = [];
            // Handle record structure: { bookId: [notes] }
            Object.values(parsed).forEach((bookNotes: any) => {
                if (Array.isArray(bookNotes)) {
                    notes.push(...bookNotes);
                }
            });

            for (const note of notes) {
                await saveNote(note);
                result.notesCount++;
            }
        }

        // 3. Migrate Highlights
        const rawHighlights = localStorage.getItem(STORAGE_KEY_HIGHLIGHTS);
        if (rawHighlights) {
            const parsed = JSON.parse(rawHighlights);
            // Handle record: { bookId: [string] }
            // We need to construct highlight objects since we only stored strings before
            // But wait, the previous code only stored strings?
            // Checking ReadingContext: highlights[bookId] = string[]
            // New schema requires objects? 
            // Let's check db.ts... createObjectStore('highlights', { keyPath: 'id' })
            // So we need to wrap the string in an object.

            for (const [bookId, texts] of Object.entries(parsed)) {
                if (Array.isArray(texts)) {
                    for (const text of texts) {
                        // Generate a pseudo-ID (simple hash)
                        const id = `${bookId}_${hashString(text as string)}`;
                        await saveHighlight({
                            id,
                            bookId,
                            text,
                            createdAt: Date.now()
                        });
                        result.highlightsCount++;
                    }
                }
            }
        }

        // 4. Migrate Progress
        const rawProgress = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (rawProgress) {
            const parsed = JSON.parse(rawProgress);
            // Record<string, { chapter: string, percent: number }>
            for (const [bookId, prog] of Object.entries(parsed)) {
                const p = prog as any;
                await saveReadingProgress({
                    bookId,
                    chapter: p.chapter,
                    percent: p.percent,
                    updatedAt: Date.now()
                });
                result.progressCount++;
            }
        }

        // 5. Migrate Stats (Daily Reading)
        const rawStats = localStorage.getItem(STORAGE_KEY_STATS);
        if (rawStats) {
            const parsed = JSON.parse(rawStats);
            // parsed is Record<string, number> (date -> minutes)
            await saveStats('dailyReading', parsed);
        }

        // 6. Mark as complete
        localStorage.setItem(MIGRATION_FLAG, 'true');
        result.success = true;
        // console.log(`[Migration] Success! Moved ${result.notesCount} notes, ${result.highlightsCount} highlights.`);

        // Optional: Clear old storage to free up space (maybe later after verification)
        // localStorage.removeItem(STORAGE_KEY_NOTES); ...

    } catch (e: any) {
        console.error('[Migration] Failed:', e);
        result.error = e.message;
    }

    return result;
}

// Simple hash for IDs
function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
