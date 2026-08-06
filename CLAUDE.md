# Extensions — AI assistant guide

Single-service web app: Vue 3 SPA + ASP.NET Core (.NET 10) API, served together from one container in production.

## Repo map

| Path | What it is |
| --- | --- |
| `frontend/` | Vue 3 + Vite + TypeScript SPA (create-vue layout: `src/views`, `src/components`, `src/router`, `src/stores`, `src/services`) |
| `backend/` | .NET solution — API in `src/Extensions.Api` (controllers), tests in `tests/Extensions.Api.Tests` (xUnit) |
| `helm/extensions/` | Helm chart: Deployment, Service, optional Ingress |
| `docs/adr/` | Architecture Decision Records (numbered, MADR-style) |
| `docs/architecture/` | Numbered architecture snapshots with mermaid diagrams |
| `plans/` | Working plans for larger efforts |
| `Dockerfile` | Multi-stage build: Vue dist → .NET publish → aspnet runtime |

## Commands

Frontend (run in `frontend/`):

- `npm run dev` — Vite dev server (proxies `/api` → `http://localhost:5000`)
- `npm run lint` — oxlint + ESLint (auto-fixes)
- `npm run test:unit -- --run` — Vitest, single pass
- `npm run build` — type-check + production build

Backend (run in `backend/`):

- `dotnet run --project src/Extensions.Api` — API on `http://localhost:5000`
- `dotnet test` — xUnit suites
- `dotnet format --verify-no-changes` — style gate (analyzers at `latest-recommended`)

Full stack:

- `docker build -t extensions .` (repo root) then `docker run -p 8080:8080 extensions`
- `helm lint helm/extensions` / `helm template helm/extensions`

## Conventions

- API endpoints: attribute-routed controllers under `/api/*`, one controller per resource, in `backend/src/Extensions.Api/Controllers/`.
- Frontend API calls go through `frontend/src/services/api.ts` — add typed functions there, never `fetch` directly in components.
- Health endpoint is `/healthz` (used by k8s probes) — don't rename without updating the Helm values.
- Significant technical decisions get a new ADR in `docs/adr/` (next number, MADR format: Context / Decision / Consequences).
- Architecture changes get a new numbered file in `docs/architecture/` with updated mermaid diagrams; never edit old snapshots.
- Before considering work done: frontend `lint` + `test:unit` + `build` and backend `dotnet test` + `dotnet format --verify-no-changes` must pass.
