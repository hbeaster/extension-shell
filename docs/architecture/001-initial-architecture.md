# 001 — Initial Architecture

Date: 2026-08-05
Related ADRs: [0001](../adr/0001-vue3-vite-frontend.md), [0002](../adr/0002-dotnet10-lts-backend.md), [0003](../adr/0003-single-container-serving.md), [0004](../adr/0004-controllers-api-style.md)

## Overview

A single-service web application: an ASP.NET Core (.NET 10) process serves both the REST API (controller-based, under `/api/*`) and the production build of the Vue 3 SPA (static files with an `index.html` fallback for client-side routing). One container image, deployed to Kubernetes with basic objects via Helm.

## Runtime architecture (production / Kubernetes)

```mermaid
flowchart LR
    U[Browser] -->|HTTPS| I[Ingress]

    subgraph cluster [Kubernetes cluster]
        I --> S[Service - ClusterIP :80]
        S --> P1
        S --> P2
        subgraph deploy [Deployment - replicas x2]
            subgraph P1 [Pod]
                A1[ASP.NET Core :8080]
            end
            subgraph P2 [Pod]
                A2[ASP.NET Core :8080]
            end
        end
    end

    subgraph app [Inside each ASP.NET Core process]
        SF[Static files - Vue dist in wwwroot<br/>SPA fallback to index.html]
        C[API controllers - /api/*]
        H[Health checks - /healthz]
    end

    A1 -.serves.-> app
```

The Deployment's liveness and readiness probes hit `/healthz`. The Ingress is optional (`ingress.enabled` in `helm/extensions/values.yaml`); without it the Service can be reached via port-forward or a LoadBalancer type.

## Development-time architecture

```mermaid
flowchart LR
    D[Browser] --> V[Vite dev server :5173<br/>HMR + Vue SPA]
    V -->|proxy /api/*| B[ASP.NET Core :5000<br/>dotnet run]
```

In dev the SPA is served by Vite (hot module reload); only `/api/*` calls reach the backend. This keeps the single-container decision invisible to day-to-day frontend work.

## Docker image build

```mermaid
flowchart LR
    subgraph stage1 [Stage 1: node:24]
        F[npm ci + npm run build-only] --> dist[shell/frontend/dist]
    end
    subgraph stage2 [Stage 2: dotnet/sdk:10.0]
        Bk[dotnet publish] --> pub[publish output]
    end
    subgraph final [Final: dotnet/aspnet:10.0]
        R[App root]
    end
    dist -->|copy to wwwroot| R
    pub -->|copy| R
```

The final image contains only the ASP.NET Core runtime, the published app, and the SPA assets — no Node, no SDK.

## Conventions for this folder

Each significant architecture change gets a new numbered file (`002-…`, `003-…`) with updated mermaid diagrams and an explanation of what changed and why, referencing the ADR that motivated it. Older files are kept as history.
