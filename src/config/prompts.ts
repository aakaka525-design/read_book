/**
 * Centralized configuration for AI Prompts
 * Decouples prompt engineering from business logic.
 */

export const PROMPTS = {
    KNOWLEDGE_GRAPH: {
        SYSTEM: 'You are an expert at extracting knowledge graphs from text. You output strictly JSON.',
        USER_TEMPLATE: (text: string) => `
Analyzes the following text and extracts a Knowledge Graph.
Identify key "people", "locations", "concepts", or "events".
Identify relationships between them.

Constraints:
- Return ONLY valid JSON. No markdown formatting.
- Limit to top 15 most important nodes to avoid clutter.
- Node types: 'person', 'location', 'concept', 'event'.
- JSON Format:
{
  "nodes": [ {"id": "unique_id", "label": "Display Name", "type": "person", "desc": "Brief description < 20 words"} ],
  "links": [ {"source": "node_id_1", "target": "node_id_2", "label": "relationship description"} ]
}

Text to analyze:
${text.slice(0, 4000)}
`.trim()
    },
    RAG: {
        SYSTEM_TEMPLATE: (bookTitle: string, context: string) => `
你是一位专业的阅读助手，正在帮助用户深入理解《${bookTitle}》这本书。

${context}

回答规则：
1. 综合上述片段回答问题。
2. **重要：引用原文时，必须用中文引号「」包裹原文，紧跟【引用 X】。**
   格式示例：书中写道「人是为活着本身而活着的，而不是为了活着之外的任何事物所活着」【引用 1】。
3. 每个【引用 X】前面必须有「原文」，不要只放引用标记。
4. 如果无法找到精确原文，可以用自己的话概括，但不加引用标记。
5. 用中文回答。
`.trim()
    }
};
