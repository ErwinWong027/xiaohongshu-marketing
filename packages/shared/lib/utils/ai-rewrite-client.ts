/** AI 仿写 API 客户端
 *
 * 调用 xhs-n8n-web-main 部署的 /api/ai-rewrite 端点，
 * 以 SSE 流式接收生成结果，支持实时 chunk 回调用于 UI 更新。
 */

const AI_REWRITE_URL = 'https://xhs-n8n-web-main.vercel.app/api/ai-rewrite';

export interface AIRewriteOptions {
  /** 是否在生成内容中添加 emoji（默认 true） */
  addEmojis?: boolean;
  /** 参考作者 ID（xhs-n8n-web-main 数据库中的作者，可选） */
  authorId?: number;
  /** 每次收到新文本片段时的回调，用于实时更新 UI */
  onChunk?: (chunk: string) => void;
}

/**
 * 调用 AI 仿写 API，流式接收生成结果，返回完整文本。
 *
 * @param content  仿写的输入提示（通常由 formatKnowledgeTemplate() 生成）
 * @param options  配置选项
 * @returns        生成的完整笔记文本（标题 + 正文 + #标签）
 */
export const callAIRewrite = async (content: string, options: AIRewriteOptions = {}): Promise<string> => {
  const { addEmojis = true, authorId, onChunk } = options;

  const res = await fetch(AI_REWRITE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, addEmojis, ...(authorId != null && { authorId }) }),
  });

  if (!res.ok) {
    throw new Error(`AI 仿写请求失败: HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error('AI 仿写无响应数据流');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 解码新块并追加到缓冲区
    buffer += decoder.decode(value, { stream: true });

    // 按换行分割，处理完整的 SSE 行
    const lines = buffer.split('\n');
    // 最后一个可能不完整，保留到下次
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        // 流结束信号
        return fullText;
      }

      try {
        const parsed = JSON.parse(payload) as { content?: string };
        const chunk = parsed.content ?? '';
        if (chunk) {
          fullText += chunk;
          onChunk?.(chunk);
        }
      } catch {
        // 忽略格式异常的 SSE 行
      }
    }
  }

  // 处理缓冲区中可能剩余的最后一行
  if (buffer.startsWith('data: ')) {
    const payload = buffer.slice(6).trim();
    if (payload && payload !== '[DONE]') {
      try {
        const parsed = JSON.parse(payload) as { content?: string };
        const chunk = parsed.content ?? '';
        if (chunk) {
          fullText += chunk;
          onChunk?.(chunk);
        }
      } catch {
        // ignore
      }
    }
  }

  return fullText;
};
