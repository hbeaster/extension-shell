# STD 002 — Extension Authoring and Shell Communication

Status: Active
Version: 3.0.0
Date: 2026-08-10
Related ADRs: [0006](../adr/0006-web-component-extension-system.md), [0007](../adr/0007-independent-extension-builds.md), [0008](../adr/0008-bidirectional-shell-extension-communication.md)

## 1. Purpose and scope

This standard defines how to create an extension for the shell: its folder layout,
manifest, build output, custom-element behavior, and the communication contract between
an extension and the shell in both directions.

It does not cover how the shell serves and loads extensions — that is
[STD 001](./001-extension-consumption.md). The two standards describe the two sides of
the same contract decided in ADR 0006 and widened in ADR 0008.

## 2. Audience

Developers on tool teams building extensions in `extensions/`. No knowledge of the shell
codebase is required; conformance to this standard is the entire integration surface.

## 3. Normative language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY in this document are to be
interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) when, and only when, they appear in
all capitals, as shown here.

## 4. Definitions

- **Extension** — an independently built web component that plugs into the shell's
  sidebar and main view.
- **Manifest** — the extension's `extension.json` file declaring `{ id, name, tag }`.
- **Extension Module** — the single ES module the extension's build emits (`dist/<id>.js`).
- **Host element** — the DOM element the shell creates from the manifest `tag` and
  mounts in its extension view; the element your custom-element class is upgraded onto.
- **Context attribute** — a `shell-` prefixed attribute the shell sets on the host
  element to convey ambient state (currently theme and locale). Written by the shell,
  read by the extension; see §5.6.
- **Assembler** — `extensions/scripts/assemble.mjs`, shell-owned packaging tooling that
  aggregates independently built extension artifacts into `extensions/dist/` (bundles,
  icons, `registry.json`) for the shell to serve. Extensions never invoke or depend on
  it; it runs after they are built.

## 5. Requirements

### 5.1 Packaging

- **EXT-01** — An extension MUST be one fully standalone folder directly under
  `extensions/`: its own `package.json`, its own committed `package-lock.json`, and its
  own `node_modules`. It MUST NOT be part of any npm workspace or shared install.
- **EXT-02** — The folder MUST contain: `extension.json` (manifest), `icon.svg` (sidebar
  icon), a `package.json` whose `build` script produces the bundle, and a committed
  `package-lock.json`. The assembler fails packaging if the bundle or icon is missing.
- **EXT-03** — The extension MUST build in isolation: `npm ci && npm run build` run
  inside the folder on a clean checkout MUST succeed and produce `dist/<id>.js` without
  referencing anything outside the folder — no shared configs, no root install, no
  sibling extensions. (Shell tooling and `Dockerfile.extensions` auto-discover extension
  folders; there is no registration step anywhere.)

### 5.2 Manifest

All manifest rules are enforced by the assembler; violations fail packaging.

- **EXT-04** — The manifest MUST define exactly three fields, all required:
  `id`, `name`, `tag`.
- **EXT-05** — `id` MUST equal the extension's folder name. It becomes the URL segment
  (`/extensions/<id>/`), the bundle name (`<id>.js`), and the route (`/ext/<id>`).
- **EXT-06** — `tag` MUST start with `ext-` (custom-element names require a hyphen, and
  the prefix avoids collisions with shell and third-party elements).
- **EXT-07** — `id` and `tag` MUST each be unique across the installed extension set.
  Uniqueness is enforced by the shell's assembler at packaging time; a conflict is a
  packaging error the deployer resolves. Extension authors are not expected to
  coordinate with each other.
- **EXT-08** — `name` is the human-readable label the shell shows in the sidebar and in
  error messages; it SHOULD be short (one or two words).

### 5.3 Build output

- **EXT-09** — The build MUST emit a single self-contained ES module at
  `<folder>/dist/<id>.js` (Vite lib mode with `formats: ['es']` in the reference
  extensions).
- **EXT-10** — All runtime dependencies, including the UI framework, MUST be bundled
  into the module. The bundle MUST NOT declare externals or rely on shell globals,
  import maps, or shared runtimes. (Per ADR 0006, each extension bundling its own Vue
  runtime — roughly 29 KB gzip — is the accepted price of zero version coupling.)
- **EXT-11** — Any extension MAY use any framework or none; the shell only ever sees a
  custom element.
- **EXT-12** — Vue-based extensions MUST define `process.env.NODE_ENV` at build time
  (`define: { 'process.env.NODE_ENV': JSON.stringify('production') }` in
  `vite.config.ts`). Without it, the lib-mode ES output keeps the esm-bundler's
  `process.env` checks and crashes in the browser.

### 5.4 Custom element

- **EXT-13** — Importing the bundle MUST register the manifest `tag` with
  `customElements.define(...)` as a side effect, and that registration MUST be its only
  side effect. Registration MUST be guarded with `customElements.get(tag)` so a repeat
  import does not throw.
- **EXT-14** — The element MUST render entirely within itself. An extension MUST NOT
  modify the DOM outside its own element, register additional custom-element tags, or
  patch globals (`window`, `document`, prototypes).
- **EXT-15** — The element MUST NOT assume anything about its container beyond being
  appended to the DOM and receiving the context attributes defined in §5.6. The shell
  calls no methods on the element and assigns no properties to it beyond those its
  declared attributes reflect.

### 5.5 Communication with the shell

- **EXT-16** — The only channels between an extension and the shell are, outbound, DOM
  `CustomEvent`s dispatched on the extension's own host element, and inbound, context
  attributes set by the shell on that same element. Events dispatched on `document`,
  `window`, or any other element are not part of the contract and MUST NOT be relied on.
- **EXT-17** — Communication is bidirectional but asymmetric: extension → shell by
  `CustomEvent` on the host element, shell → extension by context attribute on the host
  element. There is no method-call, shared-service, shared-module, or direct-property
  channel in either direction, and the shell never reads state back off the element.
- **EXT-18** — The outbound event vocabulary is exactly one event: `shell:notify`, with
  no payload. Dispatching it causes the shell to open its notification modal. (In Vue,
  `defineEmits<{ 'shell:notify': [] }>()` plus `defineCustomElement` produces a
  conformant DOM event.)
- **EXT-19** — New events, event payloads, new context attributes, structured attribute
  values, or any additional channel in either direction REQUIRE a new accepted ADR
  before use, per ADR 0006 and ADR 0008. Until such an ADR exists, an extension MUST NOT
  dispatch events other than `shell:notify` with the expectation that the shell handles
  them, and MUST NOT depend on any attribute outside the vocabulary in §5.6.

### 5.6 Shell context attributes

- **EXT-23** — The inbound context-attribute vocabulary is exactly two attributes:
  `shell-theme` and `shell-locale`. Values MUST be treated as scalar strings —
  `shell-theme` is `light` or `dark`, `shell-locale` is a BCP 47 language tag. An
  extension MUST NOT expect structured or encoded values in either.
- **EXT-24** — The `shell-` attribute prefix is reserved to the shell. An extension MUST
  NOT define, set, or write to any `shell-` prefixed attribute on its own host element,
  and MUST NOT use the prefix for its own internal attributes.
- **EXT-25** — Honouring context attributes is OPTIONAL. An extension MUST tolerate an
  attribute being absent, empty, or carrying an unrecognised value, and MUST continue to
  function if one never arrives and never changes. An extension that ignores context
  attributes entirely is conformant.
- **EXT-26** — Context attributes MAY change at any time while the element is mounted.
  An extension that reacts to them MUST treat a change as an in-place update and MUST
  NOT re-initialise, remount, discard user input, or dispatch events in response.

### 5.7 Independence

- **EXT-20** — An extension MUST NOT import code from `shell/frontend/` or depend on the
  shell's framework or bundler versions. The manifest fields and the vocabularies in
  §5.5 and §5.6 are the entire contract.
- **EXT-21** — An extension MUST NOT be aware of, discover, address, communicate with,
  or depend on any other extension: no imports of another extension's code or types, no
  events aimed at another extension, no fetching `/extensions/registry.json` or
  otherwise enumerating installed extensions, and no assuming any other extension is
  (or is not) installed. Each extension behaves as if it were the only one installed.
- **EXT-22** — The shell is the only party with knowledge of the installed extension
  set. Any future cross-extension capability MUST be mediated by the shell under a new
  accepted ADR (per EXT-19); direct extension-to-extension channels are out of
  contract.

## 6. Reference implementation walk-through (informative)

`extensions/buzzer/` is the reference extension:

```
extensions/buzzer/
├── extension.json     # { "id": "buzzer", "name": "Buzzer", "tag": "ext-buzzer" }
├── package.json       # "build": "vite build"; vue as a real dependency (bundled)
├── package-lock.json  # committed — the extension's own lockfile (npm ci needs it)
├── vite.config.ts     # lib mode, formats: ['es'], fileName 'buzzer.js', NODE_ENV define
├── tsconfig.json
├── env.d.ts           # declares the *.ce.vue module type
├── icon.svg           # sidebar icon
└── src/
    ├── main.ts        # registration side effect (below)
    └── Buzzer.ce.vue  # the component; emits 'shell:notify'
```

`src/main.ts` — the entire entry point:

```ts
import { defineCustomElement } from 'vue'
import Buzzer from './Buzzer.ce.vue'

const TAG = 'ext-buzzer'
if (!customElements.get(TAG)) {
  customElements.define(TAG, defineCustomElement(Buzzer))
}
```

Reading context attributes is optional and needs no new machinery. In Vue, declare them
as props and `defineCustomElement` wires the attributes through; note the camelCase prop
name maps to the hyphenated attribute:

```ts
const props = defineProps<{ shellTheme?: string; shellLocale?: string }>()
const dark = computed(() => props.shellTheme === 'dark')
```

Without a framework, the same thing is `observedAttributes` plus
`attributeChangedCallback`. Either way the extension MUST still render sensibly when the
attributes are absent (EXT-25), because the shell may set neither.

Development loop: there is no HMR for extension bundles. Build inside the extension's
own folder (`npm ci && npm run build`), then run `node scripts/assemble.mjs` from
`extensions/` to write `extensions/dist/` — or `node scripts/build-all.mjs` to build
every extension independently and assemble in one go — and reload the shell. In
Development the backend serves `extensions/dist` at `/extensions` via
`Extensions:RootPath`. The assembler emits one registry entry per extension:

```json
{ "id": "buzzer", "name": "Buzzer", "tag": "ext-buzzer",
  "module": "/extensions/buzzer/buzzer.js", "icon": "/extensions/buzzer/icon.svg" }
```

## 7. Conformance

A new or changed extension conforms to this standard when:

- [ ] It is one standalone folder under `extensions/` with its own `package.json` and
      committed `package-lock.json`, part of no workspace or shared install
      (EXT-01…EXT-03).
- [ ] `npm ci && npm run build` succeeds inside the folder on a clean checkout, and
      `node scripts/assemble.mjs` passes — the assembler enforces the manifest rules
      and required files (EXT-04…EXT-08, EXT-02).
- [ ] The bundle is a single self-contained ES module with no externals, and (if Vue)
      defines `process.env.NODE_ENV` (EXT-09…EXT-12).
- [ ] Importing the bundle registers exactly the manifest `tag`, guarded, with no other
      side effects (EXT-13…EXT-15).
- [ ] It sends nothing but `shell:notify` on its own host element, or a later vocabulary
      backed by an accepted ADR (EXT-16…EXT-19).
- [ ] It renders correctly with the context attributes absent, does not write to the
      `shell-` namespace, and treats attribute changes as in-place updates
      (EXT-23…EXT-26).
- [ ] It imports nothing from the shell codebase and knows nothing of other extensions
      (EXT-20…EXT-22).

## 8. References

- [ADR 0006 — Web-component extension system with a static registry](../adr/0006-web-component-extension-system.md)
- [ADR 0007 — Independent extension builds](../adr/0007-independent-extension-builds.md)
- [ADR 0008 — Bidirectional shell/extension communication via context attributes](../adr/0008-bidirectional-shell-extension-communication.md)
- [Architecture 002 — Extension System](../architecture/002-extension-system.md)
- [Architecture 003 — Independent Extension Builds](../architecture/003-independent-extension-builds.md)
- [Architecture 005 — Bidirectional Communication](../architecture/005-bidirectional-communication.md)
- [STD 001 — Extension Consumption by the Shell](./001-extension-consumption.md)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)

## 9. Change log

| Version | Date | Change |
| --- | --- | --- |
| 3.0.0 | 2026-08-10 | Bidirectional communication per ADR 0008: shell → extension context attributes added (new §5.6, EXT-23…EXT-26); EXT-15, EXT-16, EXT-17 and EXT-19 rewritten; EXT-18 scoped to the outbound vocabulary; EXT-20 updated; Independence renumbered to §5.7. |
| 2.0.0 | 2026-08-06 | Independent builds per ADR 0007: standalone packages with own lockfiles (EXT-01…EXT-03 rewritten), packaging-time uniqueness (EXT-07), inter-extension awareness banned (new EXT-21, EXT-22). |
| 1.0.0 | 2026-08-06 | Initial standard, codifying ADR 0006 as implemented. |
