/**
 * UI Types - 仅限前端 UI 使用
 * 可以 import React 类型
 */

import type { ReactNode } from 'react';

// Context State Types
export interface ReadingProgress {
    chapterId: string;
    scrollPercent: number;
    lastReadAt: number;
}

export interface DailyReading {
    date: string;
    seconds: number;
}

export interface MagicState {
    mode: 'idle' | 'loading' | 'streaming';
    content: string;
}

import type { AIConfig } from './core';
export type { AIConfig };


// Component Props (示例)
export interface LayoutProps {
    children: ReactNode;
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}
