import { useState, useRef, useEffect } from 'react';
import { Trash2, Share2, Sparkles, Clock } from 'lucide-react';
import { type Note } from '../../types';

interface NoteCardProps {
    note: Note;
    onDelete: (id: string, bookId: string) => void;
    onUpdate?: (id: string, content: string) => void;
    onScrollTo?: (note: Note) => void;
}

export default function NoteCard({ note, onDelete, onUpdate, onScrollTo }: NoteCardProps) {
    const [isEditing, setIsEditing] = useState(note.content.trim() === '');
    const [editContent, setEditContent] = useState(note.content);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Extract anchor (quote) vs insight (user note)
    // Heuristic: If content starts with "> ", treat that line as quote
    const parseContent = (text: string) => {
        const lines = text.split('\n');
        let quote = '';
        let insight = text;

        if (lines[0].trim().startsWith('>')) {
            quote = lines[0].replace(/^>\s*/, '').replace(/^"|"$/g, '');
            insight = lines.slice(1).join('\n').trim();
        }

        return { quote, insight };
    };

    const { quote, insight } = parseContent(note.content);

    const handleSave = () => {
        const trimmed = editContent.trim();
        if (trimmed === '' && !quote) {
            // Delete if empty and no quote (user cancelled creation)
            onDelete(note.id, note.bookId);
            return;
        }

        setIsEditing(false);
        if (editContent !== note.content && onUpdate) {
            onUpdate(note.id, editContent);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleSave();
        }
    };

    // Auto resize textarea
    // Auto resize textarea
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [isEditing, editContent]);

    return (
        <div
            className="group relative bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-md hover:border-teal-200 dark:hover:border-teal-900 transition-all duration-300"
            onClick={() => !isEditing && onScrollTo?.(note)}
        >
            {/* Color Strip depending on tag */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${note.tags?.includes('AI Insight') ? 'bg-teal-500' : 'bg-amber-400'}`} />

            <div className="pl-5 pr-4 py-4 flex flex-col gap-3">

                {/* 1. The Anchor (Quote) */}
                {quote && !isEditing && (
                    <div className="text-xs text-gray-500 font-serif italic line-clamp-3 leading-relaxed relative">
                        <span className="absolute -left-3 top-0 text-2xl text-gray-200 dark:text-gray-700 leading-none">“</span>
                        {quote}
                    </div>
                )}

                {/* 2. The Insight (User Note or AI Content) */}
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        className="w-full bg-gray-50 dark:bg-black/50 p-2 rounded text-[15px] font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                ) : (
                    <div
                        className="cursor-text"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >
                        {/* Specialized AI Rendering */}
                        {note.tags?.includes('AI Insight') && insight.includes('【核心隐喻】') ? (
                            <div className="space-y-4">
                                {/* Parse sections */}
                                {(() => {
                                    const defMatch = insight.match(/【核心隐喻】\n([\s\S]*?)(?=\n\n【|$)/);
                                    const ctxMatch = insight.match(/【文化溯源】\n([\s\S]*?)(?=$)/);
                                    const definition = defMatch ? defMatch[1].trim() : '';
                                    const context = ctxMatch ? ctxMatch[1].trim() : '';

                                    // Fallback if parsing fails but tag exists (e.g. legacy notes or partial edits)
                                    if (!definition && !context) return <div className="text-[14px] text-gray-800 dark:text-gray-300">{insight}</div>;

                                    return (
                                        <>
                                            {definition && (
                                                <div className="bg-teal-50/50 dark:bg-teal-900/10 p-3 rounded-lg border border-teal-100/50 dark:border-teal-900/30">
                                                    <div className="flex items-center gap-1.5 mb-2 text-teal-600 dark:text-teal-400">
                                                        <Sparkles size={12} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">核心隐喻</span>
                                                    </div>
                                                    <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-sans">{definition}</p>
                                                </div>
                                            )}

                                            {context && (
                                                <div className="pt-2">
                                                    <div className="flex items-center gap-1.5 mb-2 text-teal-600 dark:text-teal-400 opacity-80">
                                                        <Clock size={12} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">文化溯源</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {context.split('\n').map((line, i) => (
                                                            <div key={i} className="flex gap-2 items-start text-[12px] text-gray-600 dark:text-gray-400">
                                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-teal-400 shrink-0" />
                                                                <span className="leading-relaxed">{line.replace(/^-\s*/, '')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            // Standard User Note Rendering
                            <div className="text-[14px] text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                                {insight || <span className="text-gray-300 italic">Click to add thought...</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Metadata & Actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                            {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        {note.tags?.includes('AI Insight') && (
                            <span className="text-[9px] bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full font-bold">AI</span>
                        )}
                    </div>

                    {/* Hover Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0 duration-200">
                        <button
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Share"
                        >
                            <Share2 size={13} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(note.id, note.bookId);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
