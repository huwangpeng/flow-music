# Flow Music 插件包开发手册

Flow Music 当前以插件包系统为统一扩展机制。插件以 zip 包上传，包内可以包含 manifest、页面资源与脚本入口，并通过宿主暴露的动作 API 操作音乐库、文件系统与网络能力。

## 插件包结构

一个标准插件包包含以下部分：

1. **manifest.json**：描述插件名称、权限、配置与页面。
2. **server/index.mjs**：插件运行时入口。
3. **pages/**：页面资源目录，可包含独立 HTML/JS/CSS。
4. **assets/**：图标与其他静态资源。

### zip 包目录示例

```text
plugin.flow-script.zip
├─ manifest.json
├─ server/
│  └─ index.mjs
├─ pages/
│  └─ dashboard/
│     ├─ index.html
│     └─ main.js
└─ assets/
   └─ icon.png
```

### 清单示例

```json
{
  "id": "script-ncm-importer",
  "name": "网易云导入器",
  "version": "1.0.0",
  "description": "从外部服务抓取歌单并导入音乐库",
  "author": "Community",
  "source": "local-package",
  "sourceType": "package",
  "package": {
    "formatVersion": "1",
    "packageType": "nuxt-script-plugin",
    "entry": "server/index.mjs"
  },
  "permissions": [
    "runtime:execute",
    "network:fetch",
    "library:read",
    "library:write",
    "files:transcode",
    "ui:config",
    "ui:page"
  ],
  "configPage": {
    "title": "网易云导入设置",
    "fields": [
      {
        "key": "cookie",
        "label": "Cookie",
        "type": "password",
        "required": true,
        "secret": true
      }
    ]
  },
  "pages": [
    {
      "id": "dashboard",
      "title": "导入面板",
      "path": "/scripts/pages/script-ncm-importer/dashboard",
      "entry": "dashboard",
      "entryHtml": "pages/dashboard/index.html",
      "mountMode": "iframe"
    }
  ],
  "actions": [
    {
      "id": "network.fetch",
      "label": "请求外部接口",
      "permission": "network:fetch"
    }
  ]
}
```

### 配置字段定义

```json
{
  "settingsSchema": [
    { 
      "key": "showCover", 
      "label": "显示专辑封面", 
      "type": "boolean", 
      "default": true 
    },
    { 
      "key": "apiKey", 
      "label": "API 密钥", 
      "type": "password" 
    }
  ]
}
```

## 宿主动作 API

插件不应直接在主程序中硬编码业务，而是通过宿主动作 API 获得能力。当前宿主开放了这些服务端动作：

- `library.track.list`
- `library.track.upsert`
- `library.track.delete`
- `library.track.updateLyrics`
- `files.list`
- `files.writeText`
- `files.transcode`
- `download.create`
- `download.get`
- `download.list`
- `network.fetch`
- `scripts.describeActions`
- `logs.query`

示例：

```javascript
async function runImporter() {
  const response = await FlowAPI.scripts.callAction('script-ncm-importer', 'library.track.list', {
    permissions: ['library:read'],
    keyword: '周杰伦',
    limit: 10
  })

  console.log('tracks', response)
}

runImporter()
```

## 生命周期与事件

插件包系统目前支持通过注入脚本运行。应用在初始化时会尝试加载启用的脚本代码，并注入：

- `settings`
- `permissions`
- `configPage`
- `pages`
- `actions`
- `flowNodes`
- `meta`

### 示例脚本逻辑

```javascript
/**
 * 一个简单的脚本示例
 */
;(async function() {
  console.log('Flow Music Script Initialized', ScriptContext.meta)

  const result = await FlowAPI.scripts.callAction(ScriptContext.meta.id, 'logs.query', {
    permissions: ScriptContext.permissions,
    limit: 20
  })

  console.log('最近日志', result)
})()
```

## 下载任务

当脚本需要长时间下载资源时，可以使用：

```javascript
const task = await FlowAPI.scripts.callAction(ScriptContext.meta.id, 'download.create', {
  permissions: ScriptContext.permissions,
  url: 'https://example.com/test.mp3',
  targetPath: 'downloads/test.mp3'
})

const detail = await FlowAPI.scripts.callAction(ScriptContext.meta.id, 'download.get', {
  permissions: ScriptContext.permissions,
  taskId: task.data.id
})
```

## 自定义页面

插件包可以通过 `pages` 字段声明自己的页面，宿主会将其挂载到 `/scripts/pages/:scriptId/:pageId`，并通过 iframe 加载 zip 解压后的页面资源。

这允许脚本实现：

- 导入面板
- 任务执行控制台
- 配置向导
- 同步状态展示页

## 提交到商店

目前插件商店仍处于演进阶段。若要提交插件，请提供 zip 插件包，并清晰声明 manifest、入口和所需权限。
