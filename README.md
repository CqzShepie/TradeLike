# TradeLike

TradeLike is a React and ASP.NET Core application for trade businesses to manage customers, jobs, quotes, calendars, teams, and operational dashboards.

## Repository Layout

- `TradeLike.Api/` - ASP.NET Core 8 API, Entity Framework Core, SQL Server.
- `client/` - React, TypeScript, Vite, Tailwind frontend.
- `.github/workflows/` - deployment workflows plus CI.

## Required Backend Configuration

Use environment variables or a local user-secrets profile for sensitive values. Do not commit real secrets.

Required values:

- `ConnectionStrings__TradeLikeDatabase`
- `Jwt__Key` - at least 32 bytes.
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__ExpiryMinutes`
- `Frontend__BaseUrl`
- `AllowedOrigins__0`, `AllowedOrigins__1`, etc.

`TradeLike.Api/appsettings.json` keeps JWT and frontend URL placeholders only. The API validates required JWT, frontend URL, and CORS origin configuration at startup.

## Backend Setup

```powershell
dotnet restore TradeLike.Api/TradeLike.Api.csproj
dotnet ef database update --startup-project TradeLike.Api --project TradeLike.Api
dotnet build TradeLike.Api/TradeLike.Api.csproj -c Release
dotnet run --project TradeLike.Api/TradeLike.Api.csproj
```

The API defaults to SQL Server. Create migrations with:

```powershell
dotnet ef migrations add MigrationName --startup-project TradeLike.Api --project TradeLike.Api
```

## Frontend Setup

```powershell
cd client
npm ci
npm run dev
npm run lint
npm run build
```

Set `VITE_API_URL` when the API is not running at the default `http://localhost:5001/api`.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

- Backend: restore, release build, and test if test projects exist.
- Frontend: `npm ci`, lint, and production build.

## Deployment Notes

- Configure production secrets in the hosting provider, not in source control.
- Run EF migrations before deploying API changes that add or modify tables.
- Keep `AllowedOrigins` aligned with deployed frontend domains.
