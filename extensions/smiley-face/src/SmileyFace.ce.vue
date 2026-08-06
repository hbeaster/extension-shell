<script setup lang="ts">
const emit = defineEmits<{ 'shell:notify': [] }>()
</script>

<template>
  <div class="smiley-wrap">
    <button class="smiley" type="button" aria-label="Say hi to the shell" @click="emit('shell:notify')">
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#ffd93b" stroke="#e0b400" stroke-width="3" />
        <circle cx="35" cy="40" r="6" fill="#5b3f00" />
        <circle cx="65" cy="40" r="6" fill="#5b3f00" />
        <path d="M 28 60 Q 50 82 72 60" fill="none" stroke="#5b3f00" stroke-width="5" stroke-linecap="round" />
      </svg>
    </button>
    <p class="hint">Click the smiley to say hi to the shell</p>
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

.hint {
  font-family: inherit;
  color: inherit;
  opacity: 0.7;
  margin: 0;
}
</style>
