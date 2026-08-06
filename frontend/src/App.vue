<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
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
