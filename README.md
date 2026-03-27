# 这个项目还在开发阶段，自动化等高级功能正在开发，现在正在完成基础功能，以下的readme来自ai生成，看个乐子即可，完成基础功能后会补上手写readme

# 以下是ai生成部分
# Flow Music

一个极其优雅、现代且强大的全栈音乐管理与播放系统。采用 Nuxt 4 + Tailwind CSS + Prisma 构建，专为追求极致视觉体验与功能性的音乐爱好者设计。

![Flow Music Preview](https://via.placeholder.com/1200x600?text=Flow+Music+Preview)

## ✨ 特性

- **极致美学**：沉浸式毛玻璃效果、动感全屏歌词、丝滑的暗黑模式切换。
- **智能元数据**：自动匹配网易云音乐元数据，本地缓存歌词与封面。
- **逐字歌词引擎**：自主研发的高性能歌词渲染器，支持 TTML 逐字高亮与弹性物理动效。
- **插件系统**：支持动态扩展功能，如 Discord RPC、高级解析器等。
- **全平台适配**：响应式设计，在桌面端与移动端均有出色表现。
- **Docker 一键部署**：支持 Docker 快速部署，数据持久化。

## 🚀 快速开始

### 本地开发

1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/flow-music.git
   cd flow-music
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 配置环境：
   创建 `.env` 文件并填入必要配置（参考 `.env.example`）。

4. 启动开发服务器：
   ```bash
   npm run dev
   ```

### 生产部署 (Docker)

我们提供了完整的 Docker 支持，你可以从 [Docker 部署文档](#docker-部署) 开始。

## 🛠️ 插件开发

Flow Music 拥有完善的插件生态，详情请参阅 [插件开发手册](./docs/PLUGIN_DEVELOPMENT.md)。

## 🐳 Docker 部署

使用 Docker 可以在几分钟内完成部署：

1. 确保已安装 [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/)。
2. 运行部署命令：
   ```bash
   docker-compose up -d
   ```
3. 访问 `http://localhost:3000` 即可开始使用。

## 📄 开源协议

本项目采用 MIT 协议开源。
