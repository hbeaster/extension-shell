# Builds the shell image. The build context is the repository root, not this
# folder, because the build spans shell/frontend and shell/backend:
#   docker build -f shell/Dockerfile -t shell .
# The extension images build from extensions/ with their own .dockerignore.

# Stage 1: build the Vue SPA
FROM node:24-alpine AS frontend-build
WORKDIR /src
COPY shell/frontend/package.json shell/frontend/package-lock.json ./
RUN npm ci
COPY shell/frontend/ ./
RUN npm run build-only

# Stage 2: build and publish the .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY shell/backend/ ./
RUN dotnet publish src/Shell.Api -c Release -o /app/publish

# Final: runtime image with SPA assets in wwwroot
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /src/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "Shell.Api.dll"]
