# ADR 0002: .NET 10 (LTS) for the backend

- Status: Accepted
- Date: 2026-08-05

## Context

The brief requires the latest .NET LTS. As of August 2026, .NET 10 is the latest LTS (released November 2025, supported until November 2028). The development machine originally had only the .NET 8 SDK, whose support ends November 2026.

## Decision

Target .NET 10 for the ASP.NET Core backend and install the .NET 10 SDK locally. Docker builds pin the `mcr.microsoft.com/dotnet/sdk:10.0` and `aspnet:10.0` images.

## Considered alternative

.NET 8 (already installed) was rejected: its LTS window ends within months, forcing an early migration.

## Consequences

- Three years of LTS support runway.
- Local developers need the .NET 10 SDK; CI/Docker are unaffected since they pull SDK images.
