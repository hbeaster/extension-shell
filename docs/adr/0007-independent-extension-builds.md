# ADR 0007: Independent extension builds and packaging

- Status: Accepted
- Date: 2026-08-06
- Amends: [ADR 0006](./0006-web-component-extension-system.md)

## Context

ADR 0006's isolation goal — extensions integrate only through the manifest and DOM events — was contradicted by the build layer. Extensions lived in one npm workspace: a single shared `package-lock.json` and hoisted `node_modules` meant one extension's dependency change could shift another's resolved versions; adding an extension required editing two shared files (the `workspaces` array in `extensions/package.json` and a per-extension `COPY` list in `Dockerfile.extensions`); one `npm run build` built everything together; and STD 002 framed `id`/`tag` uniqueness as something authors coordinate among themselves. Extensions were coupled to each other at package time, and parties other than the shell had to know the full extension set.

The intended invariant: each extension is independently built and packaged, and the shell (including its packaging tooling and deployment) is the only party that knows about extensions.

## Decision

Each extension is a **standalone npm package**: its own `package.json`, its own committed `package-lock.json`, its own `node_modules`. It builds in isolation with `npm ci && npm run build` inside its folder, referencing nothing outside it. There is no workspace and no root `package.json` in `extensions/` — leaving one would invite a shared install and silently reintroduce the coupling.

All aggregation is **shell-owned**:

- `extensions/scripts/build-all.mjs` (dependency-free Node script) auto-discovers extension folders (any direct child with an `extension.json`), builds each independently from its own lockfile, then runs the assembler. It is a convenience; extensions never invoke or depend on it.
- `extensions/scripts/assemble.mjs` remains the packaging step that validates manifests and produces `extensions/dist/` + `registry.json`. Its cross-extension `id`/`tag` uniqueness check is a packaging-time conflict the deployer resolves, not author coordination.
- `Dockerfile.extensions` copies `extensions/` wholesale and runs `build-all.mjs` — no per-extension COPY list, no shared `npm ci`.

STD 002 (v2.0.0) makes the invariant normative: EXT-01…EXT-03 require standalone folders that build in isolation, and new EXT-21/EXT-22 forbid an extension from being aware of, discovering, or communicating with any other extension — the shell is the only party with knowledge of the installed set.

## Considered alternatives

- **Keep the npm workspace** — simpler installs and deduped dependencies, but it is exactly the coupling being removed: shared lockfile, shared version resolution, shared membership file.
- **One Docker build stage per extension** — would restore per-extension layer caching, but reintroduces a hardcoded per-extension list in a shell-owned file, defeating auto-discovery.
- **One repository (or artifact feed) per extension** — the natural end state this decision enables, but out of scope for the POC; in-repo standalone folders prove the model without new infrastructure.

## Consequences

- Adding an extension = adding a folder. Nothing else changes anywhere — no workspace entry, no Dockerfile edit, no shell change.
- Dev dependencies and build config are duplicated per extension (each has its own vite/typescript install and lockfile); independent version drift between extensions is by design, not a bug.
- Docker layer caching is coarser: `COPY extensions/ ./` invalidates on any source change and every build re-runs each extension's `npm ci`. Accepted for the POC; per-extension cache mounts or CI-built artifacts are future options.
- Per-extension lockfiles must be committed or `npm ci` fails locally and in the image build.
- ADR 0006's web-component, static-registry, and layered-image decisions stand unchanged; only its workspace-build aspect is superseded.
