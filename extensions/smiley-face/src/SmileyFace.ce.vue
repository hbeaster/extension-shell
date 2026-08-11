<script setup lang="ts">
import { computed } from 'vue'

// Shell context arrives as attributes on our host element: shell-theme becomes
// shellTheme, shell-locale becomes shellLocale. Both are optional — the shell
// may set neither, and an unrecognised value must not break us — so every read
// falls back. We never write to the shell- namespace ourselves.
const props = defineProps<{ shellTheme?: string; shellLocale?: string }>()

const emit = defineEmits<{ 'shell:notify': [] }>()

const dark = computed(() => props.shellTheme === 'dark')

const face = computed(() =>
  dark.value
    ? { fill: '#d9a908', stroke: '#8a6a00', ink: '#2a1f00' }
    : { fill: '#ffd93b', stroke: '#e0b400', ink: '#5b3f00' },
)

const DEFAULT_HINT = 'Click the smiley to say hi to the shell'
const HINTS: Record<string, string> = {
  de: 'Klicke auf den Smiley, um Hallo zu sagen',
  es: 'Haz clic en la carita para saludar',
  fr: 'Clique sur le smiley pour dire bonjour',
}

const hint = computed(() => {
  const language = (props.shellLocale ?? '').split('-')[0].toLowerCase()
  return HINTS[language] ?? DEFAULT_HINT
})
</script>

<template>
  <div class="smiley-wrap">
    <button class="smiley" type="button" aria-label="Say hi to the shell" @click="emit('shell:notify')">
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        <circle cx="50" cy="50" r="46" :fill="face.fill" :stroke="face.stroke" stroke-width="3" />
        <circle cx="35" cy="40" r="6" :fill="face.ink" />
        <circle cx="65" cy="40" r="6" :fill="face.ink" />
        <path d="M 28 60 Q 50 82 72 60" fill="none" :stroke="face.ink" stroke-width="5" stroke-linecap="round" />
      </svg>
    </button>
    <p class="hint">{{ hint }}</p>
  </div>
</template>

<style>
.smiley-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.smiley {
  width: 240px;
  height: 240px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.smiley:hover {
  transform: scale(1.05);
}

.smiley:active {
  transform: scale(0.97);
}

.smiley svg {
  width: 100%;
  height: 100%;
}

.smiley circle,
.smiley path {
  transition:
    fill 0.3s ease,
    stroke 0.3s ease;
}

.hint {
  font-family: inherit;
  color: inherit;
  opacity: 0.7;
  margin: 0;
}
</style>
