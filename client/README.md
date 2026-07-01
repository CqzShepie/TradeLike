# TradeLike Client

React, TypeScript, Vite, and Tailwind frontend for TradeLike.

## Setup

```powershell
npm ci
npm run dev
```

The local app runs on the Vite dev server. By default API calls use `http://localhost:5001/api`.

To point at another API:

```powershell
$env:VITE_API_URL="https://your-api.example.com/api"
npm run dev
```

## Checks

```powershell
npm run lint
npm run build
```

## Static Web Apps

`staticwebapp.config.json` contains SPA fallback, JavaScript MIME types, and security headers for the deployed frontend.
