import { useState, useRef, useEffect } from 'react';
import { Settings, Minus, Plus, Type, Moon, Sun } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { useTheme } from '../../hooks/useTheme';

export default function SettingsMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { fontSize, setFontSize } = useAppContext();
    const { theme, toggleTheme } = useTheme();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleIncrease = () => setFontSize(Math.min(32, fontSize + 2));
    const handleDecrease = () => setFontSize(Math.max(12, fontSize - 2));

    return (
        <div className="fixed top-4 right-4 z-50 group pointer-events-none" ref={menuRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    pointer-events-auto
                    bg-[var(--bg-card)] border border-[var(--border-color)] text-primary p-3 rounded-full shadow-lg 
                    transition-all duration-300 ease-out active:scale-95
                    ${isOpen ? 'opacity-100 scale-100' : 'opacity-40 hover:opacity-100 hover:scale-110'}
                `}
                title="Reading Settings"
                aria-label="Reading Settings"
            >
                <Settings size={20} />
            </button>

            {/* Menu Popup (Top Right Anchor) */}
            {isOpen && (
                <div className="pointer-events-auto absolute top-14 right-0 w-[240px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in duration-200 origin-top-right">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">Appearance</h3>

                    {/* Size Controls */}
                    <div className="flex items-center justify-between bg-[var(--bg-body)] rounded-lg p-2 mb-4">
                        <button onClick={handleDecrease} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" aria-label="Decrease Font Size">
                            <Minus size={16} />
                        </button>
                        <div className="flex items-center gap-1 font-bold text-sm">
                            <Type size={14} />
                            {fontSize}
                        </div>
                        <button onClick={handleIncrease} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" aria-label="Increase Font Size">
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-body)] transition-colors text-sm font-medium"
                        aria-label="Toggle Theme"
                    >
                        <span>Dark Mode</span>
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
            )}
        </div>
    );
}
