# Flow Music 插件开发文档

## 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [插件 API 参考](#插件-api-参考)
- [权限系统](#权限系统)
- [插件元数据](#插件元数据)
- [安全特性](#安全特性)
- [最佳实践](#最佳实践)
- [示例插件](#示例插件)
- [调试与测试](#调试与测试)
- [常见问题](#常见问题)

---

## 概述

Flow Music 插件系统是一个**安全的、沙箱隔离的**扩展机制，允许开发者通过编写 JavaScript 代码来扩展应用功能。

### 核心特性

- 🔒 **安全沙箱** - 插件在 Web Worker 中运行，与主应用隔离
- 🔐 **权限控制** - 基于最小权限原则，插件只能访问声明的 API
- 📝 **代码验证** - 支持代码签名和完整性校验
- 🛡️ **资源隔离** - 存储、网络等资源访问受到严格限制
- ⚡ **异步通信** - 通过消息传递与主应用交互
- 🎨 **自定义设置** - 每个插件可以有自己的配置页面
- 🔧 **核心修改** - 支持修改核心逻辑（需要用户确认）

### 系统限制

- ❌ 无法直接访问 `window`、`document` 等全局对象
- ❌ 无法直接操作 DOM
- ❌ 无法访问未授权的 localStorage 键
- ⚠️ 修改核心逻辑需要用户明确同意

---

## 架构设计

### 插件执行流程

```
┌─────────────────┐
│   主应用线程     │
│  (Nuxt App)     │
│                 │
│  $registry      │
│  (触发器/动作)   │
└────────┬────────┘
         │ 消息通信
         │ (postMessage)
         ▼
┌─────────────────┐
│  插件沙箱管理器   │
│  (PluginSandbox)│
│                 │
│  权限检查        │
│  审计日志        │
└────────┬────────┘
         │ 受限 API
         │ (RestrictedAPI)
         ▼
┌─────────────────┐
│  Web Worker     │
│  (插件代码)      │
│                 │
│  FlowAPI       │
│  (安全 API)     │
└─────────────────┘
```

### 目录结构

```
app/plugins/
├── plugin-types.ts           # TypeScript 类型定义
├── permissions.ts            # 权限控制逻辑
├── restricted-api.ts         # 受限 API 实现
├── plugin-worker.ts          # Web Worker 模板
├── plugin-sandbox.ts         # 沙箱管理器
├── signature-verifier.ts     # 签名验证器
├── dynamic-loader.client.ts  # 动态加载器
└── README.md                 # 本文档
```

---

## 快速开始

### 1. 创建插件文件

创建一个 JavaScript 文件，例如 `my-plugin.js`：

```javascript
/**
 * 我的第一个插件
 * @description 一个简单的播放器通知插件
 * @author Your Name
 * @version 1.0.0
 */

export default function(FlowAPI) {
  // 存储已注册的触发器和动作
  const triggers = new Map()
  const actions = new Map()

  // 注册一个触发器
  triggers.set('notify-play', {
    label: '播放时通知',
    execute: async (ctx) => {
      const { songTitle, artist } = ctx
      
      // 使用受限 API 发送通知
      FlowAPI.notification.show(
        '正在播放',
        `${songTitle || '未知曲目'} - ${artist || '未知艺术家'}`
      )
      
      // 记录日志
      FlowAPI.console.log('发送播放通知:', songTitle)
      
      return { success: true }
    }
  })

  // 注册到系统
  FlowAPI.registry.registerTrigger('notify-play', '播放时通知')
  
  // 返回触发器和动作集合
  return { triggers, actions }
}
```

### 2. 创建插件元数据

创建 `plugins.json` 或在插件商店中注册：

```json
{
  "id": "my-first-plugin",
  "name": "我的第一个插件",
  "version": "1.0.0",
  "description": "一个简单的播放器通知插件",
  "author": "Your Name",
  "url": "https://example.com/my-plugin.js",
  "signature": "",
  "codeHash": "",
  "publicKey": "",
  "permissions": ["automation", "notification"],
  "settingsSchema": []
}
```

### 3. 安装和测试

在应用设置中安装插件，然后启用它。插件会在下次页面加载时自动运行。

---

## 插件 API 参考

### FlowAPI 对象

插件通过 `FlowAPI` 对象与系统交互。以下是可用的 API：

#### 1. FlowAPI.registry

用于注册触发器和动作。

```typescript
interface Registry {
  /**
   * 注册触发器
   * @param id - 触发器唯一标识
   * @param label - 触发器显示名称
   */
  registerTrigger(id: string, label: string): void
  
  /**
   * 注册动作
   * @param id - 动作唯一标识
   * @param label - 动作显示名称
   */
  registerAction(id: string, label: string): void
}
```

**示例：**

```javascript
FlowAPI.registry.registerTrigger('my-trigger', '我的触发器')
FlowAPI.registry.registerAction('my-action', '我的动作')
```

#### 2. FlowAPI.storage

受限的存储 API，只能访问插件专用的存储空间。

```typescript
interface Storage {
  /**
   * 获取存储值
   * @param key - 存储键（必须以 plugin_<pluginId>_ 开头）
   * @returns 存储值或 null
   */
  getItem(key: string): string | null
  
  /**
   * 设置存储值
   * @param key - 存储键（必须以 plugin_<pluginId>_ 开头）
   * @param value - 存储值
   */
  setItem(key: string, value: string): void
}
```

**示例：**

```javascript
// 保存设置
FlowAPI.storage.setItem('plugin_my-plugin_settings', JSON.stringify({
  enabled: true,
  volume: 80
}))

// 读取设置
const settingsStr = FlowAPI.storage.getItem('plugin_my-plugin_settings')
const settings = JSON.parse(settingsStr || '{}')
```

**注意：**
- 存储键必须遵循格式：`plugin_<pluginId>_<key>`
- 尝试访问其他插件的存储空间会返回 `null`
- 没有 `storage` 权限时，所有操作都会返回 `null`

#### 3. FlowAPI.network

受限的网络请求 API。

```typescript
interface Network {
  /**
   * 发起网络请求
   * @param url - 请求 URL（必须在白名单内）
   * @param options - 请求选项
   * @returns Fetch Response 对象
   */
  fetch(url: string, options?: RequestInit): Promise<Response>
}
```

**示例：**

```javascript
try {
  const response = await FlowAPI.network.fetch('https://api.example.com/data')
  const data = await response.json()
  FlowAPI.console.log('获取数据:', data)
} catch (error) {
  FlowAPI.console.error('网络请求失败:', error)
}
```

**注意：**
- 只能访问白名单域名
- 默认白名单：`api.example.com`, `cdn.example.com`, `raw.githubusercontent.com`
- 没有 `network` 权限时，所有请求都会被拒绝

#### 4. FlowAPI.notification

系统通知 API。

```typescript
interface Notification {
  /**
   * 显示通知
   * @param title - 通知标题
   * @param body - 通知内容
   */
  show(title: string, body: string): void
}
```

**示例：**

```javascript
FlowAPI.notification.show('任务完成', '文件上传成功！')
```

**注意：**
- 需要 `notification` 权限
- 实际通知显示取决于浏览器权限设置

#### 5. FlowAPI.console

受限的控制台 API。

```typescript
interface Console {
  log(...args: any[]): void
  error(...args: any[]): void
}
```

**示例：**

```javascript
FlowAPI.console.log('普通日志', { data: 'test' })
FlowAPI.console.error('错误日志', error)
```

**注意：**
- 所有日志都会带有插件 ID 前缀
- 便于调试和审计

#### 6. FlowAPI.core (需要 core-modification 权限)

核心修改 API，允许插件修改应用核心逻辑。

```typescript
interface CoreModificationAPI {
  /**
   * 注册系统事件钩子
   * @param hookName - 钩子名称
   * @param callback - 回调函数
   */
  registerHook(hookName: keyof PluginHooks, callback: Function): void
  
  /**
   * 修改播放器状态
   * @param modifier - 状态修改函数
   */
  modifyPlayerState(modifier: (state: any) => any): void
  
  /**
   * 注册中间件
   * @param type - 中间件类型
   * @param middleware - 中间件函数
   */
  registerMiddleware(type: string, middleware: Function): void
  
  /**
   * 注入组件到指定位置
   * @param location - 注入位置
   * @param component - 组件
   */
  injectComponent(location: string, component: any): void
}
```

**可用钩子：**

- `onPlayerReady` - 播放器就绪时
- `onPlayerPlay` - 播放时
- `onPlayerPause` - 暂停时
- `onPlayerStop` - 停止时
- `onTrackChange` - 曲目变更时
- `onVolumeChange` - 音量变更时
- `onPlaylistChange` - 播放列表变更时
- `onAppMounted` - 应用挂载时
- `onAppBeforeUnmount` - 应用卸载前

**示例：**

```javascript
// 注册播放器事件钩子
FlowAPI.core.registerHook('onPlayerPlay', (ctx) => {
  console.log('播放器开始播放:', ctx)
})

// 修改播放器状态
FlowAPI.core.modifyPlayerState((state) => {
  return {
    ...state,
    customFeature: true
  }
})

// 注册中间件
FlowAPI.core.registerMiddleware('trigger', (ctx) => {
  console.log('触发器执行前:', ctx)
  return ctx
})

// 注入组件
FlowAPI.core.injectComponent('player-controls', MyCustomButton)
```

**⚠️ 警告：**
- 需要 `core-modification` 权限
- 安装时会有警告提示
- 用户必须明确同意才能加载
- 不当使用可能导致应用不稳定

---

## 权限系统

### 权限类型

| 权限 | 说明 | 对应 API | 风险等级 |
|------|------|----------|----------|
| `automation` | 注册触发器和动作 | `FlowAPI.registry` | 低 |
| `storage` | 访问本地存储 | `FlowAPI.storage` | 低 |
| `network` | 发起网络请求 | `FlowAPI.network` | 中 |
| `notification` | 发送系统通知 | `FlowAPI.notification` | 低 |
| `clipboard` | 访问剪贴板 | (未来支持) | 中 |
| `core-modification` | 修改核心逻辑 | `FlowAPI.core` | **高** ⚠️ |

### 权限声明

在插件元数据中声明所需权限：

```json
{
  "permissions": ["automation", "storage", "notification"]
}
```

### 权限验证

系统会在以下时机验证权限：

1. **安装时** - 验证权限声明的有效性
2. **加载时** - 创建受限 API 代理
3. **运行时** - 检查每次 API 调用的权限

### 最佳实践

- ✅ **最小权限原则** - 只声明必需的权限
- ✅ **渐进式权限** - 根据功能逐步申请权限
- ❌ **不要过度申请** - 申请不需要的权限会导致用户不信任

---

## 插件元数据

### 完整格式

```json
{
  "id": "unique-plugin-id",
  "name": "插件名称",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名称",
  "url": "https://example.com/plugin.js",
  "signature": "ECDSA 签名 (Base64)",
  "codeHash": "SHA-256 哈希 (Hex)",
  "publicKey": "公钥 (Base64)",
  "permissions": ["automation", "storage"],
  "settingsSchema": [
    {
      "key": "apiKey",
      "label": "API 密钥",
      "type": "password",
      "default": ""
    },
    {
      "key": "enabled",
      "label": "启用功能",
      "type": "boolean",
      "default": true
    }
  ]
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 插件唯一标识 |
| `name` | string | ✅ | 插件显示名称 |
| `version` | string | ✅ | 语义化版本号 |
| `description` | string | ✅ | 插件功能描述 |
| `author` | string | ✅ | 作者信息 |
| `url` | string | ✅ | 插件代码 URL |
| `signature` | string | ⚠️ | 代码签名（开发时可空） |
| `codeHash` | string | ⚠️ | 代码哈希（开发时可空） |
| `publicKey` | string | ⚠️ | 公钥（开发时可空） |
| `permissions` | string[] | ✅ | 权限声明 |
| `settingsSchema` | object[] | ❌ | 设置表单定义 |

### 设置字段类型

```typescript
interface PluginSettingField {
  key: string           // 设置键
  label: string         // 显示标签
  type: 'text' | 'boolean' | 'password' | 'number' | 'select'
  options?: string[]    // select 类型的选项
  default?: any         // 默认值
}
```

### 设置页面

每个插件可以有自己的设置页面，用户可以在 `/plugins` 页面访问。

**设置页面功能：**
- 查看插件信息和权限
- 配置插件设置项
- 启用/禁用插件
- 重置设置
- 卸载插件

**核心修改警告：**
如果插件有 `core-modification` 权限，设置页面会显示醒目的警告提示。

---

## 安全特性

### 1. 沙箱隔离

插件在 Web Worker 中运行，与主应用完全隔离：

```javascript
// 插件中尝试访问 window（会失败）
typeof window  // undefined
typeof document  // undefined

// 只能使用 FlowAPI 提供的受限 API
FlowAPI.console.log('这是安全的')
```

### 2. 代码验证

系统会验证插件代码的完整性和签名：

```javascript
// 计算代码哈希
const code = await fetch(pluginUrl).then(r => r.text())
const hash = await computeCodeHash(code)

// 验证签名
const isValid = await verifyPluginSignature(metadata, code)
```

**开发模式：** 签名验证失败时会显示警告，但不会阻止加载。

### 3. 存储隔离

每个插件只能访问自己的存储空间：

```javascript
// ✅ 允许
FlowAPI.storage.getItem('plugin_my-plugin_data')

// ❌ 禁止（返回 null）
FlowAPI.storage.getItem('user_token')
FlowAPI.storage.getItem('plugin_other-plugin_data')
```

### 4. 网络白名单

只能访问白名单内的域名：

```javascript
// ✅ 允许（在白名单内）
await FlowAPI.network.fetch('https://api.example.com/data')

// ❌ 禁止（抛出错误）
await FlowAPI.network.fetch('https://evil.com/steal')
```

### 5. 执行超时

插件执行超过 30 秒会被自动终止：

```javascript
// 长时间运行的任务
triggers.set('long-task', {
  execute: async (ctx) => {
    // 必须在 30 秒内完成
    await someLongTask()
  }
})
```

### 6. 审计日志

所有敏感操作都会被记录：

```
[Plugin Audit] {
  timestamp: 1234567890,
  pluginId: 'my-plugin',
  action: 'storage_get',
  details: { key: 'plugin_my-plugin_data', hasValue: true }
}
```

---

## 最佳实践

### 代码组织

```javascript
export default function(FlowAPI) {
  // 1. 定义触发器和动作
  const triggers = new Map()
  const actions = new Map()
  
  // 2. 实现触发器逻辑
  triggers.set('trigger-id', {
    label: '触发器名称',
    execute: async (ctx) => {
      // 业务逻辑
    }
  })
  
  // 3. 实现动作逻辑
  actions.set('action-id', {
    label: '动作名称',
    execute: async (ctx) => {
      // 业务逻辑
    }
  })
  
  // 4. 注册到系统
  FlowAPI.registry.registerTrigger('trigger-id', '触发器名称')
  FlowAPI.registry.registerAction('action-id', '动作名称')
  
  // 5. 返回集合
  return { triggers, actions }
}
```

### 错误处理

```javascript
triggers.set('safe-trigger', {
  label: '安全的触发器',
  execute: async (ctx) => {
    try {
      // 可能失败的操作
      const data = await FlowAPI.network.fetch('https://api.example.com/data')
      return { success: true, data }
    } catch (error) {
      // 记录错误
      FlowAPI.console.error('操作失败:', error)
      
      // 返回错误信息
      return { 
        success: false, 
        error: error.message 
      }
    }
  }
})
```

### 状态管理

```javascript
export default function(FlowAPI) {
  const triggers = new Map()
  const actions = new Map()
  
  // 从存储加载状态
  let state = { count: 0 }
  const savedState = FlowAPI.storage.getItem('plugin_my-plugin_state')
  if (savedState) {
    state = JSON.parse(savedState)
  }
  
  // 保存状态的辅助函数
  function saveState() {
    FlowAPI.storage.setItem(
      'plugin_my-plugin_state',
      JSON.stringify(state)
    )
  }
  
  triggers.set('increment', {
    label: '增加计数',
    execute: async () => {
      state.count++
      saveState()
      return { count: state.count }
    }
  })
  
  FlowAPI.registry.registerTrigger('increment', '增加计数')
  return { triggers, actions }
}
```

### 性能优化

```javascript
// ✅ 好的做法：缓存数据
let cachedData = null
let cacheTime = 0

triggers.set('fetch-data', {
  execute: async () => {
    const now = Date.now()
    
    // 使用 5 分钟缓存
    if (cachedData && (now - cacheTime) < 5 * 60 * 1000) {
      return { data: cachedData, fromCache: true }
    }
    
    cachedData = await FlowAPI.network.fetch('https://api.example.com/data')
    cacheTime = now
    
    return { data: cachedData, fromCache: false }
  }
})

// ❌ 不好的做法：每次都请求
```

---

## 示例插件

### 示例 1：播放器通知插件

```javascript
/**
 * 播放器通知插件
 * 权限：automation, notification
 */
export default function(FlowAPI) {
  const triggers = new Map()
  
  triggers.set('notify-play', {
    label: '播放通知',
    execute: async (ctx) => {
      const { songTitle, artist } = ctx || {}
      
      FlowAPI.notification.show(
        '🎵 正在播放',
        `${songTitle || '未知曲目'} - ${artist || '未知艺术家'}`
      )
      
      return { success: true }
    }
  })
  
  FlowAPI.registry.registerTrigger('notify-play', '播放通知')
  return { triggers }
}
```

### 示例 2：数据同步插件

```javascript
/**
 * 数据同步插件
 * 权限：automation, storage, network
 */
export default function(FlowAPI) {
  const triggers = new Map()
  const API_URL = 'https://api.example.com/sync'
  
  // 加载缓存的数据
  function loadCache() {
    const cached = FlowAPI.storage.getItem('plugin_sync-plugin_cache')
    return cached ? JSON.parse(cached) : null
  }
  
  // 保存缓存
  function saveCache(data) {
    FlowAPI.storage.setItem(
      'plugin_sync-plugin_cache',
      JSON.stringify(data)
    )
  }
  
  triggers.set('sync-data', {
    label: '同步数据',
    execute: async (ctx) => {
      try {
        // 获取本地数据
        const localData = ctx.localData
        
        // 发送到服务器
        const response = await FlowAPI.network.fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localData)
        })
        
        const result = await response.json()
        
        // 缓存结果
        saveCache(result)
        
        FlowAPI.console.log('同步成功:', result)
        
        return { success: true, data: result }
      } catch (error) {
        FlowAPI.console.error('同步失败:', error)
        
        // 返回缓存数据
        const cache = loadCache()
        return { 
          success: false, 
          error: error.message,
          cachedData: cache 
        }
      }
    }
  })
  
  FlowAPI.registry.registerTrigger('sync-data', '同步数据')
  return { triggers }
}
```

### 示例 3：定时任务插件

```javascript
/**
 * 定时任务插件
 * 权限：automation, storage
 */
export default function(FlowAPI) {
  const triggers = new Map()
  const actions = new Map()
  
  // 注册定时任务
  actions.set('schedule-task', {
    label: '注册定时任务',
    execute: async (ctx) => {
      const { interval, task } = ctx
      
      // 存储任务配置
      const tasks = JSON.parse(
        FlowAPI.storage.getItem('plugin_scheduler-plugin_tasks') || '[]'
      )
      
      tasks.push({ interval, task, createdAt: Date.now() })
      
      FlowAPI.storage.setItem(
        'plugin_scheduler-plugin_tasks',
        JSON.stringify(tasks)
      )
      
      return { success: true, count: tasks.length }
    }
  })
  
  // 触发器：检查并执行定时任务
  triggers.set('check-schedule', {
    label: '检查定时任务',
    execute: async () => {
      const tasks = JSON.parse(
        FlowAPI.storage.getItem('plugin_scheduler-plugin_tasks') || '[]'
      )
      
      const now = Date.now()
      const executed = []
      
      for (const task of tasks) {
        if (now - task.createdAt >= task.interval) {
          executed.push(task)
          task.createdAt = now // 重置时间
        }
      }
      
      // 保存更新
      FlowAPI.storage.setItem(
        'plugin_scheduler-plugin_tasks',
        JSON.stringify(tasks)
      )
      
      return { executed, count: executed.length }
    }
  })
  
  FlowAPI.registry.registerTrigger('check-schedule', '检查定时任务')
  FlowAPI.registry.registerAction('schedule-task', '注册定时任务')
  
  return { triggers, actions }
}
```

### 示例 4：核心修改插件（高风险）

```javascript
/**
 * 播放器增强插件
 * 权限：automation, core-modification
 * 
 * ⚠️ 此插件可以修改核心逻辑，安装时需要用户确认
 */
export default function(FlowAPI) {
  const triggers = new Map()
  const actions = new Map()
  
  // 注册播放器事件钩子
  FlowAPI.core.registerHook('onPlayerPlay', (ctx) => {
    console.log('[Player Enhancer] 开始播放:', ctx)
    
    // 自动记录播放历史
    const history = JSON.parse(
      FlowAPI.storage.getItem('plugin_enhancer-history') || '[]'
    )
    history.push({
      ...ctx,
      timestamp: Date.now()
    })
    // 只保留最近 100 条
    if (history.length > 100) {
      history.shift()
    }
    FlowAPI.storage.setItem(
      'plugin_enhancer-history',
      JSON.stringify(history)
    )
  })
  
  // 修改播放器状态，添加自定义功能
  FlowAPI.core.modifyPlayerState((state) => {
    return {
      ...state,
      // 添加均衡器支持
      equalizer: {
        enabled: true,
        bands: [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000]
      }
    }
  })
  
  // 注册触发器中间件
  FlowAPI.core.registerMiddleware('trigger', (ctx) => {
    console.log('[Player Enhancer] 触发器执行前:', ctx)
    // 可以修改触发器上下文
    return ctx
  })
  
  // 注入自定义组件到播放器控制区
  const EqualizerComponent = {
    name: 'PluginEqualizer',
    template: '<div class="equalizer">均衡器 UI</div>'
  }
  FlowAPI.core.injectComponent('player-controls', EqualizerComponent)
  
  // 提供一个查看播放历史的触发器
  triggers.set('view-history', {
    label: '查看播放历史',
    execute: async () => {
      const history = JSON.parse(
        FlowAPI.storage.getItem('plugin_enhancer-history') || '[]'
      )
      return { history, count: history.length }
    }
  })
  
  FlowAPI.registry.registerTrigger('view-history', '查看播放历史')
  
  return { triggers, actions }
}
```

**⚠️ 注意事项：**
1. 此示例使用了 `core-modification` 权限
2. 安装时会有警告提示，需要用户确认
3. 可以访问所有核心 API
4. 不当使用可能导致应用不稳定
5. 仅建议在完全信任的情况下使用

---

## 调试与测试

### 控制台日志

使用 `FlowAPI.console` 记录日志：

```javascript
FlowAPI.console.log('调试信息', { data: value })
FlowAPI.console.error('错误信息', error)
```

日志会显示在浏览器控制台，带有插件 ID 前缀：

```
[Plugin my-plugin] 调试信息 { data: 'value' }
```

### 审计日志

所有敏感操作都会记录审计日志：

```
[Plugin Audit] {
  timestamp: 1234567890,
  pluginId: 'my-plugin',
  action: 'network_request',
  details: { url: 'https://api.example.com/data', method: 'GET' }
}
```

### 错误处理

```javascript
try {
  // 可能失败的操作
} catch (error) {
  FlowAPI.console.error('错误详情:', {
    message: error.message,
    stack: error.stack
  })
}
```

### 测试清单

在发布插件前，确保：

- [ ] 所有功能正常工作
- [ ] 错误处理完善
- [ ] 权限声明准确
- [ ] 没有访问受限资源
- [ ] 日志清晰有用
- [ ] 性能可以接受
- [ ] 文档完整

---

## 常见问题

### Q: 为什么无法访问 `window` 对象？

**A:** 插件在 Web Worker 中运行，Worker 是独立的线程环境，没有 `window`、`document` 等浏览器全局对象。这是安全特性，防止插件恶意操作页面。

### Q: 如何存储插件数据？

**A:** 使用 `FlowAPI.storage` API，键名必须遵循 `plugin_<pluginId>_<key>` 格式：

```javascript
FlowAPI.storage.setItem('plugin_my-plugin_settings', 'value')
```

### Q: 网络请求失败怎么办？

**A:** 检查：
1. 是否声明了 `network` 权限
2. 域名是否在白名单内
3. 网络连接是否正常

### Q: 插件执行超时如何处理？

**A:** 优化代码逻辑，避免长时间运行的任务。如果确实需要，可以分批次执行或使用后台任务。

### Q: 如何与主应用通信？

**A:** 通过注册触发器和动作与主应用交互：

```javascript
// 注册触发器
FlowAPI.registry.registerTrigger('my-trigger', '我的触发器')

// 主应用可以调用这个触发器
```

### Q: 开发时如何跳过签名验证？

**A:** 开发模式下，系统会自动允许没有签名的插件，但会显示警告信息。这是正常行为。

### Q: 插件有大小限制吗？

**A:** 建议插件代码不超过 100KB，过大的代码会影响加载性能。

### Q: 支持使用第三方库吗？

**A:** 支持，但需要注意：
1. 库必须兼容 Web Worker 环境
2. 不能使用 Node.js 特定的 API
3. 库的大小会计入插件总大小

### Q: 如何配置插件？

**A:** 访问 `/plugins` 页面，点击已安装的插件卡片，会弹出设置面板。在面板中可以：
- 修改插件设置
- 启用/禁用插件
- 卸载插件

### Q: 核心修改插件安全吗？

**A:** 核心修改插件需要用户明确同意才能加载：
1. 安装时会有醒目的警告提示
2. 用户必须点击确认才能继续
3. 建议只使用来自可信作者的插件
4. 可以在设置页面查看插件的权限

### Q: 网络访问有限制吗？

**A:** 没有限制。插件可以访问任何域名，但需要声明 `network` 权限。

### Q: 插件执行有超时限制吗？

**A:** 没有超时限制。但建议优化代码性能，避免长时间阻塞。

---

## 更新日志

### v2.0.0 (2026-03-24)

- ✅ 移除网络访问限制
- ✅ 移除执行超时限制
- ✅ 添加插件设置页面
- ✅ 添加核心修改 API
- ✅ 添加核心修改警告提示
- ✅ 添加中间件系统
- ✅ 添加组件注入机制
- ✅ 添加系统事件钩子

### v1.0.0 (2026-03-24)

- ✅ 初始版本
- ✅ Web Worker 沙箱隔离
- ✅ 权限控制系统
- ✅ 代码签名验证
- ✅ 受限 API 代理
- ✅ 审计日志系统

---

## 反馈与支持

如有问题或建议，请：

1. 查看本文档
2. 检查示例插件
3. 查看审计日志
4. 联系开发团队

---

**最后更新：** 2026-03-24  
**文档版本：** 2.0.0
