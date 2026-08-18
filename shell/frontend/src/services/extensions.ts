// Extension discovery. This is deliberately separate from api.ts even though
// it now calls an /api/* endpoint: api.ts throws on error, and this is called
// from App.vue's onMounted with nothing to catch a rejection. Running with zero
// extensions is a normal state, so every failure resolves to an empty list.
// See ADR 0012.

export interface ExtensionCapabilityRef {
  name: string
  versions: string[]
}

export interface ExtensionDiscovery {
  implements: ExtensionCapabilityRef[]
  requires: ExtensionCapabilityRef[]
}

export interface ExtensionServiceRequirement {
  optional: boolean
  versions: string[]
}

export interface ExtensionDescriptor {
  id: string
  name: string
  displayName: string
  version: string
  type: 'WebComponent'
  tag: string
  module: string
  icon: string
  // Declared standards and data services, carried for inspection only: the
  // shell mounts an extension whether or not they can be satisfied.
  discovery: ExtensionDiscovery | null
  services: Record<string, ExtensionServiceRequirement> | null
}

export async function getExtensions(): Promise<ExtensionDescriptor[]> {
  let response: Response
  try {
    response = await fetch('/api/extensions', {
      headers: { Accept: 'application/json' },
    })
  } catch {
    return []
  }

  // A shell whose SPA bundle is newer than its backend has no /api/extensions
  // route, so the request falls through to index.html with HTTP 200 — the
  // status alone is not a reliable signal.
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok || !contentType.includes('application/json')) {
    return []
  }

  try {
    const body = (await response.json()) as { extensions?: ExtensionDescriptor[] }
    return Array.isArray(body?.extensions) ? body.extensions : []
  } catch {
    return []
  }
}

// Importing the module registers the extension's custom element as a side
// effect. Kept as an indirection so tests can mock module loading.
export function loadExtensionModule(url: string): Promise<unknown> {
  return import(/* @vite-ignore */ url)
}
