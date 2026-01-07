import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AIConfig } from '../types/core';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS, DEFAULT_AI_CONFIG, DEFAULTS } from '../constants/config';

interface SettingsState {
    fontSize: number;
    aiConfig: AIConfig;
}

interface SettingsContextValue extends SettingsState {
    setFontSize: (size: number) => void;
    setAiConfig: (config: AIConfig) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    // --- Settings ---
    // --- Settings ---
    const [fontSize, setFontSizeState] = useLocalStorage<number>(STORAGE_KEYS.FONT_SIZE, DEFAULTS.FONT_SIZE);
    const [aiConfig, setAiConfigState] = useLocalStorage<AIConfig>(STORAGE_KEYS.AI_CONFIG, DEFAULT_AI_CONFIG);

    // Persistence handled by hook automatically

    const setFontSize = (size: number) => {
        setFontSizeState(size);
    };

    const setAiConfig = (config: AIConfig) => {
        setAiConfigState(config);
    };

    const value = useMemo<SettingsContextValue>(() => ({
        fontSize,
        aiConfig,
        setFontSize,
        setAiConfig
    }), [fontSize, aiConfig]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}
