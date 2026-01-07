// import { useEffect, useState } from 'react';

interface TOCProps {
    items: { id: string; title: string }[];
    activeId: string;
    onSelect: (id: string) => void;
}

export default function TableOfContents({ items, activeId, onSelect }: TOCProps) {
    return (
        <nav className="space-y-1">
            <h2 className="text-xs uppercase tracking-wider text-secondary font-bold mb-4 px-2">Table of Contents</h2>
            <ul className="space-y-1">
                {items.map(item => (
                    <li key={item.id}>
                        <button
                            onClick={() => onSelect(item.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors duration-200 
                ${activeId === item.id
                                    ? 'text-accent font-medium bg-accent/10 border-l-2 border-accent'
                                    : 'text-secondary hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            aria-label={`Go to chapter: ${item.title}`}
                        >
                            {item.title}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
