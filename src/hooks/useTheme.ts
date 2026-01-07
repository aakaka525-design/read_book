import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { STORAGE_KEYS } from '../constants/config';

export function useTheme() {
    const getSystemTheme = (): 'light' | 'dark' =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const [theme, setTheme] = useLocalStorage<'light' | 'dark'>(
        STORAGE_KEYS.THEME,
        getSystemTheme()
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev: string) => prev === 'light' ? 'dark' : 'light');
    };

    return { theme, toggleTheme };
}
