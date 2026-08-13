<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      // Wait for the panel to render before moving focus into the dialog.
      requestAnimationFrame(() => panel.value?.focus())
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="emit('close')">
      <div
        ref="panel"
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
      >
        <h2 id="modal-title" class="modal-title"><slot name="title">Notification</slot></h2>
        <div class="modal-body"><slot /></div>
        <button class="modal-close" type="button" @click="emit('close')">Close</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
}

.modal-panel {
  min-width: 280px;
  max-width: 90vw;
  padding: 1.5rem;
  border-radius: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.modal-title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  color: var(--color-heading);
}

.modal-body {
  margin-bottom: 1.25rem;
  color: var(--color-text);
}

.modal-close {
  padding: 0.4rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
  color: var(--color-text);
  cursor: pointer;
}

.modal-close:hover {
  background: var(--color-background-mute);
}
</style>
