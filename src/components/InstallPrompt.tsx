import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent Chrome 67+ from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);

            // Check if user has dismissed it recently (optional, skipping for now to ensure visibility)
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        await deferredPrompt.userChoice;


        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 w-[90%] md:w-[320px] bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-secondary hover:text-primary transition-colors"
                aria-label="Close"
            >
                <X size={16} />
            </button>
            <div className="flex items-start gap-4 pr-6">
                <div className="bg-[var(--bg-body)] p-3 rounded-xl border border-[var(--border-color)]">
                    {/* Fallback icon if no logo */}
                    <Download size={24} className="text-[var(--accent-color)]" />
                </div>
                <div>
                    <h3 className="font-bold text-sm mb-1">Install Web Reader</h3>
                    <p className="text-xs text-secondary mb-3">Install to your desktop or home screen for the best offline reading experience.</p>
                    <button
                        onClick={handleInstallClick}
                        className="text-xs bg-black text-white dark:bg-white dark:text-black font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                    >
                        Install App
                    </button>
                </div>
            </div>
        </div>
    );
}
