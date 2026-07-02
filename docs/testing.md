# Testing

## Backend tests

Run the API build and tests from the repository root:

```powershell
dotnet build TradeLike.Api -c Release
dotnet test -c Release
```

The backend suite covers controller and service behavior with in-memory data. Regression smoke tests focus on tenant scoping, auth boundaries, quote conversion protections, request validation, and Studio plan-change audit requirements.

## Frontend tests

Run the client tests and production build from the client folder:

```powershell
cd client
npm run test
npm run build
```

The frontend suite covers route guards, sidebar gating, forms, empty states, access diagnostics visibility, staff login rendering, and key page smoke behavior.

## Manual smoke routes

After automated checks pass, click through these routes in a local development session:

- `/dashboard`
- `/customers`
- `/customers/:id`
- `/jobs`
- `/jobs/:id`
- `/quotes`
- `/quotes/:id`
- `/invoices`
- `/calendar`
- `/settings`
- `/settings/billing`
- `/settings/api`
- `/settings/branding`
- `/settings/import-export`
- `/admin`
- `/staff-login`

Use at least one Solo customer user, one Business customer director, and one internal staff user so plan gates and staff/customer boundaries are both exercised.

## When tests fail

Start with the first failing test and check whether it is a setup issue, a contract change, or a real regression. Prefer updating mocks and fixtures only when product behavior intentionally changed. If behavior changed by accident, fix the product code in the feature branch that introduced the regression rather than loosening the smoke test.
