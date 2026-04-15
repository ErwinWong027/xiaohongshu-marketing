# 小红书 Agentic 工作流 - 项目规则

## 项目概述

本项目将三个子系统合并为完整的小红书自动运营 Agentic 工作流：
- **Chrome 扩展**（`chrome-extension/` + `pages/`）：主界面，爬取数据，触发 AI 仿写
- **xiaohongshu-skills**（`xiaohongshu-skills/`）：登录、搜索、发布、评论、回复自动化
- **xhs-n8n-web-main**（`/Users/erwinwong/Documents/n8n/xhs-n8n-web-main`）：AI 仿写 API

## 服务启动顺序

```bash
# 1. 启动 WebSocket Bridge（供 xiaohongshu-skills 扩展使用）
cd xiaohongshu-skills
python scripts/bridge_server.py        # 监听 ws://localhost:9333

# 2. 启动 HTTP REST API（供 Chrome 扩展调用）
python scripts/http_server.py          # 监听 http://127.0.0.1:9334

# 3. 在 Chrome 安装 xiaohongshu-skills 扩展（extension/ 目录）

# 4. 构建并加载主 Chrome 扩展
cd ..
pnpm dev                               # 开发模式（HMR）
# 在 Chrome 加载 dist/ 目录
```

## 开发命令

```bash
pnpm dev              # 开发模式（热更新）
pnpm build            # 生产构建
pnpm lint             # ESLint 检查
pnpm lint:fix         # 自动修复
pnpm type-check       # TypeScript 类型检查
pnpm format           # Prettier 格式化
```

## 架构图

```
[Popup / SidePanel (React)]
    ↓ chrome.runtime.sendMessage
[Background Service Worker]
    ├─ HTTP POST → http://127.0.0.1:9334/api/*
    │       ↓ subprocess
    │   [Python CLI (cli.py)]
    │       ↓ ws://localhost:9333
    │   [Bridge WS Server] ↔ [XHS Skills Extension]
    │                               ↓ DOM
    │                       [xiaohongshu.com]
    │
    └─ fetch SSE → https://xhs-n8n-web-main.vercel.app/api/ai-rewrite
```

## 消息通信规范

Popup/SidePanel → Background 通过 `chrome.runtime.sendMessage({ action: '...', ...params })`：

| action | 说明 | 关键参数 |
|--------|------|----------|
| `XHS_LOGIN_CHECK` | 检查登录状态 | — |
| `XHS_GET_QRCODE` | 获取二维码 | — |
| `XHS_WAIT_LOGIN` | 等待扫码（阻塞 180s） | — |
| `XHS_SEND_PHONE_CODE` | 手机验证码第一步 | `phone` |
| `XHS_VERIFY_PHONE_CODE` | 手机验证码第二步 | `code` |
| `XHS_LOGOUT` | 退出登录 | — |
| `XHS_SEARCH` | 搜索笔记 | `keyword`, `opts?` |
| `XHS_AUTO_REWRITE` | AI 仿写（仅生成，不发布） | `authorId?` |
| `XHS_PUBLISH_CONFIRMED` | 用户确认后发布 | `note: {title, content, tags}` |
| `XHS_POST_COMMENT` | 发表评论 | `feedId, xsecToken, content` |
| `XHS_REPLY_COMMENT` | 回复评论 | `feedId, xsecToken, content, commentId?` |

Background → SidePanel（broadcast）：

| type | 说明 |
|------|------|
| `XHS_REWRITE_CHUNK` | AI 生成的实时文本片段，`chunk: string` |
| `XHS_SWITCH_TAB` | 通知 SidePanel 切换标签，`tab: 'rewrite'` |

## AI 仿写输出格式（解析规则）

`callAIRewrite()` 返回的纯文本结构：
```
标题行（第一行）

正文内容（中间段落，支持 emoji、序号）
可多段落

#标签1 #标签2 #标签3（最后一行）
```

`parseAIOutput(text)` 解析后返回：
```typescript
{
  title: "标题行",
  content: "正文内容",
  tags: ["标签1", "标签2", "标签3"]  // 已去掉 #，直接传给 publishNote()
}
```

## HTTP REST API 端点（端口 9334）

```
POST /api/login/check
POST /api/login/qrcode
POST /api/login/wait
POST /api/login/phone-send   { phone }
POST /api/login/phone-verify { code }
POST /api/login/logout
POST /api/search             { keyword, sortBy?, noteType?, publishTime? }
POST /api/publish            { title, content, tags[], images[]? }
POST /api/comment            { feedId, xsecToken, content }
POST /api/reply              { feedId, xsecToken, content, commentId? }
POST /api/like               { feedId, xsecToken, unlike? }
```

所有端点返回：`{ success: boolean, data?: any, error?: string, exit_code?: number }`

## 关键文件索引

| 文件 | 说明 |
|------|------|
| `xiaohongshu-skills/scripts/bridge_server.py` | WS Bridge（端口 9333） |
| `xiaohongshu-skills/scripts/http_server.py` | HTTP REST API（端口 9334） |
| `xiaohongshu-skills/scripts/cli.py` | 统一 CLI 入口 |
| `xiaohongshu-skills/extension/` | XHS Bridge 浏览器扩展 |
| `packages/shared/lib/utils/bridge-http-client.ts` | HTTP 客户端工具 |
| `packages/shared/lib/utils/knowledge-template.ts` | 知识库模版 + 格式化 |
| `packages/shared/lib/utils/content-parser.ts` | AI 输出解析 |
| `packages/shared/lib/utils/ai-rewrite-client.ts` | AI 仿写 SSE 客户端 |
| `chrome-extension/src/background/index.ts` | 所有消息处理逻辑 |
| `pages/popup/src/Popup.tsx` | 弹出窗口（登录+搜索+触发仿写） |
| `pages/side-panel/src/SidePanel.tsx` | 侧边栏（数据/仿写/互动 三个 Tab） |

## xiaohongshu-skills CLI 速查

```bash
python scripts/cli.py check-login
python scripts/cli.py get-qrcode
python scripts/cli.py wait-login
python scripts/cli.py search-feeds --keyword "关键词" [--sort-by 最新]
python scripts/cli.py publish --title-file t.txt --content-file c.txt --tags 标签1 --tags 标签2
python scripts/cli.py post-comment --feed-id ID --xsec-token TOKEN --content "内容"
python scripts/cli.py reply-comment --feed-id ID --xsec-token TOKEN --comment-id CID --content "内容"
python scripts/cli.py like-feed --feed-id ID --xsec-token TOKEN
```

Exit code: `0=成功, 1=未登录, 2=错误`

## 注意事项

- 知识库模版 JSON（附件一）已内置在 `DEFAULT_KNOWLEDGE_TEMPLATE` 常量中，无需从外部加载
- AI 仿写生成完成后，结果存入 `chrome.storage.local.xhsPendingPublish`，SidePanel 通过 storage 变化监听自动更新编辑字段
- 发布命令要求 tags 不含 `#` 号（`parseAIOutput` 已自动去除）
- `XHS_WAIT_LOGIN` 为阻塞调用，在 `ThreadingHTTPServer` 下不影响其他请求处理
- 此项目是 Chrome Extension MV3，不是 Next.js 应用，`use client` 指令不适用
