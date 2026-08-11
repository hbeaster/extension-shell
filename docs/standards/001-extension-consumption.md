# STD 001 — Extension Consumption by the Shell

Status: Active
Version: 1.2.0
Date: 2026-08-10
Related ADRs: [0003](../adr/0003-single-container-serving.md), [0006](../adr/0006-web-component-extension-system.md), [0007](../adr/0007-independent-extension-builds.md), [0008](../adr/0008-bidirectional-shell-extension-communication.md)

## 1. Purpose and scope

This standard defines how the shell discovers, serves, presents, loads, and tears down
extensions. It covers the registry contract, the backend serving model, the sidebar and
routing integration, the host-view lifecycle, the context attributes the shell writes to
a mounted extension, and the deployment layering.

It does not cover how extensions themselves are built or how they communicate with the
shell — that is [STD 002](./002-extension-authoring-and-communication.md). The two
standards describe the two sides of the same contract decided in ADR 0006.

## 2. Audience

Developers working on the shell itself (`frontend/`, `backend/`, `Dockerfile*`,
`helm/shell/`). Extension authors need STD 002; they may read this standard to understand
what the shell guarantees.

## 3. Normative language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be
interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in
all capitals, as shown here.

## 4. Definitions

- **Shell** — the Vue 3 SPA plus the ASP.NET Core API that serves it, built and deployed
  as one container.
- **Extension** — an independently built web component that plugs into the shell's
  sidebar and main view without changing the shell codebase.
- **Registry** — the static file `/extensions/registry.json` listing all installed
  extensions.
- **Manifest entry** — one object in the registry's `extensions` array:
  `{ id, name, tag, module, icon }`, where `module` and `icon` are URLs under
  `/extensions/<id>/`.
- **Extension Module** — the extension's self-contained ES module at the `module` URL.
- **Host element** — the DOM element the shell creates from a manifest entry's `tag` and
  mounts inside the extension host view.
- **Context attribute** — a `shell-` prefixed attribute the shell sets on the host
  element to convey ambient state (currently `shell-theme` and `shell-locale`). The
  shell's only channel into a mounted extension; see §5.5.
- **Built-in tool** — a view that ships inside the shell codebase (dashboard, data,
  reports, settings), as opposed to an extension.

## 5. Requirements

### 5.1 Serving

- **CONSUMPTION-01** — The registry and all extension assets MUST be served as static files under
  `/extensions/`. No API controller or other backend code MUST be involved in extension
  discovery or delivery.
- **CONSUMPTION-02** — In production, extension assets MUST be served from `wwwroot/extensions`
  baked into the container image. The shell image itself MUST NOT contain extensions;
  they are layered on (see CONSUMPTION-15).
- **CONSUMPTION-03** — For local development, the backend MAY map `/extensions` to an external
  directory via the `Extensions:RootPath` configuration key. This key MUST only be set in
  Development configuration (`appsettings.Development.json`), and the application MUST
  start and serve normally when the key is unset or the directory does not exist.
- **CONSUMPTION-04** — The frontend dev server MUST proxy `/extensions` (alongside `/api`) to the
  backend so that development and production resolve extension URLs identically.

### 5.2 Discovery

- **CONSUMPTION-05** — The shell MUST fetch `/extensions/registry.json` once at application
  startup and hold the result in the extensions store for the lifetime of the session.
- **CONSUMPTION-06** — A registry response MUST be treated as valid only if the HTTP status is
  OK, the `Content-Type` includes `application/json`, and the parsed body contains an
  `extensions` array. The content-type check is REQUIRED because the SPA fallback answers
  missing files with `index.html` and HTTP 200, so status alone is not a reliable signal.
- **CONSUMPTION-07** — Every discovery failure — network error, non-OK status, wrong content
  type, unparseable body, or missing `extensions` array — MUST resolve to an empty
  extension list. The shell MUST NOT surface an error to the user for an absent or
  invalid registry: running with zero extensions is a normal state.
- **CONSUMPTION-08** — Registry access MUST live in `frontend/src/services/extensions.ts`, not
  `services/api.ts`. The two have deliberately different failure semantics: `api.ts`
  throws on error for `/api/*` endpoints; the registry soft-fails to an empty list.

### 5.3 Presentation

- **CONSUMPTION-09** — The sidebar MUST render one entry per registry entry, using the manifest
  `name` and `icon`, linking to `/ext/<id>`. Extension entries MUST appear after the
  built-in tools, in registry order (the registry is sorted by `id` at assembly time).
- **CONSUMPTION-10** — The `/ext/:id` route MUST be a single generic host view. Unknown ids MUST
  be handled inside that view (see CONSUMPTION-12), not by the router's catch-all redirect.

### 5.4 Loading and lifecycle

- **CONSUMPTION-11** — To mount an extension, the host view MUST: dynamically import the manifest
  `module` URL (registering the custom element is a side effect of the import), create
  the host element with `document.createElement(tag)` using the manifest `tag`, set the
  current context attributes on it (see CONSUMPTION-17), attach its event listeners to
  the host element, and only then insert it into the DOM. Context attributes MUST be set
  before insertion so the extension has its context at first render.
- **CONSUMPTION-12** — An unknown extension id or a failed module import MUST render an in-view
  error message and MUST NOT mount an element or navigate away.
- **CONSUMPTION-13** — On route change and on unmount, the host view MUST tear down completely:
  remove its event listeners from the host element and remove the element from the DOM.
- **CONSUMPTION-14** — The shell MUST listen for extension events only on the host element it
  created, never on `document` or `window`, and MUST write to an extension only through
  context attributes on that same element. The current inbound event vocabulary is
  `shell:notify` (no payload), which the shell answers by opening its modal; the full
  contract is defined in STD 002 §5.5 and §5.6.

### 5.5 Context attributes

- **CONSUMPTION-17** — The shell MUST set the current context attributes — `shell-theme`
  and `shell-locale` — on the host element before inserting it into the DOM, and MUST
  update them in place on the mounted element when a value changes. It MUST NOT remount,
  replace, or re-import the extension to deliver a changed value. Values MUST be scalar
  strings: `shell-theme` is `light` or `dark`, `shell-locale` is a BCP 47 language tag.
- **CONSUMPTION-18** — The shell MUST NOT call methods on the host element, assign
  properties to it beyond the context attributes, or read state back off it. The element
  is opaque to the shell: context flows in by attribute and out by event, and by nothing
  else. Extensions are not required to honour context attributes, so the shell MUST NOT
  depend on any observable reaction to one.

### 5.6 Deployment

- **CONSUMPTION-15** — Extensions MUST be delivered by layering built assets onto the unmodified
  shell image (`Dockerfile.extensions` builds each extension independently, assembles
  `extensions/dist/`, and copies it to `wwwroot/extensions/`). Shipping extensions MUST NOT require rebuilding the shell image
  or changing the Helm chart beyond pointing `image.repository`/`image.tag` at the
  layered image.
- **CONSUMPTION-16** — Widening the shell/extension contract (new events, payloads, props, shared
  services, theming, a shell-to-extension channel) REQUIRES a new accepted ADR before any
  implementation, per ADR 0006.

## 6. Implementation pointers (informative)

The requirements above are implemented and tested here:

- Serving: `backend/src/Shell.Api/Program.cs` (static-file middleware, `Extensions:RootPath`
  guard), `backend/src/Shell.Api/appsettings.Development.json`, `frontend/vite.config.ts`
  (dev proxy).
- Discovery: `frontend/src/services/extensions.ts` (soft-fail cases),
  `frontend/src/stores/extensions.ts`, `frontend/src/App.vue` (startup load);
  behavior specified in `frontend/src/services/__tests__/extensions.spec.ts`.
- Presentation: `frontend/src/components/AppSidebar.vue`, `frontend/src/router/index.ts`.
- Lifecycle: `frontend/src/views/ExtensionHostView.vue`; behavior specified in
  `frontend/src/views/__tests__/ExtensionHostView.spec.ts`.
- Context attributes: `frontend/src/stores/shellContext.ts` (the shell's theme and
  locale, with `system` resolved to a concrete value before it reaches an extension),
  `frontend/src/views/ExtensionHostView.vue` (`applyContext`, set before insertion and
  updated by a watcher separate from the mount watcher so a change never remounts),
  `frontend/src/components/AppSidebar.vue` (the theme control, reachable from an
  extension route); behavior specified in
  `frontend/src/stores/__tests__/shellContext.spec.ts` and the host-view tests.
- Deployment: `Dockerfile.extensions`; runtime flow diagrams in
  [architecture snapshot 002](../architecture/002-extension-system.md); build and
  packaging flow in
  [architecture snapshot 003](../architecture/003-independent-extension-builds.md).

## 7. Conformance

A shell change touching the extension path conforms to this standard when:

- [ ] Extension assets are still served purely statically (CONSUMPTION-01…CONSUMPTION-04).
- [ ] The registry fetch still soft-fails to an empty list in all five failure cases,
      covered by the service tests (CONSUMPTION-05…CONSUMPTION-08).
- [ ] Sidebar ordering and the generic `/ext/:id` host are preserved (CONSUMPTION-09, CONSUMPTION-10).
- [ ] Mount and teardown follow the import → create → set attributes → listen → insert /
      remove-listener → remove-element sequence, covered by the host-view tests
      (CONSUMPTION-11…CONSUMPTION-14).
- [ ] Context attributes are set before insertion and updated in place, and the shell
      neither calls into the element nor reads state back off it
      (CONSUMPTION-17, CONSUMPTION-18).
- [ ] The plain shell image still works with zero extensions, and extensions still ship
      as a layered image (CONSUMPTION-15).
- [ ] Any contract widening has an accepted ADR (CONSUMPTION-16).

## 8. References

- [ADR 0006 — Web-component extension system with a static registry](../adr/0006-web-component-extension-system.md)
- [ADR 0007 — Independent extension builds](../adr/0007-independent-extension-builds.md)
- [ADR 0008 — Bidirectional shell/extension communication via context attributes](../adr/0008-bidirectional-shell-extension-communication.md)
- [ADR 0003 — Single-container serving model](../adr/0003-single-container-serving.md)
- [Architecture 002 — Extension System](../architecture/002-extension-system.md)
- [Architecture 003 — Independent Extension Builds](../architecture/003-independent-extension-builds.md)
- [STD 002 — Extension Authoring and Shell Communication](./002-extension-authoring-and-communication.md)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)

## 9. Change log

| Version | Date | Change |
| --- | --- | --- |
| 1.2.0 | 2026-08-10 | Bidirectional communication per ADR 0008: context attributes added (new §5.5, CONSUMPTION-17, CONSUMPTION-18); CONSUMPTION-11 and CONSUMPTION-14 rewritten; Deployment renumbered to §5.6. Corrected CONSUMPTION-02's cross-reference from CONSUMPTION-13 to CONSUMPTION-15. |
| 1.1.0 | 2026-08-06 | CONSUMPTION-15 wording updated for independent per-extension builds (ADR 0007); references to ADR 0007 and architecture 003. |
| 1.0.0 | 2026-08-06 | Initial standard, codifying ADR 0006 as implemented. |
