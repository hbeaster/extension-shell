import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/tools/dashboard',
    },
    {
      path: '/tools/dashboard',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/tools/data',
      name: 'data',
      // route level code-splitting: each tool view below is lazy-loaded
      // into its own chunk when the route is first visited.
      component: () => import('../views/DataView.vue'),
    },
    {
      path: '/tools/reports',
      name: 'reports',
      component: () => import('../views/ReportsView.vue'),
    },
    {
      path: '/tools/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      // Generic host for installed extensions; unknown ids are handled
      // inside the view rather than by the catch-all redirect.
      path: '/ext/:id',
      name: 'extension',
      component: () => import('../views/ExtensionHostView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/tools/dashboard',
    },
  ],
})

export default router
