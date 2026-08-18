<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink } from 'vue-router'
import IconDocumentation from './icons/IconDocumentation.vue'
import IconTooling from './icons/IconTooling.vue'
import IconCommunity from './icons/IconCommunity.vue'
import IconSupport from './icons/IconSupport.vue'
import { useExtensionsStore } from '@/stores/extensions'
import { useShellContextStore } from '@/stores/shellContext'

const extensionsStore = useExtensionsStore()
const shellContext = useShellContextStore()

// Reachable from every route, including an extension host: changing the theme
// here updates a mounted extension's context attributes in place.
function toggleTheme() {
  shellContext.preference = shellContext.theme === 'dark' ? 'light' : 'dark'
}

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
      <RouterLink
        v-for="ext in extensionsStore.extensions"
        :key="ext.id"
        :to="`/ext/${ext.id}`"
        class="tool-link"
      >
        <img :src="ext.icon" class="icon" alt="" />
        <span class="label">{{ ext.displayName }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="theme-toggle"
        data-testid="theme-toggle"
        :aria-label="shellContext.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
      >
        <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            v-if="shellContext.theme === 'dark'"
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle
            v-if="shellContext.theme === 'dark'"
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            v-else
            d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linejoin="round"
          />
        </svg>
        <span class="label">{{ shellContext.theme === 'dark' ? 'Light' : 'Dark' }}</span>
      </button>
    </div>
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

.sidebar-footer {
  margin-top: auto;
  padding: 0.5rem 0;
  border-top: 1px solid var(--color-border);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.6rem 1rem;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.theme-toggle:hover {
  background-color: var(--color-background-mute);
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

  .tool-link,
  .theme-toggle {
    justify-content: center;
    padding: 0.6rem 0;
  }
}
</style>
