/// <reference types="vite/client" />

declare module '*.ce.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
