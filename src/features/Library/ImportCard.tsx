import React, { useRef, memo } from 'react';
import { importPDF } from '../../services/importer';
import type { Book } from '../../types/core';
import { Upload } from 'lucide-react';

interface ImportCardProps {
    onImport: (book: Book) => void;
    onStart?: () => void;
}

const ImportCard = memo(({ onImport, onStart }: ImportCardProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (onStart) onStart();

        try {
            // Currently only PDF is fully supported by the importer service
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                throw new Error('Only PDF files are currently supported');
            }

            const book = await importPDF(file);
            onImport(book);
        } catch (error: any) {
            const message = error?.message || 'Unknown error during import';
            console.error('Import failed:', error);
            alert(`Could not import ${file.name}\n${message}`);
        } finally {
            // Reset input so same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCardClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            onClick={handleCardClick}
            className="group flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5 cursor-pointer transition-all h-full"
        >
            <input
                type="file"
                accept=".pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div className="bg-[var(--bg-body)] p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <Upload size={32} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]" />
            </div>

            <h3 className="font-bold text-lg mb-2">Import Book</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center">
                Supports PDF
            </p>
        </div>
    );
});

export default ImportCard;
