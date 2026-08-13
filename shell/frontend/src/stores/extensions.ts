import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getExtensionRegistry, type ExtensionManifest } from '@/services/extensions'

export const useExtensionsStore = defineStore('extensions', () => {
  const extensions = ref<ExtensionManifest[]>([])
  const loaded = ref(false)

  async function load() {
    extensions.value = await getExtensionRegistry()
    loaded.value = true
  }

  function byId(id: string): ExtensionManifest | undefined {
    return extensions.value.find((ext) => ext.id === id)
  }

  return { extensions, loaded, load, byId }
})
