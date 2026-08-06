# ADR 0001: Vue 3 + Vite + TypeScript for the frontend

- Status: Accepted
- Date: 2026-08-05

## Context

The project brief calls for a Vue frontend on its latest LTS version, built with Vite. Vue does not publish an LTS track; Vue 3.x is the current, actively maintained major version.

## Decision

Use Vue 3 (current stable) scaffolded with `create-vue`, with TypeScript, Vue Router, and Pinia. Vite is the build tool and dev server.

## Consequences

- TypeScript gives compile-time safety across components and the API client layer.
- `create-vue` keeps us on the community-standard project layout, easing onboarding and upgrades.
- Vue 2 reached EOL in 2023, so Vue 3 is the only supportable choice.
