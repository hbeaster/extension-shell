import { describe, it, expect } from 'vitest'

import { mount, RouterLinkStub } from '@vue/test-utils'
import AppSidebar from '../AppSidebar.vue'

describe('AppSidebar', () => {
  const mountSidebar = () =>
    mount(AppSidebar, {
      global: {
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
})
