import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Clock, Pin, Share2, Quote } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

interface BentoCardProps {
    data: {
        definition?: string;
        keyPoints?: string[];
        history?: string[];
    };
    isLoading?: boolean;
    bookInfo?: {
        title: string;
        author: string;
    };
    anchorText?: string;
}

const THINKING_STEPS = [
    "分析语义...",
    "检索章节上下文...",
    "正在组织语言...",
    "生成深度解读..."
];

const BentoCard = React.memo(({ data, isLoading, bookInfo, anchorText, bookId, chapterId }: BentoCardProps & { bookId: string; chapterId: string }) => {
    const { addNote } = useAppContext();
    const [thinkingStep, setThinkingStep] = useState(0);
    const [isSaved, setIsSaved] = useState(false);

    // Thinking Animation Loop
    useEffect(() => {
        if (isLoading) {
            setThinkingStep(0);
            const interval = setInterval(() => {
                setThinkingStep(prev => (prev + 1) % THINKING_STEPS.length);
            }, 1200); // Switch every 1.2s
            return () => clearInterval(interval);
        }
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-white/50 dark:border-white/5 overflow-hidden p-6 relative">
                {/* Shimmer Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />

                <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-80">
                    <div className="relative">
                        <Sparkles size={32} className="text-teal-500 animate-spin-slow" />
                        <div className="absolute inset-0 bg-teal-400 blur-xl opacity-30 animate-pulse" />
                    </div>

                    {/* Fade-in text for steps */}
                    <div className="h-6 overflow-hidden relative w-full text-center">
                        {THINKING_STEPS.map((step, idx) => (
                            <div
                                key={idx}
                                className={`absolute inset-0 transition-all duration-500 transform ${idx === thinkingStep
                                    ? 'opacity-100 translate-y-0'
                                    : 'opacity-0 translate-y-4'
                                    }`}
                            >
                                <span className="text-sm font-medium text-teal-600 dark:text-teal-400 tracking-wider">
                                    {step}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const handleCopy = () => {
        const def = typeof data.definition === 'string' ? data.definition : JSON.stringify(data.definition);
        const kp = Array.isArray(data.keyPoints) ? data.keyPoints.join('\n') : String(data.keyPoints);
        navigator.clipboard.writeText(`${anchorText}\n\n【深度解析】\n${def}\n\n【文化溯源】\n${kp}`);
    };

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isSaved) {
            timer = setTimeout(() => setIsSaved(false), 2000);
        }
        return () => clearTimeout(timer);
    }, [isSaved]);

    const handlePin = () => {
        const def = typeof data.definition === 'string' ? data.definition : JSON.stringify(data.definition);
        const kp = Array.isArray(data.keyPoints) ? data.keyPoints.map(p => `- ${p}`).join('\n') : String(data.keyPoints);

        addNote({
            id: crypto.randomUUID(),
            content: `> ${anchorText}\n\n【核心隐喻】\n${def}\n\n【文化溯源】\n${kp}`,
            tags: ['AI Insight'],
            bookId: bookId || 'current',
            chapterId: chapterId || 'current',
            createdAt: Date.now()
        });
        setIsSaved(true);
    };

    return (
        <div id="bento-card-anchor" className="w-full h-full flex flex-col gap-0 select-text animate-in zoom-in-95 duration-500">
            {/* Main Container */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col h-full">

                {/* Segment 1: The Anchor (Quote) - Fixed Header */}
                <div className="shrink-0 relative p-6 bg-stone-50 dark:bg-[#1c1c1e] border-b border-stone-100 dark:border-white/5">
                    {/* Watermark Icon */}
                    <Quote
                        className="absolute top-4 right-4 text-stone-200 dark:text-white/5 opacity-50 transform rotate-180"
                        size={64}
                    />

                    {/* Side decorative bar to match highlight */}
                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-teal-500/50 rounded-r-full" />

                    <div className="relative z-10 pl-3">
                        <div className="font-serif text-lg text-gray-800 dark:text-gray-200 leading-relaxed tracking-wide italic line-clamp-3">
                            “{anchorText || "选中文字以开始解读..."}”
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-serif text-stone-500 dark:text-gray-500">
                            <span className="w-8 h-[1px] bg-stone-300 dark:bg-gray-700"></span>
                            <span>《{bookInfo?.title || "未知书籍"}》</span>
                            <span className="opacity-50">/</span>
                            <span>{bookInfo?.author || "作者"}</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 p-6 space-y-6">
                    {/* Segment 2: The Insight (AI Analysis) */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-teal-500" />
                            <span className="text-xs font-bold text-gray-900 dark:text-white tracking-wider uppercase">核心隐喻</span>
                        </div>
                        <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-loose font-sans">
                            {data.definition}
                        </p>
                    </div>

                    {/* Segment 3: The Context (Culture/History) */}
                    {data.keyPoints && data.keyPoints.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3 pt-4 border-t border-gray-50 dark:border-white/5">
                                <Clock size={16} className="text-teal-600 dark:text-teal-400" />
                                <span className="text-xs font-bold text-gray-900 dark:text-white tracking-wider uppercase">文化溯源</span>
                            </div>
                            <ul className="space-y-3">
                                {data.keyPoints.map((point, i) => {
                                    const parts = point.split(/(\[[^\]]+\])/g);
                                    return (
                                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed flex items-start gap-2">
                                            <span className="mt-2 w-1 h-1 rounded-full bg-teal-500 shrink-0 opacity-50" />
                                            <span>
                                                {parts.map((part, idx) => {
                                                    if (part.startsWith('[') && part.endsWith(']')) {
                                                        return (
                                                            <span key={idx} className="font-bold text-teal-700 dark:text-teal-300 mr-1">
                                                                {part.slice(1, -1)}
                                                            </span>
                                                        );
                                                    }
                                                    return part;
                                                })}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Bottom Actions Bar - Fixed Footer */}
                <div className="shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                    >
                        <Copy size={14} />
                        复制
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        onClick={() => alert("海报生成功能开发中...")}
                    >
                        <Share2 size={14} />
                        生成海报
                    </button>
                    <button
                        onClick={handlePin}
                        disabled={isSaved}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all shadow-sm ${isSaved
                            ? 'bg-teal-500 text-white'
                            : 'text-white bg-gray-900 dark:bg-white dark:text-black hover:opacity-90'
                            }`}
                    >
                        {isSaved ? <Pin size={14} className="fill-current" /> : <Pin size={14} />}
                        {isSaved ? '已保存' : '存入笔记'}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default BentoCard;


