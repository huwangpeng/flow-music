export default defineNuxtPlugin(() => {
  const registry = {
    scriptPages: new Map<string, { title: string, path: string, entry: string }>(),
    storageProviders: new Map<string, any>(),
    uploadHandlers: new Map<string, any>(),

    registerScriptPage(id: string, title: string, path: string, entry: string) {
      this.scriptPages.set(id, { title, path, entry })
    },

    getScriptPages() {
      return Array.from(this.scriptPages.entries()).map(([id, page]) => ({ id, ...page }))
    }
  }

  return {
    provide: {
      registry
    }
  }
})
