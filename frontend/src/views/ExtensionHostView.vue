<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import { loadExtensionModule } from '@/services/extensions'
import { useExtensionsStore } from '@/stores/extensions'

const route = useRoute()
const store = useExtensionsStore()

const host = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)
const modalMessage = ref<string | null>(null)

let element: HTMLElement | null = null
let notifyHandler: (() => void) | null = null

function teardown() {
  if (element && notifyHandler) {
    element.removeEventListener('shell:notify', notifyHandler)
  }
  element?.remove()
  element = null
  notifyHandler = null
}

async function mountExtension() {
  teardown()
  error.value = null
  // Wait until both the registry and the host element are available; the
  // watcher fires again when either arrives (e.g. hard refresh on /ext/:id).
  if (!store.loaded || !host.value) {
    return
  }
  const id = String(route.params.id)
  const ext = store.byId(id)
  if (!ext) {
    error.value = `Unknown extension "${id}".`
    return
  }
  try {
    await loadExtensionModule(ext.module)
  } catch {
    error.value = `Failed to load "${ext.name}".`
    return
  }
  element = document.createElement(ext.tag)
  notifyHandler = () => {
    modalMessage.value = `Hi from ${ext.name}`
  }
  element.addEventListener('shell:notify', notifyHandler)
  host.value.appendChild(element)
}

watch([() => route.params.id, () => store.loaded, host], mountExtension, { immediate: true })

onBeforeUnmount(teardown)
</script>

<template>
  <div class="extension-host">
    <p v-if="error" class="extension-error" data-testid="extension-error">{{ error }}</p>
    <div ref="host" class="extension-mount" data-testid="extension-mount"></div>

    <AppModal :open="modalMessage !== null" @close="modalMessage = null">
      <template #title>Extension says</template>
      {{ modalMessage }}
    </AppModal>
  </div>
</template>

<style scoped>
.extension-host {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.extension-error {
  color: var(--color-heading);
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 1rem;
}

.extension-mount {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
