# 技术审计清单 (Tech Audit TODO)

> 深度审计于 2026-01-07  
> 状态: **待修复**

---

## 🔴 P0 - 架构缺陷 (需立即修复)

- [ ] **`useAppContext` 超级 Hook 反模式**
  - 位置: `src/contexts/AppContext.tsx:37-50`
  - 问题: 使用展开运算符 `...settings, ...library, ...reading, ...progress` 合并所有 Context，导致任意子 Context 变化时**全部组件重渲染**。
  - 修复: 逐步将组件中的 `useAppContext()` 替换为具体的 `useSettings()`, `useLibrary()` 等。

- [ ] **`magicState` 全局作用域污染**
  - 位置: `src/contexts/ReadingContext.tsx:110-116`
  - 问题: 高频 UI 交互状态（选中文本、悬浮框位置）被放入全局 Context，每次选中文字都会触发全应用重绘。
  - 修复: 将 `magicState` 下沉为 `AIAssistant.tsx` 的局部状态或使用 Zustand 独立 store。

- [ ] **`ProgressContext` 初始化竞态条件**
  - 位置: `src/contexts/ProgressContext.tsx:70-77`
  - 问题: `useReducer` 的初始化值来自 `useLocalStorage` 同步读取的 hydrated 值，但 `useLocalStorage` 实际上是异步的（`localStorage.getItem` 在某些情况下可能返回 stale 数据）。如果用户在 hydration 完成前触发 action，可能导致数据丢失。
  - 修复: 使用 `SYNC_FROM_STORAGE` action 在 `useEffect` 中显式同步，或改用 React Query/TanStack Query。

---

## 🟠 P1 - 类型安全 (应尽快修复)

- [ ] **`db.ts` 滥用 `any` 类型**
  - 位置: `src/services/db.ts:24, 29, 203, 220, 248`
  - 问题: Notes, Highlights, Stats 的类型被声明为 `any`，丧失了 TypeScript 的类型检查能力。
  - 修复: 从 `types/core.ts` 导入 `Note`, `Highlight` 等明确类型。

- [ ] **`ReadingContext` 导入路径不规范**
  - 位置: `src/contexts/ReadingContext.tsx:2`
  - 问题: 从 `../types` 导入，这个路径现在已被删除。应该使用 `../types/core` 或 `../types/index`。
  - 修复: 更新导入路径为 `../types/core`。

- [ ] **`rag.ts` 中间定义被清理后遗留空行**
  - 位置: `src/services/rag.ts:15-20`
  - 问题: 重构后遗留了多余空行，代码不整洁。
  - 修复: 清理多余空行。

---

## 🟡 P2 - 代码异味 (建议修复)

- [ ] **`SettingsContext.tsx` 重复注释**
  - 位置: `src/contexts/SettingsContext.tsx:19-20`
  - 问题: `// --- Settings ---` 被复制了两次。
  - 修复: 删除重复行。

- [ ] **JSON 解析脆弱性**
  - 位置: `src/features/Assistant/AIAssistant.tsx:155-156`
  - 问题: Magic Mode 使用简单正则 `/\{[\s\S]*\}/` 提取 JSON，无法处理嵌套大括号或多个 JSON 块的情况。
  - 修复: 实现基于栈的 JSON 提取器，或使用 `json-parse-safe` 库。

- [ ] **Error Boundary 覆盖不足**
  - 位置: `src/contexts/ReadingContext.tsx:131, 140, 157, 171, 182`
  - 问题: 异步 DB 操作的 `.catch()` 只是打印日志，未向用户反馈错误，也未触发重试机制。
  - 修复: 添加全局错误通知 Toast，或使用 React Query 的内置错误处理。

- [ ] **`Reader.tsx` 过长**
  - 位置: `src/features/Reader/Reader.tsx` (274 行)
  - 问题: 单文件承担太多职责：路由参数解析、滚动恢复、Toast、键盘导航、懒加载等。
  - 修复: 拆分为 `useScrollRestoration`, `useKeyboardNav` 等自定义 Hook。

---

## 🔵 P3 - 测试与验证 (长期改进)

- [ ] **单元测试覆盖率低**
  - 位置: `src/tests/`
  - 问题: 只有 3 个测试文件，核心模块（`rag.ts`, `ai.ts`, `db.ts`）缺少测试。
  - 修复: 为 `rag.ts` 的 `retrieveRelevantChunks` 添加测试。

- [ ] **E2E 测试只有 smoke 级别**
  - 位置: `tests/e2e/smoke.spec.ts`
  - 问题: 只验证页面能加载，未覆盖关键用户流程（如阅读、笔记、AI 助手）。
  - 修复: 添加核心流程测试。

- [ ] **运行测试套件验证重构**
  - 命令: `npm run test`
  - 问题: 本次重构（Hooks 移动、类型清理）未经测试验证，存在回归风险。
  - 修复: 立即执行测试套件。

---

## 📊 汇总

| 优先级 | 数量 | 状态 |
|--------|------|------|
| P0 🔴 | 3 | 待修复 |
| P1 🟠 | 3 | 待修复 |
| P2 🟡 | 4 | 待修复 |
| P3 🔵 | 3 | 待修复 |
| **总计** | **13** | |

---

*生成者: Code Audit Agent*

---

## 🔴 P0 - 后端 & 安全 (追加)

- [ ] **CORS 允许无 Origin 请求 (SSRF 风险)**
  - 位置: `server/server.js:30-31`
  - 问题: `if (!origin) return callback(null, true)` 允许没有 Origin 头的请求通过，攻击者可通过服务端脚本绕过 CORS。
  - 修复: 生产环境下应拒绝无 Origin 请求，或检查 `User-Agent`。

- [ ] **API Key 检查不阻断请求**
  - 位置: `server/server.js:71-81`
  - 问题: 在开发环境下，即使 `OPENAI_API_KEY` 未设置，请求仍然会继续执行（只 log error），导致后续 API 调用失败时返回误导性错误。
  - 修复: 无论环境，缺少 Key 应直接返回 500。

- [ ] **无安全响应头 (Helmet)**
  - 位置: `server/server.js`
  - 问题: 未使用 `helmet` 中间件设置安全头（`X-Frame-Options`, `CSP`, `HSTS` 等），生产环境存在 XSS/Clickjacking 风险。
  - 修复: `npm install helmet` 并添加 `app.use(helmet())`。

---

## 🟠 P1 - 配置 & 构建 (追加)

- [ ] **Vite visualizer 插件配置覆盖**
  - 位置: `vite.config.ts:49-51`
  - 问题: 当 `ANALYZE=true` 时，`plugins` 数组被完全覆盖，导致 `react()` 和 `VitePWA()` 丢失。这是一个严重的配置 bug。
  - 修复: 使用 `plugins.push(visualizer(...))` 而非覆盖整个 `plugins` 字段。

- [ ] **PWA 使用占位符图标**
  - 位置: `vite.config.ts:20-28`
  - 问题: PWA manifest 使用 `vite.svg` 作为图标，这是默认占位符，不符合品牌标识。
  - 修复: 替换为正式 App 图标（192x192 和 512x512 PNG）。

- [ ] **Embedding 返回类型使用 `any`**
  - 位置: `src/services/ai.ts:180`
  - 问题: `data.data.map((d: any) => d.embedding)` 丧失类型安全。
  - 修复: 定义 `EmbeddingResponse` 接口。

---

## 🟡 P2 - 代码质量 (追加)

- [ ] **`generateKnowledgeGraph` 静默吞错**
  - 位置: `src/services/ai.ts:260-262`
  - 问题: 捕获错误后返回空数据 `{ nodes: [], links: [] }`，调用方无法得知是网络失败还是空结果。
  - 修复: 抛出错误或返回 `Result<GraphData, Error>` 类型。

- [ ] **服务端日志无结构化**
  - 位置: `server/server.js:56, 61`
  - 问题: 日志是纯字符串拼接，不利于 ELK/CloudWatch 等日志系统解析。
  - 修复: 使用 `pino` 或 `winston` 输出 JSON 日志。

---

## 📊 汇总 (更新)

| 优先级 | 数量 | 状态 |
|--------|------|------|
| P0 🔴 | 6 | 待修复 |
| P1 🟠 | 6 | 待修复 |
| P2 🟡 | 6 | 待修复 |
| P3 🔵 | 3 | 待修复 |
| **总计** | **21** | |

---

*更新于: 2026-01-07 17:48*

