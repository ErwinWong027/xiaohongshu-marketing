import '@src/SidePanel.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, xhsAuthorStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState, useEffect, useCallback } from 'react';
import type { ParsedXhsContent } from '@extension/shared';
import type { XhsAuthorDataType, XhsNoteType } from '@extension/storage';

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = ({
  message,
  isVisible,
  type = 'success',
  onClose,
}: {
  message: string;
  isVisible: boolean;
  type?: 'success' | 'error';
  onClose: () => void;
}) => {
  useEffect(() => {
    if (isVisible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [isVisible, onClose]);

  return (
    <div
      className={`fixed right-4 top-4 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow-lg',
          type === 'success' ? 'bg-green-500' : 'bg-red-500',
        )}>
        <span>{type === 'success' ? '✓' : '✗'}</span>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};

// ─── AuthorCard（已有逻辑，原样保留）─────────────────────────────────────────

const AuthorCard = ({
  author,
  onDelete,
  isLight,
  showToast,
}: {
  author: XhsAuthorDataType;
  onDelete: (id: string) => void;
  isLight: boolean;
  showToast: (msg: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSingle = async () => {
    setIsSyncing(true);
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'XHS_SYNC_TO_CLOUD',
        data: author,
      });
      if (!result?.success) throw new Error(result?.error ?? '同步失败');
      showToast('数据已成功同步到云端');
    } catch (error) {
      showToast(`同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={cn(
        'mb-4 rounded-lg border p-4 transition-all duration-200',
        isLight ? 'border-gray-200 bg-white' : 'border-gray-600 bg-gray-700',
      )}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className={cn('text-lg font-bold', isLight ? 'text-gray-900' : 'text-white')}>{author.userName}</h3>
          <p className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-300')}>{author.userId}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncSingle}
            disabled={isSyncing}
            className={cn(
              'flex items-center gap-1 rounded px-3 py-1 text-sm transition-colors',
              isSyncing ? 'cursor-not-allowed bg-gray-400 text-white' : 'bg-blue-500 text-white hover:bg-blue-600',
            )}>
            {isSyncing ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                同步中
              </>
            ) : (
              '同步'
            )}
          </button>
          <button
            onClick={() => onDelete(author.id)}
            className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-opacity hover:opacity-80">
            删除
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: '关注', value: author.subscribers },
          { label: '粉丝', value: author.followers },
          { label: '获赞', value: author.likes },
        ].map(({ label, value }) => (
          <div key={label} className={cn('rounded p-2 text-center', isLight ? 'bg-gray-50' : 'bg-gray-600')}>
            <div className={cn('font-semibold', isLight ? 'text-gray-900' : 'text-white')}>{value}</div>
            <div className={cn('text-xs', isLight ? 'text-gray-600' : 'text-gray-300')}>{label}</div>
          </div>
        ))}
      </div>

      <div className={cn('mb-3 text-sm', isLight ? 'text-gray-600' : 'text-gray-300')}>
        共 {author.allTitles.length} 篇笔记，获取了前 {author.top10Notes.length} 篇详情
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full rounded px-4 py-2 text-sm font-medium transition-colors',
          isLight ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-blue-900 text-blue-300 hover:bg-blue-800',
        )}>
        {isExpanded ? '收起详情' : '查看详情'}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className={cn('mb-2 font-semibold', isLight ? 'text-gray-900' : 'text-white')}>
              所有笔记标题 ({author.allTitles.length})
            </h4>
            <div className={cn('max-h-32 overflow-y-auto rounded p-2 text-xs', isLight ? 'bg-gray-50' : 'bg-gray-600')}>
              {author.allTitles.map((title: string, i: number) => (
                <div key={i} className={cn('mb-1', isLight ? 'text-gray-700' : 'text-gray-200')}>
                  {i + 1}. {title}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className={cn('mb-2 font-semibold', isLight ? 'text-gray-900' : 'text-white')}>
              前 {author.top10Notes.length} 篇笔记详情
            </h4>
            <div className="space-y-2">
              {author.top10Notes.map((note: XhsNoteType, i: number) => (
                <div key={i} className={cn('rounded p-2 text-xs', isLight ? 'bg-gray-50' : 'bg-gray-600')}>
                  <div className={cn('mb-1 font-medium', isLight ? 'text-gray-900' : 'text-white')}>
                    {note.title || '无标题'}
                  </div>
                  <div className={cn('mb-1', isLight ? 'text-gray-600' : 'text-gray-300')}>
                    {note.desc ? note.desc.substring(0, 100) + (note.desc.length > 100 ? '...' : '') : '无描述'}
                  </div>
                  <div className={cn('flex gap-4', isLight ? 'text-gray-500' : 'text-gray-400')}>
                    <span>❤️ {note.like}</span>
                    <span>⭐ {note.collect}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className={cn('font-semibold', isLight ? 'text-gray-900' : 'text-white')}>JSON 数据</h4>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(JSON.stringify(author, null, 2))
                    .then(() => showToast('JSON数据已复制'))
                    .catch(() => showToast('复制失败'))
                }
                className="rounded bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600">
                复制JSON
              </button>
            </div>
            <pre
              className={cn(
                'max-h-40 overflow-auto rounded p-2 text-xs',
                isLight ? 'bg-gray-50 text-gray-700' : 'bg-gray-600 text-gray-200',
              )}>
              {JSON.stringify(author, null, 2)}
            </pre>
          </div>

          <div className={cn('text-xs', isLight ? 'text-gray-500' : 'text-gray-400')}>
            获取时间: {new Date(author.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 仿写编辑 Tab ─────────────────────────────────────────────────────────────

const RewriteTab = ({
  isLight,
  showToast,
}: {
  isLight: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) => {
  const [streamText, setStreamText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // 可编辑字段
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isDone, setIsDone] = useState(false);

  // 监听来自 background 的 chunk 消息
  useEffect(() => {
    const handleMsg = (msg: Record<string, unknown>) => {
      if (msg.type === 'XHS_REWRITE_CHUNK' && typeof msg.chunk === 'string') {
        setStreamText(prev => prev + msg.chunk);
        setIsGenerating(true);
      }
      if (msg.type === 'XHS_SWITCH_TAB' && msg.tab === 'rewrite') {
        // popup 通知切换过来时重置生成状态
        setStreamText('');
        setIsGenerating(true);
        setIsDone(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMsg);
    return () => chrome.runtime.onMessage.removeListener(handleMsg);
  }, []);

  // 从 storage 恢复待发布内容
  useEffect(() => {
    chrome.storage.local.get('xhsPendingPublish', result => {
      if (result.xhsPendingPublish) {
        const p = result.xhsPendingPublish as ParsedXhsContent;
        setEditTitle(p.title);
        setEditContent(p.content);
        setEditTags(p.tags);
        setIsDone(true);
        setIsGenerating(false);
      }
    });

    // 监听 storage 变化
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.xhsPendingPublish?.newValue) {
        const p = changes.xhsPendingPublish.newValue as ParsedXhsContent;
        setEditTitle(p.title);
        setEditContent(p.content);
        setEditTags(p.tags);
        setIsDone(true);
        setIsGenerating(false);
      }
    };
    chrome.storage.local.onChanged.addListener(onChange);
    return () => chrome.storage.local.onChanged.removeListener(onChange);
  }, []);

  const handlePublish = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      showToast('标题和正文不能为空', 'error');
      return;
    }
    setIsPublishing(true);
    try {
      const res = await chrome.runtime.sendMessage({
        action: 'XHS_PUBLISH_CONFIRMED',
        note: { title: editTitle, content: editContent, tags: editTags },
      });
      if (res?.success) {
        showToast('已保存为草稿！');
        setStreamText('');
        setEditTitle('');
        setEditContent('');
        setEditTags([]);
        setIsDone(false);
      } else {
        showToast(`发布失败: ${res?.error ?? '未知错误'}`, 'error');
      }
    } catch (err) {
      showToast(`发布失败: ${String(err)}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.replace(/^#/, '').trim();
    if (tag && !editTags.includes(tag)) {
      setEditTags(prev => [...prev, tag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(prev => prev.filter(t => t !== tag));
  };

  // 空状态
  if (!isGenerating && !isDone && !streamText) {
    return (
      <div className={cn('py-12 text-center', isLight ? 'text-gray-500' : 'text-gray-400')}>
        <div className="mb-4 text-4xl">✍️</div>
        <p>点击 Popup 中的「AI 仿写」按钮开始生成</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 生成中：显示流式文本 */}
      {isGenerating && !isDone && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span className={cn('text-sm font-medium', isLight ? 'text-purple-700' : 'text-purple-300')}>
              AI 正在生成中...
            </span>
          </div>
          <pre
            className={cn(
              'min-h-24 whitespace-pre-wrap break-words rounded-lg p-3 text-sm',
              isLight ? 'bg-purple-50 text-gray-800' : 'bg-gray-700 text-gray-200',
            )}>
            {streamText}
            <span className="animate-pulse">▍</span>
          </pre>
        </div>
      )}

      {/* 生成完成：可编辑字段 */}
      {isDone && (
        <div className="space-y-3">
          <p className={cn('text-xs font-medium', isLight ? 'text-gray-500' : 'text-gray-400')}>
            生成完成，可编辑后发布：
          </p>

          {/* 标题 */}
          <div>
            <label
              htmlFor="edit-title"
              className={cn('mb-1 block text-xs font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              标题
            </label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              maxLength={40}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 focus:border-purple-400'
                  : 'border-gray-600 bg-gray-700 text-gray-100 focus:border-purple-400',
              )}
            />
            <p className={cn('mt-0.5 text-right text-xs', isLight ? 'text-gray-400' : 'text-gray-500')}>
              {editTitle.length}/40
            </p>
          </div>

          {/* 正文 */}
          <div>
            <label
              htmlFor="edit-content"
              className={cn('mb-1 block text-xs font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              正文
            </label>
            <textarea
              id="edit-content"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={8}
              className={cn(
                'w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                isLight
                  ? 'border-gray-300 bg-white text-gray-900 focus:border-purple-400'
                  : 'border-gray-600 bg-gray-700 text-gray-100 focus:border-purple-400',
              )}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="edit-tag-input"
              className={cn('mb-2 block text-xs font-medium', isLight ? 'text-gray-700' : 'text-gray-300')}>
              话题标签
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {editTags.map(tag => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                    isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900 text-purple-300',
                  )}>
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)} className="leading-none hover:opacity-70">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="edit-tag-input"
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                placeholder="添加标签（不含#）"
                className={cn(
                  'flex-1 rounded border px-2 py-1 text-xs outline-none',
                  isLight
                    ? 'border-gray-300 bg-white text-gray-900 focus:border-purple-400'
                    : 'border-gray-600 bg-gray-700 text-gray-100 focus:border-purple-400',
                )}
              />
              <button
                onClick={handleAddTag}
                className="rounded bg-purple-500 px-2 py-1 text-xs text-white hover:bg-purple-600">
                添加
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                setIsDone(false);
                setStreamText('');
                chrome.runtime.sendMessage({ action: 'XHS_AUTO_REWRITE' }).catch(() => {});
              }}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                isLight ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gray-600 text-gray-200 hover:bg-gray-500',
              )}>
              重新生成
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                !isPublishing ? 'bg-red-500 text-white hover:bg-red-600' : 'cursor-not-allowed bg-red-300 text-white',
              )}>
              {isPublishing ? '保存中...' : '保存草稿'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 互动 Tab ─────────────────────────────────────────────────────────────────

const InteractTab = ({
  isLight,
  showToast,
}: {
  isLight: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}) => {
  const [feedId, setFeedId] = useState('');
  const [xsecToken, setXsecToken] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [commentId, setCommentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'comment' | 'reply'>('comment');

  const handleSubmit = async () => {
    if (!feedId.trim() || !xsecToken.trim() || !commentContent.trim()) {
      showToast('请填写 Feed ID、Token 和内容', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const action = mode === 'comment' ? 'XHS_POST_COMMENT' : 'XHS_REPLY_COMMENT';
      const extra =
        mode === 'comment'
          ? { feedId, xsecToken, content: commentContent }
          : { feedId, xsecToken, content: commentContent, commentId };
      const res = await chrome.runtime.sendMessage({ action, ...extra });
      if (res?.success) {
        showToast(mode === 'comment' ? '评论发布成功' : '回复发布成功');
        setCommentContent('');
        setCommentId('');
      } else {
        showToast(`失败: ${res?.error ?? '未知错误'}`, 'error');
      }
    } catch (err) {
      showToast(`失败: ${String(err)}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = cn(
    'w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors',
    isLight
      ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-400'
      : 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-400',
  );

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className={cn('flex rounded-lg p-0.5', isLight ? 'bg-gray-200' : 'bg-gray-700')}>
        {(['comment', 'reply'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-white text-gray-900 shadow'
                : isLight
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-gray-400 hover:text-gray-200',
            )}>
            {m === 'comment' ? '发表评论' : '回复评论'}
          </button>
        ))}
      </div>

      {/* 表单字段 */}
      <div className="space-y-2">
        <input
          className={inputClass}
          placeholder="Feed ID（笔记 ID）"
          value={feedId}
          onChange={e => setFeedId(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Xsec Token"
          value={xsecToken}
          onChange={e => setXsecToken(e.target.value)}
        />
        {mode === 'reply' && (
          <input
            className={inputClass}
            placeholder="Comment ID（要回复的评论 ID）"
            value={commentId}
            onChange={e => setCommentId(e.target.value)}
          />
        )}
        <textarea
          className={cn(inputClass, 'resize-none')}
          placeholder={mode === 'comment' ? '评论内容...' : '回复内容...'}
          rows={3}
          value={commentContent}
          onChange={e => setCommentContent(e.target.value)}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={cn(
          'w-full rounded-lg py-2 text-sm font-medium transition-colors',
          !isSubmitting ? 'bg-blue-500 text-white hover:bg-blue-600' : 'cursor-not-allowed bg-blue-300 text-white',
        )}>
        {isSubmitting ? '提交中...' : mode === 'comment' ? '发表评论' : '发表回复'}
      </button>
    </div>
  );
};

// ─── 主 SidePanel ─────────────────────────────────────────────────────────────

type Tab = 'data' | 'rewrite' | 'interact';

const SidePanel = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const authorData = useStorage(xhsAuthorStorage);
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setToastVisible(true);
  }, []);

  const hideToast = useCallback(() => setToastVisible(false), []);

  // 监听 popup 发出的 tab 切换指令
  useEffect(() => {
    const handler = (msg: Record<string, unknown>) => {
      if (msg.type === 'XHS_SWITCH_TAB' && msg.tab === 'rewrite') {
        setActiveTab('rewrite');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  // 监听 XHS_DATA_SAVED
  useEffect(() => {
    const handler = (msg: Record<string, unknown>) => {
      if (msg.action === 'XHS_DATA_SAVED') {
        const { syncResult } = msg;
        if (syncResult?.success) showToast('数据已成功同步到云端');
        else if (syncResult) showToast(`云端同步失败: ${syncResult.error}`, 'error');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [showToast]);

  const handleDeleteAuthor = async (id: string) => {
    if (confirm('确定删除这条数据吗？')) {
      await xhsAuthorStorage.removeAuthor(id);
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定清空所有数据吗？此操作不可恢复！')) {
      await xhsAuthorStorage.clearAll();
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'data', label: '数据' },
    { id: 'rewrite', label: '仿写' },
    { id: 'interact', label: '互动' },
  ];

  return (
    <div className={cn('min-h-screen', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
      {/* 顶部 Tabs */}
      <div className={cn('sticky top-0 z-10 px-4 pb-0 pt-4', isLight ? 'bg-gray-50' : 'bg-gray-800')}>
        <h1 className={cn('mb-3 text-lg font-bold', isLight ? 'text-gray-900' : 'text-white')}>小红书自动运营</h1>
        <div className={cn('mb-4 flex rounded-lg p-0.5', isLight ? 'bg-gray-200' : 'bg-gray-700')}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? isLight
                    ? 'bg-white text-gray-900 shadow'
                    : 'bg-gray-600 text-white shadow'
                  : isLight
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-gray-400 hover:text-gray-200',
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="px-4 pb-8">
        {/* 数据 Tab */}
        {activeTab === 'data' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className={cn('text-sm', isLight ? 'text-gray-600' : 'text-gray-300')}>
                {authorData && authorData.length > 0 ? `共 ${authorData.length} 条记录` : ''}
              </span>
              {authorData && authorData.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600">
                  清空所有
                </button>
              )}
            </div>

            {!authorData || authorData.length === 0 ? (
              <div className={cn('py-12 text-center', isLight ? 'text-gray-500' : 'text-gray-400')}>
                <div className="mb-4 text-4xl">📝</div>
                <p>暂无数据</p>
                <p className="mt-2 text-sm">请在小红书作者页面使用插件获取数据</p>
              </div>
            ) : (
              authorData.map(author => (
                <AuthorCard
                  key={author.id}
                  author={author}
                  onDelete={handleDeleteAuthor}
                  isLight={isLight}
                  showToast={showToast}
                />
              ))
            )}
          </>
        )}

        {/* 仿写 Tab */}
        {activeTab === 'rewrite' && <RewriteTab isLight={isLight} showToast={showToast} />}

        {/* 互动 Tab */}
        {activeTab === 'interact' && <InteractTab isLight={isLight} showToast={showToast} />}
      </div>

      <Toast message={toastMessage} isVisible={toastVisible} type={toastType} onClose={hideToast} />
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
