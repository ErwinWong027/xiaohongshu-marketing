<div align="center">

<picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
    <source media="(prefers-color-scheme: light)" srcset="https://github.com/user-attachments/assets/a5dbf71c-c509-4c4f-80f4-be88a1943b0a" />
    <img alt="Logo" src="https://github.com/user-attachments/assets/99cb6303-64e4-4bed-bf3f-35735353e6de" />
</picture>

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://badges.aleen42.com/src/vitejs.svg)

</div>

## 功能概述

这是一个 Chrome 浏览器插件，专门用于获取小红书作者的详细数据，包括用户信息、粉丝统计和笔记内容。

## 主要功能

### 智能检测
- 自动检测当前页面是否为小红书作者页面
- 只在正确的页面启用"获取作者数据"按钮
- 支持 URL 格式：`https://www.xiaohongshu.com/user/profile/*`

### 数据获取
获取的数据包括：
- **基本信息**：用户名、用户 ID
- **统计数据**：关注数、粉丝数、获赞数
- **笔记列表**：所有笔记标题
- **详细内容**：前 10 篇笔记的标题、笔记链接、点赞数

### 数据管理
- 数据安全存储在浏览器本地
- 支持多个作者数据同时保存
- 可以查看 JSON 格式的完整数据
- 支持单个删除和批量清空

## 技术栈

- [React](https://reactjs.org/) 19.1.0
- [TypeScript](https://www.typescriptlang.org/) 5.8.3
- [Tailwindcss](https://tailwindcss.com/) 3.4.17
- [Vite](https://vitejs.dev/) 6.3.5 + [Rollup](https://rollupjs.org/)
- [Turborepo](https://turbo.build/repo) 2.5.3
- [Prettier](https://prettier.io/) 3.5.3
- [ESLint](https://eslint.org/) 9.27.0
- Chrome Extensions Manifest Version 3

## 项目结构

```
├── chrome-extension/          # 扩展核心配置
│   ├── manifest.ts           # manifest.json 生成脚本
│   ├── src/background/       # Service Worker 后台脚本
│   └── public/               # 公共资源（图标、CSS）
├── pages/                    # 扩展页面
│   ├── content/             # Content Script（注入到页面）
│   ├── content-ui/          # React 组件注入
│   ├── popup/               # 弹出窗口
│   └── side-panel/          # 侧边栏面板
├── packages/                # 共享包
│   ├── dev-utils/           # 开发工具（manifest 解析、日志）
│   ├── env/                 # 环境变量管理
│   ├── hmr/                 # HMR 热更新插件
│   ├── i18n/                # 国际化支持
│   ├── shared/              # 共享代码（类型、hooks、组件）
│   ├── storage/             # 存储封装
│   ├── tailwind-config/     # Tailwind 配置
│   ├── tsconfig/            # TypeScript 配置
│   ├── ui/                  # UI 工具函数
│   ├── vite-config/         # Vite 配置
│   └── zipper/              # 打包压缩工具
└── tests/e2e/               # 端到端测试
```

## 安装部署

### 环境要求
- Node.js >= 22.15.1
- pnpm >= 10.11.0

### 安装步骤

1. 安装依赖
```bash
pnpm install
```

2. 开发模式
```bash
pnpm dev
```

3. 生产构建
```bash
pnpm build
```

4. 加载扩展到 Chrome
   - 打开 `chrome://extensions/`
   - 开启**开发者模式**
   - 点击**加载已解压的扩展程序**
   - 选择 `dist` 文件夹

## 使用指南

### 步骤 1：访问小红书作者页面
打开任意小红书作者的个人主页，URL 格式为：
`https://www.xiaohongshu.com/user/profile/用户ID`

### 步骤 2：打开插件
- 点击浏览器工具栏中的插件图标
- 如果在正确页面，会显示"检测到小红书作者页面"
- 如果不在正确页面，按钮会置灰并提示"请在小红书作者页面使用"

### 步骤 3：获取数据
点击"获取作者数据"按钮，插件会自动：
1. 获取作者基本信息
2. 收集所有笔记标题
3. 从笔记卡片获取前 10 篇笔记的基本信息（标题、链接、点赞数）
4. 保存数据到本地存储

### 步骤 4：查看数据
- 数据获取完成后会自动打开 Side Panel
- 在 Side Panel 中可以：
  - 查看作者统计信息
  - 展开查看详细数据
  - 查看 JSON 格式的完整数据
  - 删除不需要的数据

## 数据格式

```json
{
  "id": "唯一标识符",
  "userName": "用户名",
  "userId": "用户ID",
  "subscribers": "关注数",
  "followers": "粉丝数",
  "likes": "获赞数",
  "allTitles": ["所有笔记标题数组"],
  "top10Notes": [
    {
      "title": "笔记标题",
      "desc": "笔记链接",
      "like": "点赞数"
    }
  ],
  "createdAt": "获取时间",
  "profileUrl": "作者主页URL"
}
```

## 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式 |
| `pnpm build` | 生产构建 |
| `pnpm zip` | 构建并打包为 zip |
| `pnpm e2e` | 运行端到端测试 |
| `pnpm lint` | 代码检查 |
| `pnpm lint:fix` | 自动修复代码格式 |
| `pnpm format` | Prettier 格式化 |

## 注意事项

- 仅支持小红书作者个人主页
- 需要页面完全加载后再使用
- 获取详细笔记信息需要时间，请耐心等待
- 遵循 Chrome Extension Manifest V3 规范

## License

MIT
