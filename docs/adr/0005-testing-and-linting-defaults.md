# ADR 0005: Testing and linting — ecosystem defaults

- Status: Accepted
- Date: 2026-08-05

## Context

The brief asks for the default, standard testing and linting frameworks per stack rather than bespoke choices.

## Decision

| Concern | Frontend | Backend |
| --- | --- | --- |
| Unit/component tests | Vitest + Vue Test Utils | xUnit (+ `WebApplicationFactory` for integration tests) |
| Linting | ESLint + oxlint (create-vue default) | .NET analyzers (`AnalysisLevel=latest-recommended`) |
| Formatting | Prettier | `dotnet format` + `.editorconfig` |

## Consequences

- `npm run lint` / `npm run test:unit` on the frontend; `dotnet format --verify-no-changes` / `dotnet test` on the backend are the canonical local + CI gates.
- All tools are the stock choices of their ecosystems — minimal onboarding cost, maximal documentation coverage.
