/** XHS Bridge HTTP 客户端
 *
 * 调用 xiaohongshu-skills/scripts/http_server.py 暴露的本地 REST API。
 * 需要先启动 bridge_server.py + http_server.py 以及 XHS Bridge 浏览器扩展。
 */

const BRIDGE_HTTP_URL = 'http://127.0.0.1:9334';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface SearchOptions {
  sortBy?: '综合' | '最新' | '最多点赞' | '最多评论' | '最多收藏';
  noteType?: '不限' | '视频' | '图文';
  publishTime?: '不限' | '一天内' | '一周内' | '半年内';
}

interface PublishNote {
  title: string;
  content: string;
  tags: string[];
  images?: string[];
}

interface BridgeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  exit_code?: number;
}

// ─── 核心调用函数 ─────────────────────────────────────────────────────────────

const bridgeCall = async <T = unknown>(endpoint: string, body?: Record<string, unknown>): Promise<T> => {
  const res = await fetch(`${BRIDGE_HTTP_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    throw new Error(`Bridge HTTP 错误: ${res.status}`);
  }

  const json = (await res.json()) as BridgeResponse<T>;
  if (!json.success) {
    throw new Error(json.error ?? '操作失败');
  }
  return json.data as T;
};

/** 检测 bridge HTTP 服务是否在线（不抛异常，返回 boolean） */
const isBridgeOnline = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${BRIDGE_HTTP_URL}/api/login/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

// ─── 快捷方法 ─────────────────────────────────────────────────────────────────

/** 检查小红书登录状态。exit_code=0 已登录，exit_code=1 未登录 */
const checkLogin = () => bridgeCall<{ logged_in?: boolean; username?: string }>('/api/login/check');

/** 获取扫码登录二维码（返回 base64 图片或 URL） */
const getQrCode = () =>
  bridgeCall<{ qrcode_url?: string; qrcode_base64?: string; qrcode_path?: string }>('/api/login/qrcode');

/** 等待用户扫码登录完成（最长 180 秒阻塞） */
const waitLogin = () => bridgeCall('/api/login/wait');

/** 手机号登录第一步：发送验证码 */
const sendPhoneCode = (phone: string) => bridgeCall('/api/login/phone-send', { phone });

/** 手机号登录第二步：验证码确认 */
const verifyPhoneCode = (code: string) => bridgeCall('/api/login/phone-verify', { code });

/** 退出登录（清除 cookies） */
const xhsLogout = () => bridgeCall('/api/login/logout');

/** 搜索笔记 */
const searchFeeds = (keyword: string, opts?: SearchOptions) => bridgeCall('/api/search', { keyword, ...opts });

/** 发布图文笔记（title/content 为纯文本，tags 不含 # 号） */
const publishNote = (note: PublishNote) => bridgeCall('/api/publish', note as unknown as Record<string, unknown>);

/** 对笔记发表评论 */
const postComment = (feedId: string, xsecToken: string, content: string) =>
  bridgeCall('/api/comment', { feedId, xsecToken, content });

/** 回复评论 */
const replyComment = (feedId: string, xsecToken: string, content: string, commentId?: string) =>
  bridgeCall('/api/reply', { feedId, xsecToken, content, commentId });

/** 点赞笔记 */
const likeFeed = (feedId: string, xsecToken: string, unlike = false) =>
  bridgeCall('/api/like', { feedId, xsecToken, unlike });

export type { SearchOptions, PublishNote };
export {
  bridgeCall,
  isBridgeOnline,
  checkLogin,
  getQrCode,
  waitLogin,
  sendPhoneCode,
  verifyPhoneCode,
  xhsLogout,
  searchFeeds,
  publishNote,
  postComment,
  replyComment,
  likeFeed,
};
