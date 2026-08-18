import { describe, it, expect, vi, afterEach } from 'vitest'

import { getExtensions, type ExtensionDescriptor } from '../extensions'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const buzzer: ExtensionDescriptor = {
  id: 'buzzer',
  name: 'ext-buzzer',
  displayName: 'Buzzer',
  version: '1.0.0',
  type: 'WebComponent',
  tag: 'ext-buzzer',
  module: '/extensions/buzzer/extension.js',
  icon: '/extensions/buzzer/icon.svg',
  discovery: null,
  services: null,
}

describe('getExtensions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the extension list from the discovery endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ extensions: [buzzer] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getExtensions()).resolves.toEqual([buzzer])
    expect(fetchMock).toHaveBeenCalledWith('/api/extensions', {
      headers: { Accept: 'application/json' },
    })
  })

  it('carries discovery and services through untouched', async () => {
    const withMetadata: ExtensionDescriptor = {
      ...buzzer,
      discovery: {
        implements: [{ name: 'extensions-standard', versions: ['1.1.1'] }],
        requires: [{ name: 'DesignSystemStandard', versions: ['1.1.1', '2.0.0'] }],
      },
      // The service key is an author-chosen identifier, not a JSON property
      // name: its hyphens and casing must survive the round trip verbatim.
      services: {
        'Standards-DocumentViewerService': { optional: false, versions: ['2.0.0', '3.0.0'] },
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ extensions: [withMetadata] })))

    const [result] = await getExtensions()
    expect(result?.discovery).toEqual(withMetadata.discovery)
    expect(result?.services).toEqual(withMetadata.services)
    expect(Object.keys(result?.services ?? {})).toEqual(['Standards-DocumentViewerService'])
  })

  it('returns an empty list when the SPA fallback answers with index.html', async () => {
    const fallback = new Response('<!doctype html><html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fallback))

    await expect(getExtensions()).resolves.toEqual([])
  })

  it('returns an empty list on a non-ok response', async () => {
    const error = new Response('{}', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(error))

    await expect(getExtensions()).resolves.toEqual([])
  })

  it('returns an empty list when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network error')))

    await expect(getExtensions()).resolves.toEqual([])
  })

  it('returns an empty list when the payload has no extensions array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ something: 'else' })))

    await expect(getExtensions()).resolves.toEqual([])
  })
})
