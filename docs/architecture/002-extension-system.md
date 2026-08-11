# 002 — Extension System

Date: 2026-08-05
Related ADRs: [0006](../adr/0006-web-component-extension-system.md)
Previous snapshot: [001](./001-initial-architecture.md)

## What changed

The shell now supports UI extensions: self-contained web components (custom elements) built outside the shell codebase, served as static assets under `/extensions/`, discovered at startup via a static `registry.json`, listed in the sidebar, and rendered at `/ext/:id`. Extensions communicate with the shell via DOM `CustomEvent`s. Extensions ship in a second Docker image layered on the shell image, so they deploy independently of the shell.

## Image layering

```mermaid
flowchart LR
    subgraph extBuild [Stage: node:24-alpine]
        E[npm ci + npm run build<br/>per-extension vite lib builds<br/>+ assemble.mjs] --> ed[extensions/dist<br/>registry.json + bundles + icons]
    end
    subgraph shellImg [Base: shell image]
        W[/app/wwwroot<br/>Vue dist + API/]
    end
    subgraph extImg [Final: shell-ext image]
        WE[/app/wwwroot/extensions/<br/>registry.json<br/>smiley-face/ buzzer//]
    end
    shellImg -->|FROM shell:latest| extImg
    ed -->|COPY| WE
```

The shell image (`Dockerfile`) is unchanged and still runs standalone — with no `/extensions` files installed, the registry fetch soft-fails and the sidebar shows only the built-in tools. `Dockerfile.extensions` builds the `extensions/` npm workspace and copies `extensions/dist/` into `wwwroot/extensions/`; everything else (entrypoint, port, user, probes) is inherited.

## Runtime flow

```mermaid
sequenceDiagram
    participant B as Browser (shell SPA)
    participant S as ASP.NET Core static files
    participant X as Extension custom element

    B->>S: GET /extensions/registry.json (on startup)
    S-->>B: registry (or index.html fallback → treated as "no extensions")
    Note over B: Pinia extensions store<br/>sidebar adds one entry per extension
    B->>B: navigate to /ext/:id (ExtensionHostView)
    B->>S: dynamic import /extensions/:id/:id.js
    S-->>B: ES module (side effect: customElements.define)
    B->>X: document.createElement(tag), append to view
    X-->>B: CustomEvent "shell:notify"
    B->>B: open AppModal — "Hi from {name}"
```

## Extension contract

- **Manifest** (`extensions/<id>/extension.json`): `{ id, name, tag }`; `id` equals the folder name, `tag` starts with `ext-`. `assemble.mjs` validates both and fails the build on duplicates.
- **Registry** (`/extensions/registry.json`, built artifact): `{ "extensions": [{ id, name, tag, module, icon }] }` with `module`/`icon` URLs under `/extensions/<id>/`.
- **Events**: extensions dispatch `CustomEvent`s on their own host element; the shell listens on the element it created. Current events: `shell:notify` → shell shows a modal with the extension's name.

## Development-time architecture

```mermaid
flowchart LR
    D[Browser] --> V[Vite dev server :5173]
    V -->|proxy /api/*| B[ASP.NET Core :5000]
    V -->|proxy /extensions/*| B
    B -->|StaticFiles /extensions<br/>Extensions:RootPath| ED[extensions/dist]
```

`Extensions:RootPath` (set only in `appsettings.Development.json`) points the backend at `extensions/dist`; the mapping is skipped when the key is absent or the folder does not exist, so production and the no-extensions case need no configuration. Rebuild extensions with `npm run build` in `extensions/` to see changes (no HMR for extension bundles).
