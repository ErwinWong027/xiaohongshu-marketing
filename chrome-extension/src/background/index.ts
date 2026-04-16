import 'webextension-polyfill';
import { callAIRewrite, getDefaultTemplateText, parseAIOutput, getApiUrl } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import type { PublishNote } from '@extension/shared';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

// ─── 工具 ────────────────────────────────────────────────────────────────────

/** 等待指定 tab 加载完成 */
const waitForTabLoad = (tabId: number, timeout = 20000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab 加载超时'));
    }, timeout);

    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        // 给页面 JS 额外初始化时间
        setTimeout(resolve, 1500);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

/** 打开新 tab，等待加载后发消息给 content script */
const openTabAndSend = async (url: string, message: Record<string, unknown>): Promise<unknown> => {
  const tab = await chrome.tabs.create({ url });
  await waitForTabLoad(tab.id!);
  return chrome.tabs.sendMessage(tab.id!, message);
};

// ─── 消息监听 ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Background] 收到消息:', message.action ?? message.type);

  // ── 原有：爬取数据通知 ───────────────────────────────────────────────────

  // ── web app 生成内容接收（xhs-web content script 转发）──────────────────
  if (message.action === 'XHS_REWRITE_CONTENT') {
    const parsed = parseAIOutput(message.content as string);
    chrome.storage.local
      .set({ xhsPendingPublish: parsed })
      .then(() => {
        // 通知 SidePanel 切换到仿写 Tab
        chrome.runtime.sendMessage({ type: 'XHS_SWITCH_TAB', tab: 'rewrite' }).catch(() => {});
        sendResponse({ success: true });
      })
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  // ── 云端同步（代理 content script 的跨域请求）────────────────────────────
  if (message.action === 'XHS_SYNC_TO_CLOUD') {
    getApiUrl()
      .then(apiUrl => {
        if (!apiUrl) {
          sendResponse({ success: false, error: '未配置API地址' });
          return;
        }
        return fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.data),
        }).then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          sendResponse({ success: true, data });
        });
      })
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  if (message.action === 'XHS_DATA_SAVED') {
    chrome.notifications.create('xhs-data-success', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon-34.png'),
      title: '数据获取成功',
      message: `已成功获取 ${message.data.userName} 的数据，包含 ${message.data.top10Notes.length} 篇笔记详情`,
    });
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'XHS_DATA_ERROR') {
    chrome.notifications.create('xhs-data-error', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon-34.png'),
      title: '数据获取失败',
      message: message.error || '获取数据时发生未知错误',
    });
    sendResponse({ success: false, error: message.error });
    return true;
  }

  // ── 登录检测（原生 cookies，无需 Python）──────────────────────────────────

  if (message.action === 'XHS_LOGIN_CHECK') {
    // 用 url 参数而非 domain，确保 Chrome 返回该 URL 对应的所有 cookie（含父域 .xiaohongshu.com）
    chrome.cookies
      .getAll({ url: 'https://www.xiaohongshu.com/' })
      .then(cookies => {
        console.log(
          '[Background] XHS cookies:',
          cookies.map(c => c.name),
        );
        const isLoggedIn = cookies.some(c => ['a1', 'webId', 'web_session'].includes(c.name));
        sendResponse({ success: true, data: { logged_in: isLoggedIn } });
      })
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  // ── 搜索（打开小红书搜索页） ──────────────────────────────────────────────

  if (message.action === 'XHS_SEARCH') {
    const keyword = encodeURIComponent(message.keyword ?? '');
    chrome.tabs
      .create({ url: `https://www.xiaohongshu.com/search_result?keyword=${keyword}` })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  // ── AI 仿写（生成内容，不发布） ───────────────────────────────────────────

  if (message.action === 'XHS_AUTO_REWRITE') {
    const templateText = getDefaultTemplateText();
    const authorId: number | undefined = message.authorId;

    callAIRewrite(templateText, {
      addEmojis: true,
      authorId,
      onChunk: chunk => {
        chrome.runtime.sendMessage({ type: 'XHS_REWRITE_CHUNK', chunk }).catch(() => {});
      },
    })
      .then(fullText => {
        const parsed = parseAIOutput(fullText);
        return chrome.storage.local
          .set({ xhsPendingPublish: parsed })
          .then(() => sendResponse({ success: true, data: parsed }));
      })
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  // ── 保存草稿（原生 Content Script，无需 Python）──────────────────────────

  if (message.action === 'XHS_PUBLISH_CONFIRMED') {
    const note = message.note as PublishNote;

    openTabAndSend('https://creator.xiaohongshu.com/publish/publish', {
      action: 'XHS_FILL_DRAFT',
      note,
    })
      .then(() => {
        chrome.storage.local.remove('xhsPendingPublish').catch(() => {});
        chrome.notifications.create('xhs-draft-saved', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon-34.png'),
          title: '已保存草稿',
          message: `笔记「${note.title}」已保存为小红书草稿`,
        });
        sendResponse({ success: true });
      })
      .catch(err => {
        sendResponse({ success: false, error: String(err) });
      });
    return true;
  }

  // ── 评论（原生 Content Script，无需 Python）──────────────────────────────

  if (message.action === 'XHS_POST_COMMENT') {
    const noteUrl = `https://www.xiaohongshu.com/explore/${message.feedId}${
      message.xsecToken ? `?xsec_token=${message.xsecToken}` : ''
    }`;

    openTabAndSend(noteUrl, {
      action: 'XHS_POST_COMMENT',
      content: message.content,
    })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  // ── 回复（原生 Content Script，无需 Python）──────────────────────────────

  if (message.action === 'XHS_REPLY_COMMENT') {
    const noteUrl = `https://www.xiaohongshu.com/explore/${message.feedId}${
      message.xsecToken ? `?xsec_token=${message.xsecToken}` : ''
    }`;

    openTabAndSend(noteUrl, {
      action: 'XHS_REPLY_COMMENT',
      content: message.content,
      commentId: message.commentId,
    })
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  return true;
});

console.log('Background loaded');
