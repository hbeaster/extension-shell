<script setup lang="ts">
import { computed } from 'vue'

// Shell context arrives as attributes on our host element: shell-theme becomes
// shellTheme, shell-locale becomes shellLocale. Both are optional — the shell
// may set neither, and an unrecognised value must not break us — so every read
// falls back. We never write to the shell- namespace ourselves.
const props = defineProps<{ shellTheme?: string; shellLocale?: string }>()

const emit = defineEmits<{ 'shell:notify': [] }>()

const dark = computed(() => props.shellTheme === 'dark')

const DEFAULT_HINT = 'Press the buzzer'
const HINTS: Record<string, string> = {
  de: 'Drücke den Summer',
  es: 'Pulsa el timbre',
  fr: 'Appuie sur le buzzer',
}

const hint = computed(() => {
  const language = (props.shellLocale ?? '').split('-')[0].toLowerCase()
  return HINTS[language] ?? DEFAULT_HINT
})

function press() {
  // The AudioContext must be created inside the user gesture to satisfy
  // browser autoplay policies.
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sawtooth'
  oscillator.frequency.value = 110
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + 0.8)
  oscillator.onended = () => ctx.close()

  emit('shell:notify')
}
</script>

<template>
  <div class="buzzer-wrap" :class="{ dark }">
    <button class="buzzer" type="button" @click="press">BUZZ</button>
    <p class="hint">{{ hint }}</p>
  </div>
</template>

<style>
.buzzer-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
}

.buzzer {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 35% 30%, #ff5f52, #c62828 70%);
  box-shadow:
    0 10px 0 #8e1c1c,
    0 14px 24px rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    transform 0.05s ease,
    box-shadow 0.05s ease,
    background 0.3s ease;
}

.buzzer:active {
  transform: translateY(8px);
  box-shadow:
    0 2px 0 #8e1c1c,
    0 4px 10px rgba(0, 0, 0, 0.35);
}

.dark .buzzer {
  background: radial-gradient(circle at 35% 30%, #c8443a, #8e1c1c 70%);
  box-shadow:
    0 10px 0 #571010,
    0 14px 24px rgba(0, 0, 0, 0.6);
}

.dark .buzzer:active {
  box-shadow:
    0 2px 0 #571010,
    0 4px 10px rgba(0, 0, 0, 0.6);
}

.hint {
  font-family: inherit;
  color: inherit;
  opacity: 0.7;
  margin: 0;
}
</style>
