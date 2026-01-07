import { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Loader2, Check, Cloud } from 'lucide-react';

export default function ImportStatusWidget() {
    const { importState, setImportState } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);

    if (importState.status === 'idle') return null;

    const handleClick = () => {
        if (importState.status === 'success') {
            setIsOpen(!isOpen);
        }
    };

    const handleDismiss = () => {
        setImportState({ status: 'idle' });
        setIsOpen(false);
    };

    return (
        <div className="relative group">
            {/* The Indicator */}
            <button
                onClick={handleClick}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all"
                title="Import Status"
            >
                {importState.status === 'loading' && (
                    <Loader2 size={18} className="animate-spin text-[var(--accent-color)]" />
                )}

                {importState.status === 'success' && (
                    <div className="relative">
                        <Cloud size={18} className="text-[var(--text-secondary)]" />
                        {/* Red Dot */}
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-card)]"></span>
                    </div>
                )}
            </button>

            {/* The Popover Menu */}
            {isOpen && importState.status === 'success' && (
                <div className="absolute bottom-12 left-0 w-64 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl p-4 animate-in slide-in-from-bottom-2 fade-in z-50">
                    <div className="flex items-start gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full p-1.5 mt-0.5">
                            <Check size={14} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold mb-1">Import Successful</h4>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                {importState.message}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="mt-3 w-full text-xs py-1.5 bg-[var(--bg-body)] hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-[var(--text-secondary)] transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}
