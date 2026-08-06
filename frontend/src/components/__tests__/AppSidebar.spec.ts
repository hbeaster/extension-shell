import { describe, it, expect, beforeEach } from 'vitest'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'
import { useExtensionsStore } from '@/stores/extensions'

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
    const labels = wrapper.findAll('.label').map((label) => label.text())
    expect(labels).toEqual(['Dashboard', 'Data', 'Reports', 'Settings'])
  })

  it('renders a link with an icon for each installed extension', () => {
    const store = useExtensionsStore()
    store.extensions = [
      {
        id: 'smiley-face',
        name: 'Smiley Face',
        tag: 'ext-smiley-face',
        module: '/extensions/smiley-face/smiley-face.js',
        icon: '/extensions/smiley-face/icon.svg',
      },
      {
        id: 'buzzer',
        name: 'Buzzer',
        tag: 'ext-buzzer',
        module: '/extensions/buzzer/buzzer.js',
        icon: '/extensions/buzzer/icon.svg',
      },
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
    const labels = wrapper.findAll('.label').map((label) => label.text())
    expect(labels).toEqual(['Dashboard', 'Data', 'Reports', 'Settings', 'Smiley Face', 'Buzzer'])
  })
})
