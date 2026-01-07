import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Copy, Sparkles, Loader2, FileText, Check, Quote, MessageSquare, User, Calendar } from 'lucide-react';
import { generateMarkdown, downloadMarkdown } from '../../services/export';
import type { ExportPlatform, ExportStyle } from '../../services/export';
import { useAppContext } from '../../contexts/AppContext';
import { streamCompletion } from '../../services/ai';
import type { ChatMessage } from '../../services/ai';
import type { Book } from '../../types';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    book: Book | null;
    autoRun?: boolean;
}

export default function ExportModal({ isOpen, onClose, book, autoRun }: ExportModalProps) {
    const { getNotes, getHighlights, aiConfig } = useAppContext();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [showToast, setShowToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

    // Editable Content State
    const [aiSummary, setAiSummary] = useState('');


    const [keywords, setKeywords] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    // Export Configuration
    const [platform, setPlatform] = useState<ExportPlatform>('notion');
    const [style, setStyle] = useState<ExportStyle>('detailed');
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [includeAiSummary, setIncludeAiSummary] = useState(true);
    const [includeNotes, setIncludeNotes] = useState(true);
    const [includeHighlights, setIncludeHighlights] = useState(true);

    // Auto-resize textarea effect
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scrollHeight
        }
    }, [aiSummary, includeAiSummary]);

    const notes = book ? getNotes(book.id) : [];
    const highlights = book ? getHighlights(book.id) : [];

    // Init Logic
    useEffect(() => {
        if (isOpen && book) {
            // 1. Auto Tags
            if (keywords.length === 0) {
                const newTags = ['阅读笔记'];
                // if (book.category) newTags.push(book.category); // Removed since type might be missing
                setKeywords(newTags);
            }

            // 2. Auto AI Trigger
            if (autoRun && !aiSummary && !isGenerating) {
                // Slight delay to allow modal animation to start
                const timer = setTimeout(() => {
                    handleGenerateAI();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, book, autoRun]);

    // Toast Timer
    useEffect(() => {
        if (showToast.visible) {
            const timer = setTimeout(() => {
                setShowToast(prev => ({ ...prev, visible: false }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showToast.visible]);

    const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
        setShowToast({ visible: true, message: msg, type });
    };

    // Tag Management
    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!keywords.includes(tagInput.trim())) {
                setKeywords([...keywords, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setKeywords(keywords.filter(k => k !== tag));
    };

    // AI Generation (Real)
    const handleGenerateAI = async () => {
        if (!book) return;
        // if (!aiConfig.apiKey) check removed (BFF Architecture)


        setIsGenerating(true);
        setAiSummary(''); // Clear previous

        try {
            const contextText = `
Book: ${book.title}
Author: ${book.author}
User Highlights:
${highlights.slice(0, 20).join('\n')}
User Notes:
${notes.slice(0, 20).map(n => n.content).join('\n')}
            `.trim();

            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are an insightful reading assistant. Summarize the user\'s reading highlights and notes into a concise, reflective summary (approx 200 words). Focus on the core themes resonated with the user. Use Chinese.' },
                { role: 'user', content: contextText }
            ];

            await streamCompletion(messages, aiConfig, (chunk) => {
                setAiSummary(prev => prev + chunk.content);
            });

        } catch (e: any) {
            console.error(e);
            showNotification('AI 生成失败: ' + e.message, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExport = () => {
        if (!book) return;

        // Backlink URL
        const backlinkUrl = `${window.location.origin}/book/${book.id}`;

        const finalMarkdown = generateMarkdown(book, notes, highlights, {
            platform,
            style,
            includeMetadata,
            includeAiSummary: includeAiSummary && !!aiSummary,
            includeNotes,
            includeHighlights,
            includeBacklink: true,
            aiSummary: aiSummary,
            keywords: keywords,
            backlinkUrl
        });

        if (platform === 'clipboard') {
            navigator.clipboard.writeText(finalMarkdown).then(() => {
                showNotification('已复制到剪贴板', 'success');
            }).catch(() => {
                showNotification('复制失败', 'error');
            });
        } else {
            downloadMarkdown(`${book.title}_export`, finalMarkdown);
            showNotification('导出文件已下载', 'success');
        }
    };

    if (!isOpen) return null;

    // Loading State
    if (!book) {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-[#FEFAF6] dark:bg-gray-900 rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={32} />
                    <p className="text-gray-500 text-sm">正在准备导出数据...</p>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 font-sans selection:bg-amber-100 selection:text-amber-900">
            {/* Toast Notification */}
            {showToast.visible && (
                <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${showToast.type === 'success' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-red-500 text-white'}`}>
                    {showToast.type === 'success' ? <Check size={16} /> : <X size={16} />}
                    <span className="text-sm font-bold">{showToast.message}</span>
                </div>
            )}

            {/* Modal Container */}
            <div className="bg-[#FEFAF6] dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden border border-amber-100/50 dark:border-gray-800 ring-1 ring-black/5">

                {/* LEFT: Settings Panel */}
                <div className="w-[300px] shrink-0 border-r border-amber-100 dark:border-gray-800 bg-white/60 dark:bg-black/20 backdrop-blur-md flex flex-col">
                    {/* Header */}
                    <div className="p-5 border-b border-amber-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-sm">
                                <FileText size={18} />
                            </span>
                            导出配置
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                        {/* Platform */}
                        <div>
                            <SectionTitle>目标平台</SectionTitle>
                            <div className="space-y-2">
                                <RadioOption active={platform === 'notion'} onClick={() => setPlatform('notion')} icon="N" label="Notion" />
                                <RadioOption active={platform === 'obsidian'} onClick={() => setPlatform('obsidian')} icon="💎" label="Obsidian" />
                                <RadioOption active={platform === 'clipboard'} onClick={() => setPlatform('clipboard')} icon="📋" label="Copy Text" />
                            </div>
                        </div>

                        {/* Filters */}
                        <div>
                            <SectionTitle>包含内容</SectionTitle>
                            <div className="space-y-2">
                                <Checkbox label="封面与元数据" checked={includeMetadata} onChange={setIncludeMetadata} />
                                <Checkbox label="AI 全书摘要" checked={includeAiSummary} onChange={setIncludeAiSummary} />
                                <Checkbox label="章节目录分组" checked={true} disabled />
                                <div className="pt-2 border-t border-amber-100 dark:border-gray-800 mt-2">
                                    <Checkbox label={`我的笔记 (${notes.length})`} checked={includeNotes} onChange={setIncludeNotes} />
                                    <Checkbox label={`原文高亮 (${highlights.length})`} checked={includeHighlights} onChange={setIncludeHighlights} />
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <SectionTitle>标签 (Tags)</SectionTitle>
                            <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
                                {keywords.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-xs font-medium rounded-md flex items-center gap-1 group">
                                        #{tag}
                                        <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-amber-900 dark:hover:text-amber-300 transition-opacity"><X size={10} /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="输入标签按回车..."
                                className="w-full bg-white dark:bg-white/5 border border-amber-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/50 outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>

                        {/* Formatting */}
                        <div>
                            <SectionTitle>排版风格</SectionTitle>
                            <div className="flex bg-white/50 dark:bg-black/20 p-1 rounded-lg border border-amber-100 dark:border-gray-800">
                                <button onClick={() => setStyle('minimal')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${style === 'minimal' ? 'bg-white dark:bg-white/10 text-amber-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>简约列表</button>
                                <button onClick={() => setStyle('detailed')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${style === 'detailed' ? 'bg-white dark:bg-white/10 text-amber-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>详细卡片</button>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-amber-100 dark:border-gray-800 bg-white/40 dark:bg-transparent">
                        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            <input type="checkbox" className="rounded text-amber-500 focus:ring-amber-500 border-gray-300" />
                            记住我的选择
                        </label>
                    </div>
                </div>

                {/* RIGHT: Live Preview */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1a1a1a] relative">
                    {/* Header */}
                    <div className="h-14 px-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md z-10 sticky top-0">
                        <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">预览: {platform === 'notion' ? 'Notion 样式' : platform === 'obsidian' ? 'Obsidian 样式' : '纯文本'}</span>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Canvas - Flat Scroll Container */}
                    <div className="flex-1 overflow-y-auto flex justify-center custom-scrollbar scroll-smooth bg-white dark:bg-[#1a1a1a]">
                        <div className="w-full max-w-[850px] p-10 pb-20 text-gray-800 dark:text-gray-200 transition-all font-serif">
                            {/* ... Content ... */}
                            {includeMetadata && (
                                <div className="mb-10 group relative">
                                    <div className="h-44 w-full bg-gradient-to-r from-[#FDE6E0] to-[#E3F2FD] dark:from-amber-900/40 dark:to-blue-900/40 rounded-lg mb-8 opacity-90 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-900/20 dark:text-amber-100/20 font-serif text-3xl italic">
                                        Reading Output
                                    </div>
                                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 leading-tight tracking-tight">{book.title}</h1>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 font-sans">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-white/5 rounded border border-gray-100 dark:border-white/5"><User size={14} /><span>{book.author}</span></div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-white/5 rounded border border-gray-100 dark:border-white/5"><Calendar size={14} /><span>{new Date().toLocaleDateString()}</span></div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30 text-amber-600"><span>⭐⭐⭐⭐⭐</span></div>
                                    </div>
                                    <hr className="border-gray-100 dark:border-gray-800" />
                                </div>
                            )}

                            {/* AI Summary UI */}
                            {includeAiSummary && (
                                <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex gap-4 p-5 bg-[#F9F9F9] dark:bg-white/5 rounded-lg border-l-4 border-amber-400 dark:border-amber-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                                        <div className="shrink-0 mt-0.5">
                                            {isGenerating ? <Loader2 size={20} className="animate-spin text-amber-500" /> : <Sparkles size={20} className="text-amber-500 fill-amber-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white font-sans">AI 核心摘要</span>
                                                <button onClick={handleGenerateAI} className="text-[10px] text-gray-400 hover:text-amber-500 flex items-center gap-1 font-sans bg-white dark:bg-black/40 px-2 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                                                    <Sparkles size={10} /> {aiSummary || isGenerating ? '重新生成' : '点击生成'}
                                                </button>
                                            </div>
                                            <textarea ref={textareaRef} value={aiSummary} onChange={(e) => setAiSummary(e.target.value)} placeholder={isGenerating ? "正在生成摘要中..." : "点击上方按钮生成摘要，或在此直接输入..."} className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm leading-relaxed text-gray-700 dark:text-gray-300 resize-none overflow-hidden min-h-[80px] font-serif placeholder:text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <div className="space-y-8">
                                <h2 className="text-xl font-bold border-b border-gray-100 dark:border-gray-800 pb-2 mb-6 text-gray-900 dark:text-white">我的笔记</h2>
                                {(includeNotes || includeHighlights) && (
                                    <div className="space-y-6">
                                        <PreviewList notes={notes} highlights={highlights} style={style} includeNotes={includeNotes} includeHighlights={includeHighlights} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-sm flex justify-end gap-3 z-20 sticky bottom-0">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 font-bold text-sm transition-colors">取消</button>
                        <button onClick={handleExport} className="px-8 py-2.5 rounded-xl bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                            {platform === 'clipboard' ? <Copy size={16} /> : <Download size={16} />}
                            {platform === 'clipboard' ? '复制文本' : `导出到 ${platform === 'notion' ? 'Notion' : 'Obsidian'}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Sub Components
function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-xs font-bold text-amber-900/40 dark:text-gray-500 uppercase tracking-wider mb-3">{children}</h3>;
}
function RadioOption({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${active ? 'bg-white dark:bg-white/5 border-amber-500 shadow-sm ring-1 ring-amber-500/20' : 'bg-white/40 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-white/10 hover:shadow-sm'}`}>
            <span className="text-lg w-6 h-6 flex items-center justify-center">{icon}</span>
            <span className={`text-sm font-bold ${active ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
            {active && <Check size={16} className="ml-auto text-amber-500" />}
        </button>
    );
}
function Checkbox({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
    return (
        <label className={`flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/60 dark:hover:bg-white/5'}`}>
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${checked ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent'}`}>
                {checked && <Check size={10} strokeWidth={4} />}
            </div>
            <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange && onChange(e.target.checked)} disabled={disabled} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </label>
    );
}
function PreviewList({ notes, highlights, style, includeNotes, includeHighlights }: any) {
    return (
        <div className="space-y-8">
            {includeHighlights && highlights.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Quote size={12} /> 原文高亮</h4>
                    <div className="space-y-4">
                        {highlights.map((h: string, i: number) => (
                            <div key={i} className={`p-4 rounded-xl group transition-shadow ${style === 'detailed' ? 'bg-white dark:bg-white/5 border border-amber-100 dark:border-amber-900/30 hover:shadow-md' : 'border-l-2 border-gray-300 dark:border-gray-600 pl-4 bg-transparent'}`}>
                                <p className="text-sm text-gray-800 dark:text-gray-200 font-serif leading-relaxed italic">"{h}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {includeNotes && notes.length > 0 && (
                <div className="mt-8">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageSquare size={12} /> 个人想法</h4>
                    <div className="space-y-4">
                        {notes.map((n: any) => (
                            <div key={n.id} className="group">
                                {style === 'detailed' ? (
                                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-gray-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{n.content}</p>
                                        <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-2"><span>{new Date(n.createdAt).toLocaleString()}</span></div>
                                    </div>
                                ) : (
                                    <li className="text-sm text-gray-700 dark:text-gray-300 list-disc ml-4 pl-1">{n.content} <span className="text-gray-400 text-xs">- {new Date(n.createdAt).toLocaleDateString()}</span></li>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
