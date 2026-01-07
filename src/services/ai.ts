import type { AIConfig } from '../types/core';
import { PROMPTS } from '../config/prompts';
import { AppError, ErrorCode } from '../types/errors';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const DEFAULT_CONFIG: AIConfig = {
    baseUrl: '/api', // Use relative path via Vite proxy
    model: 'zai-org/glm-4.7',
    embeddingModel: 'qwen/qwen3-embedding-0.6b'
};

export async function checkConnection(config: AIConfig): Promise<boolean> {
    try {
        const response = await fetch(`${config.baseUrl}/models`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch (e) {
        console.error('AI Check Connection Failed:', e);
        return false;
    }
}

export interface StreamChunk {
    content: string;
    reasoning: string;
}

export async function streamCompletion(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk: (chunk: StreamChunk) => void,
    onComplete?: () => void,
    signal?: AbortSignal
) {
    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                messages: messages,
                stream: true
            }),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));

                        // Extract content and reasoning separately
                        const delta = data.choices[0]?.delta || {};
                        const chunkPayload: StreamChunk = {
                            content: delta.content || '',
                            reasoning: delta.reasoning_content || ''
                        };

                        // Only trigger if we have data
                        if (chunkPayload.content || chunkPayload.reasoning) {
                            onChunk(chunkPayload);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        if (onComplete) onComplete();

    } catch (error: any) {
        console.error('Stream Error:', error);
        // Fallback for error display
        onChunk({
            content: `\n[System Error: ${error.message}]`,
            reasoning: ''
        });
        if (onComplete) onComplete();
    }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status >= 500 || response.status === 429) {
                // Retry on server errors or rate limits
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            return response; // Return other errors (4xx) directly
        } catch (e) {
            lastError = e;
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError || new Error(`Fetch failed after ${maxRetries} retries`);
}

/**
 * Get embedding vector for text using OpenAI API
 */
export async function getEmbedding(text: string, config: AIConfig): Promise<number[]> {
    const response = await fetchWithRetry(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.embeddingModel || 'text-embedding-3-small',
            input: text.slice(0, 8000)
        })
    });

    if (!response.ok) {
        throw new Error(`Embedding API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

/**
 * Get embeddings for multiple texts in a single batch request (FAST!)
 * OpenAI supports up to 2048 inputs per request
 */
export async function getBatchEmbeddings(texts: string[], config: AIConfig, batchSizeLimit: number = 2048): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSizeLimit) {
        const batch = texts.slice(i, i + batchSizeLimit).map(t => t.slice(0, 8000));

        const response = await fetchWithRetry(`${config.baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.embeddingModel || 'text-embedding-3-small',
                input: batch
            })
        });

        if (!response.ok) {
            throw new AppError(ErrorCode.API_ERROR, `Embedding API Error: ${response.status}`, null, response.status === 429 || response.status >= 500);
        }

        const data = await response.json();
        results.push(...data.data.map((d: any) => d.embedding));
    }

    return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}


export interface GraphNode {
    id: string;
    label: string;
    type: 'person' | 'location' | 'concept' | 'event';
    desc?: string;
}

export interface GraphLink {
    source: string;
    target: string;
    label: string;
    type?: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

/**
 * Generate a Knowledge Graph (nodes & links) from text
 */
// ...

export async function generateKnowledgeGraph(text: string, config: AIConfig): Promise<GraphData> {
    const prompt = PROMPTS.KNOWLEDGE_GRAPH.USER_TEMPLATE(text);

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: PROMPTS.KNOWLEDGE_GRAPH.SYSTEM },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';

        // Clean markdown code blocks if present
        const jsonStr = content.replace(/```json\n?|\n?```/g, '');
        return JSON.parse(jsonStr);

    } catch (error) {
        console.error('KG Generation Error:', error);
        return { nodes: [], links: [] };
    }
}
