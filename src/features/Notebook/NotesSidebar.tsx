import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { PenLine, Sparkles, Search, Plus, BookOpen, Wand2, Upload, Share2 } from 'lucide-react';
import ExportModal from './ExportModal';
import type { Note, Book } from '../../types';
import AIAssistant from '../Assistant/AIAssistant';
import NoteCard from './NoteCard';
import ConceptMap from '../Visualization/ConceptMap';

interface NotesSidebarProps {
    bookId: string;
    book: Book;
    activeChapterId: string;
}

export default function NotesSidebar({ bookId, book, activeChapterId }: NotesSidebarProps) {
    const { addNote, updateNote, getNotes, deleteNote, magicState } = useAppContext();
    const notes = getNotes(bookId);

    // UI State
    const [activeTab, setActiveTab] = useState<'notes' | 'ai' | 'graph'>('notes');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Export State
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [exportAutoRun, setExportAutoRun] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-switch to AI tab when Magic interaction starts
    useEffect(() => {
        if (magicState?.active) {
            setActiveTab('ai');
        }
    }, [magicState?.active]);

    // Handle Note Creation
    const handleCreateNote = () => {
        const newNote: Note = {
            id: crypto.randomUUID(),
            bookId,
            chapterId: activeChapterId,
            content: '', // Empty start for editing
            createdAt: Date.now()
        };
        addNote(newNote);
        // Ideally scroll to top of list or new note
    };

    const filteredNotes = notes.filter((n: Note) => {
        return n.content.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Helper: Get Active Chapter Text
    const activeChapter = book?.content?.find((c: any) => c.id === activeChapterId);
    const activeChapterText = activeChapter ? activeChapter.body : '';

    // Sync Scroll
    useEffect(() => {
        if (activeTab !== 'notes' || !containerRef.current) return;
        const firstNoteForChapter = filteredNotes.find((n: Note) => n.chapterId === activeChapterId);
        if (firstNoteForChapter) {
            const noteEl = document.getElementById(`note-${firstNoteForChapter.id}`);
            if (noteEl) {
                const container = containerRef.current;
                const top = noteEl.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
                container.scrollTo({ top: top - 20, behavior: 'smooth' });
            }
        }
    }, [activeChapterId, activeTab, filteredNotes]);

    return (
        <aside className="hidden xl:flex flex-col w-[350px] sticky top-[60px] h-[calc(100vh-60px)] border-l border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 backdrop-blur-xl">

            {/* 1. Sticky Header */}
            <div className="shrink-0 bg-white/80 dark:bg-black/50 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-10">

                {/* Tabs */}
                <div className="p-3">
                    <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'notes'
                                ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <PenLine size={13} /> 笔记
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'ai'
                                ? 'bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-gray-400 hover:text-amber-500/70'
                                }`}
                        >
                            <Sparkles size={13} /> 助手
                        </button>
                        <button
                            onClick={() => setActiveTab('graph')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'graph'
                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-400 hover:text-blue-500/70'
                                }`}
                        >
                            <Share2 size={13} /> 图谱
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                {activeTab === 'notes' && (
                    <div className="px-4 pb-3 flex items-center justify-between">
                        {/* Search */}
                        <div className={`relative flex items-center transition-all duration-300 ${isSearchOpen ? 'w-full' : 'w-auto'}`}>
                            {isSearchOpen ? (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="搜索笔记..."
                                    className="w-full bg-gray-100 dark:bg-white/5 text-xs px-2 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                />
                            ) : (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                                >
                                    <Search size={14} />
                                </button>
                            )}
                        </div>

                        {/* Actions (Add Note replacement) */}
                        {!isSearchOpen && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleCreateNote}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Add Note"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Content Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 flex flex-col">
                {activeTab === 'ai' ? (
                    <AIAssistant bookId={bookId} chapterId={activeChapterId} />
                ) : activeTab === 'graph' ? (
                    <ConceptMap book={book} chapterText={activeChapterText} />
                ) : (
                    <div className="p-4 space-y-4 pb-4">
                        {filteredNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <BookOpen size={40} className="mb-4 text-gray-300 dark:text-gray-600" />
                                <p className="text-xs font-serif italic text-gray-400">读书破万卷，下笔如有神</p>
                            </div>
                        ) : (
                            filteredNotes.map(note => (
                                <div id={`note-${note.id}`} key={note.id} className={`transition-opacity duration-300 ${note.chapterId === activeChapterId ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}>
                                    <NoteCard
                                        note={note}
                                        onDelete={deleteNote}
                                        onUpdate={(id, content) => {
                                            updateNote(id, bookId, content);
                                        }}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* 3. Footer Actions (Export & AI Organize) */}
            {activeTab === 'notes' && (
                <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-black/50 backdrop-blur-md z-10 flex gap-3">
                    {/* AI Organize Button (Small) */}
                    <button
                        onClick={() => {
                            setExportAutoRun(true);
                            setIsExportOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-bold text-xs"
                    >
                        <Wand2 size={16} className="text-amber-500" />
                        <span className="hidden sm:inline">AI 整理</span>
                    </button>

                    {/* Export Button (Large) */}
                    <button
                        onClick={() => {
                            setExportAutoRun(false);
                            setIsExportOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 text-xs font-bold"
                    >
                        <Upload size={16} />
                        <span>导出笔记</span>
                    </button>
                </div>
            )}

            {/* Export Modal */}
            <ExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                book={book}
                autoRun={exportAutoRun}
            />
        </aside>
    );
}
