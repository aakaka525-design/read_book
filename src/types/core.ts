/**
 * Core Domain Types
 * ⚠️ STRICT RULE: ZERO DEPENDENCIES (No React, No DOM, No UI Libraries)
 * Safe to import in Web Workers and Node.js
 */

export interface BookSection {
    id: string;
    title: string;
    body: string;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    cover?: string | Blob;
    coverAccent?: string;
    progress: number;
    type: 'local' | 'server';
    dataFile?: string;
    toc?: { id: string; title: string }[];
    content?: BookSection[];
}

export interface BookCatalog {
    books: Book[];
}

export interface Note {
    id: string;
    bookId: string;
    chapterId: string;
    content: string;
    createdAt: number;
    tags?: string[];
}

// RAG Types
export interface TextChunk {
    id: string;
    chapterId: string;
    chapterTitle: string;
    content: string;
}

export interface SemanticChunk extends TextChunk {
    embedding?: number[];
}

export interface RetrievalResult {
    chunk: TextChunk;
    score: number;
}



export interface AIConfig {
    baseUrl: string;
    model: string;
    embeddingModel: string;
}
