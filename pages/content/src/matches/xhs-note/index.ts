/**
 * XHS Note Content Script
 * 注入页面: https://www.xiaohongshu.com/explore/*
 *
 * 监听 XHS_POST_COMMENT / XHS_REPLY_COMMENT 消息，自动填写评论并提交。
 */

console.log('[XHS Note] Content script loaded');

// ─── DOM 工具 ─────────────────────────────────────────────────────────────────

const waitForElement = <T extends Element>(selector: string, timeout = 12000): Promise<T> =>
  new Promise((resolve, reject) => {
    const el = document.querySelector<T>(selector);
    if (el) {
      resolve(el);
      return;
    }
    const observer = new MutationObserver(() => {
      const found = document.querySelector<T>(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForElement 超时: ${selector}`));
    }, timeout);
  });

const waitForButton = (text: string, timeout = 10000): Promise<HTMLElement> =>
  new Promise((resolve, reject) => {
    const find = () =>
      [...document.querySelectorAll<HTMLElement>('button, [role="button"], span')].find(
        el => el.textContent?.trim() === text || el.textContent?.includes(text),
      );
    const found = find();
    if (found) {
      resolve(found);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = find();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`waitForButton 超时: ${text}`));
    }, timeout);
  });

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 向 contenteditable 元素插入评论文字 */
const insertCommentText = (el: HTMLElement, text: string): void => {
  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  document.execCommand('insertText', false, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

// ─── 评论区选择器候选 ─────────────────────────────────────────────────────────

const COMMENT_SELECTORS = {
  inputBox: [
    '.comment-input [contenteditable]',
    '[placeholder*="说点什么"] ',
    '.input-box [contenteditable="true"]',
    '[class*="comment"] [contenteditable="true"]',
    'div[contenteditable="true"][class*="input"]',
  ],
  submitBtn: ['发布', '提交', '回复'],
  replyTrigger: ['回复', 'Reply'],
};

const findCommentInput = (): HTMLElement | null => {
  for (const sel of COMMENT_SELECTORS.inputBox) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
};

// ─── 发表评论 ────────────────────────────────────────────────────────────────

const postComment = async (content: string): Promise<void> => {
  let inputEl: HTMLElement | null = null;
  for (const sel of COMMENT_SELECTORS.inputBox) {
    try {
      inputEl = await waitForElement<HTMLElement>(sel, 8000);
      break;
    } catch {
      // 继续尝试下一个
    }
  }
  if (!inputEl) throw new Error('未找到评论输入框');

  inputEl.click();
  await delay(400);
  insertCommentText(inputEl, content);
  await delay(500);

  let submitBtn: HTMLElement | null = null;
  for (const text of COMMENT_SELECTORS.submitBtn) {
    try {
      submitBtn = await waitForButton(text, 4000);
      break;
    } catch {
      // continue
    }
  }
  if (!submitBtn) throw new Error('未找到评论提交按钮');

  submitBtn.click();
  await delay(1000);
  console.log('[XHS Note] 评论已提交');
};

// ─── 回复评论 ────────────────────────────────────────────────────────────────

const replyComment = async (commentId: string, content: string): Promise<void> => {
  let targetComment: HTMLElement | null = null;

  if (commentId) {
    targetComment = document.querySelector<HTMLElement>(
      `[data-id="${commentId}"], #comment-${commentId}, [id*="${commentId}"]`,
    );
  }

  if (targetComment) {
    const replyBtn = [...targetComment.querySelectorAll<HTMLElement>('button, span, [role="button"]')].find(el =>
      COMMENT_SELECTORS.replyTrigger.some(t => el.textContent?.includes(t)),
    );
    if (replyBtn) {
      replyBtn.click();
      await delay(500);
    }
  } else {
    console.warn('[XHS Note] 未找到目标评论，直接在主评论框填写');
  }

  const inputEl = findCommentInput();
  if (!inputEl) throw new Error('未找到回复输入框');

  inputEl.focus();
  await delay(300);
  insertCommentText(inputEl, content);
  await delay(500);

  let submitBtn: HTMLElement | null = null;
  for (const text of COMMENT_SELECTORS.submitBtn) {
    try {
      submitBtn = await waitForButton(text, 4000);
      break;
    } catch {
      // continue
    }
  }
  if (!submitBtn) throw new Error('未找到回复提交按钮');

  submitBtn.click();
  await delay(1000);
  console.log('[XHS Note] 回复已提交');
};

// ─── 消息监听 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'XHS_POST_COMMENT') {
    postComment(message.content)
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('[XHS Note] 评论失败:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  if (message.action === 'XHS_REPLY_COMMENT') {
    replyComment(message.commentId ?? '', message.content)
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('[XHS Note] 回复失败:', err);
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  return false;
});
