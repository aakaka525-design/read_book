# BFF Server (Backend for Frontend)

这是一个独立的 Express 服务器，用于代理 OpenAI API 请求，避免前端暴露 API Key。

## 安装依赖

```bash
cd server
npm install
```

## 配置

在 `server/` 目录创建 `.env` 文件：

```
OPENAI_API_KEY=your_api_key_here
```

## 运行

```bash
npm start
# 或开发模式（自动重载）
npm run dev
```

服务器默认运行在 `http://localhost:3001`

## 端点

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| POST | `/api/chat/completions` | 代理 OpenAI Chat API |
| POST | `/api/embeddings` | 代理 OpenAI Embeddings API |

## 与前端配合

前端 `vite.config.ts` 已配置代理：

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```
