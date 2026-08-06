import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExtensionHostView from '../ExtensionHostView.vue'
import { loadExtensionModule, type ExtensionManifest } from '@/services/extensions'
import { useExtensionsStore } from '@/stores/extensions'

vi.mock('@/services/extensions')

const routeParams = { id: 'smiley-face' }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
}))

const manifests: ExtensionManifest[] = [
  {
    id: 'smiley-face',
    name: 'Smiley Face',
    tag: 'ext-smiley-face',
    module: '/extensions/smiley-face/smiley-face.js',
    icon: '/extensions/smiley-face/icon.svg',
  },
]

describe('ExtensionHostView', () => {
  let wrapper: VueWrapper | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
    routeParams.id = 'smiley-face'
    vi.mocked(loadExtensionModule).mockImplementation(async () => {
      // Mirror a real extension bundle: registering the tag is a side effect.
      if (!customElements.get('ext-smiley-face')) {
        customElements.define('ext-smiley-face', class extends HTMLElement {})
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function mountView() {
    const store = useExtensionsStore()
    store.extensions = manifests
    store.loaded = true
    wrapper = mount(ExtensionHostView, { attachTo: document.body })
    return { store, wrapper }
  }

  it('loads the module and mounts the custom element', async () => {
    mountView()
    await flushPromises()

    expect(loadExtensionModule).toHaveBeenCalledWith('/extensions/smiley-face/smiley-face.js')
    const element = document.body.querySelector('ext-smiley-face')
    expect(element).not.toBeNull()
  })

  it('opens the modal with the extension name when shell:notify is emitted', async () => {
    mountView()
    await flushPromises()

    const element = document.body.querySelector('ext-smiley-face')
    element?.dispatchEvent(new CustomEvent('shell:notify'))
    await flushPromises()

    const panel = document.body.querySelector('.modal-panel')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('Hi from Smiley Face')
  })

  it('shows an error for an unknown extension id', async () => {
    routeParams.id = 'does-not-exist'
    mountView()
    await flushPromises()

    expect(wrapper!.find('[data-testid="extension-error"]').text()).toContain(
      'Unknown extension "does-not-exist"',
    )
    expect(loadExtensionModule).not.toHaveBeenCalled()
  })

  it('shows an error when the module fails to load', async () => {
    vi.mocked(loadExtensionModule).mockRejectedValue(new Error('boom'))
    mountView()
    await flushPromises()

    expect(wrapper!.find('[data-testid="extension-error"]').text()).toContain(
      'Failed to load "Smiley Face"',
    )
  })

  it('removes the element and listener on unmount', async () => {
    mountView()
    await flushPromises()

    expect(document.body.querySelector('ext-smiley-face')).not.toBeNull()
    wrapper!.unmount()
    wrapper = null
    expect(document.body.querySelector('ext-smiley-face')).toBeNull()
  })
})
