import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect, useCallback } from 'react';

// ─── 工具 ─────────────────────────────────────────────────────────────────────

const sendMsg = async <T = unknown,>(action: string, extra?: Record<string, unknown>): Promise<T> =>
  chrome.runtime.sendMessage({ action, ...extra });

// ─── 主组件 ───────────────────────────────────────────────────────────────────

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isXhsProfile, setIsXhsProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ── 初始化 ──────────────────────────────────────────────────────────────

  useEffect(() => {
    chrome.tabs.query({ currentWindow: true, active: true }).then(([tab]) => {
      if (tab?.url) {
        setCurrentUrl(tab.url);
        setIsXhsProfile(tab.url.includes('https://www.xiaohongshu.com/user/profile/'));
      }
    });
    checkLogin();
  }, []);

  const checkLogin = useCallback(async () => {
    try {
      const res = await sendMsg<{ success: boolean; data?: { logged_in: boolean } }>('XHS_LOGIN_CHECK');
      setIsLoggedIn(res.success ? (res.data?.logged_in ?? false) : false);
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  // ── 登录引导 ─────────────────────────────────────────────────────────────

  const handleGoLogin = () => {
    chrome.tabs.create({ url: 'https://www.xiaohongshu.com' });
  };

  // ── 爬取数据 ─────────────────────────────────────────────────────────────

  const handleGetAuthorData = async () => {
    if (!isXhsProfile) return;
    setIsLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
      const response = await chrome.tabs.sendMessage(tab.id!, {
        action: 'GET_XHS_AUTHOR_DATA',
        url: currentUrl,
      });
      if (response?.success) {
        try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch {
          chrome.notifications.create('side-panel-info', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon-34.png'),
            title: '数据已保存',
            message: '请右键点击插件图标，选择"打开侧边栏"查看数据',
          });
        }
      }
    } catch (err) {
      console.error('获取作者数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── AI 仿写 ──────────────────────────────────────────────────────────────

  const handleAIRewrite = async () => {
    setIsRewriting(true);
    try {
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch {
        /* ignore */
      }
      chrome.runtime.sendMessage({ type: 'XHS_SWITCH_TAB', tab: 'rewrite' }).catch(() => {});
      await sendMsg('XHS_AUTO_REWRITE');
    } catch (err) {
      console.error('AI 仿写失败:', err);
    } finally {
      setIsRewriting(false);
    }
  };

  // ── 搜索 ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    try {
      await sendMsg('XHS_SEARCH', { keyword: searchKeyword.trim() });
    } catch (err) {
      console.error('搜索失败:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.error('打开侧边栏失败:', err);
    }
  };

  // ── 渲染 ─────────────────────────────────────────────────────────────────

  const textCls = isLight ? 'text-gray-900' : 'text-gray-100';
  const subtextCls = isLight ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800', 'min-w-[300px] p-4')}>
      <div className={textCls}>
        <h1 className="mb-3 text-center text-lg font-bold">小红书自动运营</h1>

        {/* 登录状态栏 */}
        <div
          className={cn(
            'mb-3 flex items-center justify-between rounded-lg px-3 py-2',
            isLight ? 'bg-gray-100' : 'bg-gray-700',
          )}>
          <span
            className={cn(
              'text-sm',
              isLoggedIn === null ? subtextCls : isLoggedIn ? 'text-green-500' : 'text-red-400',
            )}>
            {isLoggedIn === null ? '检测登录中...' : isLoggedIn ? '● 已登录小红书' : '● 未登录'}
          </span>
          {isLoggedIn === false ? (
            <button
              onClick={handleGoLogin}
              className="rounded bg-red-500 px-2 py-1 text-xs text-white transition-colors hover:bg-red-600">
              去登录
            </button>
          ) : (
            <button
              onClick={checkLogin}
              className={cn(
                'rounded px-2 py-1 text-xs transition-colors',
                isLight ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-600 text-gray-200 hover:bg-gray-500',
              )}>
              刷新
            </button>
          )}
        </div>

        {/* 获取作者数据 */}
        <button
          className={cn(
            'w-full rounded-lg px-4 py-2.5 font-medium transition-all duration-200',
            isXhsProfile && !isLoading
              ? 'cursor-pointer bg-red-500 text-white shadow hover:bg-red-600'
              : 'cursor-not-allowed bg-gray-300 text-gray-500',
          )}
          onClick={handleGetAuthorData}
          disabled={!isXhsProfile || isLoading}>
          {isLoading ? '正在获取数据...' : '获取作者数据'}
        </button>

        {/* AI 仿写 */}
        <button
          className={cn(
            'mt-2 w-full rounded-lg px-4 py-2.5 font-medium transition-all duration-200',
            !isRewriting
              ? 'cursor-pointer bg-purple-500 text-white shadow hover:bg-purple-600'
              : 'cursor-not-allowed bg-purple-300 text-white',
          )}
          onClick={handleAIRewrite}
          disabled={isRewriting}>
          {isRewriting ? '正在生成...' : 'AI 仿写（生成后可编辑）'}
        </button>

        {/* 查看详情 */}
        <button
          className={cn(
            'mt-2 w-full rounded-lg px-4 py-2.5 font-medium transition-all duration-200',
            'cursor-pointer bg-blue-500 text-white shadow hover:bg-blue-600',
          )}
          onClick={handleOpenSidePanel}>
          查看详情
        </button>

        {/* 搜索 */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="搜索小红书笔记..."
            className={cn(
              'flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              isLight
                ? 'border-gray-300 bg-white text-gray-900 focus:border-blue-400'
                : 'border-gray-600 bg-gray-700 text-gray-100 focus:border-blue-400',
            )}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchKeyword.trim()}
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              searchKeyword.trim() && !isSearching
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'cursor-not-allowed bg-gray-300 text-gray-500',
            )}>
            {isSearching ? '...' : '搜索'}
          </button>
        </div>

        {/* 页面检测提示 */}
        {!isXhsProfile && (
          <p className={cn('mt-3 text-center text-xs', subtextCls)}>在小红书作者页面可启用"获取作者数据"</p>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
