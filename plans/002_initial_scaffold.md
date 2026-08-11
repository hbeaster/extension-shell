# Plan: Scaffold Vue 3 + .NET 10 Web Application

## Context

`C:\projects\extensions` is an empty greenfield repo (only `plans/001_init.md`, the project brief). We are scaffolding a production-shaped web application:

- **Frontend:** Vue 3 (current stable — Vue has no LTS track) + Vite + TypeScript
- **Backend:** .NET 10 (latest LTS, supported to Nov 2028) ASP.NET Core Web API with **controllers**
- **Serving model (user-confirmed):** single container — the .NET app serves both the API and the built Vue static files. In dev, Vite dev server proxies `/api` to the backend.
- **Docker:** one multi-stage Dockerfile at repo root (Node build → .NET publish → aspnet runtime with Vue `dist` in `wwwroot`)
- **Helm:** one chart using basic k8s objects (Deployment, Service, optional Ingress)
- Testing: Vitest + Vue Test Utils (frontend), xUnit (backend)
- Linting: ESLint + Prettier (frontend), .NET analyzers + `.editorconfig` + `dotnet format` (backend)
- Docs: ADRs, architecture folder with mermaid diagrams, CLAUDE.md/AGENTS.md

**Machine note:** only the .NET 8 SDK is installed. Step 0 installs the .NET 10 SDK (user approved targeting .NET 10). Node 24 (current LTS), Docker 29, Helm 4 are already present.

**Naming assumption:** project name derived from folder → solution/projects named `Extensions` (e.g. `Extensions.Api`). Easy to rename later.

## Target Structure

```
extensions/
├── frontend/                     # create-vue scaffold (TS, Router, Pinia, Vitest, ESLint, Prettier)
│   ├── src/                      # components/, views/, router/, stores/, services/api.ts
│   ├── vite.config.ts            # dev proxy: /api → http://localhost:5000
│   └── package.json
├── backend/
│   ├── Extensions.sln
│   ├── src/Extensions.Api/
│   │   ├── Controllers/          # HelloController (sample), health via MapHealthChecks
│   │   ├── Program.cs            # controllers, health checks, static files + SPA fallback
│   │   └── appsettings*.json
│   └── tests/Extensions.Api.Tests/   # xUnit + WebApplicationFactory integration test
├── helm/extensions/
│   ├── Chart.yaml
│   ├── values.yaml               # image, replicas, resources, service, ingress.enabled
│   └── templates/                # deployment.yaml (liveness/readiness → /healthz),
│                                 # service.yaml, ingress.yaml, _helpers.tpl
├── docs/
│   ├── adr/                      # 0001-vue3-vite … see ADR list below
│   └── architecture/             # 001-initial-architecture.md (mermaid + explanation)
├── plans/001_init.md             # (exists)
├── Dockerfile                    # multi-stage: node:24 → dotnet/sdk:10.0 → aspnet:10.0
├── .dockerignore
├── .editorconfig                 # C# + general style rules
├── .gitignore
├── CLAUDE.md                     # repo map, commands, conventions
├── AGENTS.md                     # cross-tool AI doc (mirrors CLAUDE.md essentials)
└── README.md
```

## Steps

0. **Install .NET 10 SDK** — `winget install Microsoft.DotNet.SDK.10`, verify `dotnet --list-sdks`. Then `git init`.
1. **Frontend** — `npm create vue@latest frontend` (TypeScript, Router, Pinia, Vitest, ESLint, Prettier; no e2e for now). Add `/api` dev proxy in `vite.config.ts`, a small `services/api.ts` fetch wrapper, and a view that calls the sample backend endpoint. Verify `npm run lint`, `test:unit`, `build`.
2. **Backend** — `dotnet new sln` + `dotnet new webapi --use-controllers` under `backend/src/Extensions.Api`, xUnit test project under `backend/tests/`. Program.cs: `AddControllers`, `AddHealthChecks` → `/healthz`, `UseDefaultFiles`/`UseStaticFiles`, `MapFallbackToFile("index.html")` (SPA fallback). Sample `HelloController` under `/api/hello`. Enable `<AnalysisLevel>latest-recommended</AnalysisLevel>` via `Directory.Build.props`; root `.editorconfig`. Verify `dotnet build`, `dotnet test`, `dotnet format --verify-no-changes`.
3. **Integration check (dev mode)** — run backend + `npm run dev`, confirm the Vue page renders data from `/api/hello` through the proxy.
4. **Docker** — root multi-stage Dockerfile: build Vue dist → publish .NET → final `aspnet:10.0` image with dist copied to `wwwroot`. `.dockerignore`. Verify `docker build` + `docker run -p 8080:8080`, curl `/`, `/api/hello`, `/healthz`.
5. **Helm** — `helm/extensions` chart: Deployment (probes on `/healthz`, resources, replicas), ClusterIP Service, Ingress behind `ingress.enabled`, standard labels via `_helpers.tpl`. Verify `helm lint` + `helm template`.
6. **Docs** —
   - ADRs (concise MADR format): `0001-vue3-vite-frontend`, `0002-dotnet10-lts-backend`, `0003-single-container-serving`, `0004-controllers-api-style`, `0005-testing-and-linting-defaults`
   - `docs/architecture/001-initial-architecture.md`: mermaid diagrams (runtime: browser → Ingress → Service → Pod [ASP.NET Core serving Vue static + API]; plus dev-time and Docker build-stage views) with prose explanation. Convention: new numbered file per significant change.
   - `CLAUDE.md` + `AGENTS.md`: repo layout, dev/build/test/lint commands, conventions (where ADRs/architecture docs live, when to add them).
   - `README.md`: quick start.

## Verification (end-to-end)

- `frontend`: `npm run lint && npm run test:unit && npm run build`
- `backend`: `dotnet build && dotnet test && dotnet format --verify-no-changes`
- Dev integration: Vite page shows live data from the API
- `docker build` then `docker run` → `/`, `/api/hello`, `/healthz` all respond from the single container
- `helm lint` and `helm template` render valid manifests

Not doing (deferred): CI pipeline, e2e tests (Playwright/Cypress), auth, database, docker-compose — call them out in README as next steps. No git commit unless requested.
