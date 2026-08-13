<script setup lang="ts">
import ApiGreeting from '@/components/ApiGreeting.vue'

interface Stat {
  label: string
  value: string
  delta: string
}

const stats: Stat[] = [
  { label: 'Active Users', value: '1,284', delta: '+12% this week' },
  { label: 'Sessions', value: '5,902', delta: '+4% this week' },
  { label: 'Errors', value: '17', delta: '-8% this week' },
  { label: 'Uptime', value: '99.98%', delta: 'last 30 days' },
]
</script>

<template>
  <section>
    <h1>Dashboard</h1>
    <div class="stat-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <span class="stat-label">{{ stat.label }}</span>
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-delta">{{ stat.delta }}</span>
      </div>
    </div>
    <ApiGreeting />
  </section>
</template>

<style scoped>
h1 {
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.25rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--color-heading);
}

.stat-delta {
  font-size: 0.8rem;
  color: hsla(160, 100%, 37%, 1);
}
</style>
