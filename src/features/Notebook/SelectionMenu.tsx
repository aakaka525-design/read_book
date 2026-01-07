import { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, Highlighter } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

export default function SelectionMenu() {
    const { setMagicState, magicState, addHighlight, currentBook } = useAppContext();
    const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    // CRITICAL: Store the Range immediately when text is selected, not when button is clicked
    const capturedRangeRef = useRef<Range | null>(null);

    // Hover State for Fluid Expansion
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Selection Capture
    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
                setIsVisible(false);
                setTimeout(() => setPosition(null), 200);
                capturedRangeRef.current = null; // Clear captured range
                return;
            }

            const text = selection.toString();
            setSelectedText(text);

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // CRITICAL: Clone and store range IMMEDIATELY while selection is still active
            capturedRangeRef.current = range.cloneRange();


            setPosition({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
            setIsVisible(true);
        };

        document.addEventListener('mouseup', handleSelection);
        document.addEventListener('keyup', handleSelection);

        return () => {
            document.removeEventListener('mouseup', handleSelection);
            document.removeEventListener('keyup', handleSelection);
        };
    }, [magicState?.active]);

    const handleHighlight = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedText && currentBook) {
            addHighlight(currentBook.id, selectedText.trim());
            setIsVisible(false);
            capturedRangeRef.current = null;
            window.getSelection()?.removeAllRanges();
        }
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
            setIsVisible(false);
            capturedRangeRef.current = null;
            window.getSelection()?.removeAllRanges();
        }
    };

    const handleMouseEnter = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setIsHovered(true), 150);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        setIsHovered(false);
    };

    const handleMagicTrigger = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!position || !selectedText) return;

        // Use the pre-captured range (captured when text was first selected)
        const rangeToUse = capturedRangeRef.current;


        setMagicState({
            active: true,
            sourceRect: position,
            sourceRange: rangeToUse || undefined, // Use pre-captured range
            selectedText: selectedText,
            status: 'loading',
            data: null
        });

        setIsVisible(false);
        capturedRangeRef.current = null;
        window.getSelection()?.removeAllRanges();
    };

    if (!position) return null;

    return (
        <div
            className={`fixed z-50 flex items-center justify-center transition-all duration-300 ease-out ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
                }`}
            style={{
                top: position.top - 60, // Fixed position above selection
                left: position.left + position.width / 2
            }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div
                className="
                    flex items-center gap-1 p-1 pr-1.5
                    bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl 
                    rounded-full shadow-2xl border border-white/10
                    animate-in fade-in zoom-in-95 duration-200
                "
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Standard Tools */}
                <button
                    onClick={handleHighlight}
                    className="p-2 text-gray-400 hover:text-amber-400 hover:bg-white/10 rounded-full transition-colors"
                    title="Highlight"
                >
                    <Highlighter size={16} />
                </button>

                <button
                    onClick={handleCopy}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    title="Copy"
                >
                    <Copy size={16} />
                </button>

                <div className="w-[1px] h-4 bg-white/20 mx-1 opacity-20" />

                {/* Magic Button with Morphing Width */}
                <button
                    onClick={handleMagicTrigger}
                    className={`
                        group relative flex items-center justify-center overflow-hidden
                        bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500
                        text-white rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                        shadow-lg shadow-amber-500/20
                        ${isHovered ? 'w-[110px] pl-3 pr-4' : 'w-9'} 
                        h-9
                    `}
                >
                    <Sparkles size={16} className={`shrink-0 ${isHovered ? 'animate-pulse' : ''}`} />

                    <span className={`
                        ml-2 text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-500
                        ${isHovered ? 'opacity-100 max-w-[100px] translate-x-0' : 'opacity-0 max-w-0 -translate-x-4'}
                    `}>
                        AI 帮我读
                    </span>
                </button>
            </div>
        </div>
    );
}
