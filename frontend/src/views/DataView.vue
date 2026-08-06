<script setup lang="ts">
interface Row {
  id: number
  name: string
  category: string
  status: 'Active' | 'Pending' | 'Archived'
  updated: string
}

const rows: Row[] = [
  { id: 101, name: 'Ingest pipeline', category: 'Infrastructure', status: 'Active', updated: '2026-08-01' },
  { id: 102, name: 'Customer export', category: 'Reporting', status: 'Pending', updated: '2026-07-28' },
  { id: 103, name: 'Legacy sync job', category: 'Integration', status: 'Archived', updated: '2026-05-14' },
  { id: 104, name: 'Billing webhook', category: 'Integration', status: 'Active', updated: '2026-08-03' },
  { id: 105, name: 'Audit log rollup', category: 'Infrastructure', status: 'Active', updated: '2026-07-30' },
  { id: 106, name: 'Weekly digest', category: 'Reporting', status: 'Pending', updated: '2026-08-04' },
]
</script>

<template>
  <section>
    <h1>Data</h1>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.category }}</td>
            <td>
              <span class="badge" :class="`badge-${row.status.toLowerCase()}`">{{ row.status }}</span>
            </td>
            <td>{{ row.updated }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
h1 {
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  text-align: left;
  padding: 0.6rem 1rem;
  white-space: nowrap;
}

thead th {
  background: var(--color-background-mute);
  color: var(--color-heading);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
}

tbody tr:nth-child(even) {
  background: var(--color-background-soft);
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
}

.badge-active {
  background: hsla(160, 100%, 37%, 0.15);
  color: hsla(160, 100%, 30%, 1);
}

.badge-pending {
  background: hsla(40, 100%, 50%, 0.15);
  color: hsla(40, 90%, 35%, 1);
}

.badge-archived {
  background: var(--color-background-mute);
  color: var(--color-text);
}
</style>
