import { renderHook, act } from '@testing-library/react';
import { ProgressProvider, useProgress } from '../../contexts/ProgressContext';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ProgressContext', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('should initialize with default empty values', () => {
        const { result } = renderHook(() => useProgress(), {
            wrapper: ProgressProvider,
        });

        expect(result.current.readingProgress).toEqual({});
        expect(result.current.dailyReading).toEqual({});
    });

    it('should update progress for a book', () => {
        const { result } = renderHook(() => useProgress(), {
            wrapper: ProgressProvider,
        });

        const progressData = { chapter: 'ch1', percent: 0.5 };

        act(() => {
            result.current.setProgress('book1', progressData);
        });

        expect(result.current.readingProgress['book1']).toEqual(progressData);
        expect(result.current.getProgress('book1')).toEqual(progressData);
    });

    it('should accumulate daily reading time', () => {
        const { result } = renderHook(() => useProgress(), {
            wrapper: ProgressProvider,
        });

        act(() => {
            result.current.addReadingTime(10);
        });

        const today = new Date().toISOString().split('T')[0];
        expect(result.current.getTotalReadingTime()).toBe(10);
        expect(result.current.dailyReading[today]).toBe(10);

        act(() => {
            result.current.addReadingTime(5);
        });
        expect(result.current.getTotalReadingTime()).toBe(15);
    });
});
