/**
 * XHS Creator Content Script
 * 注入页面: https://creator.xiaohongshu.com/publish/publish
 *
 * 监听 XHS_FILL_DRAFT 消息，自动填写标题/正文/标签并保存草稿。
 * creator.xiaohongshu.com 使用 React/Vue 受控组件，需用原生 setter 触发状态更新。
 */

console.log('[XHS Creator] Content script loaded');

// ─── DOM 工具 ─────────────────────────────────────────────────────────────────

/** 等待元素出现，超时后 reject */
const waitForElement = <T extends Element>(selector: string, timeout = 15000): Promise<T> =>
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

/** 等待含有指定文字的按钮出现 */
const waitForButton = (text: string, timeout = 15000): Promise<HTMLElement> =>
  new Promise((resolve, reject) => {
    const find = () =>
      [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].find(el => el.textContent?.includes(text));

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

/** 为 React 受控 input/textarea 设置值并触发更新 */
const setReactValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string): void => {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/** 向 contenteditable 元素插入文字（兼容 React quill 等富文本编辑器） */
const setContentEditable = (el: HTMLElement, value: string): void => {
  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  const lines = value.split('\n');
  lines.forEach((line, i) => {
    document.execCommand('insertText', false, line);
    if (i < lines.length - 1) {
      document.execCommand('insertParagraph', false);
    }
  });
  el.dispatchEvent(new Event('input', { bubbles: true }));
};

// ─── 选择器候选列表（按优先级排列） ──────────────────────────────────────────

const SELECTORS = {
  title: [
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
    '.note-title input',
    '.title-input input',
    '#content-title',
  ],
  content: [
    '.ql-editor[contenteditable="true"]',
    '[contenteditable="true"][class*="editor"]',
    '.publish-content [contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  tagInput: ['input[placeholder*="话题"]', 'input[placeholder*="标签"]', '.tag-input input', '[class*="topic"] input'],
  saveDraft: ['保存草稿', '存草稿'],
  successHint: ['草稿保存成功', '保存成功', '已保存'],
};

// ─── 核心填写逻辑 ─────────────────────────────────────────────────────────────

const fillDraft = async (note: { title: string; content: string; tags: string[] }): Promise<void> => {
  await waitForElement(SELECTORS.content[0], 20000).catch(() => waitForElement('[contenteditable="true"]', 10000));
  await delay(800);

  const titleSelectors = SELECTORS.title;
  let titleEl: HTMLInputElement | HTMLTextAreaElement | null = null;
  for (const sel of titleSelectors) {
    titleEl = document.querySelector(sel);
    if (titleEl) break;
  }
  if (titleEl) {
    setReactValue(titleEl, note.title);
    await delay(300);
  } else {
    console.warn('[XHS Creator] 未找到标题输入框，跳过');
  }

  let contentEl: HTMLElement | null = null;
  for (const sel of SELECTORS.content) {
    contentEl = document.querySelector<HTMLElement>(sel);
    if (contentEl) break;
  }
  if (contentEl) {
    setContentEditable(contentEl, note.content);
    await delay(500);
  } else {
    throw new Error('未找到正文编辑区域');
  }

  for (const tag of note.tags.slice(0, 10)) {
    let tagInput: HTMLInputElement | null = null;
    for (const sel of SELECTORS.tagInput) {
      tagInput = document.querySelector<HTMLInputElement>(sel);
      if (tagInput) break;
    }
    if (!tagInput) break;

    tagInput.focus();
    setReactValue(tagInput, tag);
    await delay(400);
    tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await delay(600);
    const firstOption = document.querySelector<HTMLElement>(
      '[class*="suggest"] li:first-child, [class*="topic-item"]:first-child, [class*="dropdown"] li:first-child',
    );
    if (firstOption) {
      firstOption.click();
      await delay(300);
    }
  }

  let saveDraftBtn: HTMLElement | null = null;
  for (const text of SELECTORS.saveDraft) {
    try {
      saveDraftBtn = await waitForButton(text, 5000);
      break;
    } catch {
      // 继续尝试下一个文字
    }
  }
  if (!saveDraftBtn) {
    throw new Error('未找到"保存草稿"按钮');
  }
  saveDraftBtn.click();
  await delay(2000);

  const successFound = SELECTORS.successHint.some(hint => document.body.textContent?.includes(hint));
  console.log('[XHS Creator] 保存草稿', successFound ? '成功' : '已点击，请确认结果');
};

// ─── 消息监听 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'XHS_FILL_DRAFT') return false;

  console.log('[XHS Creator] 收到 XHS_FILL_DRAFT:', message.note);

  fillDraft(message.note)
    .then(() => sendResponse({ success: true }))
    .catch(err => {
      console.error('[XHS Creator] 填写失败:', err);
      sendResponse({ success: false, error: String(err) });
    });

  return true;
});
