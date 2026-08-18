# STD 001 — Extension Consumption by the Shell

Status: Active
Version: 2.0.0
Date: 2026-08-18
Related ADRs: [0003](../adr/0003-single-container-serving.md), [0006](../adr/0006-web-component-extension-system.md), [0007](../adr/0007-independent-extension-builds.md), [0008](../adr/0008-bidirectional-shell-extension-communication.md), [0009](../adr/0009-mounted-extension-volumes.md), [0010](../adr/0010-image-volume-extension-delivery.md), [0011](../adr/0011-remove-hostpath-extension-delivery.md), [0012](../adr/0012-filesystem-scanned-extension-discovery.md)

## 1. Purpose and scope

This standard defines how the shell discovers, serves, presents, loads, and tears down
extensions. It covers the discovery endpoint contract, the backend serving model, the
sidebar and routing integration, the host-view lifecycle, the context attributes the shell
writes to a mounted extension, and the two supported delivery modes (layered image and
mounted volume).

It does not cover how extensions themselves are built or how they communicate with the
shell — that is [STD 002](./002-extension-authoring-and-communication.md). The two
standards describe the two sides of the same contract decided in ADR 0006.

## 2. Audience

Developers working on the shell itself (`shell/`, `Dockerfile.extensions`,
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
- **Extensions root** — the directory holding one folder per installed extension. Its
  contents are the configuration; nothing else declares what is installed.
- **Extension catalog** — the backend component that scans the extensions root and
  produces the descriptor list served by the discovery endpoint.
- **Extension descriptor** — one object in the discovery response's `extensions` array:
  `{ id, name, displayName, version, type, tag, module, icon, discovery, services }`,
  where `module` and `icon` are URLs under `/extensions/<id>/`. Assembled by the catalog
  from the extension's own manifest; see CONSUMPTION-20.
- **Extension manifest** — the `bc-extension` section of an extension's `package.json`,
  defined normatively in [STD 002](./002-extension-authoring-and-communication.md) §5.2.
- **Extension Module** — the extension's self-contained ES module at the `module` URL.
- **Host element** — the DOM element the shell creates from a descriptor's `tag` and
  mounts inside the extension host view.
- **Context attribute** — a `shell-` prefixed attribute the shell sets on the host
  element to convey ambient state (currently `shell-theme` and `shell-locale`). The
  shell's only channel into a mounted extension; see §5.5.
- **Built-in tool** — a view that ships inside the shell codebase (dashboard, data,
  reports, settings), as opposed to an extension.

## 5. Requirements

### 5.1 Serving

- **CONSUMPTION-01** — All extension assets — bundles, icons, and manifests — MUST be served
  as static files under `/extensions/`; no backend code MUST be involved in delivering
  them. Discovery is the one exception: the list of installed extensions MUST come from
  `GET /api/extensions`, and that endpoint MUST derive it solely from the contents of the
  extensions root, never from a checked-in or generated index file.
- **CONSUMPTION-02** — In production, the extensions root MUST be `wwwroot/extensions`.
  The path is fixed; the source MAY be either assets baked into the image or a volume
  mounted over that path (see CONSUMPTION-15 and CONSUMPTION-19). The shell image itself
  MUST NOT contain extensions in either mode. The discovery scan and the static-file
  middleware MUST resolve the same root, through one shared code path, so a descriptor's
  asset URLs can never point somewhere the server does not serve.
- **CONSUMPTION-03** — For local development, the backend MAY point the extensions root at an
  external directory via the `Extensions:RootPath` configuration key, which governs both
  static serving and the discovery scan. This key MUST only be set in Development
  configuration (`appsettings.Development.json`), and the application MUST start and serve
  normally when the key is unset or the directory does not exist.
- **CONSUMPTION-04** — The frontend dev server MUST proxy `/extensions` (alongside `/api`) to the
  backend so that development and production resolve extension URLs identically.

### 5.2 Discovery

- **CONSUMPTION-05** — The shell MUST call `GET /api/extensions` once at application startup
  and hold the result in the extensions store for the lifetime of the session.
- **CONSUMPTION-06** — The endpoint MUST rescan the extensions root on every request and MUST
  NOT cache its result, so that a volume replaced under a running pod, or a dist rebuilt
  beside a running dev server, takes effect without a restart. Responses MUST be marked
  non-cacheable. It MUST answer HTTP 200 with `{ "extensions": [...] }` sorted by `id`,
  including when the root is absent or empty. A folder that cannot be read or does not
  describe a usable extension MUST be omitted and logged, never fail the response; an
  extension whose `type` the shell cannot host MUST likewise be omitted and logged. One
  malformed folder MUST NOT cost the intact ones their entries.
- **CONSUMPTION-07** — Every client-side discovery failure — network error, non-OK status,
  wrong content type, unparseable body, or missing `extensions` array — MUST resolve to an
  empty extension list. The shell MUST NOT surface an error to the user for absent or
  invalid discovery data: running with zero extensions is a normal state. The content-type
  check is REQUIRED: an SPA bundle newer than the backend serving it has no
  `/api/extensions` route, so the request falls through to `index.html` with HTTP 200 and
  status alone is not a reliable signal.
- **CONSUMPTION-08** — Discovery access MUST live in `shell/frontend/src/services/extensions.ts`,
  not `services/api.ts`, even though it now calls an `/api/*` endpoint. The two have
  deliberately different failure semantics: `api.ts` throws on error, and its callers
  render an error state; discovery is called from `App.vue`'s `onMounted` with nothing to
  catch a rejection, and soft-fails to an empty list. See ADR 0012.
- **CONSUMPTION-20** — A descriptor MUST carry
  `{ id, name, displayName, version, type, tag, module, icon, discovery, services }`.
  `id` is the extension's folder name and is both the URL segment `/extensions/<id>/` and
  the route segment `/ext/<id>`; it is not a manifest field. `name` and `version` are the
  package's top-level fields; `displayName` is the manifest's, falling back to `name` when
  absent. `module` and `icon` MUST be absolute URLs under `/extensions/<id>/`, derived from
  plain file names that default to `extension.js` and `icon.svg`; a manifest naming a
  `module` or `icon` outside its own folder MUST be rejected, not resolved.
  `discovery` and `services` MUST be carried verbatim from the manifest and exposed to the
  shell, and MUST NOT gate loading: the shell mounts a hostable extension whether or not
  its declared requirements can be satisfied. Enforcing them REQUIRES a new accepted ADR,
  per CONSUMPTION-16.

### 5.3 Presentation

- **CONSUMPTION-09** — The sidebar MUST render one entry per descriptor, using `displayName`
  and `icon`, linking to `/ext/<id>`. Extension entries MUST appear after the built-in
  tools, in the order the endpoint returns them (sorted by `id`, per CONSUMPTION-06).
- **CONSUMPTION-10** — The `/ext/:id` route MUST be a single generic host view. Unknown ids MUST
  be handled inside that view (see CONSUMPTION-12), not by the router's catch-all redirect.

### 5.4 Loading and lifecycle

- **CONSUMPTION-11** — To mount an extension, the host view MUST: dynamically import the
  descriptor's `module` URL (registering the custom element is a side effect of the
  import), create the host element with `document.createElement(tag)` using the
  descriptor's `tag`, set the current context attributes on it (see CONSUMPTION-17),
  attach its event listeners to the host element, and only then insert it into the DOM.
  Context attributes MUST be set before insertion so the extension has its context at
  first render.
- **CONSUMPTION-12** — An unknown extension id, a failed module import, or a module that
  imports without registering the descriptor's `tag` MUST render an in-view error message
  and MUST NOT mount an element or navigate away. The registration check is REQUIRED
  because nothing at packaging time can verify the tag a bundle registers, and without it
  a mismatch renders a silently inert element instead of an error.
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

- **CONSUMPTION-15** — Extensions MUST be delivered by one of two modes, and shipping them
  MUST NOT require rebuilding the shell image in either:
  - **Layered image (default)** — built assets are layered onto the unmodified shell image
    (`Dockerfile.extensions` builds each extension independently, assembles
    `extensions/dist/`, and copies it to `wwwroot/extensions/`). This MUST NOT require
    changing the Helm chart beyond pointing `image.repository`/`image.tag` at the layered
    image.
  - **Mounted volume** — an assembled dist is mounted over `wwwroot/extensions` in the pod,
    per CONSUMPTION-19. An assembled dist is one folder per extension and nothing else;
    it contains no index or registry file.

  The two modes MUST NOT be combined: a volume mounted over `wwwroot/extensions` shadows
  assets baked into a layered image, making them unreachable with no diagnostic. Mount mode
  MUST use the plain shell image.
- **CONSUMPTION-19** — A mounted extension volume MUST contain an assembled dist — one folder
  per extension, each holding a `package.json` with a `bc-extension` section, its module,
  and its icon, as produced by `extensions/scripts/assemble.mjs` — mounted read-only. No
  registry or index file exists, and none MUST be required. The shell MUST serve it with no
  additional configuration: the mount path is the shell's existing static-asset path, and
  `Extensions:RootPath` MUST NOT be used for this purpose (it remains Development-only per
  CONSUMPTION-03). An absent or empty volume MUST degrade to zero extensions, and a
  partially malformed one MUST degrade per folder (CONSUMPTION-06), never a startup
  failure. Because the folders themselves are the configuration, a stale folder is served
  and listed rather than ignored: a process that populates the volume MUST clear the target
  before copying, or removed extensions reappear at whatever version was last written.
- **CONSUMPTION-16** — Widening the shell/extension contract (new events, payloads, props, shared
  services, theming, a shell-to-extension channel) REQUIRES a new accepted ADR before any
  implementation, per ADR 0006.

## 6. Implementation pointers (informative)

The requirements above are implemented and tested here:

- Serving: `shell/backend/src/Shell.Api/Program.cs` (static-file middleware,
  `Extensions:RootPath` guard), `shell/backend/src/Shell.Api/ExtensionCatalog/ExtensionsRoot.cs`
  (the one root resolution both the middleware and the scan use),
  `shell/backend/src/Shell.Api/appsettings.Development.json`,
  `shell/frontend/vite.config.ts` (dev proxy — `/api` and `/extensions`, both still needed).
- Discovery, backend: `shell/backend/src/Shell.Api/ExtensionCatalog/FileSystemExtensionCatalog.cs`
  (the scan and its skip-and-log rules),
  `shell/backend/src/Shell.Api/ExtensionCatalog/ExtensionDescriptor.cs` (the wire shape),
  `shell/backend/src/Shell.Api/Controllers/ExtensionsController.cs`; behavior specified in
  `shell/backend/tests/Shell.Api.Tests/ExtensionCatalogTests.cs` and
  `ExtensionsEndpointTests.cs`.
- Discovery, frontend: `shell/frontend/src/services/extensions.ts` (soft-fail cases),
  `shell/frontend/src/stores/extensions.ts`, `shell/frontend/src/App.vue` (startup load);
  behavior specified in `shell/frontend/src/services/__tests__/extensions.spec.ts`.
- Presentation: `shell/frontend/src/components/AppSidebar.vue`,
  `shell/frontend/src/router/index.ts`.
- Lifecycle: `shell/frontend/src/views/ExtensionHostView.vue`; behavior specified in
  `shell/frontend/src/views/__tests__/ExtensionHostView.spec.ts`.
- Context attributes: `shell/frontend/src/stores/shellContext.ts` (the shell's theme and
  locale, with `system` resolved to a concrete value before it reaches an extension),
  `shell/frontend/src/views/ExtensionHostView.vue` (`applyContext`, set before insertion and
  updated by a watcher separate from the mount watcher so a change never remounts),
  `shell/frontend/src/components/AppSidebar.vue` (the theme control, reachable from an
  extension route); behavior specified in
  `shell/frontend/src/stores/__tests__/shellContext.spec.ts` and the host-view tests.
- Mounted delivery: `helm/shell/values.yaml` (the opt-in `extensions` block and the
  `podSecurityContext` passthrough a root-owned volume needs),
  `helm/shell/templates/deployment.yaml` (read-only `volumeMounts` entry at
  `/app/wwwroot/extensions`, verbatim `volumes` passthrough, and the fail-fast guard for
  `enabled` without a volume), `helm/shell/templates/NOTES.txt` (the shadowing warning),
  `helm/shell/examples/extensions-pvc.yaml` (example claim and populate recipe),
  `Dockerfile.extensions-image` and `helm/shell/examples/values-dev-imagevolume.yaml`
  (OCI image volume mount — a development convenience, and a shared-cluster option via
  a registry, distinct from CONSUMPTION-03, which governs running the backend directly
  rather than in a pod).
- Deployment: `Dockerfile.extensions`; runtime flow diagrams in
  [architecture snapshot 002](../architecture/002-extension-system.md); build and
  packaging flow in
  [architecture snapshot 003](../architecture/003-independent-extension-builds.md).

## 7. Conformance

A shell change touching the extension path conforms to this standard when:

- [ ] Extension assets are still served purely statically, and the scan and the static-file
      middleware still resolve one shared root (CONSUMPTION-01…CONSUMPTION-04).
- [ ] The endpoint still rescans per request, still returns 200 with a sorted list when the
      root is absent, and still omits-and-logs a bad folder rather than failing; the client
      fetch still soft-fails to an empty list in all five failure cases. Covered by the
      catalog, endpoint, and service tests (CONSUMPTION-05…CONSUMPTION-08).
- [ ] Descriptors carry the full field set, and `discovery`/`services` are still carried
      without gating a load (CONSUMPTION-20).
- [ ] Sidebar ordering and labelling and the generic `/ext/:id` host are preserved
      (CONSUMPTION-09, CONSUMPTION-10).
- [ ] Mount and teardown follow the import → verify tag → create → set attributes → listen →
      insert / remove-listener → remove-element sequence, covered by the host-view tests
      (CONSUMPTION-11…CONSUMPTION-14).
- [ ] Context attributes are set before insertion and updated in place, and the shell
      neither calls into the element nor reads state back off it
      (CONSUMPTION-17, CONSUMPTION-18).
- [ ] The plain shell image still works with zero extensions, and extensions ship either
      as a layered image or as a mounted volume, never both at once (CONSUMPTION-15).
- [ ] A mounted volume carries one folder per extension and no registry file, is read-only,
      needs no shell configuration, and degrades per folder when partly malformed
      (CONSUMPTION-19).
- [ ] Any contract widening has an accepted ADR (CONSUMPTION-16).

## 8. References

- [ADR 0012 — Filesystem-scanned extension discovery with package.json manifests](../adr/0012-filesystem-scanned-extension-discovery.md)
- [ADR 0006 — Web-component extension system with a static registry](../adr/0006-web-component-extension-system.md)
- [ADR 0007 — Independent extension builds](../adr/0007-independent-extension-builds.md)
- [ADR 0008 — Bidirectional shell/extension communication via context attributes](../adr/0008-bidirectional-shell-extension-communication.md)
- [ADR 0009 — Mounted extension volumes as a second delivery mode](../adr/0009-mounted-extension-volumes.md)
- [ADR 0003 — Single-container serving model](../adr/0003-single-container-serving.md)
- [Architecture 002 — Extension System](../architecture/002-extension-system.md)
- [Architecture 003 — Independent Extension Builds](../architecture/003-independent-extension-builds.md)
- [Architecture 006 — Mounted Extension Delivery](../architecture/006-mounted-extension-delivery.md)
- [Architecture 008 — Backend Extension Discovery](../architecture/008-backend-extension-discovery.md)
- [STD 002 — Extension Authoring and Shell Communication](./002-extension-authoring-and-communication.md)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)

## 9. Change log

| Version | Date | Change |
| --- | --- | --- |
| 2.0.0 | 2026-08-18 | **Breaking.** The registry is removed per ADR 0012: the extensions root's contents are the configuration, and discovery is `GET /api/extensions`, scanned per request. §4 drops **Registry**, renames **Manifest entry** to **Extension descriptor**, and adds **Extensions root**, **Extension catalog**, and **Extension manifest**. CONSUMPTION-01 now separates static asset delivery from endpoint-based discovery; -02 requires one shared root resolution; -03 extends `Extensions:RootPath` to the scan; §5.2 rewritten (-05 endpoint call, -06 per-request scan and per-folder degradation, -07 re-justified content-type check, -08 re-justified api.ts split); new -20 fixes the descriptor shape and makes `discovery`/`services` non-gating; -09 uses `displayName`; -12 adds the tag-registration failure; -15 and -19 drop the registry file and warn that stale folders are now served. |
| 1.4.0 | 2026-08-17 | §6 implementation pointers updated per ADR 0010/0011: the hostPath example is removed (unreliable on kind and Docker Desktop Kubernetes, no filesystem access from the node) and replaced by an OCI image volume example (`Dockerfile.extensions-image`, `values-dev-imagevolume.yaml`). No normative change — CONSUMPTION-15 and CONSUMPTION-19 remain volume-type-agnostic. |
| 1.3.0 | 2026-08-13 | Mounted extension volumes as a second delivery mode per ADR 0009: CONSUMPTION-02 now fixes the serving *path* while allowing either source; CONSUMPTION-15 rewritten to name two mutually exclusive modes; new CONSUMPTION-19 specifies the mounted volume's shape and failure behaviour. CONSUMPTION-03 unchanged — `Extensions:RootPath` stays Development-only. |
| 1.2.0 | 2026-08-10 | Bidirectional communication per ADR 0008: context attributes added (new §5.5, CONSUMPTION-17, CONSUMPTION-18); CONSUMPTION-11 and CONSUMPTION-14 rewritten; Deployment renumbered to §5.6. Corrected CONSUMPTION-02's cross-reference from CONSUMPTION-13 to CONSUMPTION-15. |
| 1.1.0 | 2026-08-06 | CONSUMPTION-15 wording updated for independent per-extension builds (ADR 0007); references to ADR 0007 and architecture 003. |
| 1.0.0 | 2026-08-06 | Initial standard, codifying ADR 0006 as implemented. |
