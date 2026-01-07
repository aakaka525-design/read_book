import { useState, useEffect, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';
import InstallPrompt from '../InstallPrompt';

export default function MainLayout() {
    const { theme, toggleTheme } = useTheme();
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Show if scrolling UP or at TOP
            if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
                setShowHeader(true);
            } else if (currentScrollY > 100 && currentScrollY > lastScrollY.current) {
                // Hide if scrolling DOWN and past top
                setShowHeader(false);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header
                className={`fixed top-0 left-0 w-full h-[60px] bg-paper border-b border-[var(--border-color)] z-50 flex items-center px-6 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">
                    <Link to="/" className="font-serif font-bold text-xl text-primary no-underline">
                        Web Reader
                    </Link>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-200/10 transition-colors text-primary"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-[60px] min-h-screen opacity-100 transition-opacity duration-300">
                <Outlet />
            </main>

            {/* PWA Install Prompt */}
            <InstallPrompt />
        </div>
    );
}
