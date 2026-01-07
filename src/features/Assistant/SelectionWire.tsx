import { useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';

const HIGHLIGHT_ID = 'magic-active-highlight';

export default function SelectionWire() {
    const { magicState } = useAppContext();

    // Refs to directly manipulate SVG without React re-renders
    const svgContainerRef = useRef<HTMLDivElement>(null);
    const highlightRectRef = useRef<SVGRectElement>(null);
    const borderRectRef = useRef<SVGRectElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const glowPathRef = useRef<SVGPathElement>(null);
    const sourceDotRef = useRef<SVGCircleElement>(null);
    const targetDotRef = useRef<SVGCircleElement>(null);
    const particleRef = useRef<SVGCircleElement>(null);
    const animateMotionRef = useRef<SVGAnimateMotionElement>(null);

    // Ref to store the injected highlight span for cleanup
    const injectedHighlightRef = useRef<HTMLSpanElement | null>(null);

    // Ref to store a "Healed" range if the original one is lost
    const healedRangeRef = useRef<Range | null>(null);

    // Helper: Find text across multiple DOM nodes and create a spanning Range
    const findTextRange = (textToFind: string) => {
        const contentEl = document.querySelector('.reader-content');
        if (!contentEl) return null;

        const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
        const targetText = normalize(textToFind);
        if (!targetText || targetText.length < 3) return null;

        // Build a map of all text nodes with their cumulative positions
        const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null);
        const textNodes: { node: Node; text: string; start: number; end: number }[] = [];
        let fullText = '';
        let node;

        while (node = walker.nextNode()) {
            const val = node.textContent || '';
            if (!val.trim()) continue; // Skip empty nodes

            const start = fullText.length;
            fullText += val;
            textNodes.push({ node, text: val, start, end: fullText.length });
        }

        const normalizedFullText = normalize(fullText);

        // Find the target text in the normalized full text
        // Use first 20 chars for initial search to handle slight variations
        const searchKey = targetText.slice(0, Math.min(20, targetText.length));
        const matchIndex = normalizedFullText.indexOf(searchKey);

        if (matchIndex === -1) {
            // Fallback: try even shorter match
            const shortKey = targetText.slice(0, 10);
            const shortMatch = normalizedFullText.indexOf(shortKey);
            if (shortMatch === -1) return null;
        }

        // Now we need to map the normalized position back to the original text nodes
        // This is approximate but works for most cases

        // Find which node contains the START of our target text
        let startNode: Node | null = null;
        let startOffset = 0;
        let endNode: Node | null = null;
        let endOffset = 0;

        let charCount = 0;
        const targetLength = targetText.length;

        for (let i = 0; i < textNodes.length; i++) {
            const tn = textNodes[i];
            const nodeText = tn.text;
            const nodeNormalized = normalize(nodeText);

            if (!startNode) {
                // Looking for start
                const keyToFind = searchKey.slice(0, 10);
                const idx = nodeNormalized.indexOf(keyToFind);
                if (idx !== -1) {
                    startNode = tn.node;
                    // Find the actual offset in the original text
                    startOffset = nodeText.indexOf(targetText.slice(0, 5));
                    if (startOffset === -1) startOffset = Math.max(0, idx);
                    charCount = nodeText.length - startOffset;
                }
            } else {
                // Already found start, accumulate chars towards end
                charCount += nodeText.length;
            }

            // Check if we've accumulated enough characters
            if (startNode && charCount >= targetLength) {
                endNode = tn.node;
                // Calculate end offset within this node
                const leftover = charCount - targetLength;
                endOffset = Math.max(0, nodeText.length - leftover);
                endOffset = Math.min(endOffset, nodeText.length);
                break;
            }
        }

        // Fallback: if we found start but not end, use last node
        if (startNode && !endNode && textNodes.length > 0) {
            const lastNode = textNodes[textNodes.length - 1];
            endNode = lastNode.node;
            endOffset = lastNode.text.length;
        }

        if (!startNode || !endNode) return null;

        try {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            return range;
        } catch (e) {
            console.warn('[findTextRange] Failed to create range:', e);
            return null;
        }
    };


    // Effect 1: Inject/Cleanup DOM Highlight Element
    useEffect(() => {
        const cleanup = () => {
            const el = injectedHighlightRef.current || document.getElementById(HIGHLIGHT_ID);
            if (el && el.parentNode) {
                const parent = el.parentNode;
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
                injectedHighlightRef.current = null;
            }
            healedRangeRef.current = null;
        };

        if (!magicState.active) {
            cleanup();
            return;
        }

        // Ensure we clean up previous injections first
        if (document.getElementById(HIGHLIGHT_ID)) {
            // Already there
        } else if (magicState.sourceRange) {
            // Try strict injection
            try {
                // Must verify range is effectively in document
                if (magicState.sourceRange.commonAncestorContainer.isConnected) {
                    const span = document.createElement('span');
                    span.id = HIGHLIGHT_ID;
                    span.style.cssText = 'background: rgba(45, 212, 191, 0.3); outline: 2px solid rgba(45, 212, 191, 0.6); border-radius: 2px;';
                    magicState.sourceRange.surroundContents(span);
                    injectedHighlightRef.current = span;
                }
            } catch (e) {
                console.warn('[SelectionWire] Injection failed:', e);
            }
        }

        return cleanup;
    }, [magicState.active, magicState.sourceRange, magicState.selectedText]);

    // Effect 2: Animation Frame Loop - Direct DOM Manipulation
    useEffect(() => {
        if (!magicState.active) {
            if (svgContainerRef.current) svgContainerRef.current.style.display = 'none';
            return;
        }

        if (svgContainerRef.current) svgContainerRef.current.style.display = 'block';

        let rafId: number;
        let lastSourceRect = magicState.sourceRect;
        let frameCount = 0;

        const updateFrame = () => {
            let source: { top: number; left: number; width: number; height: number } | null = null;

            frameCount++;

            // 1. DOM Element (Best - scrolls naturally with content)
            const highlightEl = document.getElementById(HIGHLIGHT_ID);
            if (highlightEl) {
                const rect = highlightEl.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    source = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };

                }
            }

            // 2. Original Range (If valid and connected to DOM)
            if (!source && magicState.sourceRange) {
                try {
                    // Check if the range's nodes are still in the document
                    const isConnected = magicState.sourceRange.commonAncestorContainer?.isConnected;
                    if (isConnected) {
                        const rect = magicState.sourceRange.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            source = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };

                        }
                    }
                } catch { }
            }

            // 3. Live Text Search (Always find fresh DOM nodes)
            // This is the most reliable method - search for the text on EVERY frame
            // because React re-renders can replace DOM nodes at any time
            if (!source && magicState.selectedText) {
                const liveRange = findTextRange(magicState.selectedText);
                if (liveRange) {
                    try {
                        const rect = liveRange.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            source = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };

                        }
                    } catch { }
                }
            }

            // 4. Default to Static (Last Resort - this causes "fixed to screen" behavior)
            if (!source && lastSourceRect) {
                source = lastSourceRect;
                // sourceType = 'STATIC_FALLBACK';
            }

            // Log every 60 frames (~1 second)
            if (frameCount % 60 === 1) {

            }

            // If still no source, skip this frame
            if (!source) {
                rafId = requestAnimationFrame(updateFrame);
                return;
            }


            if (highlightRectRef.current) {
                // Show SVG rect only if NOT using DOM element ID
                const showSvgRect = !highlightEl;
                highlightRectRef.current.style.display = showSvgRect ? 'block' : 'none';
                borderRectRef.current!.style.display = showSvgRect ? 'block' : 'none';

                if (showSvgRect) {
                    highlightRectRef.current.setAttribute('x', String(source.left));
                    highlightRectRef.current.setAttribute('y', String(source.top));
                    highlightRectRef.current.setAttribute('width', String(source.width));
                    highlightRectRef.current.setAttribute('height', String(source.height));

                    borderRectRef.current!.setAttribute('x', String(source.left - 2));
                    borderRectRef.current!.setAttribute('y', String(source.top - 2));
                    borderRectRef.current!.setAttribute('width', String(source.width + 4));
                    borderRectRef.current!.setAttribute('height', String(source.height + 4));
                }
            }

            // Update Connector Path (Always needed)
            const targetEl = document.getElementById('bento-card-anchor');
            if (targetEl) {
                const target = targetEl.getBoundingClientRect();
                const x1 = source.left + source.width;
                const y1 = source.top + source.height / 2;
                const x2 = target.left;
                const y2 = target.top + 80;

                const c1x = x1 + (x2 - x1) * 0.5;
                const c2x = x2 - (x2 - x1) * 0.5;
                const pathD = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;

                if (pathRef.current) pathRef.current.setAttribute('d', pathD);
                if (glowPathRef.current) glowPathRef.current.setAttribute('d', pathD);
                if (sourceDotRef.current) {
                    sourceDotRef.current.setAttribute('cx', String(x1));
                    sourceDotRef.current.setAttribute('cy', String(y1));
                }
                if (targetDotRef.current) {
                    targetDotRef.current.setAttribute('cx', String(x2));
                    targetDotRef.current.setAttribute('cy', String(y2));
                }
                if (animateMotionRef.current) animateMotionRef.current.setAttribute('path', pathD);
            }

            rafId = requestAnimationFrame(updateFrame);
        };

        rafId = requestAnimationFrame(updateFrame);
        return () => cancelAnimationFrame(rafId);

    }, [magicState.active, magicState.sourceRect, magicState.sourceRange, magicState.selectedText]);

    return (
        <div
            ref={svgContainerRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ display: magicState.active ? 'block' : 'none' }}
        >
            <svg className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="magicGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <rect ref={highlightRectRef} fill="#f59e0b" opacity="0.2" rx="4" />
                <rect ref={borderRectRef} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" rx="6" />

                <path ref={glowPathRef} stroke="url(#magicGradient)" strokeWidth="4" fill="none" opacity="0.3" style={{ filter: 'blur(2px)' }} />
                <path ref={pathRef} stroke="url(#magicGradient)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" filter="url(#glow)" />

                <circle ref={particleRef} r="3" fill="#2dd4bf" opacity="0.8">
                    <animateMotion ref={animateMotionRef} dur="1.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />
                </circle>

                <circle ref={sourceDotRef} r="3" fill="#2dd4bf" />
                <circle ref={targetDotRef} r="3" fill="#f59e0b" />
            </svg>
        </div>
    );
}
