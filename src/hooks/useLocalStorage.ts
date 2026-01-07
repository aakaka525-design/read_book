import { useState } from 'react';

/**
 * A hook to safely use localStorage.
 * Handles parsing, serialization, and SSR safety.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (!item) return initialValue;

            try {
                return JSON.parse(item);
            } catch {
                // FALLBACK: If JSON.parse fails, it might be a legacy raw string (like "light")
                // We return it if T is string, otherwise return initialValue for safety
                if (typeof initialValue === 'string') {
                    return item as unknown as T;
                }
                console.warn(`[useLocalStorage] Failed to parse JSON for key "${key}", and T is not string. Returning initialValue.`);
                return initialValue;
            }
        } catch (error) {
            // If error also return initialValue
            console.error(error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Use functional update to ensure we always have the latest state
            setStoredValue((currentValue) => {
                // Resolve the new value based on the LATEST currentValue
                const valueToStore = value instanceof Function ? value(currentValue) : value;

                // Persist to localStorage
                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(key, JSON.stringify(valueToStore));
                    } catch (e) {
                        console.error(`[useLocalStorage] Error saving key "${key}":`, e);
                    }
                }

                return valueToStore;
            });
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}
