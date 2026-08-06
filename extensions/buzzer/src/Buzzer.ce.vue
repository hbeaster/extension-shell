<script setup lang="ts">
const emit = defineEmits<{ 'shell:notify': [] }>()

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
  <div class="buzzer-wrap">
    <button class="buzzer" type="button" @click="press">BUZZ</button>
    <p class="hint">Press the buzzer</p>
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
    box-shadow 0.05s ease;
}

.buzzer:active {
  transform: translateY(8px);
  box-shadow:
    0 2px 0 #8e1c1c,
    0 4px 10px rgba(0, 0, 0, 0.35);
}

.hint {
  font-family: inherit;
  color: inherit;
  opacity: 0.7;
  margin: 0;
}
</style>
