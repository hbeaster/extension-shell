<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import IconDocumentation from './icons/IconDocumentation.vue'
import IconTooling from './icons/IconTooling.vue'
import IconCommunity from './icons/IconCommunity.vue'
import IconSupport from './icons/IconSupport.vue'

interface Tool {
  to: string
  label: string
  icon: Component
}

const tools: Tool[] = [
  { to: '/tools/dashboard', label: 'Dashboard', icon: IconDocumentation },
  { to: '/tools/data', label: 'Data', icon: IconTooling },
  { to: '/tools/reports', label: 'Reports', icon: IconCommunity },
  { to: '/tools/settings', label: 'Settings', icon: IconSupport },
]
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <img alt="Shell logo" class="logo" src="@/assets/logo.svg" width="32" height="32" />
      <span class="title">Shell</span>
    </div>

    <nav class="tool-nav">
      <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tool-link">
        <component :is="tool.icon" class="icon" />
        <span class="label">{{ tool.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.logo {
  flex-shrink: 0;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}

.tool-nav {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
}

.tool-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  color: var(--color-text);
  border-left: 3px solid transparent;
}

.tool-link:hover {
  background-color: var(--color-background-mute);
}

.tool-link.router-link-active {
  background-color: var(--color-background-mute);
  border-left-color: hsla(160, 100%, 37%, 1);
  color: var(--color-heading);
}

.icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.label {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .title,
  .label {
    display: none;
  }

  .sidebar-header {
    justify-content: center;
    padding: 1rem 0.5rem;
  }

  .tool-link {
    justify-content: center;
    padding: 0.6rem 0;
  }
}
</style>
