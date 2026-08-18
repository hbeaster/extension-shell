import { describe, it, expect, beforeEach } from 'vitest'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'
import { useExtensionsStore } from '@/stores/extensions'
import { type ExtensionDescriptor } from '@/services/extensions'
import { useShellContextStore } from '@/stores/shellContext'

const descriptor = (id: string, displayName: string): ExtensionDescriptor => ({
  id,
  name: `ext-${id}`,
  displayName,
  version: '1.0.0',
  type: 'WebComponent',
  tag: `ext-${id}`,
  module: `/extensions/${id}/extension.js`,
  icon: `/extensions/${id}/icon.svg`,
  discovery: null,
  services: null,
})

describe('AppSidebar', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const mountSidebar = () =>
    mount(AppSidebar, {
      global: {
        plugins: [pinia],
        stubs: { RouterLink: RouterLinkStub },
      },
    })

  it('renders a link for each tool', () => {
    const wrapper = mountSidebar()
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links).toHaveLength(4)
    expect(links.map((link) => link.props('to'))).toEqual([
      '/tools/dashboard',
      '/tools/data',
      '/tools/reports',
      '/tools/settings',
    ])
  })

  it('renders the tool labels', () => {
    const wrapper = mountSidebar()
    const labels = wrapper.findAll('.tool-nav .label').map((label) => label.text())
    expect(labels).toEqual(['Dashboard', 'Data', 'Reports', 'Settings'])
  })

  it('renders a link with an icon for each installed extension', () => {
    const store = useExtensionsStore()
    // name is the npm package name and displayName is the label — they differ
    // here so the sidebar cannot pass by reading the wrong one.
    store.extensions = [
      descriptor('smiley-face', 'Smiley Face'),
      descriptor('buzzer', 'Buzzer'),
    ]

    const wrapper = mountSidebar()
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links).toHaveLength(6)
    expect(links[4]?.props('to')).toBe('/ext/smiley-face')
    expect(links[5]?.props('to')).toBe('/ext/buzzer')

    const icons = wrapper.findAll('img.icon')
    expect(icons.map((icon) => icon.attributes('src'))).toEqual([
      '/extensions/smiley-face/icon.svg',
      '/extensions/buzzer/icon.svg',
    ])
    const labels = wrapper.findAll('.tool-nav .label').map((label) => label.text())
    expect(labels).toEqual(['Dashboard', 'Data', 'Reports', 'Settings', 'Smiley Face', 'Buzzer'])
  })

  it('toggles the shell theme, which is what reaches mounted extensions', async () => {
    const shellContext = useShellContextStore()
    const wrapper = mountSidebar()
    const toggle = wrapper.find('[data-testid="theme-toggle"]')

    expect(shellContext.theme).toBe('light')
    expect(toggle.attributes('aria-label')).toBe('Switch to dark theme')

    await toggle.trigger('click')
    expect(shellContext.theme).toBe('dark')
    expect(toggle.attributes('aria-label')).toBe('Switch to light theme')

    await toggle.trigger('click')
    expect(shellContext.theme).toBe('light')
  })
})
