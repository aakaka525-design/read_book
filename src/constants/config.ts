import type { AIConfig } from '../types/core';

// --- Storage Keys ---
export const STORAGE_KEYS = {
    // Core
    THEME: 'theme',

    // Settings
    FONT_SIZE: 'webReaderFontSize',
    AI_CONFIG: 'webReaderAIConfig',

    // Library
    FAVORITES: 'webReaderFavorites',

    // Progress
    PROGRESS: 'webReaderProgress',
    STATS: 'webReaderStats',

    // Dynamic Prefixes
    CHAT_HISTORY_PREFIX: 'chat_history_',
    TOAST_PREFIX: 'typographyToast-'
} as const;

// --- Defaults ---
export const DEFAULT_AI_CONFIG: AIConfig = {
    baseUrl: '/api',
    model: 'zai-org/glm-4.7',
    embeddingModel: 'qwen/qwen3-embedding-0.6b'
};

export const DEFAULTS = {
    FONT_SIZE: 18,
    THEME: 'light'
} as const;

// --- Timeouts & Limits ---
export const CONFIG = {
    TOAST_DURATION: 3000,
    SEARCH_DEBOUNCE: 800,
    READING_DELAY: 1000,
    MAX_HISTORY: 100
} as const;
