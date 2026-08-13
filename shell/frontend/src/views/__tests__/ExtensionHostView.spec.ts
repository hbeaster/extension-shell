import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExtensionHostView from '../ExtensionHostView.vue'
import { loadExtensionModule, type ExtensionManifest } from '@/services/extensions'
import { useExtensionsStore } from '@/stores/extensions'
import { useShellContextStore } from '@/stores/shellContext'

vi.mock('@/services/extensions')

// Records what the element could see when it connected, which is how we assert
// that context attributes are set before insertion rather than after.
let contextAtConnect: Record<string, string | null> = {}

class SmileyFaceStub extends HTMLElement {
  connectedCallback() {
    contextAtConnect = {
      'shell-theme': this.getAttribute('shell-theme'),
      'shell-locale': this.getAttribute('shell-locale'),
    }
  }
}

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
    contextAtConnect = {}
    vi.mocked(loadExtensionModule).mockImplementation(async () => {
      // Mirror a real extension bundle: registering the tag is a side effect.
      if (!customElements.get('ext-smiley-face')) {
        customElements.define('ext-smiley-face', SmileyFaceStub)
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
    const shellContext = useShellContextStore()
    store.extensions = manifests
    store.loaded = true
    wrapper = mount(ExtensionHostView, { attachTo: document.body })
    return { store, shellContext, wrapper }
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

  it('sets context attributes before inserting the element', async () => {
    const { shellContext } = mountView()
    await flushPromises()

    // The element saw its context on connect, so it had theme and locale
    // available for its first render.
    expect(contextAtConnect).toEqual({
      'shell-theme': shellContext.theme,
      'shell-locale': shellContext.locale,
    })
  })

  it('updates context attributes in place without remounting', async () => {
    const { shellContext } = mountView()
    await flushPromises()

    const before = document.body.querySelector('ext-smiley-face')
    expect(before?.getAttribute('shell-theme')).toBe('light')

    shellContext.preference = 'dark'
    await flushPromises()

    const after = document.body.querySelector('ext-smiley-face')
    expect(after?.getAttribute('shell-theme')).toBe('dark')
    // Same element instance and no second import: a theme change must never
    // remount the extension or discard its state.
    expect(after).toBe(before)
    expect(loadExtensionModule).toHaveBeenCalledTimes(1)
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
