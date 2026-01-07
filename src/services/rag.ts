/**
 * RAG Service - 使用 WorkerClient 脚手架
 */

import type { AIConfig, TextChunk, SemanticChunk, RetrievalResult } from '../types/core';
import { getEmbedding, getBatchEmbeddings } from './ai';
import { getBookEmbeddings, saveEmbeddingsBatch, getEmbeddingMetadata, clearBookEmbeddings } from './db';
import { PROMPTS } from '../config/prompts';
import { WorkerClient } from '../lib/workerClient';
import { AppError, ErrorCode } from '../types/errors';

// ============== Types ==============
// Re-export types for consumers
export type { TextChunk, SemanticChunk, RetrievalResult };




// ============== Worker Clients (Lazy Singleton) ==============
let _ragClient: WorkerClient | null = null;
let _parserClient: WorkerClient | null = null;

function getRagClient(): WorkerClient {
    if (!_ragClient) {
        _ragClient = new WorkerClient(
            new URL('../workers/rag.worker.ts', import.meta.url),
            { timeout: 60000 } // 60s for vector search
        );
    }
    return _ragClient;
}

function getParserClient(): WorkerClient {
    if (!_parserClient) {
        _parserClient = new WorkerClient(
            new URL('../workers/parser.worker.ts', import.meta.url),
            { timeout: 120000 } // 2min for large book parsing
        );
    }
    return _parserClient;
}

// ============== Public API ==============

/**
 * 分块：委托给 Parser Worker
 */
export async function chunkBookContent(
    bookContent: { id: string; title: string; body: string }[],
    chunkSize: number = 800,
    overlap: number = 100
): Promise<TextChunk[]> {
    const client = getParserClient();

    const result = await client.request<
        { chapters: typeof bookContent; chunkSize: number; overlap: number },
        { chunks: TextChunk[] }
    >('CHUNK_BOOK', { chapters: bookContent, chunkSize, overlap });

    return result.chunks;
}

/**
 * 验证现有索引是否与当前配置兼容
 */
export async function validateIndex(bookId: string, config: AIConfig): Promise<{ valid: boolean; reason?: string }> {
    const meta = await getEmbeddingMetadata(bookId);
    if (!meta) return { valid: true }; // No index yet, so it's "valid" (ready to be created)

    if (config.embeddingModel && meta.model && meta.model !== config.embeddingModel) {
        return { valid: false, reason: `Model mismatch: index=${meta.model}, config=${config.embeddingModel}` };
    }

    // Optional: detect dimension changes if model is same but somehow dimensions changed (rare)
    return { valid: true };
}

/**
 * 索引嵌入：API 调用在主线程，向量存储委托给 RAG Worker
 */
export async function indexChunksWithEmbeddings(
    chunks: TextChunk[],
    config: AIConfig,
    bookId: string,
    onProgress?: (current: number, total: number) => void
): Promise<SemanticChunk[]> {
    const client = getRagClient();
    const semanticChunks: SemanticChunk[] = [];

    // 1. 验证索引完整性
    const validation = await validateIndex(bookId, config);
    if (!validation.valid) {
        console.warn(`[RAG] Stale index detected: ${validation.reason}. Clearing...`);
        await clearBookEmbeddings(bookId);
    }

    // 2. 从 IndexedDB 加载缓存
    let persistedEmbeddings: Map<string, number[]>;
    try {
        persistedEmbeddings = await getBookEmbeddings(bookId);
    } catch {
        persistedEmbeddings = new Map();
    }

    const uncached: { index: number; chunk: TextChunk }[] = [];

    // 2. 分离缓存/未缓存，发送缓存到 Worker（单向，不等待）
    chunks.forEach((chunk, i) => {
        if (persistedEmbeddings.has(chunk.id)) {
            const embedding = persistedEmbeddings.get(chunk.id)!;
            semanticChunks[i] = { ...chunk, embedding };
            // 单向发送，不等待响应
            client.send('INDEX_CHUNK', { id: chunk.id, content: chunk.content, embedding });
        } else {
            uncached.push({ index: i, chunk });
            semanticChunks[i] = { ...chunk };
        }
    });

    // 3. 批量获取 Embedding（API 调用在主线程）
    const BATCH_SIZE = 50;
    const newEmbeddings: { chunkId: string; embedding: number[] }[] = [];

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
        const batch = uncached.slice(i, i + BATCH_SIZE);
        const texts = batch.map(b => b.chunk.content);

        try {
            const embeddings = await getBatchEmbeddings(texts, config);

            batch.forEach((item, batchIdx) => {
                const embedding = embeddings[batchIdx];
                // 单向发送到 Worker
                client.send('INDEX_CHUNK', { id: item.chunk.id, content: item.chunk.content, embedding });
                semanticChunks[item.index].embedding = embedding;
                newEmbeddings.push({ chunkId: item.chunk.id, embedding });
            });

            onProgress?.(chunks.length - uncached.length + i + batch.length, chunks.length);
        } catch (e: any) {
            console.error('Batch embedding failed', e);
            // In a real app, we might want to throw or mark chunks as failed
            // For now, we continue but wrap for logging consistency if needed
            const appError = AppError.from(e);
            if (appError.code === ErrorCode.API_ERROR) {
                // Major failure, probably stop indexing
                throw appError;
            }
        }
    }

    // 4. 持久化新 Embedding
    if (newEmbeddings.length > 0) {
        await saveEmbeddingsBatch(bookId, newEmbeddings, config.embeddingModel);
    }

    return semanticChunks;
}

/**
 * 语义搜索：委托给 RAG Worker
 */
export async function semanticSearch(
    query: string,
    chunks: SemanticChunk[],
    config: AIConfig,
    topK: number = 5
): Promise<RetrievalResult[]> {
    // 1. 主线程获取 Query Embedding（需要 API Key）
    const queryEmbedding = await getEmbedding(query, config);

    // 2. 委托 Worker 执行向量搜索（类型安全的请求-响应）
    const client = getRagClient();
    const response = await client.request<
        { queryEmbedding: number[]; topK: number },
        { results: { id: string; score: number }[] }
    >('SEARCH', { queryEmbedding, topK });

    // 3. 映射回 Chunk 对象
    const chunkMap = new Map(chunks.map(c => [c.id, c]));
    return response.results
        .map(r => ({ chunk: chunkMap.get(r.id) as TextChunk, score: r.score }))
        .filter(r => r.chunk);
}

// ============== Utility Functions ==============

/**
 * 关键词检索（备用方案，无需 Embedding）
 * 用于快速匹配，当没有语义索引时使用
 */
export function retrieveRelevantChunks(
    query: string,
    chunks: TextChunk[],
    topK: number = 10
): RetrievalResult[] {
    // Use Intl.Segmenter for language-aware tokenization (works for Chinese & English)
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

    // Extract meaningful tokens (ignore spaces/punctuation)
    const queryTokens = new Set(
        Array.from(segmenter.segment(query.toLowerCase()))
            .filter(t => t.isWordLike)
            .map(t => t.segment)
    );

    if (queryTokens.size === 0) return [];

    const scored = chunks.map(chunk => {
        // Tokenize content on the fly (performance note: for large books, this should be pre-computed)
        const chunkTokens = Array.from(segmenter.segment(chunk.content.toLowerCase()));

        let matchCount = 0;
        let totalWords = 0;

        for (const token of chunkTokens) {
            if (token.isWordLike) {
                totalWords++;
                if (queryTokens.has(token.segment)) matchCount++;
            }
        }

        // Score = Token Overlap / Query Length (Precision-oriented) 
        // We care if the chunk contains the query constraints, not just random words
        // Also add a small length penalty to avoid super short chunks having high score just by luck
        const score = matchCount / Math.max(queryTokens.size, 1);

        return { chunk, score };
    });

    return scored
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

export function formatContextForLLM(results: RetrievalResult[]): string {
    if (results.length === 0) return "No relevant content found.";
    return results.map((r, i) => `【引用 ${i + 1}】"${r.chunk.content}"`).join('\n\n');
}

export function buildRAGSystemPrompt(bookTitle: string, context: string): string {
    return PROMPTS.RAG.SYSTEM_TEMPLATE(bookTitle, context);
}

// ============== Cleanup ==============
export function terminateWorkers(): void {
    _ragClient?.terminate();
    _parserClient?.terminate();
    _ragClient = null;
    _parserClient = null;
}
