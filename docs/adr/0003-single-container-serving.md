# ADR 0003: Single-container serving model

- Status: Accepted
- Date: 2026-08-05

## Context

The Vue SPA and the .NET API must both reach production. Options: (a) one container where ASP.NET Core serves the built SPA as static files alongside the API, or (b) two containers (nginx for the SPA, .NET for the API) behind shared routing.

## Decision

Single container: the Vue production build is copied into the ASP.NET Core app's `wwwroot` and served via static-file middleware with an SPA fallback to `index.html`. In development, the Vite dev server proxies `/api` to the backend, so DX is unaffected.

## Considered alternative

Two containers scale the tiers independently and keep images single-purpose, but double the Kubernetes objects and images. Rejected for now given the brief's "basic k8s objects" constraint and the app's early stage.

## Consequences

- One image, one Deployment/Service/Ingress — simplest possible Helm chart.
- Frontend and backend deploy atomically (no version skew between SPA and API).
- If static traffic ever needs a CDN or independent scaling, revisit this ADR.
