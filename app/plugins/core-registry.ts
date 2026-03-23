export default defineNuxtPlugin(() => {
  const registry = {
    automationTriggers: new Map<string, { label: string, execute: (ctx: any) => Promise<void> }>(),
    automationActions: new Map<string, { label: string, execute: (ctx: any) => Promise<void> }>(),
    storageProviders: new Map<string, any>(),
    uploadHandlers: new Map<string, any>(),

    registerTrigger(id: string, label: string, executeFn: (ctx: any) => Promise<void>) {
      this.automationTriggers.set(id, { label, execute: executeFn })
    },

    registerAction(id: string, label: string, executeFn: (ctx: any) => Promise<void>) {
      this.automationActions.set(id, { label, execute: executeFn })
    },

    getAvailableTriggers() {
      return Array.from(this.automationTriggers.entries()).map(([id, t]) => ({ id, label: t.label }))
    },

    getAvailableActions() {
      return Array.from(this.automationActions.entries()).map(([id, a]) => ({ id, label: a.label }))
    }
  }

  // 注册内置节点
  registry.registerTrigger('builtin-upload', '上传歌曲', async (ctx) => { console.log('Triggered upload', ctx) })
  registry.registerTrigger('builtin-play', '播放歌曲', async (ctx) => { console.log('Triggered play', ctx) })
  registry.registerTrigger('builtin-delete', '删除歌曲', async (ctx) => { console.log('Triggered delete', ctx) })
  registry.registerTrigger('builtin-cron', '定时任务', async (ctx) => { console.log('Triggered schedule', ctx) })
  
  registry.registerAction('builtin-tag', '自动补全Tag', async (ctx) => { console.log('Action: auto tag', ctx) })
  registry.registerAction('builtin-cover', '下载封面', async (ctx) => { console.log('Action: download cover', ctx) })
  registry.registerAction('builtin-move', '移动文件', async (ctx) => { console.log('Action: move file', ctx) })
  registry.registerAction('builtin-notify', '发送通知', async (ctx) => { console.log('Action: send notification', ctx) })
  registry.registerAction('builtin-remote', '推送到远程存储', async (ctx) => { console.log('Action: sync remote', ctx) })

  return {
    provide: {
      registry
    }
  }
})
