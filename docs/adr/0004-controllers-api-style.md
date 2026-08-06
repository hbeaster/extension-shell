# ADR 0004: Controller-based API style

- Status: Accepted
- Date: 2026-08-05

## Context

ASP.NET Core offers two first-class API styles: MVC controllers and Minimal APIs (the default template since .NET 6).

## Decision

Use attribute-routed controllers (`[ApiController]`) under `/api/*`.

## Considered alternative

Minimal APIs have less ceremony and are the modern template default, but controllers provide stronger conventions (filters, model binding, per-controller organization) as the endpoint surface grows, and are the more familiar shape for most .NET teams.

## Consequences

- Endpoints live in `backend/src/Shell.Api/Controllers/`, one controller per resource.
- Cross-cutting concerns use MVC filters/middleware rather than endpoint filters.
