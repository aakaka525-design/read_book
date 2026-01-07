import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../constants/config';
import { Sparkles, Send, ThumbsUp, ThumbsDown, Bot, User, Settings as SettingsIcon, Save, BookOpen, Search, MessageCircle, Trash2 } from 'lucide-react';
import BentoCard from './BentoCard';
import { useAppContext } from '../../contexts/AppContext';
import { streamCompletion, type ChatMessage } from '../../services/ai';
import {
    chunkBookContent, retrieveRelevantChunks, formatContextForLLM, buildRAGSystemPrompt,
    type TextChunk, type SemanticChunk, indexChunksWithEmbeddings, semanticSearch
} from '../../services/rag';

// Enhanced Message interface to store citation source data
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string; // New field for thinking process
    isStreaming?: boolean;
    citations?: TextChunk[]; // Store the actual chunks used
    activeCitationId?: string; // For syncing UI state if needed
}

const PRESET_PROMPTS = [
    { id: 'summary', text: '总结本章主要内容' },
    { id: 'character', text: '分析主角的性格特点' },
    { id: 'quotes', text: '摘录书中关于人生、命运的感人句子' }
];

export default function AIAssistant({ bookId, chapterId: _chapterId }: { bookId: string; chapterId: string }) {
    const { aiConfig, setAiConfig, currentBook, scrollToCitation, magicState, setMagicState } = useAppContext();

    const [messages, setMessages] = useLocalStorage<Message[]>(
        `${STORAGE_KEYS.CHAT_HISTORY_PREFIX}${bookId}`,
        [{ id: 'welcome', role: 'assistant', content: '我是您的智能阅读助手。我已阅读全书，您可以问我任何关于本书的问题。' }]
    );
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // RAG State
    const [chunks, setChunks] = useState<TextChunk[]>([]);
    const [semanticChunks, setSemanticChunks] = useState<SemanticChunk[]>([]);
    const [isIndexing, setIsIndexing] = useState(false);
    const [isSemanticIndexing, setIsSemanticIndexing] = useState(false);
    const [semanticProgress, setSemanticProgress] = useState({ current: 0, total: 0 });

    // Search Mode State
    const [searchMode, setSearchMode] = useState<'chat' | 'search'>('chat');
    const [searchResults, setSearchResults] = useState<{ chunk: TextChunk; score: number }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [thinkingStep, setThinkingStep] = useState<'idle' | 'searching' | 'reading' | 'thinking'>('idle');

    // Citation Viewer State
    const [activeCitation, setActiveCitation] = useState<{ chunk: TextChunk, messageId: string } | null>(null);

    // Initial Indexing
    useEffect(() => {
        if (currentBook && chunks.length === 0) {
            setIsIndexing(true);


            // Check if content exists
            if (!currentBook.content || currentBook.content.length === 0) {
                console.error('[RAG] ERROR: No content in book!');
                setIsIndexing(false);
                return;
            }

            setTimeout(async () => {
                try {
                    const newChunks = await chunkBookContent(currentBook.content as any);
                    setChunks(newChunks);

                } catch (e) {
                    console.error('[RAG] Indexing failed:', e);
                } finally {
                    setIsIndexing(false);
                }
            }, 100);
        }
    }, [currentBook]);

    // Config State
    const [tempConfig, setTempConfig] = useState(aiConfig);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (showSettings) setTempConfig(aiConfig);
    }, [showSettings, aiConfig]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, activeCitation]);


    // Magic Contextual AI Logic (Top-level Effect)
    useEffect(() => {
        if (magicState.active && magicState.status === 'loading') {
            const fetchContext = async () => {
                // Wait for animation to start
                await new Promise(resolve => setTimeout(resolve, 800));

                let definition = "";
                let keyPoints: string[] = [];

                try {
                    let fullResponse = '';
                    await streamCompletion([
                        {
                            role: 'system',
                            content: `You are a profound literature expert. 
                            Analyze the selected text deeply but concisely.
                            
                            STRICT OUTPUT FORMAT(JSON ONLY):
{
    "insight": "A single profound insight sentence in Chinese (Simplified).",
        "keyPoints": [
            "Key point 1 (History/Theme) in Chinese",
            "Key point 2 in Chinese",
            "Key point 3 in Chinese"
        ]
}
                            
                            Do not output markdown code blocks.Just the raw JSON.
                            STRICT RULE: CHINESE ONLY.`
                        },
                        { role: 'user', content: magicState.selectedText }
                    ], aiConfig, (chunk) => {
                        fullResponse += chunk.content; // Only use content for magic definition
                    });

                    // Robust JSON Parse
                    try {
                        // Try to find the first JSON object in the text
                        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
                        const jsonStr = jsonMatch ? jsonMatch[0] : fullResponse;
                        const parsed = JSON.parse(jsonStr);

                        // Force to string to prevent "Cannot convert object to primitive value"
                        const rawDef = parsed.insight || parsed.definition || '';
                        definition = typeof rawDef === 'string' ? rawDef : JSON.stringify(rawDef);

                        const rawKP = parsed.keyPoints || parsed.history || [];
                        keyPoints = Array.isArray(rawKP) ? rawKP.map(p => String(p)) : [String(rawKP)];
                    } catch (e) {
                        console.error("JSON Parse failed, falling back to text", fullResponse);
                        // Fallback to text parsing if JSON fails
                        const lines = fullResponse.split('\n').filter(l => l.trim());
                        if (lines.length > 0) {
                            definition = lines[0];
                            // Try to extract lines that look like keypoints (start with -, *, or digit)
                            const potentialPoints = lines.slice(1).filter(l => /^[-\*•\d]/.test(l));
                            if (potentialPoints.length > 0) {
                                keyPoints = potentialPoints.map(l => l.replace(/^[-\*•\d\.]+\s*/, '')).slice(0, 3);
                            } else {
                                keyPoints = lines.slice(1).slice(0, 3);
                            }
                        }
                    }

                } catch (e) {
                    definition = "无法连接 AI 服务，请检查设置。";
                    keyPoints = ["检查网络连接", "确认服务端配置", "尝试重试"];
                }

                setMagicState({
                    status: 'success',
                    data: {
                        definition,
                        keyPoints,
                        history: [] // Legacy field, kept for type safety if needed
                    }
                });
            };

            fetchContext();
        }
    }, [magicState.active, magicState.status, magicState.selectedText, aiConfig, setMagicState]);



    const handleSaveConfig = () => {
        setAiConfig(tempConfig);
        setShowSettings(false);
    };



    // ... [Inside handleSend] ...

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        // User Message
        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        setThinkingStep('searching'); // Start searching

        const aiMsgId = (Date.now() + 1).toString();
        let citations: TextChunk[] = [];

        try {
            // Simulate Search Delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));
            setThinkingStep('reading');

            // 1. RAG Retrieval
            let systemContent = `You are a helpful reading assistant.The user is reading a book(ID: ${bookId}).`;

            if (chunks.length > 0) {
                const results = retrieveRelevantChunks(text, chunks);
                citations = results.map(r => r.chunk);
                const context = formatContextForLLM(results);
                systemContent = buildRAGSystemPrompt(currentBook?.title || 'Book', context);

            }

            // Simulate Reading Delay for UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            setThinkingStep('thinking');

            // Set initial state with citations
            setMessages(prev => [...prev, {
                id: aiMsgId,
                role: 'assistant',
                content: '',
                isStreaming: true,
                citations: citations
            }]);

            // Wait for state update to propagate
            await new Promise(resolve => setTimeout(resolve, 100));

            const chatMessages: ChatMessage[] = [
                { role: 'system', content: systemContent },
                ...messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: text }
            ];

            // 2. LLM Streaming
            let fullContent = '';
            let fullReasoning = '';

            // Abort previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            await streamCompletion(
                chatMessages,
                aiConfig,
                (chunk) => {
                    fullContent += chunk.content;
                    if (chunk.reasoning) {
                        fullReasoning += chunk.reasoning;
                    }

                    setMessages(prev => prev.map(m =>
                        m.id === aiMsgId ? {
                            ...m,
                            content: fullContent,
                            reasoning: fullReasoning
                        } : m
                    ));
                    // Once first chunk arrives, we are done "thinking" visually, but still "typing"
                    setThinkingStep('idle');
                },
                () => {
                    setIsTyping(false);
                    setThinkingStep('idle');
                    setMessages(prev => prev.map(m =>
                        m.id === aiMsgId ? { ...m, isStreaming: false } : m
                    ));
                    abortControllerRef.current = null;
                },
                controller.signal
            );
        } catch (e: any) {
            setIsTyping(false);
            setThinkingStep('idle');
            const message = e?.message || 'Unknown AI error';
            setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: 'Error connecting to AI service: ' + message, isStreaming: false } : m
            ));
        }
    };

    // Semantic Search Handler
    const handleSemanticSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchResults([]);
        setInput('');

        try {
            // Check if we have semantic chunks indexed
            let chunksToSearch = semanticChunks;

            if (semanticChunks.length === 0 && chunks.length > 0) {
                setIsSemanticIndexing(true);
                const indexed = await indexChunksWithEmbeddings(
                    chunks,
                    aiConfig,
                    bookId,
                    (current: number, total: number) => setSemanticProgress({ current, total })
                );
                setSemanticChunks(indexed);
                setIsSemanticIndexing(false);
                chunksToSearch = indexed; // Use the indexed result directly!
            }

            // Perform semantic search
            const results = await semanticSearch(query, chunksToSearch, aiConfig, 8);
            setSearchResults(results);

        } catch (e) {
            console.error('[Semantic] Search failed:', e);
        } finally {
            setIsSearching(false);
        }
    };

    // --- Magic Contextual AI Logic ---
    // (Hook moved to top level)




    // If Magic Mode is active, override user interface
    if (magicState.active) {
        return (
            <div className="absolute inset-0 z-50 p-4">
                <BentoCard
                    data={magicState.data || { definition: '', history: [], keyPoints: [] }}
                    isLoading={magicState.status === 'loading'}
                    bookInfo={currentBook || undefined}
                    anchorText={magicState.selectedText}
                    bookId={bookId}
                    chapterId={_chapterId}
                />
                <button
                    onClick={() => setMagicState({ active: false })}
                    className="fixed bottom-4 right-4 bg-gray-900/80 text-white px-3 py-1 text-xs rounded-full backdrop-blur-md hover:bg-black transition-colors"
                >
                    Close Magic Mode
                </button>
            </div>
        );
    }

    if (showSettings) {
        return (
            <div className="flex flex-col h-full bg-[var(--bg-paper)] p-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <SettingsIcon size={18} /> AI Settings
                    </h2>
                    <button onClick={() => setShowSettings(false)} className="text-secondary hover:text-primary">Cancel</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">API Endpoint (Proxy)</label>
                        <input
                            className="w-full bg-[var(--bg-body)] rounded-lg p-3 text-sm border border-[var(--border-color)]"
                            value={tempConfig.baseUrl}
                            onChange={e => setTempConfig({ ...tempConfig, baseUrl: e.target.value })}
                            placeholder="/api"
                        />
                    </div>
                    {/* API Key Managed by Server */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Model Name</label>
                        <input
                            className="w-full bg-[var(--bg-body)] rounded-lg p-3 text-sm border border-[var(--border-color)]"
                            value={tempConfig.model}
                            onChange={e => setTempConfig({ ...tempConfig, model: e.target.value })}
                            placeholder="gpt-3.5-turbo"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">Embedding Model (语义搜索)</label>
                        <input
                            className="w-full bg-[var(--bg-body)] rounded-lg p-3 text-sm border border-[var(--border-color)]"
                            value={tempConfig.embeddingModel || 'text-embedding-3-small'}
                            onChange={e => setTempConfig({ ...tempConfig, embeddingModel: e.target.value })}
                            placeholder="text-embedding-3-small"
                        />
                    </div>

                    <button
                        onClick={handleSaveConfig}
                        className="w-full py-3 bg-[var(--accent-color)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-4"
                    >
                        <Save size={16} /> Save Configuration
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            <button
                onClick={() => setShowSettings(true)}
                className="absolute top-2 right-4 z-10 p-2 text-secondary hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all"
                title="AI Settings"
            >
                <SettingsIcon size={16} />
            </button>

            {/* Messages Area */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 pt-10 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-black/20">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} group relative`}>
                        {/* Avatar */}
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                            ${msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-lg shadow-teal-500/20'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            }
                        `}>
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                        </div>

                        {/* Content Container */}
                        <div className={`max-w-[85%] text-sm leading-relaxed ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>

                            {/* User Message: Low Saturation Card */}
                            {msg.role === 'user' && (
                                <div className="bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 px-4 py-2.5 rounded-2xl rounded-tr-none inline-block text-left">
                                    {msg.content}
                                    {!msg.isStreaming && (
                                        <button
                                            onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                                            className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="删除"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* AI Message: Clean Accent Line Style */}
                            {msg.role === 'assistant' && (
                                <div className="pl-4 border-l-2 border-teal-400 dark:border-teal-500/50">
                                    {/* Thinking Process (Collapsible) */}
                                    {msg.reasoning && (
                                        <details className="mb-2 group">
                                            <summary className="text-[10px] text-gray-400 dark:text-gray-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-teal-500 transition-colors">
                                                <span className="transform transition-transform group-open:rotate-90">›</span>
                                                <span>深度思考过程</span>
                                            </summary>
                                            <div className="mt-2 pl-2 border-l-2 border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap font-mono bg-gray-50/50 dark:bg-black/20 p-2 rounded">
                                                {msg.reasoning}
                                            </div>
                                        </details>
                                    )}

                                    {/* Content with Citation Parsing */}
                                    <div className="text-gray-800 dark:text-gray-100/90 whitespace-pre-wrap font-sans">
                                        {msg.content.split(/(【引用 \d+】)/g).map((part, i) => {
                                            const match = part.match(/【引用 (\d+)】/);
                                            if (match && msg.citations) {
                                                const index = parseInt(match[1]) - 1;
                                                const citation = msg.citations[index];
                                                if (citation) {
                                                    return (
                                                        <sup
                                                            key={i}
                                                            onMouseEnter={() => { /* Potential: Trigger Highlight Preview */ }}
                                                            onClick={() => setActiveCitation({ chunk: citation, messageId: msg.id })}
                                                            className="cursor-pointer mx-0.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline hover:text-teal-500 transition-colors"
                                                            title={`来源：${citation.chapterTitle}`}
                                                        >
                                                            [{index + 1}]
                                                        </sup>
                                                    );
                                                }
                                            }
                                            return part;
                                        })}
                                    </div>

                                    {/* Streaming Cursor */}
                                    {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-teal-500 animate-pulse ml-1 align-middle"></span>}

                                    {/* Feedback Actions & Tools */}
                                    {!msg.isStreaming && (
                                        <div className="flex gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {msg.role === 'assistant' && (
                                                <>
                                                    <button className="text-gray-400 hover:text-teal-500 transition-colors" title="有帮助"><ThumbsUp size={12} /></button>
                                                    <button className="text-gray-400 hover:text-red-500 transition-colors" title="没帮助"><ThumbsDown size={12} /></button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                                                className="text-gray-400 hover:text-red-600 transition-colors ml-auto"
                                                title="删除此消息"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Active Citation Preview Box (Kept same logic, just positioned) */}
                            {activeCitation && activeCitation.messageId === msg.id && (
                                <div className="mt-4 text-left">
                                    <div className="p-3 bg-teal-50/50 dark:bg-teal-900/10 rounded-lg border border-teal-100 dark:border-teal-900/30 text-xs text-secondary animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-[10px] uppercase tracking-wider opacity-70 flex items-center gap-1">
                                                <BookOpen size={10} /> 来源：{activeCitation.chunk.chapterTitle}
                                            </span>
                                            <button onClick={() => setActiveCitation(null)} className="hover:text-primary">✕</button>
                                        </div>

                                        {/* Quote Extraction Logic reused */}
                                        {(() => {
                                            const citationIndex = msg.citations?.indexOf(activeCitation.chunk) ?? -1;
                                            const citationMarker = `【引用 ${citationIndex + 1}】`;
                                            const markerPos = msg.content.indexOf(citationMarker);
                                            let quotedText = '';

                                            // Simple heuristic again
                                            if (markerPos > 0) {
                                                const beforeMarker = msg.content.slice(0, markerPos);
                                                const quotes = [...beforeMarker.matchAll(/「([^」]+)」/g)];
                                                if (quotes.length > 0) quotedText = quotes[quotes.length - 1][1];
                                            }

                                            return quotedText ? (
                                                <div className="italic leading-relaxed mb-3 p-2 bg-white/60 dark:bg-black/20 rounded border-l-2 border-teal-300">
                                                    「{quotedText}」
                                                </div>
                                            ) : null;
                                        })()}

                                        <button
                                            onClick={() => {
                                                const textToFind = activeCitation.chunk.content.slice(0, 50); // Fallback logic needs to be robust but keeping simple for now
                                                scrollToCitation(activeCitation.chunk.chapterId, textToFind);
                                                setActiveCitation(null);
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 rounded-md text-[11px] font-bold hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                                        >
                                            跳转阅读原文 ↗
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isIndexing && (
                    <div className="flex justify-center my-2">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                            <Sparkles size={10} className="animate-spin" /> Indexing Book Content...
                        </div>
                    </div>
                )}

                {isTyping && thinkingStep !== 'idle' && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl px-4 py-3 text-xs text-secondary flex flex-col gap-2 min-w-[200px]">
                            {/* Step 1: Search */}
                            <div className={`flex items-center gap-2 transition-all duration-300 ${thinkingStep === 'searching' ? 'opacity-100 text-blue-500 font-bold' : 'opacity-40'}`}>
                                <Search size={12} className={thinkingStep === 'searching' ? 'animate-bounce' : ''} />
                                <span>{thinkingStep === 'searching' ? '正在检索相关章节...' : '检索完成'}</span>
                            </div>

                            {/* Step 2: Read */}
                            {(thinkingStep === 'reading' || thinkingStep === 'thinking') && (
                                <div className={`flex items-center gap-2 transition-all duration-300 ${thinkingStep === 'reading' ? 'opacity-100 text-amber-500 font-bold' : 'opacity-40'}`}>
                                    <BookOpen size={12} className={thinkingStep === 'reading' ? 'animate-pulse' : ''} />
                                    <span>{thinkingStep === 'reading' ? '正在阅读关键段落...' : '阅读完成'}</span>
                                </div>
                            )}

                            {/* Step 3: Think */}
                            {thinkingStep === 'thinking' && (
                                <div className="flex items-center gap-2 text-purple-500 font-bold animate-in slide-in-from-left-2">
                                    <Sparkles size={12} className="animate-spin" />
                                    <span>正在整理回答...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Intro Capsules */}
                {messages.length === 1 && !isIndexing && (
                    <div className="grid grid-cols-1 gap-2 mt-8">
                        {PRESET_PROMPTS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => handleSend(p.text)}
                                className="text-left p-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5 transition-all text-xs text-secondary hover:text-[var(--text-primary)] flex items-center justify-between group"
                            >
                                <span>{p.text}</span>
                                <Send size={12} className="opacity-0 group-hover:opacity-100 transition-opacity transform -rotate-45 group-hover:rotate-0" />
                            </button>
                        ))}
                    </div>
                )}

            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-paper)]">
                {/* Mode Toggle Tabs */}
                <div className="flex gap-1 mb-3 p-1 bg-[var(--bg-body)] rounded-lg">
                    <button
                        onClick={() => setSearchMode('chat')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${searchMode === 'chat'
                            ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--text-primary)]'
                            : 'text-secondary hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <MessageCircle size={12} /> 问答
                    </button>
                    <button
                        onClick={() => setSearchMode('search')}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${searchMode === 'search'
                            ? 'bg-white dark:bg-gray-800 shadow-sm text-[var(--text-primary)]'
                            : 'text-secondary hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <Search size={12} /> 语义搜索
                    </button>
                </div>

                {/* Semantic Indexing Progress */}
                {isSemanticIndexing && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-amber-600">
                        <Sparkles size={12} className="animate-spin" />
                        <span>正在构建语义索引... {semanticProgress.current}/{semanticProgress.total}</span>
                    </div>
                )}

                {/* Search Results (only in search mode) */}
                {searchMode === 'search' && searchResults.length > 0 && (
                    <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                        <div className="text-xs text-secondary mb-2">找到 {searchResults.length} 个相关段落：</div>
                        {searchResults.map((result) => (
                            <button
                                key={result.chunk.id}
                                onClick={() => scrollToCitation(result.chunk.chapterId, result.chunk.content.slice(0, 50))}
                                className="w-full text-left p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-amber-600">{result.chunk.chapterTitle}</span>
                                    <span className="text-[10px] text-secondary">{(result.score * 100).toFixed(0)}% 匹配</span>
                                </div>
                                <div className="text-xs text-[var(--text-primary)] line-clamp-2">
                                    {result.chunk.content.slice(0, 100)}...
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Searching Indicator */}
                {isSearching && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-blue-600">
                        <Sparkles size={12} className="animate-spin" />
                        <span>语义搜索中...</span>
                    </div>
                )}

                {/* Input */}
                <div className="relative">
                    <input
                        className="w-full bg-[var(--bg-body)] rounded-full pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400"
                        placeholder={
                            searchMode === 'search'
                                ? "输入语义描述，如：关于死亡的感悟..."
                                : "问关于这本书的问题..."
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                searchMode === 'search' ? handleSemanticSearch(input) : handleSend(input);
                            }
                        }}
                    // disabled removed
                    />
                    <button
                        onClick={() => searchMode === 'search' ? handleSemanticSearch(input) : handleSend(input)}
                        disabled={!input.trim()}
                        className={`absolute right-2 top-2 p-1.5 text-white rounded-full hover:opacity-90 disabled:opacity-50 transition-all ${searchMode === 'search' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                    >
                        {searchMode === 'search' ? <Search size={14} /> : <Sparkles size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
