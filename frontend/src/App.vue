<script setup lang="ts">
import { onBeforeUnmount, onMounted, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import { useExtensionsStore } from './stores/extensions'
import { useShellContextStore } from './stores/shellContext'

const extensionsStore = useExtensionsStore()
const shellContext = useShellContextStore()

let stopSystemThemeWatch: (() => void) | null = null

// The shell applies its own context to the document; extensions receive the
// same values as attributes on their host element (see ExtensionHostView).
watchEffect(() => {
  document.documentElement.dataset.theme = shellContext.theme
  document.documentElement.lang = shellContext.locale
})

onMounted(() => {
  extensionsStore.load()
  stopSystemThemeWatch = shellContext.watchSystemTheme()
})

onBeforeUnmount(() => {
  stopSystemThemeWatch?.()
  stopSystemThemeWatch = null
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.app-main {
  padding: 2rem;
  overflow-y: auto;
  min-width: 0;
}

@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 56px 1fr;
  }

  .app-main {
    padding: 1rem;
  }
}
</style>
