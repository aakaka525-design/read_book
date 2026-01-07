import { WorkerClient } from '../lib/workerClient';

// Singleton instance
let parserClient: WorkerClient | null = null;

function getClient(): WorkerClient {
    if (!parserClient) {
        parserClient = new WorkerClient(
            new URL('../workers/parser.worker.ts', import.meta.url),
            { timeout: 60000 } // Long timeout for heavy parsing
        );
    }
    return parserClient;
}

export async function chunkBook(chapters: any[]) {
    return getClient().request('CHUNK_BOOK', {
        chapters,
        chunkSize: 800,
        overlap: 100
    });
}

export async function parseText(text: string) {
    return getClient().request('PARSE_TEXT', { text });
}

export async function processChapterWithHighlights(html: string, highlights: string[]): Promise<{ html: string }> {
    return getClient().request('PROCESS_CHAPTER', { html, highlights });
}

export function terminateParser() {
    if (parserClient) {
        parserClient.terminate();
        parserClient = null;
    }
}
