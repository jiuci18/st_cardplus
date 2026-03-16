# SillyTavern 角色卡编辑器

这是一个基于 Tauri 2、Vue 3、TypeScript 和 Vite 构建的桌面应用程序，旨在为 SillyTavern 用户提供快速创建和管理角色卡及世界观的工具

## 下载最新版本

**获取`main`分支最后一次成功构建版本（稳定版）：**

- 🌐 **Web版本** - [下载 `web-build`](https://nightly.link/awaae001/st_cardplus/workflows/build/main/web-build.zip)，解压后可直接部署
- 🐧 **Linux APP Image** - [下载 `linux-appimage`](https://nightly.link/awaae001/st_cardplus/workflows/build/main/linux-appimage.zip)，双击运行
- 💻 **Windows应用（NSIS）** - [下载 `windows-nsis-installer`](https://nightly.link/awaae001/st_cardplus/workflows/build/main/windows-nsis-installer.zip)（`.exe` 安装器）
- 💻 **Windows应用（MSI）** - [下载 `windows-msi-installer`](https://nightly.link/awaae001/st_cardplus/workflows/build/main/windows-msi-installer.zip)（`.msi` 安装器）

**获取最新版本：** 请前往 [Actions](../../actions) 页面下载最新工作流产物。

> 每次代码推送后会自动构建最新版本，确保您使用的是最新功能和修复

## 项目概述

本应用专为角色扮演爱好者设计，提供直观的界面来编辑角色卡并生成输出，同时支持世界观设定管理通过集成现代前端技术与桌面应用框架，确保高效开发与良好的用户体验

**Discord 社区**：[St_CardPlus](https://discord.gg/KH6rHAGBXD)

![大图](/public/image/hello.png)

## 主要功能

- 角色卡管理器：无须打开 sillytavern，app 全功能解析编辑
- 角色卡编辑器：提供 **填表式** 启发性角色信息填写，拒绝随性想法
- 世界地标：启发性地标编辑器（开发中），提供节点图式地标展示管理
- EJS模板：适配变量框架，生成 EJS 模板，不喜欢手写代码，就用这个
- 世界书：内嵌全功能世界书解析/编辑器
- 正则修正：提供智能文本选择器，无须了解正则，立刻生成
- 工具箱：提供小工具

## 开发指南

### 1. 安装依赖

```bash
pnpm install
```

桌面端构建还需要安装 Rust 与 Tauri 相关工具链（Windows 需要 WebView2，Android 需要 Android Studio/SDK/NDK）。

### 2. 启动开发模式

**Tauri 桌面应用模式**：

```bash
pnpm dev
```

**Web-only 模式**：

```bash
pnpm dev:web
```

### 3. 打包应用程序

```bash
pnpm build:desktop
```

## 项目结构

```
st_cardplus/
├── src-tauri/                # Tauri Rust 端与打包配置
├── public/                   # 静态资源
├── src/                      # 前端源代码
│   ├── assets/              # 静态资源 (icons, etc.)
│   ├── components/          # Vue 组件
│   ├── composables/         # Vue Composition API 可组合函数
│   ├── css/                 # 全局 CSS 样式
│   ├── database/            # 数据库服务 (Dexie.js)
│   ├── image/               # 图片资源
│   ├── pages/               # 页面级组件
│   ├── router/              # Vue Router 配置
│   ├── stores/              # Pinia 状态管理
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   ├── App.vue              # 根组件
│   └── main.ts              # 前端入口
├── .env                     # 环境变量
├── index.html               # HTML 入口文件
├── package.json             # 项目依赖与脚本
└── vite.config.ts           # Vite 配置
```

## 许可证

MIT License
