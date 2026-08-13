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
