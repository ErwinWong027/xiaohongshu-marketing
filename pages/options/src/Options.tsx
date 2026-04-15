import { cn } from '@extension/ui';
import { useState, useEffect } from 'react';

const DEFAULT_API_URL = 'https://erwinwong.app.n8n.cloud/webhook/xiaohongshu-analysis';

const Options = () => {
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  useEffect(() => {
    chrome.storage.sync.get(['xhsApiUrl'], result => {
      if (result.xhsApiUrl) {
        setApiUrl(result.xhsApiUrl);
      } else {
        setApiUrl(DEFAULT_API_URL);
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      await chrome.storage.sync.set({ xhsApiUrl: apiUrl });
      setSaveMessage('✓ 保存成功！');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('✗ 保存失败，请重试');
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setApiUrl(DEFAULT_API_URL);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">小红书数据助手 - 设置</h1>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6">
            <label htmlFor="apiUrl" className="mb-2 block text-sm font-medium text-gray-700">
              API 地址
            </label>
            <input
              type="url"
              id="apiUrl"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
              placeholder="请输入您的 n8n webhook 地址"
              className={cn(
                'w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2',
                'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
              )}
            />
            <p className="mt-2 text-sm text-gray-500">
              此地址用于同步小红书作者数据到您的 n8n 工作流。留空则使用默认地址。
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'rounded-lg px-6 py-2 font-medium transition-colors',
                isSaving ? 'cursor-not-allowed bg-gray-400 text-white' : 'bg-blue-500 text-white hover:bg-blue-600',
              )}>
              {isSaving ? '保存中...' : '保存设置'}
            </button>

            <button
              onClick={handleReset}
              className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300">
              恢复默认
            </button>
          </div>

          {saveMessage && (
            <div
              className={cn(
                'mt-4 rounded-lg p-3',
                saveMessage.startsWith('✓') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
              )}>
              {saveMessage}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h2 className="mb-2 font-semibold text-blue-900">使用说明</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 在 n8n 中创建一个 Webhook 节点，获取 webhook URL</li>
            <li>• 将 webhook URL 粘贴到上方的 API 地址输入框中</li>
            <li>• 点击保存设置，配置将立即生效</li>
            <li>• 您可以随时修改或恢复默认设置</li>
          </ul>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>版本: 0.5.0</p>
          <p className="mt-1">
            如有问题，请访问:{' '}
            <a
              href="https://xhs-n8n-web-main.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline">
              主理Note
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Options;
