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

Three supported modes (ADR 0009, ADR 0010). **Layered image** is the default — build
`shell-ext` with `Dockerfile.extensions` and point `image.repository`/`image.tag` at it.

**Mounted volume (PVC)** ships extensions independently of the shell image. Publish the
assembled dist — `registry.json` plus one folder per extension, exactly what
`node scripts/build-all.mjs` writes to `extensions/dist/` — to a volume, then:

```bash
kubectl apply -f helm/shell/examples/extensions-pvc.yaml
helm install shell helm/shell \
  --set extensions.enabled=true \
  --set extensions.volume.persistentVolumeClaim.claimName=shell-extensions
```

`helm/shell/examples/extensions-pvc.yaml` is a ready-to-adapt claim with a populate-job
recipe. It uses `ReadWriteMany` deliberately: the chart runs 2 replicas by default, so
`ReadWriteOnce` would leave pods on other nodes stuck in `ContainerCreating`.

**Mounted volume (image)** packages the assembled dist as a standalone OCI image and mounts
it with Kubernetes' `image` volume type (GA in 1.36) — no external storage to provision:

```bash
docker build -f Dockerfile.extensions-image -t shell-extensions:latest .
helm install shell helm/shell -f helm/shell/examples/values-dev-imagevolume.yaml
```

For local single-node clusters (kind, Docker Desktop Kubernetes, minikube), the image must
be loaded into the node directly rather than pulled — `values-dev-imagevolume.yaml` spells
out the load command for each. In a shared cluster, push the image to a registry and point
`extensions.volume.image.reference` at that tag instead. This mode replaced an earlier
hostPath-based example (removed): hostPath required the node to see the host filesystem,
which fails outright on kind and Docker Desktop Kubernetes with no reliable per-platform fix
— the image volume sidesteps that by never touching the node's filesystem.

`extensions.volume` takes a raw volume spec, so any volume type works (PVC, NFS, CSI, image).
It is mounted read-only over `/app/wwwroot/extensions` and needs no shell configuration.

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
