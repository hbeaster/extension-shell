# Shell

A web application: Vue 3 + Vite + TypeScript frontend, ASP.NET Core (.NET 10) backend with controller-based APIs. In production a single container serves both the SPA and the API; Kubernetes deployment via Helm.

## Prerequisites

- Node.js 24+ (LTS)
- .NET 10 SDK
- Docker (optional, for container builds)
- Helm 3+ (optional, for Kubernetes)

## Quick start (development)

Terminal 1 — backend:

```bash
cd shell/backend
dotnet run --project src/Shell.Api
```

Terminal 2 — frontend (Vite proxies `/api` to the backend):

```bash
cd shell/frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Testing & linting

```bash
# frontend
cd shell/frontend
npm run lint
npm run test:unit -- --run
npm run build

# backend
cd shell/backend
dotnet test
dotnet format --verify-no-changes
```

## Docker

```bash
docker build -f shell/Dockerfile -t shell .
docker run -p 8080:8080 shell
# http://localhost:8080  (SPA), /api/hello, /healthz
```

> Troubleshooting: if pulls from `mcr.microsoft.com` fail with `EOF`, the IPv6 route to Microsoft's registry may be broken on your network. Pull the `dotnet/sdk:10.0` and `dotnet/aspnet:10.0` images by another means (e.g. skopeo) and build with `--pull=false`.

## Kubernetes (Helm)

```bash
helm lint helm/shell
helm install shell helm/shell --set image.repository=<your-registry>/shell --set image.tag=<tag>
```

See `helm/shell/values.yaml` for replicas, resources, ingress, and probe settings.

### Extension delivery

Two supported modes (ADR 0009). **Layered image** is the default — build `shell-ext` with
`Dockerfile.extensions` and point `image.repository`/`image.tag` at it.

**Mounted volume** ships extensions independently of the shell image. Publish the assembled
dist — `registry.json` plus one folder per extension, exactly what `node scripts/build-all.mjs`
writes to `extensions/dist/` — to a volume, then:

```bash
kubectl apply -f helm/shell/examples/extensions-pvc.yaml
helm install shell helm/shell \
  --set extensions.enabled=true \
  --set extensions.volume.persistentVolumeClaim.claimName=shell-extensions
```

`helm/shell/examples/extensions-pvc.yaml` is a ready-to-adapt claim with a populate-job
recipe. It uses `ReadWriteMany` deliberately: the chart runs 2 replicas by default, so
`ReadWriteOnce` would leave pods on other nodes stuck in `ContainerCreating`.

#### Local development (hostPath)

For a local single-node cluster, `helm/shell/examples/values-dev-hostpath.yaml` mounts
extensions from the node instead, so rebuilding is the whole loop — files are read per
request, with no pod restart:

```bash
docker build -f shell/Dockerfile -t shell .        # once
helm install shell helm/shell -f helm/shell/examples/values-dev-hostpath.yaml
```

The default path is this repo's own `extensions/dist`. hostPath reads the *node's*
filesystem, not your workstation's, so that value mounts as-is only where the node can see
it — plain Linux/k3s, or a kind cluster created with `extraMounts`. Check `kubectl get
nodes`: a node named `*-control-plane` means kind (including current Docker Desktop
Kubernetes), whose node is a container with no view of your drive; there you either create
your own kind cluster with `extraMounts` to keep the live loop, or copy the dist in with
`docker cp extensions/dist <node>:/var/local/shell-extensions` and re-copy after each
rebuild. The example file spells out all of these, plus minikube.

> hostPath is for local clusters only — it ties a pod to its node and is commonly blocked by
> admission policy. Use a PVC anywhere shared.

`extensions.volume` takes a raw volume spec, so any volume type works (PVC, NFS, CSI). It is
mounted read-only over `/app/wwwroot/extensions` and needs no shell configuration.

> Use the plain `shell` image in this mode: the mount shadows extensions baked into a layered
> image. A missing or empty volume is not an error — the sidebar simply shows only built-in
> tools. Check with `kubectl exec deploy/shell -- ls /app/wwwroot/extensions`.

## Documentation

- `docs/adr/` — Architecture Decision Records
- `docs/architecture/` — architecture snapshots with mermaid diagrams
- `docs/standards/` — normative standards (extension consumption, extension authoring)
- `plans/` — working plans
- `CLAUDE.md` / `AGENTS.md` — guides for AI coding assistants

## Deferred / next steps

- CI pipeline (build, test, image publish)
- End-to-end tests (Playwright or Cypress)
- AuthN/AuthZ, persistence layer
- docker-compose for one-command local stack
