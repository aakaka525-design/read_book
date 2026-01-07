import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface DeleteConfirmModalProps {
    bookTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DeleteConfirmModal({ bookTitle, onConfirm, onCancel }: DeleteConfirmModalProps) {
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Focus cancel button on mount (prevent accidental deletion via Enter)
    useEffect(() => {
        cancelButtonRef.current?.focus();
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onCancel}
        >
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/40"
                style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />

            {/* Modal Card */}
            <div
                className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Red top accent line */}
                <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />

                {/* Content */}
                <div className="p-6 text-center">
                    {/* Icon */}
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
                        <Trash2 className="w-7 h-7 text-red-500" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        删除《{bookTitle}》？
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        删除后，该书将从书架移除。此操作无法撤销。
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            ref={cancelButtonRef}
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-lg shadow-red-500/25"
                        >
                            确认删除
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
