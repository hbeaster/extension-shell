# ADR 0012: Filesystem-scanned extension discovery with package.json manifests

- Status: Accepted
- Date: 2026-08-18
- Amends: [ADR 0006](./0006-web-component-extension-system.md), [ADR 0007](./0007-independent-extension-builds.md), [ADR 0009](./0009-mounted-extension-volumes.md)

## Context

ADR 0006 chose a static `registry.json`, merged at packaging time by `assemble.mjs`, and
explicitly rejected the alternative now being adopted: "*Backend discovery endpoint
(scanning manifests at runtime) adds a controller and runtime I/O for what is static,
build-time-known data.*" Two things have since falsified the premise in that sentence.

**The extensions directory is no longer build-time-known.** ADR 0009 and ADR 0010 made
`/app/wwwroot/extensions` a mount point: a PVC or an OCI image volume can be replaced
under a running pod by whoever populates it. The registry stayed a build artifact anyway,
which forced CONSUMPTION-19 to require that a volume carry a file the deployer had to
produce with *our* assembler — an inversion where the deployment surface (a directory of
folders) is described by an artifact only our build can legitimately create. Nothing
validates that the registry matches the folders beside it; a mismatch is silent.

**Extensions now need to describe more than three fields.** The platform is growing
capability metadata: what kind of extension this is (`WebComponent`, and `iFrame` later),
which standards it implements and requires, which data services it depends on. That
information is authored by the extension and belongs to it. Routing it through a merged
registry means every new field touches `assemble.mjs`, and the merged copy can drift from
the extension that owns it. A separate `extension.json` alongside `package.json` made this
worse: two manifests per extension, with `name` and `version` duplicated between them.

## Decision

**The contents of the extensions directory are the configuration.** There is no registry.

Each built extension ships exactly three files into `extensions/dist/<id>/`:
`package.json`, `extension.js`, and `icon.svg`. `extension.json` is deleted; an
extension describes itself in a `bc-extension` section of its own `package.json`:

```json
{
  "name": "ext-buzzer",
  "version": "1.0.0",
  "bc-extension": {
    "type": "WebComponent",
    "displayName": "Buzzer",
    "tag": "ext-buzzer",
    "module": "extension.js",
    "icon": "icon.svg",
    "discovery": {
      "implements": [ { "name": "extensions-standard", "versions": [ "1.1.1" ] } ],
      "requires": [ { "name": "DesignSystemStandard", "versions": [ "1.1.1", "2.0.0" ] } ]
    },
    "services": {
      "Standards-DocumentViewerService": { "optional": false, "versions": [ "2.0.0", "3.0.0" ] }
    }
  }
}
```

There is no `name` or `version` inside `bc-extension`: those are the package's own
top-level fields. `module` defaults to `extension.js` and `icon` to `icon.svg`.
`displayName` falls back to `name`. The `id` is not a field at all — it is the folder
name, which is what makes it unique without anything having to enforce uniqueness.

**Discovery is a new backend endpoint, `GET /api/extensions`**, which enumerates the
extensions root, reads each `package.json`, and returns a flat descriptor per extension
with `module` and `icon` resolved to `/extensions/<id>/<file>` URLs. The bundles and icons
themselves remain plain static assets; only the *list* is now computed.

**The scan runs on every request.** No cache, no startup snapshot. A remounted volume or a
developer's rebuild is visible on the next page load rather than the next restart.

**`discovery` and `services` are carried, not enforced.** They are parsed, returned, and
exposed in the frontend store, but the shell mounts every extension whose `type` it can
host regardless of whether the declared requirements can be satisfied. An extension
declaring a type the shell cannot host is omitted from the response and logged.

**One bad folder must not break the rest.** The scan skips and logs any folder that is
unreadable, has no `package.json`, has no `bc-extension` section, has a malformed
manifest, has a tag that is not `ext-` prefixed, names a `module`/`icon` outside its own
folder, or is missing its bundle. Everything intact still gets served.

## Considered alternatives

- **Keep `registry.json`, add the new fields to it.** The smallest change, and it keeps
  discovery free of backend code. Rejected because it preserves the mismatch that started
  this: a merged, build-time file describing a directory that deployers now populate, plus
  a growing schema that has to be mirrored in the assembler.
- **Scan once at startup and cache.** Cheaper, and discovery is called once per page load
  anyway. Rejected because it silently reintroduces the restart requirement that mount
  mode exists to avoid — a volume swapped under a running pod would do nothing until the
  Deployment rolled. At a handful of extensions the scan costs one directory enumeration
  and a few small reads; that is not worth a cache with a correct invalidation story.
  If the extension count ever reaches the hundreds, revisit with a watcher-invalidated
  cache; do not add one casually.
- **Enforce `discovery.requires` and `services` at load time.** The obvious eventual use
  for the metadata. Deferred deliberately: it needs the shell to declare what it provides,
  and a version-range matching rule, neither of which exists. Bundling that into this
  change would have made an already-broad change a capability-negotiation design too.
  It gets its own ADR.
- **Derive the custom-element tag from the package name, or detect it after import.**
  Would remove a field. Rejected: deriving couples an npm package name to a DOM tag name
  and breaks for scoped packages, and detecting it by diffing `customElements` before and
  after import is untestable when a module defines zero or several elements.
- **Serve the manifests and let the SPA assemble the list.** No backend code, closer to
  the old model. Rejected because the SPA cannot enumerate a directory; it would need an
  index file, which is the registry again.

## Consequences

- Shipping an extension is now "put a folder in the directory". Nothing has to be merged,
  regenerated, or kept in sync with a sibling file.
- **A stale folder is no longer inert.** Under the registry, a leftover extension folder on
  a mounted volume was unreachable because nothing referenced it. Now the folder *is* the
  configuration, so a deleted-but-not-cleaned extension reappears in the sidebar at
  whatever version was last copied. Every populate path must clear the target first — the
  example populate job's `rm -rf /target/*` changed from hygiene to a requirement.
- Discovery costs one directory enumeration and one small read per extension per call.
  `Cache-Control: no-store` plus the SPA's once-per-session fetch keeps that at roughly one
  scan per page load. It is a real change from a static file with ETag revalidation.
- The backend is no longer uninvolved in extensions. ADR 0003's single-container model is
  unaffected, but CONSUMPTION-01's "no API controller MUST be involved" is now false and is
  rewritten: assets stay static, discovery does not.
- `assemble.mjs` shrinks to a validator and copier. It still enforces what only a
  cross-extension view can see — tag uniqueness — and now also fails the build on the
  things the runtime scan would merely skip, so authors see the error rather than a
  missing sidebar entry.
- The shipped `package.json` is trimmed to `{ name, version, "bc-extension" }` rather than
  copied verbatim: it becomes publicly fetchable at `/extensions/<id>/package.json`, and
  `devDependencies`, `scripts`, and repo internals have no business being served. The
  scanner still tolerates a full `package.json`, so hand-populating a volume from source
  works.
- Discovery moving under `/api/*` weakens ADR 0006's stated reason for keeping the fetch
  out of `services/api.ts` ("the registry is a static asset"), but not the real one:
  `api.ts` throws, and `App.vue` calls this from `onMounted` with nothing to catch a
  rejection. The split stays, re-justified on failure semantics.
- The mismatch between a manifest `tag` and the tag its bundle actually registers is still
  unverifiable at packaging time — the bundle is opaque. The host view now checks
  `customElements.get(tag)` after import and reports a load error, turning a silently
  blank pane into a visible one.
- ADR 0006's web-component decision, ADR 0007's independent-build decision, and ADR 0009's
  two delivery modes all stand. Only the registry — and the `extension.json` manifest that
  fed it — is removed.
