/**
 * XHS Web Content Script
 * 注入页面: https://xhs-n8n-web-main.vercel.app/*
 *
 * 监听 web app 广播的 XHS_REWRITE_DONE 消息，
 * 将生成内容转发给 background，由 background 存入 storage 供 SidePanel 读取。
 */

console.log('[XHS Web] Content script loaded');

window.addEventListener('message', event => {
  if (event.source !== window) return;
  if (event.data?.type !== 'XHS_REWRITE_DONE') return;

  const content: string = event.data.content ?? '';
  if (!content.trim()) return;

  console.log('[XHS Web] 收到生成内容，转发给 background');
  chrome.runtime.sendMessage({ action: 'XHS_REWRITE_CONTENT', content });
});
