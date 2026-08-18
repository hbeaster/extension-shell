# ADR 0010: OCI image volumes as an extension delivery variant

- Status: Accepted
- Date: 2026-08-17
- Amends: [ADR 0009](./0009-mounted-extension-volumes.md)

## Context

ADR 0009 made `extensions.volume` a raw, pass-through volume spec — "any volume type works" was the explicit design intent, so this ADR is not a new decision so much as documenting a specific volume type worth naming: Kubernetes' `image` volume source (KEP-4639), which reached GA in 1.36.

The motivating case was concrete: `values-dev-hostpath.yaml`'s hostPath mount fails on Docker Desktop Kubernetes / kind, because the node runs as a container with no view of the host filesystem — `MountVolume.SetUp failed ... hostPath type check failed: <path> is not a directory` for every path convention tried (see that file's notes). Fix B there (`docker cp` the dist into the node) works but is a manual, per-node filesystem hack.

An `image` volume sidesteps the problem entirely: it never touches the node's filesystem. It mounts the unpacked contents of an OCI image read-only, using the same image-load path the chart already requires for the `shell` image itself (`docker save | ctr images import`, `pullPolicy: Never` for local dev). It also behaves identically in a shared cluster, where the image is pushed to and pulled from an ordinary registry — unlike hostPath, which the chart's own docs mark local-single-node-only.

## Decision

Document and provide a worked example for extension delivery via `extensions.volume.image`, alongside the existing hostPath and PVC examples:

- `Dockerfile.extensions-image` (repo root) builds the assembled `extensions/dist` as a standalone OCI image — `FROM scratch`, no runtime, never executed as a container. Mirrors `Dockerfile.extensions`'s build stage but skips layering onto the shell image.
- `helm/shell/examples/values-dev-imagevolume.yaml` sets:
  ```yaml
  extensions:
    volume:
      image:
        reference: shell-extensions:latest
        pullPolicy: Never
  ```
  with notes on loading the image into a local node (kind/Docker Desktop via `ctr images import`, minikube via `minikube image load`) versus referencing a registry tag in a shared cluster.

No chart template changes were needed — `extensions.volume` already passes any volume spec through verbatim (`helm/shell/templates/deployment.yaml`).

Verified working: built the image, loaded it into a Docker Desktop Kubernetes node (`desktop-control-plane`, v1.36.1 / containerd 2.3.1), installed the chart, and confirmed the pod reached `1/1 Running` on the first attempt with `registry.json` and both extension folders visible at `/app/wwwroot/extensions` — no node-filesystem workaround required.

## Considered alternatives

- **Only document Fix B (`docker cp` into the node) for local dev** — this is what ADR 0009's hostPath example already does, and it works, but it is a manual step tied to a specific node container name and repeated after every rebuild with no clear cluster-portable equivalent. Rejected as the sole answer because the image volume gives the same local workflow shape (rebuild, reload, no pod restart needed) while also being the same mechanism a shared cluster would use — one mental model instead of two.
- **Recommend PVC as the shared-cluster answer and leave image volumes undocumented** — PVC (the existing `extensions-pvc.yaml` example) remains valid and is the better fit when something *else* already populates a volume outside CI (a sync job, an existing NFS share). Rejected as exclusive: image volumes fit better when the extension bundle *is* a build artifact with a natural image identity (tag, digest, registry push) and the operator doesn't want to stand up RWX-capable storage or a populate Job just to serve ~200 KB of static files.

## Consequences

- Extension delivery now has three documented shapes under the same `extensions.enabled` / `extensions.volume` contract: layered image (default), mounted volume via PVC/hostPath/other (ADR 0009), and mounted volume via `image` source (this ADR). All three serve through the same `/app/wwwroot/extensions` mount and the same static-file middleware; nothing in the backend or STD 001's registry contract changes.
- Requires Kubernetes ≥1.35 with beta-or-GA `image` volume support in the node's container runtime (containerd ≥2.2.1 or CRI-O with equivalent support). A cluster below that returns a Pod validation error on the unrecognized volume field — surfaces at `kubectl apply`/`helm install` time, not silently.
- Read-only is enforced by the volume type itself, not by chart convention (contrast hostPath, which relies on `type: Directory` plus the mount's `readOnly: true`).
- No live-edit loop: an image volume mounts a snapshot of whatever was loaded/pulled, so `node scripts/build-all.mjs` must be followed by an image rebuild and a fresh load/push — same cost as PVC re-sync, cheaper than a full shell image rebuild.
- `Dockerfile.extensions-image` is a second, narrower build path alongside `Dockerfile.extensions`, both driven by the same `scripts/build-all.mjs`. They diverge only in their final stage (layer onto `shell` vs. `FROM scratch`), so a change to the assembler affects both identically.
