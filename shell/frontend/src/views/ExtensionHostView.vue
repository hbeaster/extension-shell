<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import { loadExtensionModule } from '@/services/extensions'
import { useExtensionsStore } from '@/stores/extensions'
import { useShellContextStore } from '@/stores/shellContext'

const route = useRoute()
const store = useExtensionsStore()
const shellContext = useShellContextStore()

const host = ref<HTMLElement | null>(null)
const error = ref<string | null>(null)
const modalMessage = ref<string | null>(null)

let element: HTMLElement | null = null
let notifyHandler: (() => void) | null = null

// Context reaches an extension only as attributes on its own host element: the
// shell calls no methods on it, assigns it no properties, and reads nothing back.
function applyContext(target: HTMLElement) {
  target.setAttribute('shell-theme', shellContext.theme)
  target.setAttribute('shell-locale', shellContext.locale)
}

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
  // Wait until both the extension list and the host element are available; the
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
    error.value = `Failed to load "${ext.displayName}".`
    return
  }
  // The bundle registers its own tag, and nothing at packaging time can check
  // that the literal it uses matches the manifest — the bundle is opaque. Catch
  // the mismatch here, or createElement silently yields an inert element.
  if (!customElements.get(ext.tag)) {
    error.value = `"${ext.displayName}" did not register <${ext.tag}>.`
    return
  }
  element = document.createElement(ext.tag)
  // Attributes, then listeners, then insertion. Context has to be in place for
  // the extension's first render, and a listener attached after insertion could
  // miss anything dispatched while the element connects.
  applyContext(element)
  notifyHandler = () => {
    modalMessage.value = `Hi from ${ext.displayName}`
  }
  element.addEventListener('shell:notify', notifyHandler)
  host.value.appendChild(element)
}

watch([() => route.params.id, () => store.loaded, host], mountExtension, { immediate: true })

// Deliberately a separate watcher: a theme or locale change updates the mounted
// element in place, and must never remount the extension or lose its state.
watch([() => shellContext.theme, () => shellContext.locale], () => {
  if (element) {
    applyContext(element)
  }
})

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
