import type { Book, BookCatalog } from '../types/core';

export async function fetchServerBooks(): Promise<Book[]> {
    try {
        const response = await fetch('/data/books.json');
        if (!response.ok) {
            throw new Error('Failed to load catalog');
        }
        const data: BookCatalog = await response.json();
        return data.books.map(book => ({
            ...book,
            type: 'server',
            progress: 0 // Fetch actual progress from localStorage if needed later
        }));
    } catch (error) {
        console.error('Error fetching server books:', error);
        return [];
    }
}
