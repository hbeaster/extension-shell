# Shell — AI assistant guide

Single-service web app: Vue 3 SPA + ASP.NET Core (.NET 10) API, served together from one container in production.

## Repo map

| Path | What it is |
| --- | --- |
| `frontend/` | Vue 3 + Vite + TypeScript SPA (create-vue layout: `src/views`, `src/components`, `src/router`, `src/stores`, `src/services`) |
| `backend/` | .NET solution — API in `src/Shell.Api` (controllers), tests in `tests/Shell.Api.Tests` (xUnit) |
| `extensions/` | npm workspace of web-component extensions (one folder per extension + `scripts/assemble.mjs` → `extensions/dist/` with `registry.json`) |
| `helm/shell/` | Helm chart: Deployment, Service, optional Ingress |
| `docs/adr/` | Architecture Decision Records (numbered, MADR-style) |
| `docs/architecture/` | Numbered architecture snapshots with mermaid diagrams |
| `plans/` | Working plans for larger efforts |
| `Dockerfile` | Multi-stage build: Vue dist → .NET publish → aspnet runtime |
| `Dockerfile.extensions` | Layers built extensions onto the shell image (`FROM shell:latest`, copies `extensions/dist/` → `wwwroot/extensions/`) |

## Commands

Frontend (run in `frontend/`):

- `npm run dev` — Vite dev server (proxies `/api` → `http://localhost:5000`)
- `npm run lint` — oxlint + ESLint (auto-fixes)
- `npm run test:unit -- --run` — Vitest, single pass
- `npm run build` — type-check + production build

Backend (run in `backend/`):

- `dotnet run --project src/Shell.Api` — API on `http://localhost:5000`
- `dotnet test` — xUnit suites
- `dotnet format --verify-no-changes` — style gate (analyzers at `latest-recommended`)

Extensions (run in `extensions/`):

- `npm run build` — builds every extension (Vite lib mode) and assembles `extensions/dist/` (bundles, icons, `registry.json`). No HMR: rebuild to see changes in dev; the backend serves `extensions/dist` at `/extensions` in Development (`Extensions:RootPath`).

Full stack:

- `docker build -t shell .` (repo root) then `docker run -p 8080:8080 shell`
- `docker build -f Dockerfile.extensions -t shell-ext .` (after building `shell`) — shell + extensions image
- `helm lint helm/shell` / `helm template helm/shell`

## Conventions

- API endpoints: attribute-routed controllers under `/api/*`, one controller per resource, in `backend/src/Shell.Api/Controllers/`.
- Frontend API calls go through `frontend/src/services/api.ts` — add typed functions there, never `fetch` directly in components. (The extension registry fetch lives in `services/extensions.ts` — static asset, soft-fail semantics; see ADR 0006.)
- Extensions are web components: one folder per extension in `extensions/` with an `extension.json` manifest (`{ id, name, tag }`; `id` = folder name, `tag` starts with `ext-`). They talk to the shell only via DOM `CustomEvent`s on their host element (`shell:notify` opens the shell modal). Widening this contract needs a new ADR.
- Health endpoint is `/healthz` (used by k8s probes) — don't rename without updating the Helm values.
- Significant technical decisions get a new ADR in `docs/adr/` (next number, MADR format: Context / Decision / Consequences).
- Architecture changes get a new numbered file in `docs/architecture/` with updated mermaid diagrams; never edit old snapshots.
- Before considering work done: frontend `lint` + `test:unit` + `build` and backend `dotnet test` + `dotnet format --verify-no-changes` must pass.
