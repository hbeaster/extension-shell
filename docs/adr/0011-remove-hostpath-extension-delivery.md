# ADR 0011: Remove the hostPath extension delivery example

- Status: Accepted
- Date: 2026-08-17
- Amends: [ADR 0009](./0009-mounted-extension-volumes.md), [ADR 0010](./0010-image-volume-extension-delivery.md)

## Context

`helm/shell/examples/values-dev-hostpath.yaml` documented a `hostPath`-based local-dev
workflow: mount `extensions/dist` straight from the node's filesystem, so a rebuild is
the whole loop.

In practice it failed outright on the environment it was meant to serve. Docker Desktop
Kubernetes and kind run the node as a container with no view of the host filesystem —
every path convention tried failed with `MountVolume.SetUp failed ... hostPath type
check failed: <path> is not a directory`. The example's own notes grew to cover four
different fixes depending on cluster flavor (self-managed kind `extraMounts`, `docker cp`
into the node, `minikube mount`, or a genuinely host-visible node on plain Linux/k3s),
none of which is "just works." ADR 0010 already used this as its motivating case and
added the `image` volume type as an alternative that sidesteps the problem entirely by
never touching the node's filesystem.

With the image volume verified working — first attempt, no per-platform workaround, same
image-load mechanism the chart already needs for the `shell` image itself — the hostPath
example no longer earns its complexity. It solves the same problem the image volume
solves, worse, and only on cluster types where the node happens to see the host disk.

## Decision

Remove `helm/shell/examples/values-dev-hostpath.yaml` and every documentation reference
to it (README.md, STD 001 §6 implementation pointers). Supported extension delivery is
now exactly three shapes:

1. **Layered image** (default) — `Dockerfile.extensions`.
2. **Mounted volume, PVC** — `helm/shell/examples/extensions-pvc.yaml`, for shared
   clusters with RWX-capable storage.
3. **Mounted volume, image** — `Dockerfile.extensions-image` +
   `helm/shell/examples/values-dev-imagevolume.yaml` (ADR 0010), for local dev and for
   shared clusters via a registry.

This does not change `extensions.volume`'s contract. ADR 0009's "raw spec, any volume
type works" stands — an operator who wants a hostPath volume can still supply one
directly. What changes is that this repo no longer builds, tests, or documents an
example for it.

## Consequences

- One fewer example to keep working across cluster flavors; the two remaining local-dev-
  capable modes (PVC's populate job, or the image volume) both avoid node-filesystem
  assumptions entirely.
- README.md's "Extension delivery" section and STD 001 §6 now list three concrete
  recipes instead of two-plus-a-caveat-heavy-third.
- Nothing in the Helm chart itself changes — `extensions.volume` was always a pass-
  through, so no template or `values.yaml` edit was needed to drop hostPath, and none is
  needed if an operator reintroduces it locally.
- Anyone who copied the old hostPath example into a fork keeps a working file; only this
  repo's copy and its documentation trail are removed.
