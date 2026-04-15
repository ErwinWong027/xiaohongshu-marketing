# Chrome Web Store 截图指南

Chrome Web Store 要求截图尺寸为 **1280×800** 或 **640×400**，PNG 或 JPEG，最多 5 张。

---

## 准备工作

1. 打开 Chrome，加载已构建的扩展（`dist/` 目录）：
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"，选择 `dist/` 文件夹

2. 登录小红书网页版：[https://www.xiaohongshu.com](https://www.xiaohongshu.com)

3. 设置 Chrome 窗口尺寸为 1280×800：
   ```javascript
   // 在 DevTools Console 粘贴执行：
   window.resizeTo(1280, 800);
   // 或用快捷键手动调整，然后用 DevTools Device Toolbar 精确设置
   ```

---

## 截图 1 — Popup 界面

**展示内容：** 已登录状态下的 Popup，显示"获取作者数据"、"AI 仿写"、"查看详情"按钮和搜索框。

**步骤：**
1. 打开任意小红书作者页面，如 `https://www.xiaohongshu.com/user/profile/<userId>`
2. 点击扩展图标，弹出 Popup
3. 打开 DevTools（F12），进入 **Elements** 面板，右键 `<html>` → Capture screenshot

**建议构图：** 居中展示 Popup，周围留白，背景使用小红书作者页面。

---

## 截图 2 — 侧边栏「数据」Tab

**展示内容：** 侧边栏打开，显示作者昵称、粉丝/获赞/收藏数据，以及 TOP 10 笔记列表。

**步骤：**
1. 在作者页面点击"获取作者数据"
2. 等待侧边栏自动打开并加载数据
3. 使用 Chrome DevTools **Device Toolbar**（手机图标）将视口设为 `1280×800`
4. 全页截图：DevTools → Command Menu（Ctrl+Shift+P / Cmd+Shift+P）→ `Capture full size screenshot`

---

## 截图 3 — 侧边栏「仿写」Tab（生成中）

**展示内容：** AI 流式输出，文字逐渐出现，底部显示"生成中..."状态。

**步骤：**
1. 打开侧边栏，切换到"仿写"Tab
2. 点击"AI 仿写"按钮
3. 在生成过程中（有内容但未完成时）立即截图
4. 建议截图时机：约 1/3 内容已生成时

---

## 截图 4 — 侧边栏「仿写」Tab（生成完成，可编辑）

**展示内容：** 标题、正文、标签三个可编辑字段，底部显示"保存草稿"按钮。

**步骤：**
1. 等待 AI 仿写生成完成
2. 可在字段中做轻微编辑以展示可交互性
3. 确保"保存草稿"按钮可见
4. 截图

---

## 截图 5 — 创作者中心自动填写效果

**展示内容：** `creator.xiaohongshu.com/publish/publish` 页面，标题和正文已被自动填入。

**步骤：**
1. 在仿写完成后点击"保存草稿"
2. 创作者中心会在新标签页自动打开，并自动填写内容
3. 在填写完成、弹出保存成功提示前截图
4. 截图尺寸 1280×800

---

## 使用 DevTools Capture Screenshot 的快捷方法

```
Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows)
→ 输入 "screenshot"
→ 选择:
   "Capture full size screenshot"  — 全页截图
   "Capture screenshot"             — 当前视口截图
   "Capture node screenshot"        — 截取指定元素
```

---

## 截图后处理建议

- 使用 [Squoosh](https://squoosh.app) 或 `imagemin` 压缩，保持文件 < 1 MB
- 可用 Figma/Canva 添加简洁的标注文字，说明核心功能
- 保持截图风格统一（同一窗口主题、同一浏览器配色）

---

## 宣传图（可选，1280×800）

Chrome Web Store 支持上传一张宣传大图（Marquee）。建议设计：
- 红色背景 (#FF2442)
- 白色大字"小红书自动运营助手"
- 右侧放 Popup 或侧边栏截图
- 底部写核心卖点：数据获取 · AI 仿写 · 自动草稿

---

*指南版本：2026-04-13*
