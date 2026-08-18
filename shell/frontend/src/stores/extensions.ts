import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getExtensions, type ExtensionDescriptor } from '@/services/extensions'

export const useExtensionsStore = defineStore('extensions', () => {
  const extensions = ref<ExtensionDescriptor[]>([])
  const loaded = ref(false)

  async function load() {
    extensions.value = await getExtensions()
    loaded.value = true
  }

  function byId(id: string): ExtensionDescriptor | undefined {
    return extensions.value.find((ext) => ext.id === id)
  }

  return { extensions, loaded, load, byId }
})
