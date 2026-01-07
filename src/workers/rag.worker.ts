/**
 * RAG Worker - 向量索引与搜索
 * 使用 WorkerClient 的响应协议
 */



// ============== Types ==============
interface WorkerMessage<T = any> {
    id: string;
    type: string;
    payload: T;
}

// IndexedChunk local usage is fine or export from core if needed.
// For now, keeping local helpers local.

// ============== State ==============

// ============== State ==============
let vectors: Float32Array | null = null;
let ids: string[] = [];
let dimension = 0;
let count = 0;

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
            case 'INDEX_CHUNK': {
                const { id: chunkId, embedding } = payload as { id: string; content: string; embedding: number[] };
                const dim = embedding.length;

                if (dimension === 0) dimension = dim;
                if (dim !== dimension) {
                    replyError(id, `Dimension mismatch: expected ${dimension}, got ${dim}`);
                    return;
                }

                // 扩容 Float32Array
                if (!vectors || count * dimension >= vectors.length) {
                    const newSize = Math.max(1000, (count + 500)) * dimension;
                    const newVectors = new Float32Array(newSize);
                    if (vectors) newVectors.set(vectors);
                    vectors = newVectors;
                }

                // 写入向量
                vectors.set(embedding, count * dimension);
                ids.push(chunkId);
                count++;

                // 单向消息可以不回复，但如果需要确认可以回复
                // reply(id, 'INDEX_COMPLETE', { indexed: count });
                break;
            }

            case 'SEARCH': {
                const { queryEmbedding, topK } = payload as { queryEmbedding: number[]; topK: number };

                if (!vectors || count === 0) {
                    reply(id, 'SEARCH_RESULT', { results: [] });
                    return;
                }

                // 余弦相似度搜索
                const query = new Float32Array(queryEmbedding);
                const scores: { id: string; score: number }[] = [];

                for (let i = 0; i < count; i++) {
                    const offset = i * dimension;
                    let dot = 0, normA = 0, normB = 0;

                    for (let j = 0; j < dimension; j++) {
                        const a = query[j];
                        const b = vectors[offset + j];
                        dot += a * b;
                        normA += a * a;
                        normB += b * b;
                    }

                    const score = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
                    scores.push({ id: ids[i], score });
                }

                // 排序取 TopK
                scores.sort((a, b) => b.score - a.score);
                const results = scores.slice(0, topK);

                reply(id, 'SEARCH_RESULT', { results });
                break;
            }

            case 'CLEAR': {
                vectors = null;
                ids = [];
                count = 0;
                dimension = 0;
                reply(id, 'CLEAR_COMPLETE', { success: true });
                break;
            }

            default:
                replyError(id, `Unknown message type: ${type}`);
        }
    } catch (err: any) {
        replyError(id, err.message || 'Worker error');
    }
};

export { };
