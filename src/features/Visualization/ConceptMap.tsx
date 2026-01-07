import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAppContext } from '../../contexts/AppContext';
import { generateKnowledgeGraph, type GraphData, type GraphNode } from '../../services/ai';
import { Loader2, Share2, Info, X } from 'lucide-react';
import type { Book } from '../../types';

interface ConceptMapProps {
    book: Book;
    chapterText: string;
}

export default function ConceptMap({ chapterText }: ConceptMapProps) {
    const { aiConfig } = useAppContext();
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(false);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 300, height: 600 });
    const fgRef = useRef<any>(null);

    // Initial resize
    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }

        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const handleGenerate = async () => {
        if (!chapterText) return;
        setLoading(true);
        try {
            const data = await generateKnowledgeGraph(chapterText, aiConfig);
            setGraphData(data);
            // Center graph slightly delayed to allow layout to settle
            setTimeout(() => {
                if (fgRef.current) {
                    fgRef.current.zoomToFit(400);
                }
            }, 500);

        } finally {
            setLoading(false);
        }
    };

    // Custom Node Painting
    const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;



        // Type colors
        let fillStyle = '#607D8B'; // Default concept
        if (node.type === 'person') fillStyle = '#EF5350'; // Red
        if (node.type === 'location') fillStyle = '#66BB6A'; // Green
        if (node.type === 'event') fillStyle = '#FFA726'; // Orange

        // Node Circle
        ctx.beginPath();
        ctx.fillStyle = fillStyle;
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fill();

        // Label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.id === selectedNode?.id ? '#000' : '#888';
        if (node.id === selectedNode?.id) ctx.font = `bold ${fontSize * 1.2}px Sans-Serif`;

        ctx.fillText(label, node.x, node.y + 8);
    }, [selectedNode]);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1a1a1a] relative" ref={containerRef}>
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10 bg-white dark:bg-[#1a1a1a]">
                <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <Share2 size={16} /> 知识图谱
                </h3>
                <button
                    onClick={handleGenerate}
                    disabled={loading || !chapterText}
                    className="px-3 py-1.5 text-xs bg-black text-white dark:bg-white dark:text-black rounded-lg hover:opacity-80 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Info size={12} />}
                    {graphData.nodes.length > 0 ? '重新分析' : '分析本章'}
                </button>
            </div>

            {/* Empty State */}
            {graphData.nodes.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center z-0">
                    <Share2 size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">点击上方按钮，AI 将分析本章内容并生成人物关系图谱。</p>
                </div>
            )}

            {/* Graph Canvas */}
            <div className="flex-1 overflow-hidden cursor-move">
                {graphData.nodes.length > 0 && (
                    <ForceGraph2D
                        ref={fgRef}
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel="label"
                        nodeCanvasObject={paintNode}
                        onNodeClick={(node) => {
                            setSelectedNode(node as GraphNode);
                            // Aim camera at node? Optional.
                            // fgRef.current.centerAt(node.x, node.y, 1000);
                        }}
                        linkColor={() => 'rgba(200, 200, 200, 0.5)'}
                        backgroundColor="transparent"
                    />
                )}
            </div>

            {/* Detail Overlay */}
            {selectedNode && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 fade-in z-20">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-1 inline-block ${selectedNode.type === 'person' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' :
                                selectedNode.type === 'location' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {selectedNode.type}
                            </span>
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white">{selectedNode.label}</h4>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400">
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {selectedNode.desc || 'No description available.'}
                    </p>
                </div>
            )}
        </div>
    );
}
