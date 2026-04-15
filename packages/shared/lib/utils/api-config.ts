const DEFAULT_API_URL = 'https://erwinwong.app.n8n.cloud/webhook/xiaohongshu-analysis';

export const getApiUrl = async (): Promise<string> =>
  new Promise(resolve => {
    chrome.storage.sync.get(['xhsApiUrl'], result => {
      if (result.xhsApiUrl) {
        resolve(result.xhsApiUrl);
      } else {
        resolve(DEFAULT_API_URL);
      }
    });
  });
