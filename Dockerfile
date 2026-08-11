# Stage 1: build the Vue SPA
FROM node:24-alpine AS frontend-build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build-only

# Stage 2: build and publish the .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY backend/ ./
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
