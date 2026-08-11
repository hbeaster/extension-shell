import { describe, it, expect, afterEach } from 'vitest'

import { mount, type VueWrapper } from '@vue/test-utils'
import AppModal from '../AppModal.vue'

describe('AppModal', () => {
  let wrapper: VueWrapper | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  const mountModal = (open: boolean) =>
    mount(AppModal, {
      props: { open },
      slots: { default: 'Hi from Test' },
      attachTo: document.body,
    })

  it('renders nothing when closed', () => {
    wrapper = mountModal(false)
    expect(document.body.querySelector('.modal-panel')).toBeNull()
  })

  it('renders the dialog into the body when open', () => {
    wrapper = mountModal(true)
    const panel = document.body.querySelector('.modal-panel')
    expect(panel).not.toBeNull()
    expect(panel?.getAttribute('role')).toBe('dialog')
    expect(panel?.textContent).toContain('Hi from Test')
  })

  it('emits close when the close button is clicked', async () => {
    wrapper = mountModal(true)
    const button = document.body.querySelector<HTMLButtonElement>('.modal-close')
    button?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close when the backdrop is clicked', async () => {
    wrapper = mountModal(true)
    // Clicking the backdrop itself (not the panel) closes via @click.self.
    const backdrop = document.body.querySelector<HTMLElement>('.modal-backdrop')
    backdrop?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on Escape', async () => {
    wrapper = mountModal(true)
    await wrapper.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
