# ADR 0006: Web-component extension system with a static registry

- Status: Accepted
- Date: 2026-08-05
- Amended by: [ADR 0007](./0007-independent-extension-builds.md) (workspace build replaced by independent per-extension builds)
- Amended by: [ADR 0008](./0008-bidirectional-shell-extension-communication.md) (one-directional event channel replaced by a bidirectional, asymmetric one)

## Context

The shell is maintained by a core team, but other teams need to ship additional UI tools without changing the shell codebase or its release cadence. Extensions must plug into the sidebar and the main view, communicate with the shell, and be deployable independently of the shell image. Options considered: (a) framework-agnostic web components discovered via a static registry file, (b) module federation of Vue components, (c) iframes per extension, (d) a backend API endpoint for extension discovery.

## Decision

Extensions are **custom elements (web components)** authored with Vue's `defineCustomElement`, each built by its own Vite lib-mode build into a self-contained ES module (Vue runtime bundled per extension, ~29 KB gzip). They live in an `extensions/` npm workspace at the repository root, sibling to the `shell/` application rather than inside it.

Discovery is a **static `registry.json`** at `/extensions/registry.json`, assembled at build time by `extensions/scripts/assemble.mjs` from per-extension `extension.json` manifests (`{ id, name, tag }`; `id` matches the folder, `tag` is `ext-` prefixed and unique — the script fails the build otherwise). Each entry resolves to `module` and `icon` URLs under `/extensions/<id>/`.

Delivery is a **layered Docker image**: `Dockerfile.extensions` builds the workspace and copies `extensions/dist/` into the shell image's `wwwroot/extensions/`, so extensions are served by the existing static-file middleware with no backend code involved. In development the backend maps `/extensions` to `extensions/dist` via the `Extensions:RootPath` config key (Development settings only), and Vite proxies `/extensions` to the backend.

The shell fetches the registry at startup into a Pinia store, appends sidebar entries after the built-in tools, and hosts extensions at `/ext/:id`, where it dynamically imports the module and creates the custom element. Extensions talk to the shell only via DOM `CustomEvent`s dispatched on their host element (currently `shell:notify`, which opens a shell modal).

The registry fetch lives in `shell/frontend/src/services/extensions.ts`, not `services/api.ts`: `api.ts`'s contract is `/api/*` endpoints with throw-on-error semantics, while the registry is a static asset whose absence is a normal state (soft-fail to an empty list). The SPA fallback answers missing files with `index.html` and HTTP 200, so the service validates the response content type before parsing.

## Considered alternatives

- **Module federation** shares the Vue runtime and allows richer integration, but couples extensions to the shell's bundler/framework versions — the opposite of the isolation goal.
- **Iframes** give the strongest isolation but poor UX integration (theming, sizing, events) and heavier per-extension overhead.
- **Backend discovery endpoint** (scanning manifests at runtime) adds a controller and runtime I/O for what is static, build-time-known data; the static registry keeps the backend untouched.

## Consequences

- Extensions deploy by rebuilding only the extensions image; the shell image and codebase are untouched. Adding an extension = new folder + workspace entry.
- Each extension bundles its own Vue runtime — accepted duplication in exchange for zero shell/extension version coupling; extensions could equally be written with any framework or none.
- The shell/extension contract is deliberately narrow: manifest fields + DOM events. Widening it (props, shared services, theming) needs a new ADR.
- The plain shell image keeps working with zero extensions installed (registry fetch soft-fails).
- Extension assets are served unversioned with ETag revalidation; content-hashed filenames are a future improvement if caching becomes an issue.
