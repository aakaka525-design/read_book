import { createContext, useContext, useReducer, useMemo, useCallback, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Tech Debt #53: Async Context Pattern
 * Using useReducer for predictable state updates with explicit action types.
 * This allows for better debugging and ensures actions are processed sequentially.
 */

// ============== Types ==============
interface ReadingProgress {
    chapter: string;
    percent: number;
}

type DailyReading = Record<string, number>;

interface ProgressState {
    readingProgress: Record<string, ReadingProgress>;
    dailyReading: DailyReading;
}

// Action Types - explicit contract for state mutations
type ProgressAction =
    | { type: 'SET_PROGRESS'; bookId: string; progress: ReadingProgress }
    | { type: 'ADD_READING_TIME'; minutes: number; date: string }
    | { type: 'SYNC_FROM_STORAGE'; state: ProgressState };

interface ProgressContextValue extends ProgressState {
    setProgress: (bookId: string, progress: ReadingProgress) => void;
    getProgress: (bookId: string) => ReadingProgress | undefined;
    addReadingTime: (minutes: number) => void;
    getTotalReadingTime: () => number;
    getStreak: () => number;
    dispatch: React.Dispatch<ProgressAction>;
}

// ============== Reducer ==============
function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
    switch (action.type) {
        case 'SET_PROGRESS':
            return {
                ...state,
                readingProgress: {
                    ...state.readingProgress,
                    [action.bookId]: action.progress
                }
            };
        case 'ADD_READING_TIME':
            return {
                ...state,
                dailyReading: {
                    ...state.dailyReading,
                    [action.date]: (state.dailyReading[action.date] || 0) + action.minutes
                }
            };
        case 'SYNC_FROM_STORAGE':
            return action.state;
        default:
            return state;
    }
}

// ============== Context ==============
const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
    // Hydrate from localStorage
    const [storedProgress, setStoredProgress] = useLocalStorage<Record<string, ReadingProgress>>(STORAGE_KEYS.PROGRESS, {});
    const [storedDailyReading, setStoredDailyReading] = useLocalStorage<DailyReading>(STORAGE_KEYS.STATS, {});

    // Initialize reducer with hydrated state
    const [state, dispatch] = useReducer(progressReducer, {
        readingProgress: storedProgress,
        dailyReading: storedDailyReading
    });

    // Sync reducer state back to localStorage
    const setProgress = useCallback((bookId: string, progress: ReadingProgress) => {
        dispatch({ type: 'SET_PROGRESS', bookId, progress });
        setStoredProgress((prev: Record<string, ReadingProgress>) => ({ ...prev, [bookId]: progress }));
    }, [setStoredProgress]);

    const addReadingTime = useCallback((minutes: number) => {
        if (minutes <= 0) return;
        const date = new Date().toISOString().split('T')[0];
        dispatch({ type: 'ADD_READING_TIME', minutes, date });
        setStoredDailyReading((prev: DailyReading) => ({
            ...prev,
            [date]: (prev[date] || 0) + minutes
        }));
    }, [setStoredDailyReading]);

    const getProgress = useCallback((bookId: string) => state.readingProgress[bookId], [state.readingProgress]);

    const getTotalReadingTime = useCallback(() => {
        return Object.values(state.dailyReading).reduce((acc, curr) => acc + curr, 0);
    }, [state.dailyReading]);

    const getStreak = useCallback(() => {
        const { dailyReading } = state;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (!dailyReading[todayStr] && !dailyReading[yesterdayStr]) {
            return 0;
        }

        let streak = 0;
        let checkDate = new Date();

        if (!dailyReading[todayStr]) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (dailyReading[dateStr] && dailyReading[dateStr] > 0) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [state.dailyReading]);

    const value = useMemo<ProgressContextValue>(() => ({
        readingProgress: state.readingProgress,
        dailyReading: state.dailyReading,
        setProgress,
        getProgress,
        addReadingTime,
        getTotalReadingTime,
        getStreak,
        dispatch
    }), [state, setProgress, getProgress, addReadingTime, getTotalReadingTime, getStreak]);

    return (
        <ProgressContext.Provider value={value}>
            {children}
        </ProgressContext.Provider>
    );
}

export function useProgress() {
    const context = useContext(ProgressContext);
    if (!context) {
        throw new Error('useProgress must be used within ProgressProvider');
    }
    return context;
}
