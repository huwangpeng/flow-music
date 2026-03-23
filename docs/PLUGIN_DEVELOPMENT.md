# Flow Music 插件开发手册

Flow Music 的插件系统允许开发者通过加载外部脚本来扩展应用功能。插件以 JavaScript 脚本的形式存在，可以访问应用状态并监听特定事件。

## 插件结构

一个标准的插件包含以下部分：

1. **元数据 (Metadata)**: 在 `plugins.json` 商店配置中定义。
2. **设置模式 (Settings Schema)**: 定义插件在 UI 中显示的配置项。
3. **逻辑代码 (Logic Code)**: 插件的核心 JavaScript 代码。

### 设置模式定义

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

## 生命周期与事件 (规划中)

插件系统目前支持通过注入脚本运行。应用在初始化时会尝试加载启用的插件代码。

### 示例插件逻辑

```javascript
/**
 * 一个简单的插件示例
 */
(function() {
  console.log("Flow Music Plugin [Example] Initialized!");
  
  // 插件可以访问 window.flowContext 提供的 API (正在完善中)
  // 例如：监听播放状态
})();
```

## 提交插件到商店

目前插件商店是通过解析 GitHub 仓库下的 `plugins.json` 获取的。要提交你的插件，请在你的公开仓库中提供 JS 文件的 Raw 链接。
