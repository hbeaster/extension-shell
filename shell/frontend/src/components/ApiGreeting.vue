<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHello, type HelloResponse } from '@/services/api'

const data = ref<HelloResponse | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    data.value = await getHello()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <section class="api-greeting">
    <h3>Backend says:</h3>
    <p v-if="data" data-testid="message">{{ data.message }} ({{ data.serverTimeUtc }})</p>
    <p v-else-if="error" data-testid="error" class="error">{{ error }}</p>
    <p v-else data-testid="loading">Loading…</p>
  </section>
</template>

<style scoped>
.api-greeting {
  margin-top: 2rem;
}
.error {
  color: var(--vt-c-text-light-2, #b00020);
}
</style>
