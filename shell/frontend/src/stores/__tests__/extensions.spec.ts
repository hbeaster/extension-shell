import { describe, it, expect, vi, beforeEach } from 'vitest'

import { createPinia, setActivePinia } from 'pinia'
import { useExtensionsStore } from '../extensions'
import { getExtensions, type ExtensionDescriptor } from '@/services/extensions'

vi.mock('@/services/extensions')

const descriptors: ExtensionDescriptor[] = [
  {
    id: 'smiley-face',
    name: 'ext-smiley-face',
    displayName: 'Smiley Face',
    version: '1.0.0',
    type: 'WebComponent',
    tag: 'ext-smiley-face',
    module: '/extensions/smiley-face/extension.js',
    icon: '/extensions/smiley-face/icon.svg',
    discovery: null,
    services: null,
  },
]

describe('extensions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getExtensions).mockResolvedValue(descriptors)
  })

  it('starts empty and not loaded', () => {
    const store = useExtensionsStore()
    expect(store.extensions).toEqual([])
    expect(store.loaded).toBe(false)
  })

  it('load() populates extensions and marks the store loaded', async () => {
    const store = useExtensionsStore()
    await store.load()
    expect(store.extensions).toEqual(descriptors)
    expect(store.loaded).toBe(true)
  })

  it('byId finds a descriptor and returns undefined for unknown ids', async () => {
    const store = useExtensionsStore()
    await store.load()
    expect(store.byId('smiley-face')).toEqual(descriptors[0])
    expect(store.byId('nope')).toBeUndefined()
  })
})
