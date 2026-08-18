# ADR 0009: Mounted extension volumes as a second delivery mode

- Status: Accepted
- Date: 2026-08-13
- Amends: [ADR 0006](./0006-web-component-extension-system.md), [ADR 0007](./0007-independent-extension-builds.md)

## Context

ADR 0006 established one way to ship extensions, and CONSUMPTION-15 made it normative: build a layered image with `Dockerfile.extensions` and point the Helm chart's `image.repository`/`image.tag` at it. That satisfied the goal it was written for — the shell image stays free of extension references — but it ties the release cadence of *static files* to an image build.

The consequence is a mismatch between what an extension is and what it costs to ship. An extension bundle is an ES module and an SVG; nothing in it executes at build time. Yet changing one means building an image, pushing it to a registry, and rolling the Deployment. Operators who already have a way to place files in a cluster — a PVC someone syncs into, an NFS share, a CSI volume populated by an existing pipeline — cannot use it, and cannot ship extensions on a cadence separate from the shell.

Nothing about the runtime contract requires the image path. The shell resolves extensions entirely through `/extensions/registry.json` and the URLs inside it; it has no knowledge of how the bytes arrived.

## Decision

Support **mounting a pre-assembled extension dist into the pod** as a second delivery mode, alongside the layered image. Layering remains the default and is unchanged.

The Helm chart gains an opt-in `extensions` block:

- `extensions.enabled` turns the mode on; `extensions.volume` is a **raw volume spec passed through verbatim**, so any volume type works. Producing and populating the volume is the operator's concern and outside this repo.
- The volume is mounted **read-only over `/app/wwwroot/extensions`** — the image's own static-asset path. The existing `app.UseStaticFiles()` on `wwwroot` then serves it.
- The volume MUST contain an **assembled dist**: `registry.json` plus one folder per extension, byte-for-byte what `extensions/scripts/assemble.mjs` produces at `extensions/dist/`.

This required **no backend change**. `Program.cs` already serves `wwwroot` statically, and kubelet creates the mount directory even though it does not exist in the plain `shell` image.

STD 001 is amended to match: CONSUMPTION-02 keeps `wwwroot/extensions` mandatory as the *path* while allowing either source; CONSUMPTION-15 names two supported modes; and new CONSUMPTION-19 specifies the mounted volume's required shape and failure behaviour.

## Considered alternatives

- **Assemble in-cluster from per-extension volumes** — one volume per extension, merged into a registry by an initContainer at pod start. Attractive because deployments could mix and match extensions without a rebuild, but it moves the registry invariant (id/tag uniqueness, id-matches-folder, sorted order) out of build time into every pod start, and requires a merge runtime plus a second copy of the assembler in the cluster. Rejected: the registry is a build artifact, and keeping one implementation of that validation is worth more than deployment-time composition.
- **`Extensions:RootPath` in production** — mount anywhere and point the existing dev-only overlay at it with an env var. Works today with no chart-side path assumptions, and the `Directory.Exists` guard makes a bad path a clean no-op. Rejected to keep CONSUMPTION-03 intact: that key is Development-only by design, and widening it would blur a boundary the standard draws deliberately.
- **ConfigMap-based delivery** — GitOps-friendly and needs no external storage, but the 1 MiB etcd limit is already tight against the two sample bundles (~185 KB), binary assets need base64, and it would put build output in Helm values. Rejected as a scaling dead end; nothing prevents an operator supplying a ConfigMap through `extensions.volume` if they accept the limit.

## Consequences

- Extensions can be released independently of the shell image, on the operator's cadence and through whatever storage they already run.
- **Mounting shadows baked extensions.** With a layered `shell-ext` image *and* a mounted volume, the volume wins and the baked assets become unreachable, silently — the mount covers the directory. Mount mode expects the plain `shell` image. The chart's NOTES.txt warns about this; nothing enforces it.
- The registry contract is untouched. The volume carries the same `registry.json` the assembler generates, so discovery, ordering, and uniqueness behave identically in both modes.
- A missing, empty, or malformed volume is not an error. A missing `registry.json` returns a clean 404 — `MapFallbackToFile` is registered with the `nonfile` route constraint, so a dotted last segment bypasses the SPA fallback rather than being answered with `index.html` — and CONSUMPTION-07 requires every discovery failure, non-OK status included, to resolve to an empty extension list. The shell still starts and serves its built-in tools. The failure mode is invisible by design, so the NOTES point at `kubectl exec ... ls` for diagnosis.
- Extension contents become an operational surface outside CI's reach. In layered mode a bad bundle is caught in a build; in mount mode it reaches the pod directly. Whoever populates the volume owns that validation.
- The chart gains a `podSecurityContext` passthrough, because a volume whose files are root-owned is unreadable by the image's unprivileged `app` user without `fsGroup`.
- ADR 0006's web-component and static-registry decisions and ADR 0007's independent-build decisions stand unchanged; only the single-delivery-path aspect of CONSUMPTION-15 is widened.
