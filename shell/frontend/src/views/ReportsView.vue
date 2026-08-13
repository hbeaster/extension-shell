<script setup lang="ts">
interface Report {
  title: string
  description: string
  progress: number
}

const reports: Report[] = [
  { title: 'Q3 usage summary', description: 'Aggregated usage across all workspaces.', progress: 100 },
  { title: 'Onboarding funnel', description: 'Conversion from signup to first tool run.', progress: 72 },
  { title: 'Infrastructure cost review', description: 'Monthly spend breakdown by service.', progress: 45 },
  { title: 'Security posture audit', description: 'Dependency and access review for August.', progress: 10 },
]
</script>

<template>
  <section>
    <h1>Reports</h1>
    <ul class="report-list">
      <li v-for="report in reports" :key="report.title" class="report-card">
        <div class="report-info">
          <h2>{{ report.title }}</h2>
          <p>{{ report.description }}</p>
        </div>
        <div class="report-progress">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${report.progress}%` }"></div>
          </div>
          <span class="progress-label">{{ report.progress }}%</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
h1 {
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.report-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
}

.report-card {
  padding: 1rem 1.25rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.report-info h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.report-info p {
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.report-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-track {
  flex: 1;
  height: 8px;
  background: var(--color-background-mute);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: hsla(160, 100%, 37%, 1);
  border-radius: 999px;
}

.progress-label {
  font-size: 0.85rem;
  min-width: 3ch;
  text-align: right;
}
</style>
