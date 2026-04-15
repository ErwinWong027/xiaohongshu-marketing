import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'example@example.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: ['*://*.xiaohongshu.com/*', 'https://xhs-n8n-web-main.vercel.app/*', 'https://*.n8n.cloud/*'],
  permissions: ['storage', 'scripting', 'tabs', 'notifications', 'sidePanel', 'cookies'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  options_ui: {
    page: 'options/index.html',
    open_in_tab: true,
  },
  icons: {
    '16': 'icon-16.png',
    '48': 'icon-48.png',
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['https://www.xiaohongshu.com/*', 'https://creator.xiaohongshu.com/*'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['https://www.xiaohongshu.com/user/profile/*'],
      js: ['content/xiaohongshu.iife.js'],
    },
    {
      matches: ['https://creator.xiaohongshu.com/publish/*'],
      js: ['content/xhs-creator.iife.js'],
    },
    {
      matches: ['https://www.xiaohongshu.com/explore/*'],
      js: ['content/xhs-note.iife.js'],
    },
    {
      matches: ['https://www.xiaohongshu.com/*', 'https://creator.xiaohongshu.com/*'],
      css: ['content.css'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-16.png', 'icon-48.png', 'icon-128.png', 'icon-34.png'],
      matches: ['https://www.xiaohongshu.com/*', 'https://creator.xiaohongshu.com/*'],
    },
  ],
  side_panel: {
    default_path: 'side-panel/index.html',
  },
} satisfies ManifestType;

export default manifest;
