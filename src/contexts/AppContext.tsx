import { type ReactNode } from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { LibraryProvider, useLibrary } from './LibraryContext';
import { ReadingProvider, useReading } from './ReadingContext';
import { ProgressProvider, useProgress } from './ProgressContext';

/**
 * Master Provider - Context Dependency Tree
 * Tech Debt #15: Explicit dependency documentation
 * 
 * Nesting Order (outer → inner):
 * 1. SettingsProvider - No dependencies (theme, AI config)
 * 2. LibraryProvider  - Depends on: Settings (for persistence config)
 * 3. ProgressProvider - Depends on: Settings, Library (tracks reading stats)
 * 4. ReadingProvider  - Depends on: All above (current reading session)
 * 
 * Rule: Inner contexts may access outer contexts via hooks.
 *       Outer contexts must NOT access inner contexts.
 */
export function AppProvider({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider>
            <LibraryProvider>
                <ProgressProvider>
                    <ReadingProvider>
                        {children}
                    </ReadingProvider>
                </ProgressProvider>
            </LibraryProvider>
        </SettingsProvider>
    );
}

// Legacy Accessor (Migration Adapter)
// This strictly aggregates all contexts so existing components don't break yet.
// Future Refactoring: Replace useAppContext() calls with useSettings(), useLibrary(), etc.
export function useAppContext() {
    const settings = useSettings();
    const library = useLibrary();
    const reading = useReading();
    const progress = useProgress();

    return {
        ...settings,
        ...library,
        ...reading,
        ...progress,
        // Manual bridge for naming mismatches if any
    };
}
