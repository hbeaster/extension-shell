<script setup lang="ts">
import { ref } from 'vue'

const displayName = ref('Jane Doe')
const theme = ref('system')
const emailNotifications = ref(true)
const weeklyDigest = ref(false)
</script>

<template>
  <section>
    <h1>Settings</h1>
    <form class="settings-form" @submit.prevent>
      <div class="field">
        <label for="display-name">Display name</label>
        <input id="display-name" v-model="displayName" type="text" />
      </div>

      <div class="field">
        <label for="theme">Theme</label>
        <select id="theme" v-model="theme">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <fieldset class="field">
        <legend>Notifications</legend>
        <label class="checkbox">
          <input v-model="emailNotifications" type="checkbox" />
          Email notifications
        </label>
        <label class="checkbox">
          <input v-model="weeklyDigest" type="checkbox" />
          Weekly digest
        </label>
      </fieldset>

      <button type="submit">Save changes</button>
    </form>
  </section>
</template>

<style scoped>
h1 {
  color: var(--color-heading);
  margin-bottom: 1.5rem;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 420px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: none;
  padding: 0;
}

label,
legend {
  font-size: 0.9rem;
  color: var(--color-heading);
  font-weight: 500;
}

input[type='text'],
select {
  padding: 0.5rem 0.75rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font: inherit;
}

input[type='text']:focus,
select:focus {
  outline: none;
  border-color: hsla(160, 100%, 37%, 1);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  color: var(--color-text);
}

button {
  align-self: flex-start;
  padding: 0.5rem 1.25rem;
  background: hsla(160, 100%, 37%, 1);
  color: white;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  background: hsla(160, 100%, 30%, 1);
}
</style>
